/**
 * Virtual 2D map of the club's facilities (boards Mappa-centro, Rotazione-campi, Rotazione-Dervio).
 *
 * One responsive SVG plan per site with layer toggles, a details panel (side panel on desktop,
 * bottom sheet on phones), open/closed status from the contract hours in Europe/Rome and, in the
 * staff view, the pitches and changing rooms in use from the weekly training board snapshot.
 * Data: config/scd-facilities.v1.json through src/lib/facilities.ts. Unknown renders "da inserire".
 */
import { Link } from "@tanstack/react-router";
import { Check, ClipboardCopy, Clock3, DoorOpen, ExternalLink, MapPin, Route as RouteIcon, ShieldCheck, Users, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { Chip, ScrollRegion } from "@/components/scd/interior-ui";
import {
  CORRECTION_KINDS,
  FACILITIES,
  QUADRO_DAY,
  REGISTER_URL,
  WEEKDAYS,
  WEEKDAY_LABEL,
  clubClock,
  correctionProblems,
  correctionRow,
  correctionTsv,
  hoursLines,
  isProposed,
  publicSite,
  publicSpace,
  slotTimes,
  spaceStatus,
  usageAt,
  whoMayEnter,
  type ClubClock,
  type CorrectionKind,
  type Entrance,
  type Site,
  type Space,
  type SpaceLayer,
  type UseEntry,
  type Weekday,
} from "@/lib/facilities";
import type { TrainingSlot } from "@/lib/public-snapshots";

export type FacilityMapMode = "public" | "staff";
type Layer = SpaceLayer | "ingressi" | "percorsi";

const LAYER_LABEL: Readonly<Record<Layer, string>> = {
  campi: "Campi",
  spogliatoi: "Spogliatoi",
  servizi: "Servizi",
  ingressi: "Ingressi",
  percorsi: "Percorsi",
};
const ALL_LAYERS: readonly Layer[] = ["campi", "spogliatoi", "servizi", "ingressi", "percorsi"];

const TYPE_LABEL: Readonly<Record<Space["type"], string>> = {
  field: "Campo",
  office: "Ufficio",
  clubhouse: "Club House",
  food: "Ristorazione",
  storage: "Magazzino",
  first_aid: "Infermeria",
  ticket_office: "Biglietteria",
  changing_room: "Spogliatoio",
  referee_room: "Spogliatoio arbitri",
  stand: "Tribuna",
  athletics: "Atletica",
  beach_volley: "Beach volley",
};

/** Plan colours: inside palette for surfaces, natural greens and clay for playing surfaces. */
const PLAN = {
  ground: "#e9f2fb",
  pitch: "#2f8a4f",
  pitchAlt: "#3d9a5c",
  line: "#ffffff",
  room: "#ffffff",
  roomStroke: "#b9d5ef",
  service: "#fff3c4",
  serviceStroke: "#e0c34a",
  clay: "#c8735a",
  clayInner: "#d98b70",
  sand: "#f3d79a",
  ink: "#062a52",
  sub: "#3b5683",
  inUse: "#0860a8",
  selected: "#f8d000",
  focus: "#1898d8",
  teamsRoute: "#0860a8",
  publicRoute: "#a3241b",
};

export interface ViewMoment {
  clock: Pick<ClubClock, "weekday" | "minutes">;
  /** True when the moment follows the real clock. */
  live: boolean;
}

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const short = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

/* ───────────────────────── Hooks ───────────────────────── */

/** Real club clock refreshed every minute, or the injected instant (tests, screenshots). */
function useClubClock(now?: Date): ClubClock | null {
  const [clock, setClock] = useState<ClubClock | null>(now ? clubClock(now) : null);
  useEffect(() => {
    if (now) {
      setClock(clubClock(now));
      return;
    }
    setClock(clubClock(new Date()));
    const t = window.setInterval(() => setClock(clubClock(new Date())), 60_000);
    return () => window.clearInterval(t);
  }, [now]);
  return clock;
}

function useIsPhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return phone;
}

/* ───────────────────────── Main component ───────────────────────── */

export interface FacilityMapProps {
  mode: FacilityMapMode;
  /** Weekly training board slots (staff view only). */
  slots?: readonly TrainingSlot[];
  /** Injected instant for tests and screenshots; defaults to the real clock. */
  now?: Date;
  initialSiteId?: string;
  /** Staff view: called when the user asks to correct a space. */
  onPropose?: (spaceId: string) => void;
}

export function FacilityMap({ mode, slots = [], now, initialSiteId = "SED-COL", onPropose }: FacilityMapProps) {
  const staff = mode === "staff";
  const clock = useClubClock(now);
  const isPhone = useIsPhone();
  const [siteId, setSiteId] = useState(initialSiteId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [layers, setLayers] = useState<ReadonlySet<Layer>>(() => new Set(ALL_LAYERS));
  const [pick, setPick] = useState<{ day: Weekday; minute: number } | null>(null);
  const lastTrigger = useRef<string | null>(null);
  const tabsId = useId();

  const rawSite = FACILITIES.sites.find((s) => s.id === siteId) ?? FACILITIES.sites[0]!;
  const site: Site = staff ? rawSite : publicSite(rawSite);
  const spaces: Space[] = useMemo(
    () => FACILITIES.spaces.filter((s) => s.site === rawSite.id).map((s) => (staff ? s : publicSpace(s, rawSite))),
    [rawSite, staff],
  );

  const moment: ViewMoment | null = pick
    ? { clock: { weekday: pick.day, minutes: pick.minute }, live: false }
    : clock
      ? { clock, live: true }
      : null;

  const usage = useMemo(
    () => (staff && moment ? usageAt(slots, QUADRO_DAY[moment.clock.weekday], moment.clock.minutes) : new Map<string, UseEntry[]>()),
    [staff, slots, moment?.clock.weekday, moment?.clock.minutes],
  );
  const usageOf = useCallback((s: Space) => (s.quadro_key ? (usage.get(s.quadro_key) ?? []) : []), [usage]);
  const inUseCount = spaces.filter((s) => usageOf(s).length > 0).length;

  const selected = spaces.find((s) => s.id === selectedId) ?? null;
  const placed = spaces.filter((s) => s.layout && layers.has(s.layer));
  const unplaced = spaces.filter((s) => !s.layout);

  const select = (id: string) => {
    lastTrigger.current = id;
    setSelectedId(id);
  };
  const closeSheet = () => {
    setSelectedId(null);
    const id = lastTrigger.current;
    if (id) window.setTimeout(() => document.querySelector<HTMLElement>(`[data-space-trigger="${id}"]`)?.focus(), 0);
  };
  const toggleLayer = (l: Layer) =>
    setLayers((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  const switchSite = (id: string) => {
    setSiteId(id);
    setSelectedId(null);
  };

  const momentLabel = moment
    ? `${moment.live ? "Adesso · " : ""}${WEEKDAY_LABEL[moment.clock.weekday]} ${hhmm(moment.clock.minutes)}`
    : "Ora del club in caricamento";

  const panel = selected ? (
    <SpaceDetails
      space={selected}
      site={site}
      staff={staff}
      moment={moment}
      momentLabel={momentLabel}
      use={usageOf(selected)}
      onPropose={onPropose}
    />
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: site, layers, time */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--in-line)] bg-white p-3 shadow-[var(--in-card-shadow)] sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Centro sportivo" id={tabsId} className="flex gap-1 rounded-xl bg-[#e2edf8] p-1">
            {FACILITIES.sites.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === siteId}
                aria-controls={`${tabsId}-plan`}
                onClick={() => switchSite(s.id)}
                className={`scd-focus h-11 min-w-[104px] rounded-[10px] px-4 text-[16px] font-bold transition-colors duration-150 ${
                  s.id === siteId ? "bg-white text-[var(--in-ink)] shadow-sm" : "text-[var(--in-sub)] hover:bg-white/60"
                }`}
              >
                {s.short}
              </button>
            ))}
          </div>
          <p className="m-0 min-w-0 basis-full text-[14px] leading-snug text-[var(--in-sub)] sm:basis-auto sm:flex-1">
            <MapPin className="mr-1 inline size-4 align-[-3px]" strokeWidth={1.8} aria-hidden="true" />
            <span className="font-semibold text-[var(--in-ink)]">{site.name}</span>
            {" · "}
            {site.address ?? "indirizzo da verificare"}, {site.municipality}
            {!site.managed_by_scd && <> · impianto non gestito dalla SCD</>}
          </p>
        </div>

        <fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0">
          <legend className="sr-only">Livelli della mappa</legend>
          <span aria-hidden="true" className="mr-1 text-[13px] font-semibold text-[var(--in-sub)]">
            Mostra
          </span>
          {ALL_LAYERS.filter((l) => staff || l !== "percorsi" || (site.routes?.length ?? 0) > 0).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={layers.has(l)}
              onClick={() => toggleLayer(l)}
              className={`scd-focus inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-semibold transition-colors duration-150 ${
                layers.has(l)
                  ? "border-[var(--in-info)] bg-[var(--in-info-bg)] text-[var(--in-info)]"
                  : "border-[var(--in-line)] bg-white text-[var(--in-sub)]"
              }`}
            >
              {layers.has(l) && <Check className="size-4" strokeWidth={2.2} aria-hidden="true" />}
              {LAYER_LABEL[l]}
            </button>
          ))}
        </fieldset>

        {staff && (
          <TimePicker
            slots={slots}
            moment={moment}
            pick={pick}
            onPick={setPick}
            inUseCount={inUseCount}
            siteHasBoard={spaces.some((s) => s.quadro_key)}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_290px] xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <section
          id={`${tabsId}-plan`}
          aria-label={`Mappa di ${site.short}`}
          className="min-w-0 self-start overflow-hidden rounded-2xl border border-[var(--in-line)] bg-white shadow-[var(--in-card-shadow)]"
        >
          <p className="m-0 px-4 pt-3 text-[13px] font-medium text-[var(--in-sub)] sm:hidden">Scorri la mappa di lato · tocca uno spazio per i dettagli</p>
          <ScrollRegion label={`Pianta schematica di ${site.short}, scorri di lato se serve`} className="p-2 sm:p-3">
            <PlanSvg
              site={site}
              spaces={placed}
              layers={layers}
              staff={staff}
              selectedId={selectedId}
              focusedId={focusedId}
              usageOf={usageOf}
              moment={moment}
              onSelect={select}
              onFocusSpace={setFocusedId}
            />
          </ScrollRegion>
          <Legend staff={staff} site={site} layers={layers} hasBoard={spaces.some((s) => s.provenance.source === "board")} />
          <p className="m-0 border-t border-[var(--in-line)] px-4 py-3 text-[13px] leading-snug text-[var(--in-sub)]">{site.plan.note}</p>
        </section>

        <aside aria-label="Dettagli dello spazio" className="hidden min-w-0 lg:block">
          <div className="sticky top-4 overflow-hidden rounded-2xl border border-[var(--in-line)] bg-white shadow-[var(--in-card-shadow)]">
            <div aria-live="polite">
              {panel ?? (
                <div className="p-5">
                  <p className="m-0 font-title text-[24px] font-extrabold leading-none">Scegli uno spazio</p>
                  <p className="m-0 mt-2 text-[15px] leading-snug text-[var(--in-sub)]">
                    Tocca un campo, uno spogliatoio o un servizio sulla mappa, oppure usa l'elenco qui sotto: vedi se è aperto, chi entra, da dove e con quali regole.
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <SpaceIndex spaces={spaces} unplaced={unplaced} selectedId={selectedId} usageOf={usageOf} moment={moment} onSelect={select} staff={staff} />

      {isPhone && selected && (
        <BottomSheet title={selected.name} onClose={closeSheet}>
          {panel}
        </BottomSheet>
      )}
    </div>
  );
}

/* ───────────────────────── Time picker (staff) ───────────────────────── */

function TimePicker({
  slots,
  moment,
  pick,
  onPick,
  inUseCount,
  siteHasBoard,
}: {
  slots: readonly TrainingSlot[];
  moment: ViewMoment | null;
  pick: { day: Weekday; minute: number } | null;
  onPick: (p: { day: Weekday; minute: number } | null) => void;
  inUseCount: number;
  siteHasBoard: boolean;
}) {
  const dayId = useId();
  const timeId = useId();
  const day: Weekday = pick?.day ?? moment?.clock.weekday ?? "mon";
  const times = slotTimes(slots, QUADRO_DAY[day]);
  const minute = pick?.minute ?? moment?.clock.minutes ?? 0;
  const matching = times.find((t) => t.minute === minute);
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--in-line)] pt-3">
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1">
          <label htmlFor={dayId} className="text-[13px] font-semibold text-[var(--in-sub)]">
            Giorno
          </label>
          <select
            id={dayId}
            value={day}
            onChange={(e) => {
              const d = e.target.value as Weekday;
              const first = slotTimes(slots, QUADRO_DAY[d])[0];
              onPick({ day: d, minute: first?.minute ?? minute });
            }}
            className="scd-focus h-11 rounded-[10px] border border-[#b9d5ef] bg-white px-3 text-[15px] font-semibold text-[var(--in-ink)]"
          >
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {WEEKDAY_LABEL[d]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={timeId} className="text-[13px] font-semibold text-[var(--in-sub)]">
            Fascia del quadro
          </label>
          <select
            id={timeId}
            value={matching ? String(matching.minute) : ""}
            disabled={times.length === 0}
            onChange={(e) => onPick({ day, minute: Number(e.target.value) })}
            className="scd-focus h-11 min-w-[150px] rounded-[10px] border border-[#b9d5ef] bg-white px-3 text-[15px] font-semibold text-[var(--in-ink)] disabled:opacity-60"
          >
            {!matching && <option value="">{times.length ? `Ora ${hhmm(minute)}` : "Nessun allenamento"}</option>}
            {times.map((t) => (
              <option key={t.minute} value={t.minute}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => onPick(null)}
          disabled={pick === null}
          className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] border border-[#b9d5ef] bg-white px-4 text-[15px] font-semibold text-[var(--in-info)] hover:bg-[var(--in-info-bg)] disabled:cursor-default disabled:opacity-60"
        >
          <Clock3 className="size-4" strokeWidth={2} aria-hidden="true" />
          Adesso
        </button>
      </div>
      <p role="status" aria-live="polite" className="m-0 text-[14px] leading-snug text-[var(--in-ink)]">
        <b>
          {moment ? `${moment.live ? "Adesso, " : ""}${WEEKDAY_LABEL[moment.clock.weekday].toLowerCase()} alle ${hhmm(moment.clock.minutes)}` : "Ora del club in caricamento"}
        </b>
        {" · "}
        {!siteHasBoard
          ? "il quadro settimanale copre solo Colico"
          : inUseCount > 0
            ? `${inUseCount} tra campi e spogliatoi in uso secondo il quadro`
            : "nessun allenamento in quadro in questa fascia"}
      </p>
    </div>
  );
}

/* ───────────────────────── SVG plan ───────────────────────── */

function PlanSvg({
  site,
  spaces,
  layers,
  staff,
  selectedId,
  focusedId,
  usageOf,
  moment,
  onSelect,
  onFocusSpace,
}: {
  site: Site;
  spaces: Space[];
  layers: ReadonlySet<Layer>;
  staff: boolean;
  selectedId: string | null;
  focusedId: string | null;
  usageOf: (s: Space) => UseEntry[];
  moment: ViewMoment | null;
  onSelect: (id: string) => void;
  onFocusSpace: (id: string | null) => void;
}) {
  const { width, height } = site.plan;
  const titleId = useId();
  const dervio = site.id === "SED-DER";
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-labelledby={titleId}
      className="block h-auto w-full min-w-[640px] select-none"
      style={{ fontFamily: "Barlow, sans-serif" }}
    >
      <title id={titleId}>{`Pianta schematica di ${site.name}: ${spaces.length} spazi sulla mappa`}</title>
      <rect width={width} height={height} rx={18} fill={PLAN.ground} />
      {dervio && layers.has("campi") && (
        <g aria-hidden="true">
          <rect x={60} y={70} width={620} height={380} rx={190} fill={PLAN.clay} />
          <rect x={96} y={104} width={548} height={312} rx={156} fill={PLAN.clayInner} />
        </g>
      )}

      {layers.has("percorsi") &&
        (site.routes ?? []).map((r) => (
          <polyline
            key={r.id}
            points={r.points.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke={r.audience === "public" ? PLAN.publicRoute : PLAN.teamsRoute}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={r.audience === "public" ? "2 12" : "16 10"}
            aria-hidden="true"
          />
        ))}

      {spaces.map((s) => (
        <SpaceShape
          key={s.id}
          space={s}
          staff={staff}
          selected={s.id === selectedId}
          focused={s.id === focusedId}
          use={usageOf(s)}
          moment={moment}
          onSelect={onSelect}
          onFocus={onFocusSpace}
        />
      ))}

      {layers.has("ingressi") && (site.entrances ?? []).map((e) => <EntranceMarker key={e.id} entrance={e} planWidth={width} />)}
    </svg>
  );
}

function spaceAria(s: Space, use: UseEntry[], moment: ViewMoment | null, staff: boolean): string {
  const status = moment ? spaceStatus(s.hours, moment.clock).label : "stato in caricamento";
  const parts = [s.name, TYPE_LABEL[s.type], status];
  if (staff && s.quadro_key) parts.push(use.length ? `in uso: ${use.map((u) => u.group).join(" e ")}` : "libero in questa fascia");
  if (s.provenance.source === "board") parts.push("da board, da verificare");
  return parts.join(", ");
}

function SpaceShape({
  space: s,
  staff,
  selected,
  focused,
  use,
  moment,
  onSelect,
  onFocus,
}: {
  space: Space;
  staff: boolean;
  selected: boolean;
  focused: boolean;
  use: UseEntry[];
  moment: ViewMoment | null;
  onSelect: (id: string) => void;
  onFocus: (id: string | null) => void;
}) {
  const b = s.layout!;
  const isPitch = s.type === "field";
  const isSand = s.type === "beach_volley";
  const isClay = s.type === "athletics";
  const isService = s.layer === "servizi";
  const inUse = staff && use.length > 0;
  const fill = isPitch ? (s.site === "SED-DER" && s.board_code === "C2" ? PLAN.pitchAlt : PLAN.pitch) : isSand ? PLAN.sand : isClay ? PLAN.clayInner : isService ? PLAN.service : PLAN.room;
  const onDark = isPitch;
  const textFill = onDark ? "#ffffff" : PLAN.ink;
  const subFill = onDark ? "#ffffff" : PLAN.sub;
  const big = b.w >= 200 && b.h >= 120;
  const status = moment ? spaceStatus(s.hours, moment.clock) : null;

  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(s.id);
    }
  };

  const code = s.board_code ?? s.quadro_key ?? /-(SP\d)$/.exec(s.id)?.[1] ?? null;
  const title = big ? s.name : (code ?? s.name);
  let subline: string | null = null;
  if (staff && s.quadro_key) subline = use.length ? use.map((u) => u.group).join(" + ") : "libero";
  else if (big && s.size) subline = s.size.text;
  else if (!big && code) subline = s.name;

  const maxChars = Math.max(6, Math.floor(b.w / (big ? 11 : 10)));
  return (
    <g
      role="button"
      tabIndex={0}
      data-space-trigger={s.id}
      aria-label={spaceAria(s, use, moment, staff)}
      aria-pressed={selected}
      onClick={() => onSelect(s.id)}
      onKeyDown={onKey}
      onFocus={() => onFocus(s.id)}
      onBlur={() => onFocus(null)}
      className="cursor-pointer outline-none"
    >
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        rx={isPitch ? 10 : 8}
        fill={fill}
        stroke={inUse ? PLAN.inUse : isService ? PLAN.serviceStroke : isPitch ? "#1f6b3a" : PLAN.roomStroke}
        strokeWidth={inUse ? 5 : 2}
        strokeDasharray={s.provenance.source === "board" ? "8 6" : undefined}
      />
      {isPitch && <PitchLines b={b} />}
      {inUse && !isPitch && <rect x={b.x} y={b.y} width={8} height={b.h} rx={3} fill={PLAN.inUse} aria-hidden="true" />}
      {(selected || focused) && (
        <rect
          x={b.x - 5}
          y={b.y - 5}
          width={b.w + 10}
          height={b.h + 10}
          rx={12}
          fill="none"
          stroke={focused ? PLAN.focus : PLAN.selected}
          strokeWidth={focused && selected ? 7 : 6}
          aria-hidden="true"
        />
      )}
      <g aria-hidden="true" pointerEvents="none">
        {big ? (
          <>
            <rect x={b.x + 14} y={b.y + 14} width={Math.min(b.w - 28, title.length * 13 + 24)} height={36} rx={8} fill="rgba(6,42,82,.82)" />
            <text x={b.x + 26} y={b.y + 39} fontSize={22} fontWeight={700} fill="#ffffff">
              {title}
            </text>
            {subline && (
              <text x={b.x + 18} y={b.y + b.h - 18} fontSize={18} fontWeight={600} fill={subFill}>
                {short(subline, maxChars)}
              </text>
            )}
            {inUse && (
              <>
                <rect x={b.x + b.w - 118} y={b.y + 14} width={104} height={32} rx={16} fill="#ffffff" />
                <text x={b.x + b.w - 66} y={b.y + 36} textAnchor="middle" fontSize={17} fontWeight={700} fill={PLAN.inUse}>
                  in uso
                </text>
              </>
            )}
          </>
        ) : (
          <>
            <text x={b.x + b.w / 2} y={b.y + (subline ? b.h / 2 - 2 : b.h / 2 + 7)} textAnchor="middle" fontSize={b.h < 50 ? 19 : 22} fontWeight={700} fill={textFill}>
              {short(title, maxChars)}
            </text>
            {subline && b.h >= 50 && (
              <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 21} textAnchor="middle" fontSize={17} fontWeight={inUse ? 700 : 500} fill={inUse ? PLAN.inUse : subFill}>
                {short(subline, maxChars + 2)}
              </text>
            )}
          </>
        )}
        {status && <StatusDot x={b.x + b.w - 14} y={b.y + b.h - 14} state={status.state} onDark={onDark} />}
      </g>
    </g>
  );
}

function PitchLines({ b }: { b: { x: number; y: number; w: number; h: number } }) {
  const inset = Math.min(12, b.w * 0.04);
  const x = b.x + inset;
  const y = b.y + inset;
  const w = b.w - inset * 2;
  const h = b.h - inset * 2;
  const horizontal = w >= h;
  const r = Math.min(w, h) * 0.13;
  const boxD = (horizontal ? w : h) * 0.14;
  const boxS = (horizontal ? h : w) * 0.5;
  return (
    <g aria-hidden="true" stroke={PLAN.line} strokeOpacity={0.75} strokeWidth={2} fill="none" pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} rx={3} />
      {horizontal ? (
        <>
          <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} />
          <rect x={x} y={y + (h - boxS) / 2} width={boxD} height={boxS} />
          <rect x={x + w - boxD} y={y + (h - boxS) / 2} width={boxD} height={boxS} />
        </>
      ) : (
        <>
          <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} />
          <rect x={x + (w - boxS) / 2} y={y} width={boxS} height={boxD} />
          <rect x={x + (w - boxS) / 2} y={y + h - boxD} width={boxS} height={boxD} />
        </>
      )}
      <circle cx={x + w / 2} cy={y + h / 2} r={r} />
    </g>
  );
}

function StatusDot({ x, y, state, onDark }: { x: number; y: number; state: "open" | "closed" | "unknown"; onDark: boolean }) {
  if (state === "open") return <circle cx={x} cy={y} r={7} fill="#16683f" stroke="#ffffff" strokeWidth={2} />;
  if (state === "closed") return <circle cx={x} cy={y} r={7} fill="#a3241b" stroke="#ffffff" strokeWidth={2} />;
  return <circle cx={x} cy={y} r={6} fill="none" stroke={onDark ? "#ffffff" : PLAN.sub} strokeWidth={2} strokeDasharray="3 3" />;
}

function EntranceMarker({ entrance: e, planWidth }: { entrance: Entrance; planWidth: number }) {
  const label = e.label;
  const w = label.length * 10 + 46;
  const lx = Math.min(Math.max(e.x - w / 2, 8), planWidth - w - 8);
  const pub = e.audience === "public";
  return (
    <g aria-hidden="true" pointerEvents="none">
      <rect x={lx} y={e.y - 40} width={w} height={32} rx={9} fill={pub ? PLAN.publicRoute : PLAN.teamsRoute} />
      <path d={`M${lx + 14} ${e.y - 31} h10 v14 h-10 z M${lx + 20} ${e.y - 24} h-0.1`} stroke="#ffffff" strokeWidth={2} fill="none" />
      <text x={lx + 32} y={e.y - 18} fontSize={16} fontWeight={700} fill="#ffffff">
        {label}
      </text>
      <circle cx={e.x} cy={e.y - 2} r={6} fill={pub ? PLAN.publicRoute : PLAN.teamsRoute} stroke="#ffffff" strokeWidth={2} />
    </g>
  );
}

/* ───────────────────────── Legend and index ───────────────────────── */

function Legend({ staff, site, layers, hasBoard }: { staff: boolean; site: Site; layers: ReadonlySet<Layer>; hasBoard: boolean }) {
  const item = (swatch: ReactNode, text: string) => (
    <li className="flex items-center gap-2">
      <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true" className="flex-none">
        {swatch}
      </svg>
      {text}
    </li>
  );
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 border-t border-[var(--in-line)] px-4 py-3 text-[13.5px] text-[var(--in-ink)]">
      {item(<rect x="1" y="1" width="24" height="14" rx="3" fill={PLAN.pitch} />, "Campo")}
      {item(<rect x="1" y="1" width="24" height="14" rx="3" fill={PLAN.room} stroke={PLAN.roomStroke} strokeWidth="2" />, "Spogliatoio")}
      {item(<rect x="1" y="1" width="24" height="14" rx="3" fill={PLAN.service} stroke={PLAN.serviceStroke} strokeWidth="2" />, "Servizio")}
      {staff && item(<rect x="2" y="2" width="22" height="12" rx="3" fill="#fff" stroke={PLAN.inUse} strokeWidth="3" />, "In uso secondo il quadro")}
      {item(<circle cx="13" cy="8" r="5" fill="none" stroke={PLAN.sub} strokeWidth="2" strokeDasharray="3 3" />, "Orari da inserire")}
      {item(<circle cx="13" cy="8" r="6" fill="#16683f" />, "Aperto")}
      {item(<circle cx="13" cy="8" r="6" fill="#a3241b" />, "Chiuso")}
      {hasBoard && item(<rect x="1" y="1" width="24" height="14" rx="3" fill="#fff" stroke={PLAN.sub} strokeWidth="2" strokeDasharray="5 3" />, "Da board, da verificare")}
      {layers.has("percorsi") && (site.routes?.length ?? 0) > 0 && (
        <>
          {staff && item(<line x1="1" y1="8" x2="25" y2="8" stroke={PLAN.teamsRoute} strokeWidth="4" strokeDasharray="8 5" />, "Percorso squadre (da verificare)")}
          {item(<line x1="2" y1="8" x2="25" y2="8" stroke={PLAN.publicRoute} strokeWidth="4" strokeLinecap="round" strokeDasharray="1 6" />, "Percorso pubblico (da verificare)")}
        </>
      )}
    </ul>
  );
}

function SpaceIndex({
  spaces,
  unplaced,
  selectedId,
  usageOf,
  moment,
  onSelect,
  staff,
}: {
  spaces: Space[];
  unplaced: Space[];
  selectedId: string | null;
  usageOf: (s: Space) => UseEntry[];
  moment: ViewMoment | null;
  onSelect: (id: string) => void;
  staff: boolean;
}) {
  const groups: { layer: SpaceLayer; title: string }[] = [
    { layer: "campi", title: "Campi e zone di gioco" },
    { layer: "spogliatoi", title: "Spogliatoi" },
    { layer: "servizi", title: "Servizi" },
  ];
  const unplacedIds = new Set(unplaced.map((s) => s.id));
  return (
    <section aria-labelledby="fm-index-title" className="rounded-2xl border border-[var(--in-line)] bg-white shadow-[var(--in-card-shadow)]">
      <header className="px-4 pb-2 pt-4 sm:px-[18px]">
        <h2 id="fm-index-title" className="m-0 text-[19px] font-bold leading-tight">
          Tutti gli spazi
        </h2>
        <p className="m-0 mt-0.5 text-[14px] leading-snug text-[var(--in-sub)]">
          Elenco completo, anche degli spazi che non hanno ancora una posizione sulla mappa.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-x-6 px-4 pb-4 sm:px-[18px] md:grid-cols-3">
        {groups.map((g) => {
          const list = spaces.filter((s) => s.layer === g.layer);
          if (!list.length) return null;
          return (
            <div key={g.layer} className="min-w-0">
              <h3 className="m-0 mb-1 mt-3 text-[14px] font-semibold text-[var(--in-sub)]">{g.title}</h3>
              <ul className="m-0 list-none p-0">
                {list.map((s) => {
                  const use = usageOf(s);
                  const status = moment ? spaceStatus(s.hours, moment.clock) : null;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        data-space-trigger={unplacedIds.has(s.id) ? s.id : undefined}
                        aria-pressed={s.id === selectedId}
                        onClick={() => onSelect(s.id)}
                        className={`scd-focus flex min-h-12 w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left transition-colors duration-150 hover:bg-[var(--in-info-bg)] ${
                          s.id === selectedId ? "bg-[var(--in-info-bg)]" : ""
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold leading-tight">{s.name}</span>
                          <span className="block text-[13px] leading-snug text-[var(--in-sub)]">
                            {status?.label ?? "—"}
                            {!s.layout && " · posizione da inserire"}
                            {s.provenance.source === "board" && " · da verificare"}
                          </span>
                        </span>
                        {staff && use.length > 0 && <Chip tone="info">in uso</Chip>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────────────────── Details panel ───────────────────────── */

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-5">
      <span className="mt-0.5 flex-none text-[var(--in-info)]" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[13px] font-semibold text-[var(--in-sub)]">{label}</dt>
        <dd className="m-0 mt-0.5 text-[15px] leading-snug">{children}</dd>
      </div>
    </div>
  );
}

const Missing = ({ children = "da inserire" }: { children?: ReactNode }) => <span className="text-[var(--in-sub)]">— {children}</span>;

function SpaceDetails({
  space: s,
  site,
  staff,
  moment,
  momentLabel,
  use,
  onPropose,
}: {
  space: Space;
  site: Site;
  staff: boolean;
  moment: ViewMoment | null;
  momentLabel: string;
  use: UseEntry[];
  onPropose?: ((spaceId: string) => void) | undefined;
}) {
  const status = moment ? spaceStatus(s.hours, moment.clock) : null;
  const lines = hoursLines(s.hours);
  const who = whoMayEnter(s.access);
  const entrances = s.entrances === null ? null : (site.entrances ?? []).filter((e) => s.entrances!.includes(e.id));
  const fromBoard = s.provenance.source === "board";
  return (
    <div>
      <div className="px-4 pb-3 pt-4 sm:px-5">
        <p className="m-0 text-[13px] font-semibold text-[var(--in-sub)]">
          {TYPE_LABEL[s.type]} · {site.short}
        </p>
        <h2 className="m-0 mt-1 font-title text-[30px] font-extrabold leading-none">{s.name}</h2>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {status ? (
            <Chip tone={status.state === "open" ? "ok" : status.state === "closed" ? "crit" : "mute"}>{status.label}</Chip>
          ) : (
            <Chip>Stato in caricamento</Chip>
          )}
          {fromBoard ? <Chip tone="warn">Da board, da verificare</Chip> : <Chip tone="info">Dal master impianti</Chip>}
        </div>
        <p className="m-0 mt-2 text-[13px] text-[var(--in-sub)]">{moment?.live ? "Stato adesso" : `Stato a: ${momentLabel}`} (ora di Roma)</p>
      </div>
      <dl className="m-0">
        {staff && (
          <Row icon={<Users className="size-[18px]" strokeWidth={1.8} />} label={`In uso · ${momentLabel}`}>
            {s.quadro_key ? (
              use.length ? (
                <ul className="m-0 list-none p-0">
                  {use.map((u) => (
                    <li key={`${u.timeLabel}-${u.group}`}>
                      <b>{u.group}</b> <span className="text-[var(--in-sub)]">· {u.timeLabel}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span>Libero in questa fascia secondo il quadro</span>
              )
            ) : (
              <Missing>il quadro settimanale non copre questo spazio</Missing>
            )}
          </Row>
        )}
        <Row icon={<MapPin className="size-[18px]" strokeWidth={1.8} />} label="Fondo e misure">
          {s.surface || s.size ? (
            <>
              {s.surface ?? "Fondo —"}
              {s.size ? ` · ${s.size.text}` : ""}
            </>
          ) : (
            <Missing />
          )}
        </Row>
        <Row icon={<Clock3 className="size-[18px]" strokeWidth={1.8} />} label="Orari">
          {lines ? (
            <ul className="m-0 grid list-none grid-cols-[auto_1fr] gap-x-3 p-0">
              {lines.map((l) => (
                <li key={l.day} className="contents">
                  <span className="text-[var(--in-sub)]">{WEEKDAY_LABEL[l.day]}</span>
                  <span>{l.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Missing>orari da inserire</Missing>
          )}
        </Row>
        <Row icon={<DoorOpen className="size-[18px]" strokeWidth={1.8} />} label="Da dove si entra">
          {entrances === null ? (
            <Missing>ingresso da inserire</Missing>
          ) : entrances.length === 0 ? (
            <Missing>{staff ? "ingresso da inserire" : "ingresso riservato, non pubblico"}</Missing>
          ) : (
            <ul className="m-0 list-none p-0">
              {entrances.map((e) => (
                <li key={e.id}>
                  {e.label}
                  {!e.provenance.verified && <span className="text-[13px] text-[var(--in-warn)]"> · da board, da verificare</span>}
                </li>
              ))}
            </ul>
          )}
        </Row>
        <Row icon={<ShieldCheck className="size-[18px]" strokeWidth={1.8} />} label="Chi può entrare">
          {who ? (
            <>
              {who.charAt(0).toUpperCase() + who.slice(1)}
              {isProposed(s.access!.source) && <span className="block text-[13px] text-[var(--in-warn)]">Regola proposta, da confermare</span>}
            </>
          ) : (
            <Missing />
          )}
        </Row>
        <Row icon={<RouteIcon className="size-[18px]" strokeWidth={1.8} />} label="Regole d'uso">
          {s.rules.length ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {s.rules.map((r) => (
                <li key={r.text}>
                  {r.text}
                  <span className="block text-[12.5px] text-[var(--in-sub)]">Fonte: {r.source}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Missing>regole da inserire</Missing>
          )}
        </Row>
        {staff && (
          <Row icon={<Users className="size-[18px]" strokeWidth={1.8} />} label="Ruolo responsabile">
            {s.responsible_role ?? <Missing />}
          </Row>
        )}
      </dl>
      <div className="border-t border-[var(--in-line)] px-4 py-3.5 sm:px-5">
        {staff && onPropose ? (
          <button type="button" onClick={() => onPropose(s.id)} className="scd-action inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold">
            Inserisci o correggi
          </button>
        ) : (
          <Link to="/contatti" className="scd-focus text-[15px] font-semibold text-[var(--in-info)] underline-offset-4 hover:underline">
            Un dato è sbagliato? Scrivici
          </Link>
        )}
        <p className="m-0 mt-2 text-[12.5px] text-[var(--in-sub)]">Codice spazio {s.id}</p>
      </div>
    </div>
  );
}

/* ───────────────────────── Bottom sheet (phone) ───────────────────────── */

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && sheetRef.current) {
        const f = sheetRef.current.querySelectorAll<HTMLElement>('button, a[href], select, input, textarea, [tabindex="0"]');
        if (!f.length) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <button type="button" aria-label="Chiudi i dettagli" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[#062a52]/45" />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto overscroll-contain rounded-t-[20px] bg-white pb-[env(safe-area-inset-bottom)] text-[var(--in-ink)] shadow-[0_-12px_40px_rgb(6_42_82/0.3)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--in-line)] bg-white px-4 py-2">
          <span aria-hidden="true" className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-[var(--in-line)]" />
          <span id={labelId} className="pt-1 text-[14px] font-semibold text-[var(--in-sub)]">
            {title}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="scd-focus mt-1 flex size-11 items-center justify-center rounded-full bg-[var(--in-info-bg)] text-[var(--in-info)]"
          >
            <X className="size-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ───────────────────────── "Inserisci o correggi" ───────────────────────── */

const ROLE_SUGGESTIONS = [
  "responsabile campi",
  "segreteria",
  "direzione",
  "dirigente di annata",
  "mister",
  "responsabile magazzino",
  "addetto biglietteria",
  "responsabile Club House",
];

export interface FacilityCorrectionProps {
  /** Space chosen from the map ("Inserisci o correggi"). */
  spaceId: string | null;
  onSpaceChange: (id: string) => void;
  /** Club date YYYY-MM-DD used for the "Data" column; defaults to today in Rome. */
  today?: string;
}

/**
 * Proposes a correction or a new piece of information for a space and turns it into a
 * ready-to-paste row of "00 - SCD INSERIMENTI E RICHIESTE A SKY (master)". No server write.
 */
export function FacilityCorrection({ spaceId, onSpaceChange, today }: FacilityCorrectionProps) {
  const ids = {
    space: useId(),
    kind: useId(),
    role: useId(),
    roles: useId(),
    desc: useId(),
    deadline: useId(),
    link: useId(),
    out: useId(),
  };
  const [kind, setKind] = useState<CorrectionKind>("orari");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [link, setLink] = useState("");
  const [copy, setCopy] = useState<"idle" | "copied" | "manual">("idle");
  const [tried, setTried] = useState(false);
  const outRef = useRef<HTMLTextAreaElement>(null);
  const date = today ?? clubClock(new Date()).date;
  const space = spaceId ?? FACILITIES.spaces[0]!.id;

  const input = { date, role, kind, spaceId: space, description, deadline: deadline || undefined, link: link || undefined };
  const problems = correctionProblems(input);
  const row = correctionRow(input);
  const tsv = correctionTsv(input);
  const columns = FACILITIES.sources.corrections_register.columns;

  useEffect(() => {
    if (copy === "idle") return;
    const t = window.setTimeout(() => setCopy("idle"), 2600);
    return () => window.clearTimeout(t);
  }, [copy]);

  const doCopy = async () => {
    setTried(true);
    if (problems.length) return;
    try {
      await navigator.clipboard.writeText(tsv);
      setCopy("copied");
    } catch {
      outRef.current?.focus();
      outRef.current?.select();
      setCopy("manual");
    }
  };

  const input_cls =
    "scd-focus h-11 w-full rounded-[10px] border border-[#b9d5ef] bg-white px-3 text-[15px] text-[var(--in-ink)]";
  return (
    <form onSubmit={(e) => { e.preventDefault(); void doCopy(); }} noValidate className="flex flex-col gap-4 px-4 pb-4 sm:px-[18px]">
      <p role="note" className="m-0 rounded-xl bg-[var(--in-info-bg)] px-3 py-2.5 text-[14px] leading-snug text-[var(--in-ink)]">
        Scrivi solo il tuo <b>ruolo</b>, mai nomi o dati personali. La riga va incollata nel registro INSERIMENTI: lì la società la verifica e aggiorna il master impianti. Da qui non si scrive nulla sui server.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.space} className="text-[13px] font-semibold text-[var(--in-sub)]">Spazio</label>
          <select id={ids.space} value={space} onChange={(e) => onSpaceChange(e.target.value)} className={input_cls}>
            {FACILITIES.sites.map((site) => (
              <optgroup key={site.id} label={site.name}>
                {FACILITIES.spaces.filter((s) => s.site === site.id).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.kind} className="text-[13px] font-semibold text-[var(--in-sub)]">Cosa vuoi inserire</label>
          <select id={ids.kind} value={kind} onChange={(e) => setKind(e.target.value as CorrectionKind)} className={input_cls}>
            {CORRECTION_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.role} className="text-[13px] font-semibold text-[var(--in-sub)]">Il tuo ruolo</label>
          <input id={ids.role} list={ids.roles} value={role} onChange={(e) => setRole(e.target.value)} autoComplete="off" placeholder="es. responsabile campi" className={input_cls} />
          <datalist id={ids.roles}>
            {ROLE_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.deadline} className="text-[13px] font-semibold text-[var(--in-sub)]">Scadenza (facoltativa)</label>
          <input id={ids.deadline} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={input_cls} />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor={ids.desc} className="text-[13px] font-semibold text-[var(--in-sub)]">Descrizione</label>
          <textarea
            id={ids.desc}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={kind === "orari" ? "es. lun–ven 16:30–22:30, sabato 8:30–19:00" : kind === "ingresso" ? "es. ingresso dal cancello di Via Lido, lato parcheggio" : "Scrivi l'informazione corretta e da dove viene"}
            className="scd-focus w-full rounded-[10px] border border-[#b9d5ef] bg-white px-3 py-2.5 text-[15px] text-[var(--in-ink)]"
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor={ids.link} className="text-[13px] font-semibold text-[var(--in-sub)]">Link o allegato (facoltativo)</label>
          <input id={ids.link} type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/…" className={input_cls} />
        </div>
      </div>

      {tried && problems.length > 0 && (
        <ul role="alert" className="m-0 list-disc rounded-xl bg-[var(--in-crit-bg)] py-2.5 pl-8 pr-3 text-[14px] text-[var(--in-crit)]">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <div>
        <p className="m-0 mb-1.5 text-[13px] font-semibold text-[var(--in-sub)]">Anteprima della riga</p>
        <ScrollRegion label="Anteprima della riga del registro" className="rounded-xl border border-[var(--in-line)]">
          <table className="w-full min-w-[860px] border-collapse text-left text-[13.5px]">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c} scope="col" className="border-b border-[var(--in-line)] bg-[#f6f9fd] px-2.5 py-2 font-semibold text-[var(--in-sub)]">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {row.map((v, i) => (
                  <td key={columns[i]} className="px-2.5 py-2 align-top">
                    {v || <span className="text-[var(--in-sub)]">—</span>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </ScrollRegion>
        <label htmlFor={ids.out} className="sr-only">Riga da incollare (separata da tabulazioni)</label>
        <textarea id={ids.out} ref={outRef} readOnly value={tsv} rows={1} className="sr-only" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="scd-action inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold">
          {copy === "copied" ? <Check className="size-4" strokeWidth={2.2} aria-hidden="true" /> : <ClipboardCopy className="size-4" strokeWidth={2} aria-hidden="true" />}
          Copia la riga
        </button>
        <a
          href={REGISTER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] border border-[#b9d5ef] bg-white px-4 text-[15px] font-semibold text-[var(--in-info)] hover:bg-[var(--in-info-bg)]"
        >
          Apri il registro
          <ExternalLink className="size-4" strokeWidth={2} aria-hidden="true" />
          <span className="sr-only">(si apre in una nuova scheda)</span>
        </a>
        <span role="status" aria-live="polite" className="text-[14px] font-medium text-[var(--in-sub)]">
          {copy === "copied" ? "Riga copiata: incollala nella prima riga libera del registro." : copy === "manual" ? "Copia non riuscita: la riga è selezionata, usa Ctrl+C." : ""}
        </span>
      </div>
    </form>
  );
}

/**
 * Minibuses in 2D under the trainings (UD-123, Direzione 14/10/2026 11:00). Same visual language as the
 * pitches and changing rooms of /impianti (navy outline, light fill, yellow only to highlight):
 * a top view of each van with the driver seat and numbered passenger seats, and a "Giro" tab with the
 * ordered stops of the line and who gets on (andata) and off (ritorno) at each one.
 *
 * Everything comes already minimised from the server (src/lib/pulmini-vans.functions.ts): children appear as
 * first name + surname initial only for the transport staff; otherwise as team counts or the lock line.
 * No phones, parents, addresses or notes exist in these props. Contacts stay a locked placeholder.
 */
import { ArrowDown, ArrowUp, Lock, MapPin, ShieldCheck, TriangleAlert } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent } from "react";

import { Chip } from "@/components/scd/interior-ui";
import { InternalBadgeImage } from "@/components/scd/InternalBadge";
import { INTERNAL_BADGES } from "@/lib/internal-badges";
import { shortTeam, teamCounts, type PlanRider, type VanId, type VanPlan } from "@/lib/pulmini-vans";
import {
  DAY_SHORT,
  assignmentEmptyText,
  assignmentSummary,
  giroFor,
  minorLabel,
  seatPlanFor,
  seatShortLabel,
  seatsFor,
  vanAlerts,
  vanTabs,
  weekdayOf,
  type FleetFacts,
  type GiroStop,
  type SeatCell,
  type VanSeatPlan,
} from "@/lib/van-plan";

export const CONTACTS_LOCKED_TEXT = "Contatti riservati: visibili solo a chi la Direzione abilita (sezione pulmini-contatti)";

type Tab = "posti" | "giro";

export interface VanPlan2DProps {
  plan: VanPlan;
  fleet: FleetFacts;
  /** Quadro day of the trainings above ("LUNEDÌ"…). */
  day: string;
  /** Rome date (YYYY-MM-DD) for expiry alerts. */
  today: string;
  initialVan?: VanId;
  initialTab?: Tab;
  /** Seat open at first render ("D", "1"…), for deep links and visual QA. */
  initialSeat?: string | null;
}

function stopText(s: { town: string; place: string | null } | null): string | null {
  return s ? `${s.town}${s.place ? ` · ${s.place}` : ""}` : null;
}

function riderLabel(r: PlanRider, named: boolean): string {
  return named && r.name ? (minorLabel(r.name) ?? shortTeam(r.team)) : shortTeam(r.team);
}

// ── Top view ────────────────────────────────────────────────────────────────────────────────────────

const W = 300;
const SEAT_W = 72;
const SEAT_H = 60;
const ROW_GAP = 22;
const FIRST_Y = 78;
const COL_X = [36, 114, 192];

function VanTopView({ seats, named, locked, selected, onSelect, label }: { seats: VanSeatPlan; named: boolean; locked: boolean; selected: string | null; onSelect: (id: string) => void; label: string }) {
  const rows = seats.rows;
  const H = FIRST_Y + rows.length * (SEAT_H + ROW_GAP) + 26;
  const key = (e: KeyboardEvent<SVGGElement>, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id);
    }
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-[340px]" role="group" aria-label={label} data-testid="van-top-view">
      <rect x="0" y="0" width={W} height={H} rx="18" fill="#e9f2fb" />
      {/* body seen from above, front at the top */}
      <rect x="18" y="14" width={W - 36} height={H - 28} rx="34" fill="#ffffff" stroke="#062a52" strokeWidth="3" />
      <path d={`M40 30 Q${W / 2} 8 ${W - 40} 30 L${W - 48} 56 Q${W / 2} 44 48 56 Z`} fill="#d7e9fb" stroke="#062a52" strokeWidth="2.5" />
      <rect x="6" y="54" width="12" height="20" rx="4" fill="#062a52" />
      <rect x={W - 18} y="54" width="12" height="20" rx="4" fill="#062a52" />
      <path d={`M${W / 2 - 10} 24 l10 -8 l10 8`} fill="none" stroke="#F8D000" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {/* sliding door on the right side, between front and middle row */}
      {rows.length > 1 && <rect x={W - 21} y={FIRST_Y + SEAT_H + 2} width="6" height={ROW_GAP + 18} rx="2" fill="#F8D000" />}
      {rows.map((row, ri) => {
        const y = FIRST_Y + ri * (SEAT_H + ROW_GAP);
        return (
          <g key={row.label}>
            <text x="28" y={y - 6} fontFamily="Barlow" fontWeight="700" fontSize="11" fill="#3b5683" letterSpacing="0.06em">
              {row.label.toUpperCase()}
            </text>
            {row.seats.map((s, ci) => (
              <Seat key={s.id} cell={s} x={COL_X[ci] ?? COL_X[0]!} y={y} named={named} locked={locked} selected={selected === s.id} onSelect={onSelect} onKey={key} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function Seat({ cell, x, y, named, locked, selected, onSelect, onKey }: { cell: SeatCell; x: number; y: number; named: boolean; locked: boolean; selected: boolean; onSelect: (id: string) => void; onKey: (e: KeyboardEvent<SVGGElement>, id: string) => void }) {
  const driver = cell.kind === "driver";
  const r = cell.rider;
  const short = r ? (named && r.name ? seatShortLabel(r.name) : shortTeam(r.team)) : null;
  const fill = driver ? "#fff3c4" : r ? "#e6f3fc" : "#ffffff";
  const stroke = selected ? "#F8D000" : driver ? "#f1dc7a" : r ? "#062a52" : "#b9d5ef";
  const aria = driver ? "Posto autista" : `Posto ${cell.id}: ${r ? riderLabel(r, named) : locked ? "riservato" : "libero"}`;
  return (
    <g role="button" tabIndex={0} aria-pressed={selected} aria-label={aria} onClick={() => onSelect(cell.id)} onKeyDown={(e) => onKey(e, cell.id)} className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[#1898d8]" data-seat={cell.id} data-occupied={r ? "1" : "0"}>
      <rect x={x} y={y} width={SEAT_W} height={SEAT_H} rx="12" fill={fill} stroke={stroke} strokeWidth={selected ? 4 : 2} strokeDasharray={!driver && !r ? "5 4" : undefined} />
      <text x={x + 8} y={y + 16} fontFamily="Barlow" fontWeight="800" fontSize="12" fill={driver ? "#7a5200" : "#3b5683"}>
        {driver ? "AUTISTA" : cell.id}
      </text>
      {driver ? (
        <circle cx={x + SEAT_W / 2} cy={y + 38} r="11" fill="none" stroke="#062a52" strokeWidth="3" />
      ) : r ? (
        <text x={x + SEAT_W / 2} y={y + 40} textAnchor="middle" fontFamily="Barlow" fontWeight="700" fontSize="14" fill="#062a52">
          {(short ?? "").slice(0, 9)}
        </text>
      ) : (
        <text x={x + SEAT_W / 2} y={y + 40} textAnchor="middle" fontFamily="Barlow" fontSize="12" fill="#6b84a8">
          {locked ? "riservato" : "libero"}
        </text>
      )}
    </g>
  );
}

// ── Panels ──────────────────────────────────────────────────────────────────────────────────────────

function People({ riders, named, empty }: { riders: PlanRider[]; named: boolean; empty: string }) {
  if (riders.length === 0) return <span className="text-[13.5px] text-[var(--in-sub)]">{empty}</span>;
  if (!named || riders.some((r) => !r.name)) {
    return (
      <span className="flex flex-wrap gap-1">
        {teamCounts(riders).map(([team, n]) => (
          <Chip key={team} tone="mute">
            {shortTeam(team)} · {n}
          </Chip>
        ))}
      </span>
    );
  }
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
      {riders.map((r) => (
        <li key={r.key} className="inline-flex min-h-[28px] items-center gap-1 rounded-full bg-white px-2.5 text-[14px] font-semibold ring-1 ring-[var(--in-line)]">
          {minorLabel(r.name)}
          <span className="text-[12px] font-bold text-[var(--in-sub)]">{shortTeam(r.team)}</span>
        </li>
      ))}
    </ul>
  );
}

function SeatDetail({ seats, seatId, named, dayCode, locked, emptyText }: { seats: VanSeatPlan; seatId: string | null; named: boolean; dayCode: keyof typeof DAY_SHORT; locked: boolean; emptyText: string | null }) {
  const cell = seats.rows.flatMap((r) => r.seats).find((s) => s.id === seatId) ?? null;
  if (!cell) {
    return <p className="m-0 text-[14px] leading-snug text-[var(--in-sub)]">Tocca un posto per vedere chi c'è, dove sale e dove scende.</p>;
  }
  if (cell.kind === "driver") {
    return (
      <div className="grid gap-1" data-testid="seat-detail">
        <p className="m-0 text-[16px] font-bold">Posto autista</p>
        <p className="m-0 text-[14px] leading-snug text-[var(--in-sub)]">Autista da assegnare: nessuna corsa di allenamento registrata per questo pulmino. Lo assegna il responsabile trasporti.</p>
      </div>
    );
  }
  const r = cell.rider;
  if (!r) {
    return (
      <div className="grid gap-1" data-testid="seat-detail">
        <p className="m-0 text-[16px] font-bold">Posto {cell.id}{locked ? "" : " · libero"}</p>
        <p className="m-0 text-[14px] leading-snug text-[var(--in-sub)]">{locked ? "Chi siede qui è riservato al personale dei trasporti." : (emptyText ?? "Nessun ragazzo con questo posto fisso nel Master Flotta.")}</p>
      </div>
    );
  }
  const today = r.days[dayCode];
  return (
    <div className="grid gap-2" data-testid="seat-detail">
      <p className="m-0 text-[16px] font-bold">
        Posto {cell.id} · {riderLabel(r, named)}
        <span className="ml-1.5 text-[13px] font-bold text-[var(--in-sub)]">{shortTeam(r.team)}</span>
      </p>
      <dl className="m-0 grid gap-1.5 text-[14px]">
        <div className="flex items-start gap-2">
          <dt className="flex flex-none items-center gap-1 whitespace-nowrap font-bold text-[var(--in-ok)]">
            <ArrowUp className="size-4" strokeWidth={2.4} aria-hidden="true" />
            Sale a
          </dt>
          <dd className="m-0">{stopText(r.up) ?? "fermata non registrata"}{r.up?.eta ? ` · ${r.up.eta}` : r.up ? " · orario non nel Master" : ""}</dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="flex flex-none items-center gap-1 whitespace-nowrap font-bold text-[var(--in-info)]">
            <ArrowDown className="size-4" strokeWidth={2.4} aria-hidden="true" />
            Scende a
          </dt>
          <dd className="m-0">{stopText(r.down) ?? "fermata non registrata"}{r.down ? " · orario non nel Master" : ""}</dd>
        </div>
      </dl>
      <p className="m-0 text-[13px] text-[var(--in-sub)]">
        {DAY_SHORT[dayCode]}: andata {today.out === "no" ? "no" : today.out === "ask" ? "da confermare" : "sì"}, ritorno {today.back === "no" ? "no" : today.back === "ask" ? "da confermare" : "sì"}
      </p>
    </div>
  );
}

function GiroView({ stops, named, locked, giro }: { stops: GiroStop[]; named: boolean; locked: boolean; giro: ReturnType<typeof giroFor> }) {
  return (
    <div className="grid gap-3" data-testid="van-giro">
      {stops.length === 0 ? (
        <p className="m-0 rounded-xl border border-dashed border-[var(--in-line)] px-3 py-2.5 text-[14px] text-[var(--in-sub)]">{giro.note}</p>
      ) : (
        <ol className="relative m-0 list-none rounded-2xl bg-[#e9f2fb] p-3" aria-label="Giro del pulmino">
          <span aria-hidden="true" className="absolute bottom-6 left-[27px] top-6 w-[3px] rounded-full bg-[#062a52] opacity-30" />
          {stops.map((s) => (
            <li key={`${s.town}-${s.index}`} className="relative grid grid-cols-[30px_minmax(0,1fr)] gap-2.5 py-2" data-testid="giro-stop">
              <span aria-hidden="true" className="relative z-[1] grid size-[30px] place-items-center rounded-full border-[3px] border-[#062a52] bg-white text-[12px] font-black text-[#062a52]">
                {s.index + 1}
              </span>
              <div className="min-w-0 rounded-xl border border-[#b9d5ef] bg-white px-3 py-2">
                <p className="m-0 flex flex-wrap items-baseline justify-between gap-x-2 text-[15px] leading-tight">
                  <span>
                    <b>{s.town}</b>
                    {s.place && <span className="text-[var(--in-sub)]"> · {s.place}</span>}
                  </span>
                  <span className={`text-[13px] font-bold tabular-nums ${s.eta ? "text-[#062a52]" : "text-[var(--in-sub)]"}`}>{s.eta ?? "orario non nel Master"}</span>
                </p>
                {locked ? null : (
                  <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-0.5 text-[13px] font-extrabold text-[var(--in-ok)]">
                        <ArrowUp className="size-3.5" strokeWidth={2.6} aria-hidden="true" />
                        Salgono {s.up.length}
                      </span>
                      {s.up.length > 0 && <People riders={s.up} named={named} empty="" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-0.5 text-[13px] font-extrabold text-[var(--in-info)]">
                        <ArrowDown className="size-3.5" strokeWidth={2.6} aria-hidden="true" />
                        Scendono {s.down.length}
                      </span>
                      {s.down.length > 0 && <People riders={s.down} named={named} empty="" />}
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
          <li className="relative grid grid-cols-[30px_minmax(0,1fr)] items-center gap-2.5 py-2">
            <span aria-hidden="true" className="relative z-[1] grid size-[30px] place-items-center rounded-full bg-[#F8D000] text-[#062a52]">
              <MapPin className="size-4" strokeWidth={2.4} />
            </span>
            <span className="text-[15px] font-bold">Colico · {giro.destination}</span>
          </li>
        </ol>
      )}
      <p className={`m-0 text-[13px] leading-snug ${giro.source === "board" ? "font-semibold text-[var(--in-warn)]" : "text-[var(--in-sub)]"}`}>{giro.note}</p>
      {locked ? (
        <p className="m-0 flex items-start gap-2 rounded-xl bg-[#f5f9ff] px-3 py-2.5 text-[14px] leading-snug text-[var(--in-sub)]">
          <Lock className="mt-[2px] size-4 flex-none" strokeWidth={2} aria-hidden="true" />
          Chi sale e chi scende a ogni fermata è riservato al personale dei trasporti.
        </p>
      ) : (giro.noStopUp.length > 0 || giro.noStopDown.length > 0) ? (
        <div className="grid gap-1.5 rounded-xl border border-dashed border-[#e3b65c] bg-[var(--in-warn-bg)] px-3 py-2.5" data-testid="giro-nostop">
          <p className="m-0 text-[14px] font-bold text-[var(--in-warn)]">Senza fermata registrata nel Master</p>
          {giro.noStopUp.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <span className="font-bold">▲ andata {giro.noStopUp.length}</span>
              <People riders={giro.noStopUp} named={named} empty="" />
            </div>
          )}
          {giro.noStopDown.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <span className="font-bold">▼ ritorno {giro.noStopDown.length}</span>
              <People riders={giro.noStopDown} named={named} empty="" />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Contacts of the age group: no permission-checked server function returns them today, so nothing is fetched. */
export function VanContactsLocked() {
  return (
    <section className="rounded-2xl border border-[var(--in-line)] bg-[#f5f9ff] px-3.5 py-3" aria-label="Contatti del pulmino" data-testid="van-contacts-locked">
      <p className="m-0 flex items-start gap-2 text-[14.5px] font-bold leading-snug">
        <Lock className="mt-[2px] size-4 flex-none text-[var(--in-info)]" strokeWidth={2.2} aria-hidden="true" />
        {CONTACTS_LOCKED_TEXT}
      </p>
      <p className="m-0 mt-1 pl-6 text-[13px] leading-snug text-[var(--in-sub)]">Genitori o tutori, mister e dirigente dell'annata, responsabile trasporti. Mai il telefono dei ragazzi.</p>
    </section>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────────────────────────────

export function VanPlan2D({ plan, fleet, day, today, initialVan = "p1", initialTab = "posti", initialSeat = null }: VanPlan2DProps) {
  const uid = useId();
  const [van, setVan] = useState<VanId>(initialVan);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [seat, setSeat] = useState<string | null>(initialSeat);
  const dayCode = weekdayOf(day);
  const locked = plan.mode === "locked";
  const named = plan.mode === "names";
  const tabs = useMemo(() => vanTabs(fleet), [fleet]);
  const detail = plan.vans.find((v) => v.id === van) ?? plan.vans[0]!;
  const vehicle = tabs.find((t) => t.id === detail.id)?.vehicle ?? null;
  const layout = seatsFor(vehicle);
  const seats = useMemo(() => seatPlanFor(detail.id, locked ? [] : detail.regulars, layout), [detail, layout, locked]);
  const giro = useMemo(() => giroFor(detail, dayCode), [detail, dayCode]);
  const alerts = useMemo(() => vanAlerts({ plan, fleet, today }).filter((a) => a.van === null || a.van === detail.id), [plan, fleet, today, detail.id]);
  const summary = assignmentSummary(plan);
  const emptyText = assignmentEmptyText(plan);
  const onLineNoVan = detail.regulars.filter((r) => r.assigned !== detail.id);
  const pickVan = (id: VanId) => {
    setVan(id);
    setSeat(null);
  };

  return (
    <div className="grid gap-3" data-testid="van-plan-2d" data-van={detail.id} data-tab={tab}>
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Pulmino">
        {tabs.map((t) => {
          const on = t.id === detail.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => pickVan(t.id)}
              className={`scd-focus flex min-h-[48px] flex-none items-center gap-2 rounded-xl border px-2 pr-3 text-left text-[14px] font-bold ${on ? "border-[#062a52] bg-[#062a52] text-white" : "border-[var(--in-line)] bg-white text-[var(--in-ink)]"}`}
              data-testid="van-tab"
              data-van={t.id}
            >
              <InternalBadgeImage badge={INTERNAL_BADGES[plan.vans.find((v) => v.id === t.id)!.badge]} size={34} />
              <span className="leading-tight">
                {t.label.replace("Pulmino ", "P")}
                <span className={`block text-[12px] font-semibold ${on ? "text-[#cfe0ff]" : "text-[var(--in-sub)]"}`}>{t.line}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-[10px] bg-[var(--in-info-bg)] p-1" role="tablist" aria-label="Vista">
          {(["posti", "giro"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} aria-controls={`${uid}-${t}`} onClick={() => setTab(t)} className={`h-9 rounded-[8px] px-3.5 text-[14px] font-bold ${tab === t ? "bg-white text-[var(--in-ink)] shadow-sm" : "text-[var(--in-info)]"}`} data-testid={`van-view-${t}`}>
              {t === "posti" ? "Posti" : `Giro di ${DAY_SHORT[dayCode]}`}
            </button>
          ))}
        </div>
        <span className="flex flex-wrap gap-1.5">
          <Chip tone={layout.source === "master" ? "ok" : "warn"}>{layout.source === "master" ? `${layout.passengerSeats} posti + autista` : "disposizione indicativa"}</Chip>
          {!locked && <Chip tone={summary.assigned === 0 ? "warn" : "info"}>assegnati {summary.assigned} su {summary.active}</Chip>}
        </span>
      </div>

      {alerts.length > 0 && (
        <ul className="m-0 grid list-none gap-1 p-0" aria-label="Avvisi" data-testid="van-alerts">
          {alerts.map((a) => (
            <li key={a.id} className={`flex items-start gap-2 rounded-xl px-3 py-2 text-[13.5px] leading-snug ${a.tone === "crit" ? "bg-[var(--in-crit-bg)] text-[var(--in-crit)]" : "bg-[var(--in-warn-bg)] text-[var(--in-warn)]"}`} data-tone={a.tone}>
              <TriangleAlert className="mt-[1px] size-4 flex-none" strokeWidth={2} aria-hidden="true" />
              {a.text}
            </li>
          ))}
        </ul>
      )}

      {tab === "posti" ? (
        <div id={`${uid}-posti`} role="tabpanel" className="grid gap-3 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:items-start">
          <figure className="m-0">
            <VanTopView seats={seats} named={named} locked={locked} selected={seat} onSelect={setSeat} label={`${detail.label} ${detail.line} visto dall'alto: autista e ${layout.passengerSeats} posti`} />
            <figcaption className={`mt-1.5 text-[12.5px] leading-snug ${layout.source === "indicative" ? "font-semibold text-[var(--in-warn)]" : "text-[var(--in-sub)]"}`}>
              {vehicle ? `${vehicle.label}${vehicle.plate ? ` · ${vehicle.plate}` : " · targa da confermare"}. ` : "Mezzo non ancora collegato nel Master Flotta. "}
              {layout.note}
            </figcaption>
          </figure>
          <div className="grid gap-3">
            <div className="rounded-2xl border border-[var(--in-line)] bg-white px-3.5 py-3">
              <SeatDetail seats={seats} seatId={seat} named={named} dayCode={dayCode} locked={locked} emptyText={emptyText} />
            </div>
            {locked ? (
              <p className="m-0 flex items-start gap-2 rounded-xl bg-[#f5f9ff] px-3 py-2.5 text-[14px] leading-snug text-[var(--in-sub)]" data-testid="van-plan-locked">
                <Lock className="mt-[2px] size-4 flex-none" strokeWidth={2} aria-hidden="true" />
                <span>Chi siede sul pulmino è riservato. {plan.namesNote}</span>
              </p>
            ) : seats.aboard.length === 0 ? (
              <p className="m-0 rounded-xl border border-dashed border-[#e3b65c] bg-[var(--in-warn-bg)] px-3 py-2.5 text-[14px] font-semibold leading-snug text-[var(--in-warn)]" data-testid="van-plan-empty">
                {emptyText ?? `Nessun ragazzo assegnato a ${detail.label} nel Master Flotta.`}
              </p>
            ) : null}
            {!locked && seats.noFixedSeat.length > 0 && (
              <div className="grid gap-1.5">
                <p className="m-0 text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-[var(--in-sub)]">A bordo, posto non fissato · {seats.noFixedSeat.length}</p>
                <People riders={seats.noFixedSeat} named={named} empty="" />
              </div>
            )}
            {!locked && onLineNoVan.length > 0 && (
              <div className="grid gap-1.5" data-testid="van-to-place">
                <p className="m-0 text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-[var(--in-sub)]">Da collocare · sulla linea {detail.line}, senza pulmino nel Master · {onLineNoVan.length}</p>
                <People riders={onLineNoVan} named={named} empty="" />
              </div>
            )}
            <VanContactsLocked />
          </div>
        </div>
      ) : (
        <div id={`${uid}-giro`} role="tabpanel">
          <GiroView stops={giro.stops} named={named} locked={locked} giro={giro} />
        </div>
      )}

      <p className="m-0 flex items-start gap-2 text-[12.5px] leading-snug text-[var(--in-sub)]">
        <ShieldCheck className="mt-[1px] size-4 flex-none text-[var(--in-info)]" strokeWidth={1.8} aria-hidden="true" />
        Ragazzi solo con nome e iniziale del cognome, solo per il personale dei trasporti. Fermate solo tra quelle registrate della linea. Niente telefoni, genitori o indirizzi.
      </p>
    </div>
  );
}

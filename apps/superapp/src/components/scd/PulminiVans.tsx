/**
 * Vans under the trainings (UD-108). Each van is a separate unit with its badge (Pulmino 1 Lago, 2 Lecco,
 * 3 Valtellina, 4 Chiavenna); tapping it opens who is always on board, where it goes and its route.
 * Children appear by name only for the transport staff (names come already minimised from the server);
 * everyone else sees counts by team and the lock line. No phones, parents, addresses or notes exist here.
 */
import { Bus, ChevronRight, Lock, MapPin, ShieldCheck, Users } from "lucide-react";

import { Chip } from "@/components/scd/interior-ui";
import { InternalBadgeImage } from "@/components/scd/InternalBadge";
import { INTERNAL_BADGES } from "@/lib/internal-badges";
import {
  DAY_LABEL,
  QUADRO_DAY_CODE,
  WEEKDAY_CODES,
  shortTeam,
  teamCounts,
  type PlanRider,
  type PlanSlot,
  type RideFlag,
  type SlotVan,
  type VanDetail,
  type VanId,
  type VanPlan,
} from "@/lib/pulmini-vans";

function Names({ riders, mode }: { riders: PlanRider[]; mode: VanPlan["mode"] }) {
  if (riders.length === 0) return <span className="text-[13.5px] text-[var(--in-sub)]">nessuno</span>;
  const named = mode === "names" && riders.every((r) => r.name);
  if (!named) {
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
    <ul className="m-0 flex list-none flex-wrap gap-1 p-0" data-testid="van-names">
      {riders.map((r) => (
        <li key={r.key} className="inline-flex min-h-[28px] items-center gap-1 rounded-full bg-white px-2.5 text-[14px] font-semibold ring-1 ring-[var(--in-line)]">
          {r.name}
          <span className="text-[12px] font-bold text-[var(--in-sub)]">{shortTeam(r.team)}</span>
          {r.provisional && <span className="text-[12px] font-bold text-[var(--in-warn)]">prov.</span>}
        </li>
      ))}
    </ul>
  );
}

function asked(riders: PlanRider[], day: string, way: "out" | "back"): boolean {
  const d = QUADRO_DAY_CODE[day];
  return Boolean(d) && riders.some((r) => r.days[d!][way] === "ask");
}

/** One van of a training slot: a button that opens the van detail. */
export function SlotVanCard({ sv, van, day, mode, onOpen }: { sv: SlotVan; van: VanDetail; day: string; mode: VanPlan["mode"]; onOpen: (id: VanId) => void }) {
  const badge = INTERNAL_BADGES[van.badge];
  const toConfirm = asked(sv.out, day, "out") || asked(sv.back, day, "back");
  return (
    <button
      type="button"
      onClick={() => onOpen(van.id)}
      className="scd-focus group grid w-full gap-2.5 rounded-2xl border border-[var(--in-line)] bg-[#f5f9ff] p-3 text-left transition-colors hover:border-[var(--in-info)]"
      aria-label={`${van.label} ${van.line}: apri chi c'è a bordo, destinazione e percorso`}
      data-testid="slot-van"
      data-van={van.id}
    >
      <span className="flex items-center gap-3">
        <InternalBadgeImage badge={badge} size={48} />
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-bold leading-tight">
            {van.label} · {van.line}
          </span>
          <span className="block text-[13px] leading-snug text-[var(--in-sub)]">
            Verso {van.destination} · partenza: orario non nel Master
          </span>
        </span>
        <ChevronRight className="size-5 flex-none text-[var(--in-sub)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
      <span className="grid gap-1.5 sm:grid-cols-[86px_minmax(0,1fr)] sm:items-start">
        <span className="text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-[var(--in-sub)]">Andata · {sv.out.length}</span>
        <Names riders={sv.out} mode={mode} />
        <span className="text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-[var(--in-sub)]">Ritorno · {sv.back.length}</span>
        <Names riders={sv.back} mode={mode} />
      </span>
      {(toConfirm || sv.overCapacity) && (
        <span className="flex flex-wrap gap-1.5">
          {toConfirm && <Chip tone="warn">richiesta nel Master: da confermare</Chip>}
          {sv.overCapacity && <Chip tone="crit">oltre {van.seats} posti: serve un secondo giro</Chip>}
        </span>
      )}
    </button>
  );
}

/** What goes under one training slot: its vans, riders still to place, or the lock line. */
export function SlotVans({ slot, plan, onOpen }: { slot: PlanSlot; plan: VanPlan; onOpen: (id: VanId) => void }) {
  if (plan.mode === "locked") {
    if (!slot.youth) return null;
    return (
      <p className="m-0 flex items-start gap-2 rounded-2xl bg-[#f5f9ff] px-3 py-2.5 text-[14px] leading-snug text-[var(--in-sub)]" data-testid="slot-locked">
        <Lock className="mt-[2px] size-4 flex-none" strokeWidth={2} aria-hidden="true" />
        <span>Pulmini e ragazzi di questa fascia: riservati. {plan.namesNote}</span>
      </p>
    );
  }
  if (slot.vans.length === 0 && slot.unplaced.length === 0) return null;
  const vanById = new Map(plan.vans.map((v) => [v.id, v]));
  return (
    <div className="grid gap-3">
      {slot.vans.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {slot.vans.map((sv) => (
            <SlotVanCard key={sv.van} sv={sv} van={vanById.get(sv.van)!} day={slot.day} mode={plan.mode} onOpen={onOpen} />
          ))}
        </div>
      )}
      {slot.unplaced.map((u) => (
        <div key={u.reason} className="grid gap-1.5 rounded-2xl border border-dashed border-[#e3b65c] bg-[var(--in-warn-bg)] px-3 py-2.5" data-testid="slot-unplaced">
          <span className="flex items-start gap-2 text-[14px] font-bold leading-snug text-[var(--in-warn)]">
            <Bus className="mt-[2px] size-4 flex-none" strokeWidth={2} aria-hidden="true" />
            Da collocare su un pulmino · {u.riders.length}
          </span>
          <span className="text-[13px] leading-snug text-[var(--in-sub)]">{u.reason}</span>
          <Names riders={u.riders} mode={plan.mode} />
        </div>
      ))}
    </div>
  );
}

const FLAG_TEXT: Record<RideFlag, string> = { yes: "sì", ask: "da confermare", no: "no" };

function DayFlags({ r }: { r: PlanRider }) {
  return (
    <span className="flex flex-wrap gap-1">
      {WEEKDAY_CODES.filter((d) => r.days[d].out !== "no" || r.days[d].back !== "no").map((d) => {
        const { out, back } = r.days[d];
        const ask = out === "ask" || back === "ask";
        const ways = [out !== "no" ? "A" : "", back !== "no" ? "R" : ""].filter(Boolean).join("/");
        return (
          <span
            key={d}
            title={`${DAY_LABEL[d]}: andata ${FLAG_TEXT[out]}, ritorno ${FLAG_TEXT[back]}`}
            className={`inline-flex h-6 items-center rounded-md px-1.5 text-[12px] font-bold ${ask ? "bg-[var(--in-warn-bg)] text-[var(--in-warn)]" : "bg-[var(--in-ok-bg)] text-[var(--in-ok)]"}`}
          >
            {DAY_LABEL[d]} {ways}
          </span>
        );
      })}
    </span>
  );
}

/** Schematic route: ordered stops on a vertical line ending at the destination (no external map). */
export function RouteLine({ van }: { van: VanDetail }) {
  const { route } = van;
  return (
    <div>
      {route.stops.length === 0 ? (
        <p className="m-0 rounded-xl border border-dashed border-[var(--in-line)] px-3 py-2.5 text-[14px] text-[var(--in-sub)]">{route.note}</p>
      ) : (
        <>
          <ol className="relative m-0 list-none p-0" aria-label={`Percorso ${van.label}`} data-testid="van-route">
            <span aria-hidden="true" className="absolute bottom-3 left-[11px] top-3 w-[3px] rounded-full bg-[var(--in-info)] opacity-40" />
            {route.stops.map((s, i) => (
              <li key={`${s.town}-${i}`} className="relative grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2.5 py-1.5">
                <span aria-hidden="true" className="relative z-[1] grid size-6 place-items-center rounded-full border-[3px] border-[var(--in-info)] bg-white text-[11px] font-black text-[var(--in-info)]">
                  {i + 1}
                </span>
                <span className="min-w-0 text-[14.5px] leading-tight">
                  <span className="font-bold">{s.town}</span>
                  {s.place && <span className="text-[var(--in-sub)]"> · {s.place}</span>}
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-[var(--in-sub)]">{s.eta ?? "—"}</span>
              </li>
            ))}
            <li className="relative grid grid-cols-[24px_minmax(0,1fr)] items-center gap-2.5 py-1.5">
              <span aria-hidden="true" className="relative z-[1] grid size-6 place-items-center rounded-full bg-[var(--in-ink)] text-white">
                <MapPin className="size-3.5" strokeWidth={2.4} />
              </span>
              <span className="text-[14.5px] font-bold leading-tight">Colico · {van.destination}</span>
            </li>
          </ol>
          <p className={`m-0 mt-1.5 text-[13px] leading-snug ${route.source === "board" ? "font-semibold text-[var(--in-warn)]" : "text-[var(--in-sub)]"}`}>{route.note}</p>
        </>
      )}
    </div>
  );
}

/** Content of the van sheet: who is always on board, destination, route, driver role and seats. */
export function VanDetailPanel({ van, plan }: { van: VanDetail; plan: VanPlan }) {
  const badge = INTERNAL_BADGES[van.badge];
  const named = plan.mode === "names";
  return (
    <div className="mt-3 grid max-h-[72vh] gap-4 overflow-y-auto pr-1" data-testid="van-detail" data-van={van.id}>
      <div className="flex items-center gap-3">
        <InternalBadgeImage badge={badge} size={72} />
        <dl className="m-0 grid flex-1 grid-cols-2 gap-1.5 text-[13.5px]">
          <div className="rounded-lg bg-[var(--in-info-bg)] px-2.5 py-1.5">
            <dt className="text-[12px] text-[var(--in-sub)]">Dove va</dt>
            <dd className="m-0 font-bold leading-tight">{van.destination}</dd>
          </div>
          <div className="rounded-lg bg-[var(--in-info-bg)] px-2.5 py-1.5">
            <dt className="text-[12px] text-[var(--in-sub)]">Posti</dt>
            <dd className="m-0 font-bold leading-tight">max {van.seats} + autista</dd>
          </div>
          <div className="col-span-2 rounded-lg bg-[var(--in-info-bg)] px-2.5 py-1.5">
            <dt className="text-[12px] text-[var(--in-sub)]">Autista</dt>
            <dd className="m-0 font-bold leading-tight">Autista volontario del club, assegnato dal Responsabile servizio pulmini</dd>
          </div>
        </dl>
      </div>

      <section aria-labelledby={`van-${van.id}-who`}>
        <h3 id={`van-${van.id}-who`} className="m-0 mb-1.5 flex items-center gap-2 text-[15px] font-bold">
          <Users className="size-4 text-[var(--in-info)]" strokeWidth={2} aria-hidden="true" />
          Chi c'è sempre · {plan.mode === "locked" ? (van.lineShared ? "—" : (van.lineUsers ?? "—")) : van.regulars.length}
        </h3>
        {plan.mode === "locked" ? (
          <p className="m-0 flex items-start gap-2 rounded-xl bg-[#f5f9ff] px-3 py-2.5 text-[14px] leading-snug text-[var(--in-sub)]">
            <Lock className="mt-[2px] size-4 flex-none" strokeWidth={2} aria-hidden="true" />
            <span>
              {van.lineUsers == null
                ? "La linea del Master non corrisponde ancora a questo pulmino. "
                : van.lineShared
                  ? `${van.lineUsers} utenti sulla linea comune LAGO/LECCO del Master, da dividere tra Pulmino 1 e 2. `
                  : `${van.lineUsers} utenti registrati su questa linea nel Master Pulmini. `}
              {plan.namesNote}
            </span>
          </p>
        ) : van.regulars.length === 0 ? (
          <p className="m-0 rounded-xl border border-dashed border-[var(--in-line)] px-3 py-2.5 text-[14px] text-[var(--in-sub)]">
            Nessun ragazzo collocato su questo pulmino: {van.id === "p1" || van.id === "p2" ? "il Master ha ancora la linea unica LAGO/LECCO." : "nessuna richiesta nel Master per questa linea."}
          </p>
        ) : named ? (
          <ul className="m-0 grid list-none gap-1.5 p-0" data-testid="van-regulars">
            {van.regulars.map((r) => (
              <li key={r.key} className="grid gap-1 rounded-xl border border-[var(--in-line)] px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <span className="text-[15px] font-bold leading-tight">
                  {r.name}
                  <span className="ml-1.5 text-[12.5px] font-bold text-[var(--in-sub)]">{shortTeam(r.team)}</span>
                  {r.provisional && <span className="ml-1.5 text-[12.5px] font-bold text-[var(--in-warn)]">provvisorio</span>}
                </span>
                <DayFlags r={r} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid gap-1.5">
            <Names riders={van.regulars} mode={plan.mode} />
            {plan.namesNote && <p className="m-0 text-[13px] leading-snug text-[var(--in-sub)]">{plan.namesNote}</p>}
          </div>
        )}
      </section>

      <section aria-labelledby={`van-${van.id}-route`}>
        <h3 id={`van-${van.id}-route`} className="m-0 mb-1.5 flex items-center gap-2 text-[15px] font-bold">
          <MapPin className="size-4 text-[var(--in-info)]" strokeWidth={2} aria-hidden="true" />
          Che percorso fa
        </h3>
        <RouteLine van={van} />
      </section>

      <p className="m-0 flex items-start gap-2 text-[12.5px] leading-snug text-[var(--in-sub)]">
        <ShieldCheck className="mt-[1px] size-4 flex-none text-[var(--in-info)]" strokeWidth={1.8} aria-hidden="true" />
        Solo nome e iniziale del cognome, solo per il personale dei trasporti. Niente telefoni, genitori o indirizzi.
      </p>
    </div>
  );
}

/** The four vans as separate units ("la divisione linea resta"), each opening its detail. */
export function VanLines({ plan, onOpen }: { plan: VanPlan; onOpen: (id: VanId) => void }) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-1" data-testid="van-lines">
      {plan.vans.map((v) => {
        const n = plan.mode === "locked" ? v.lineUsers : v.regulars.length;
        return (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onOpen(v.id)}
              className="scd-focus flex min-h-[64px] w-full items-center gap-3 rounded-xl border border-[var(--in-line)] bg-white px-2.5 py-2 text-left hover:border-[var(--in-info)]"
              data-testid="van-line"
              data-van={v.id}
            >
              <InternalBadgeImage badge={INTERNAL_BADGES[v.badge]} size={48} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold leading-tight">
                  {v.label} · {v.line}
                </span>
                <span className="block text-[13px] leading-snug text-[var(--in-sub)]">
                  {v.route.stops.length ? `${v.route.stops.length} fermate` : "percorso da definire"} · {n == null ? "nessuna linea nel Master" : plan.mode === "locked" ? `${n} utenti sulla linea${v.lineShared ? " comune LAGO/LECCO" : ""}` : `${n} ${n === 1 ? "ragazzo" : "ragazzi"}`}
                </span>
              </span>
              <ChevronRight className="size-5 flex-none text-[var(--in-sub)]" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The 26 platforms of the gestionale (SCD_COMANDI_PERMANENTI §1): the hub grouped by the 5 sectors and the shared
 * layout of the starter pages. Data from src/lib/piattaforme.ts only; every link goes to an existing route.
 * Palette: interior `--in-*` (blue, light blue, yellow action, white). 390 px first.
 */
import { Link } from "@tanstack/react-router";
import {
  Apple,
  ArrowLeft,
  BadgePercent,
  BarChart3,
  Building2,
  Bus,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clapperboard,
  Coffee,
  Dumbbell,
  FileSearch,
  Gift,
  Handshake,
  HeartHandshake,
  Lightbulb,
  Medal,
  Newspaper,
  Package,
  Puzzle,
  Repeat,
  Search,
  Shirt,
  Stethoscope,
  Trophy,
  UserRound,
  UserSearch,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";

import {
  AUDIENCES,
  HUB_PATH,
  PLATFORMS,
  STATUS_LABEL,
  agentLabel,
  bySector,
  filterPlatforms,
  sectorOf,
  type AppPath,
  type AudienceId,
  type Platform,
  type PlatformIcon,
  type PlatformStatus,
} from "@/lib/piattaforme";
import { Card, Chip, SourceLine, type ChipTone } from "./interior-ui";

export const PLATFORM_ICON: Record<PlatformIcon, LucideIcon> = {
  bus: Bus,
  wallet: Wallet,
  clipboard: ClipboardList,
  handshake: Handshake,
  trophy: Trophy,
  stethoscope: Stethoscope,
  coffee: Coffee,
  dumbbell: Dumbbell,
  building: Building2,
  calendar: CalendarDays,
  repeat: Repeat,
  apple: Apple,
  clapperboard: Clapperboard,
  user: UserRound,
  medal: Medal,
  puzzle: Puzzle,
  "search-user": UserSearch,
  newspaper: Newspaper,
  percent: BadgePercent,
  shirt: Shirt,
  package: Package,
  chart: BarChart3,
  "file-search": FileSearch,
  heart: HeartHandshake,
  gift: Gift,
  lightbulb: Lightbulb,
};

const STATUS_TONE: Record<PlatformStatus, ChipTone> = {
  live: "info",
  parziale: "warn",
  "in-costruzione": "mute",
};

export function StatusChip({ status }: { status: PlatformStatus }) {
  return <Chip tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Chip>;
}

function PlatformBadge({ p }: { p: Platform }) {
  const Icon = PLATFORM_ICON[p.icon];
  return (
    <span className="relative flex size-11 flex-none items-center justify-center rounded-xl bg-[var(--in-info-bg)] text-[var(--in-info)]">
      <Icon className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
      <span className="absolute -bottom-1 -right-1 rounded-md bg-[var(--in-rail)] px-1 text-[11px] font-bold leading-[16px] text-white">
        {p.id}
      </span>
    </span>
  );
}

function PlatformRow({ p }: { p: Platform }) {
  return (
    <li className="flex items-start gap-3 border-t border-[var(--in-line)] px-4 py-3.5 first:border-t-0 sm:px-[18px]" data-platform={p.id}>
      <PlatformBadge p={p} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <b className="text-[15.5px] leading-snug">{p.name}</b>
          <StatusChip status={p.status} />
        </div>
        <p className="m-0 mt-0.5 text-[13.5px] leading-snug text-[var(--in-sub)]">{p.purpose}</p>
      </div>
      <Link
        to={p.route}
        aria-label={`Apri ${p.name}`}
        className="scd-focus inline-flex h-11 flex-none items-center gap-1 self-center rounded-[10px] border border-[#b9d5ef] bg-white px-3 text-[14.5px] font-semibold text-[var(--in-info)] hover:bg-[var(--in-info-bg)]"
      >
        Apri
        <ChevronRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
      </Link>
    </li>
  );
}

/** Hub /gestionale/piattaforme: search, role filter, 5 sector groups. */
export function PlatformHub() {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<AudienceId | null>(null);
  const searchId = useId();
  const list = useMemo(() => filterPlatforms(query, audience), [query, audience]);
  const groups = useMemo(() => bySector(list), [list]);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--in-line)] bg-white p-3 shadow-[var(--in-card-shadow)] sm:p-4">
        <label htmlFor={searchId} className="sr-only">
          Cerca una piattaforma
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-[var(--in-sub)]" strokeWidth={2} aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca: pulmini, bandi, 22…"
            className="scd-focus h-11 w-full rounded-[10px] border border-[#b9d5ef] bg-white pl-10 pr-3 text-[16px] text-[var(--in-ink)] placeholder:text-[var(--in-sub)]"
          />
        </div>
        <div role="group" aria-label="Filtra per ruolo" className="flex flex-wrap gap-2">
          {[{ id: null, label: "Tutti" } as const, ...AUDIENCES].map((a) => {
            const on = audience === a.id;
            return (
              <button
                key={a.id ?? "tutti"}
                type="button"
                aria-pressed={on}
                onClick={() => setAudience(a.id)}
                className={`scd-focus h-10 whitespace-nowrap rounded-full border px-3.5 text-[14px] font-semibold transition-colors ${
                  on ? "border-[var(--in-rail)] bg-[var(--in-rail)] text-white" : "border-[#b9d5ef] bg-white text-[var(--in-info)] hover:bg-[var(--in-info-bg)]"
                }`}
              >
                {a.label}
              </button>
            );
          })}
        </div>
        <p className="m-0 text-[13px] text-[var(--in-sub)]" aria-live="polite">
          {list.length === PLATFORMS.length ? `${list.length} piattaforme` : `${list.length} di ${PLATFORMS.length} piattaforme`}
          {audience ? " · il filtro mostra dove lavora il ruolo; l'accesso lo decide il login" : ""}
        </p>
      </div>

      {groups.length === 0 && (
        <Card>
          <p className="m-0 px-4 py-5 text-[15px] text-[var(--in-sub)]">Nessuna piattaforma con questi filtri.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-2">
        {groups.map(({ sector, items }) => (
          <Card
            key={sector.id}
            id={`settore-${sector.id}`}
            className="xl:self-start"
            title={sector.label}
            sub={`Coordina il settore: ${agentLabel(sector.director)}`}
            aside={<Chip tone="info">{items.length}</Chip>}
          >
            <ul className="m-0 list-none border-t border-[var(--in-line)] p-0">
              {items.map((p) => (
                <PlatformRow key={p.id} p={p} />
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ActionRow({ label, to }: { label: string; to: AppPath }) {
  return (
    <li className="border-t border-[var(--in-line)] first:border-t-0">
      <Link
        to={to}
        className="scd-focus flex min-h-12 items-center gap-3 px-4 py-2.5 text-[15px] font-semibold text-[var(--in-info)] hover:bg-[var(--in-info-bg)] sm:px-[18px]"
      >
        <span className="min-w-0 flex-1">{label}</span>
        <ChevronRight className="size-[18px] flex-none" strokeWidth={2.2} aria-hidden="true" />
      </Link>
    </li>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-[var(--in-line)] px-4 py-2.5 first:border-t-0 sm:px-[18px]">
      <dt className="text-[13px] font-semibold text-[var(--in-sub)]">{label}</dt>
      <dd className="m-0 mt-0.5 text-[15px] leading-snug">{children}</dd>
    </div>
  );
}

/** Shared layout of every starter page (platforms with no page before 17/10/2026). */
export function PlatformStarter({ p }: { p: Platform }) {
  const sector = sectorOf(p.sector);
  const s = p.starter;
  const Icon = PLATFORM_ICON[p.icon];
  return (
    <div className="flex flex-col gap-[18px]">
      <Link to={HUB_PATH} className="scd-focus inline-flex w-fit items-center gap-1.5 text-[14.5px] font-semibold text-[var(--in-info)] underline-offset-4 hover:underline">
        <ArrowLeft className="size-4" strokeWidth={2.2} aria-hidden="true" />
        Tutte le 26 piattaforme
      </Link>

      <section aria-labelledby="piattaforma-scopo" className="flex flex-wrap items-center gap-4 rounded-2xl bg-[var(--in-rail)] px-4 py-4 text-white shadow-[var(--in-card-shadow)] sm:flex-nowrap sm:px-6">
        <span className="flex size-12 flex-none items-center justify-center rounded-xl bg-[var(--in-action)] text-[var(--in-ink)]">
          <Icon className="size-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 basis-[calc(100%-4rem)] sm:basis-auto">
          <p className="m-0 text-[13px] font-semibold text-[#d6ebfb]">
            Piattaforma {p.id} · {sector.label}
          </p>
          <h2 id="piattaforma-scopo" className="m-0 mt-1 text-[17px] font-bold leading-snug text-white">
            {p.purpose}
          </h2>
        </div>
        <span className="ml-16 inline-flex h-8 flex-none items-center rounded-full bg-white/14 px-3 text-[13px] font-semibold sm:ml-0">{STATUS_LABEL[p.status]}</span>
      </section>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="oggi" title="Cosa puoi fare oggi" sub="Pagine e richieste che esistono già nell'app.">
            <ul className="m-0 list-none border-t border-[var(--in-line)] p-0">
              {p.today.map((a) => (
                <ActionRow key={a.to + a.label} label={a.label} to={a.to} />
              ))}
            </ul>
          </Card>

          <Card id="arrivo" title="In arrivo" sub="Dall'elenco unico delle idee (docs/piattaforme/IDEE.md). Niente va online senza l'ok di Francesco.">
            {s && s.next.length > 0 ? (
              <ul className="m-0 list-none border-t border-[var(--in-line)] p-0">
                {s.next.map((n) => (
                  <li key={n.idea} className="border-t border-[var(--in-line)] px-4 py-3 first:border-t-0 sm:px-[18px]">
                    <p className="m-0 text-[15px] leading-snug">{n.text}</p>
                    <p className="m-0 mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[var(--in-sub)]">
                      <span>{n.idea}</span>
                      <Chip tone={n.state.startsWith("Pronta") ? "info" : "warn"}>{n.state}</Chip>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 border-t border-[var(--in-line)] px-4 py-3 text-[15px] leading-snug sm:px-[18px]">
                Il primo passo si decide al prossimo ciclo del Cantiere piattaforme (ordine in docs/piattaforme/ROTAZIONE.md).
              </p>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px] lg:self-start">
          <Card id="chi" title="Chi è responsabile">
            <dl className="m-0 border-t border-[var(--in-line)]">
              <Fact label="Persona del club">{s?.person ?? "da confermare"}</Fact>
              <Fact label="Assistente responsabile">{agentLabel(p.responsible)}</Fact>
              <Fact label="Supporto">{p.support.map(agentLabel).join(", ")}</Fact>
              <Fact label="Coordina il settore">{agentLabel(sector.director)}</Fact>
              <Fact label="Motore e misura">
                {p.engine} · {p.measure}
              </Fact>
            </dl>
          </Card>

          <Card id="fonti" title="Fonti dei dati" sub="Solo nomi di fogli master, cartelle e tabelle: nessun dato personale.">
            <ul className="m-0 list-none border-t border-[var(--in-line)] p-0">
              {(s?.sources ?? []).map((src) => (
                <li key={src.name} className="border-t border-[var(--in-line)] px-4 py-2.5 first:border-t-0 sm:px-[18px]">
                  <b className="block text-[15px] leading-snug">{src.name}</b>
                  <span className="text-[13.5px] text-[var(--in-sub)]">{src.note}</span>
                </li>
              ))}
            </ul>
            <SourceLine>Scheda viva: docs/piattaforme/{p.dossier}</SourceLine>
          </Card>
        </div>
      </div>
    </div>
  );
}

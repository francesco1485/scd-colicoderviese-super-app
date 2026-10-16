import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarClock, CircleAlert, CircleCheck, CircleHelp, ExternalLink, ShieldCheck, UsersRound } from "lucide-react";
import { useMemo } from "react";

import { Card, Chip, SourceLine, useRomeNow, type ChipTone } from "@/components/scd/interior-ui";
import { PositionCatalogCard } from "@/components/scd/PositionCatalogCard";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { getPositionCatalog, type PositionCatalogView } from "@/lib/position-catalog.functions";
import { getSgsStatus, type OrganigrammaData } from "@/lib/sgs-quality.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";
import {
  COVER_LABEL,
  OBLIGATION_LABEL,
  SGS_RULES,
  checkCoaching,
  deadlinesFor,
  emptyStatus,
  organizationalScore,
  requirementRows,
  summarize,
  type CategoryRow,
  type CoverStatus,
  type DeadlineView,
  type Level,
  type RequirementRow,
  type TeamRow,
} from "@/lib/sgs-quality";
import { italianDate } from "@/lib/work-areas";

/**
 * Organigramma e 3° livello SGS (UD-024): what the FIGC SGS quality system asks for the chosen
 * level, role by role and team by team, with deadlines. Rules are public (C.U. n.18 SGS, Manuale
 * 2026); the club status is private and comes from the server without names. Read-only, except the
 * "Catalogo ruoli" (r138): every position ready to be filled and "Crea ruolo nuovo" for Presidente / DG.
 */
type OrganigrammaPageData = OrganigrammaData & { catalog: PositionCatalogView | null };

export const Route = createFileRoute("/gestionale/organigramma")({
  validateSearch: (s: Record<string, unknown>): { livello?: Level } => {
    const n = Number(s["livello"]);
    return Number.isInteger(n) && n >= 1 && n <= 5 ? { livello: n as Level } : {};
  },
  loader: async (): Promise<OrganigrammaPageData> => {
    const gate = await getWorkAreaGate({ data: { area: "organigramma" } });
    if (gate.view !== "page") return { gate, status: emptyStatus(), level: SGS_RULES.targetLevel as Level, statusConfigured: false, catalog: null };
    const [sgs, catalog] = await Promise.all([getSgsStatus(), getPositionCatalog()]);
    return { gate, ...sgs, catalog };
  },
  head: ({ loaderData }) => workAreaHead("organigramma", loaderData?.gate),
  component: OrganigrammaRoute,
});

function OrganigrammaRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="organigramma" gate={data.gate}>
      {data.gate.view === "page" && <OrganigrammaPage data={data} />}
    </WorkAreaGateView>
  );
}

const COVER_TONE: Readonly<Record<CoverStatus, ChipTone>> = { COVERED: "ok", TO_VERIFY: "warn", MISSING: "crit", UNKNOWN: "mute" };
const CHECK_TONE: Readonly<Record<string, ChipTone>> = { ok: "ok", verify: "warn", gap: "crit", absent: "crit" };
const CHECK_LABEL: Readonly<Record<string, string>> = { ok: "in regola", verify: "da verificare", gap: "manca", absent: "nessuna squadra" };
const AREA_LABEL: Readonly<Record<string, string>> = {
  sportivi: "Criteri sportivi",
  "player-care": "Player Care e tutela minori",
  inclusione: "Diversità e inclusione",
  infrastrutture: "Infrastrutture",
};

function OrganigrammaPage({ data }: { data: OrganigrammaPageData }) {
  const { livello } = Route.useSearch();
  const navigate = useNavigate({ from: "/gestionale/organigramma" });
  const now = useRomeNow();
  const level: Level = livello ?? data.level;
  const status = data.status;

  const deadlines = useMemo(() => deadlinesFor(level, now.date), [level, now.date]);
  const roles = useMemo(() => requirementRows(SGS_RULES.organizational, level, status.roles), [level, status.roles]);
  const criteria = useMemo(() => requirementRows(SGS_RULES.criteria, level, status.criteria), [level, status.criteria]);
  const coaching = useMemo(() => checkCoaching(status, level), [status, level]);
  const summary = useMemo(() => summarize(status, level), [status, level]);
  const score = useMemo(() => organizationalScore(status.scoreItems, level), [status.scoreItems, level]);
  const nextDue = deadlines.find((d) => d.state !== "passed") ?? null;
  const levelName = SGS_RULES.levels.find((l) => l.level === level)?.name ?? "";

  return (
    <WorkAreaShell
      id="organigramma"
      title={`Organigramma · ${level}° livello SGS`}
      preview={data.gate.preview}
      highlights={[
        { value: data.statusConfigured ? summary.missing : null, label: "requisiti obbligatori mancanti" },
        { value: data.statusConfigured ? summary.open : null, label: "da verificare o rilevare" },
        { value: nextDue ? nextDue.daysLeft : null, label: nextDue ? `giorni alla scadenza del ${italianDate(nextDue.date)}` : "nessuna scadenza aperta" },
      ]}
      note={
        <>
          Regole: C.U. n.18 SGS, Manuale 2026 (lette il {italianDate(SGS_RULES.source.readOn)}).{" "}
          {data.statusConfigured && status.asOf ? <>Stato del club al {italianDate(status.asOf)}.</> : <>Stato del club non ancora collegato.</>} Nessun nome.
        </>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-wrap items-center gap-3 text-[15px] font-semibold">
            Livello da valutare
            <select
              value={level}
              onChange={(e) => void navigate({ search: { livello: Number(e.target.value) as Level }, replace: true })}
              className="scd-focus h-11 min-w-[200px] rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-medium"
            >
              {SGS_RULES.levels.map((l) => (
                <option key={l.level} value={l.level}>
                  {l.level}° livello · {l.name}
                </option>
              ))}
            </select>
          </label>
          <DeclarationChip data={data} />
        </div>

        {!data.statusConfigured && (
          <EmptyState title="Stato del club da collegare">
            Qui sotto ci sono le regole del {level}° livello ({levelName}). Le coperture ruolo per ruolo compaiono quando la Direzione conferma la bozza
            "3° livello SGS 2026-27 – cosa manca entro il 31/10" in Drive: nessun dato viene indovinato.
          </EmptyState>
        )}

        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <div className="lg:hidden">
              <DeadlinesCard list={deadlines} id="org-scadenze-mobile" />
            </div>
            <RolesCard rows={roles} level={level} />
            {data.catalog && <PositionCatalogCard view={data.catalog} />}
            <TeamsCard rows={coaching.teams} categories={coaching.categories} risk={coaching.unclassifiedRisk} level={level} configured={data.statusConfigured} />
            <CriteriaCard rows={criteria} level={level} />
          </div>
          <div className="flex min-w-0 flex-col gap-[18px]">
            <div className="hidden lg:block">
              <DeadlinesCard list={deadlines} />
            </div>
            <ScoreCard level={level} score={score} />
            <EventsAndProjectsCard level={level} />
            <SourcesBox id="organigramma" />
          </div>
        </div>
      </div>
    </WorkAreaShell>
  );
}

function DeclarationChip({ data }: { data: OrganigrammaData }) {
  const d = data.status.declaration;
  if (d.sent === "YES") return <Chip tone="ok"><CircleCheck className="size-3.5" aria-hidden="true" />Dichiarazione di Impegno inviata{d.level ? ` per il ${d.level}° livello` : ""}</Chip>;
  if (d.sent === "NO") return <Chip tone="crit"><CircleAlert className="size-3.5" aria-hidden="true" />Dichiarazione di Impegno non inviata entro il 30/09</Chip>;
  return <Chip tone="warn"><CircleHelp className="size-3.5" aria-hidden="true" />Dichiarazione di Impegno 2026/27: da confermare</Chip>;
}

function RolesCard({ rows, level }: { rows: RequirementRow[]; level: Level }) {
  return (
    <Card id="org-ruoli" title={`Ruoli richiesti al ${level}° livello`} sub="Tabella criteri organizzativi del Manuale (p. 41). Prima gli obbligatori, poi i raccomandati.">
      <ul className="m-0 list-none p-0">
        {rows.map((r) => (
          <li key={r.req.id} className="flex flex-col gap-1.5 border-t border-[var(--in-line)] px-4 py-3 sm:flex-row sm:items-start sm:gap-3 sm:px-[18px]">
            <div className="min-w-0 flex-1">
              <b className="block text-[15.5px] leading-snug">{r.req.label}</b>
              {r.req.requirement && <span className="mt-0.5 block text-[14px] leading-snug text-[var(--in-sub)]">{r.req.requirement}</span>}
            </div>
            <div className="flex flex-none flex-wrap gap-1.5 sm:justify-end">
              <Chip tone={r.obligation === "O" ? "info" : "mute"}>{OBLIGATION_LABEL[r.obligation]}</Chip>
              <Chip tone={COVER_TONE[r.status]}>{COVER_LABEL[r.status]}</Chip>
            </div>
          </li>
        ))}
      </ul>
      <SourceLine>Un allenatore titolare di una squadra obbligatoria non può coprire un altro ruolo obbligatorio. Ruoli vacanti: nuova nomina entro 60 giorni.</SourceLine>
    </Card>
  );
}

function TeamsCard({ rows, categories, risk, level, configured }: { rows: TeamRow[]; categories: CategoryRow[]; risk: "yes" | "no" | "unknown"; level: Level; configured: boolean }) {
  const relevant = categories.filter((c) => c.category.group !== "altra" || c.teams > 0);
  return (
    <Card
      id="org-squadre"
      title="Squadre e allenatori"
      sub="Giovanissimi e Allievi: ogni squadra con allenatore UEFA. Categorie di base: almeno una squadra per categoria con allenatore UEFA."
      aside={
        risk === "yes" ? (
          <Chip tone="crit"><CircleAlert className="size-3.5" aria-hidden="true" />Rischio "Non Classificato"</Chip>
        ) : risk === "no" ? (
          <Chip tone="ok"><ShieldCheck className="size-3.5" aria-hidden="true" />Obblighi tecnici coperti</Chip>
        ) : (
          <Chip tone="warn"><CircleHelp className="size-3.5" aria-hidden="true" />Da verificare</Chip>
        )
      }
    >
      <ul className="m-0 list-none p-0">
        {relevant.map((c) => (
          <li key={c.category.id} className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
            <div className="flex flex-wrap items-center gap-2">
              <UsersRound className="size-[18px] flex-none text-[var(--in-info)]" strokeWidth={1.8} aria-hidden="true" />
              <b className="text-[15.5px]">{c.category.label}</b>
              {c.category.births && <span className="text-[13.5px] text-[var(--in-sub)]">nati {c.category.births}</span>}
              <span className="flex-1" />
              {configured ? <Chip tone={CHECK_TONE[c.check] ?? "mute"}>{CHECK_LABEL[c.check]}</Chip> : <Chip tone="mute">non ancora rilevato</Chip>}
            </div>
            <p className="m-0 mt-1 text-[14px] leading-snug text-[var(--in-sub)]">
              Squadre: {configured ? c.teams : "—"}
              {c.category.minPlayers !== undefined && <> · minimo {c.category.minPlayers} tesserati</>}
              {c.players !== null && <> · tesserati {c.players}{c.belowMinimum ? " (sotto il minimo)" : ""}{c.tooFewTeams ? " · servono più squadre" : ""}</>}
              {c.category.note && <> · {c.category.note}</>}
            </p>
            {rows.filter((r) => r.team.category === c.category.id).length > 0 && (
              <ul className="m-0 mt-2 list-none p-0">
                {rows
                  .filter((r) => r.team.category === c.category.id)
                  .map((r) => (
                    <li key={r.team.id} className="flex flex-wrap items-center gap-2 py-1 text-[14.5px]">
                      <span className="font-semibold">{r.team.label}</span>
                      {r.mandatorySlot && <Chip tone="info">squadra obbligatoria</Chip>}
                      <Chip tone={CHECK_TONE[r.check] ?? "mute"}>{CHECK_LABEL[r.check]}</Chip>
                      <span className="basis-full text-[13.5px] text-[var(--in-sub)]">{r.reason}</span>
                    </li>
                  ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <SourceLine>
        {level >= 3
          ? "Al 3° livello anche ogni altra squadra va affidata a un tecnico UEFA o formato con il corso SGS Grassroots Livello E. Tesseramento dello staff tecnico entro il 31/10."
          : "Tesseramento dello staff tecnico entro il 31/10."}
      </SourceLine>
    </Card>
  );
}

function CriteriaCard({ rows, level }: { rows: RequirementRow[]; level: Level }) {
  const areas = [...new Set(rows.map((r) => r.req.area ?? ""))];
  return (
    <Card id="org-criteri" title={`Altri requisiti del ${level}° livello`} sub="Documenti, Player Care, inclusione e impianti (Manuale pp. 18-28).">
      {areas.map((area) => (
        <div key={area} className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
          <b className="block text-[14px] uppercase tracking-normal text-[var(--in-sub)]">{AREA_LABEL[area] ?? area}</b>
          <ul className="m-0 mt-1.5 list-none p-0">
            {rows
              .filter((r) => (r.req.area ?? "") === area)
              .map((r) => (
                <li key={r.req.id} className="flex flex-col gap-1 py-1.5 text-[15px] sm:flex-row sm:items-center sm:gap-2">
                  <span className="min-w-0 flex-1 leading-snug">{r.req.label}</span>
                  <span className="flex flex-none flex-wrap gap-1.5">
                    <Chip tone={r.obligation === "O" ? "info" : "mute"}>{OBLIGATION_LABEL[r.obligation]}</Chip>
                    <Chip tone={COVER_TONE[r.status]}>{COVER_LABEL[r.status]}</Chip>
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </Card>
  );
}

function DeadlinesCard({ list, id = "org-scadenze", title = "Scadenze della stagione" }: { list: DeadlineView[]; id?: string; title?: string }) {
  return (
    <Card id={id} title={title} sub="Termini perentori del C.U. n.18 SGS. Il Coordinatore regionale può anticiparli.">
      <ul className="m-0 list-none p-0">
        {list.map((d) => (
          <li key={d.id} className="flex items-start gap-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
            <CalendarClock className={`mt-0.5 size-[18px] flex-none ${d.state === "due-soon" ? "text-[var(--in-warn)]" : "text-[var(--in-sub)]"}`} strokeWidth={1.8} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <b className="block text-[15px] leading-snug">{italianDate(d.date)}</b>
              <span className="block text-[14px] leading-snug">{d.label}</span>
              {d.note && <span className="block text-[13.5px] leading-snug text-[var(--in-sub)]">{d.note}</span>}
            </div>
            <Chip tone={d.state === "passed" ? "mute" : d.state === "due-soon" ? "warn" : "info"}>
              {d.state === "passed" ? "scaduta" : d.daysLeft === 0 ? "oggi" : `tra ${d.daysLeft} gg`}
            </Chip>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ScoreCard({ level, score }: { level: Level; score: ReturnType<typeof organizationalScore> }) {
  const threshold = SGS_RULES.levels.find((l) => l.level === level)?.organizationalMinScore ?? null;
  return (
    <Card id="org-punteggio" title="Punteggio criteri organizzativi" sub={`Minimo per il ${level}° livello: ${threshold ?? "—"} punti (Manuale p. 42).`}>
      <div className="px-4 pb-4 sm:px-[18px]">
        {score ? (
          <p className="m-0 text-[15px]">
            <b className="font-title text-[32px] font-black">{score.points}</b>
            <span className="text-[var(--in-sub)]"> / {score.threshold} punti</span>{" "}
            <Chip tone={score.reached ? "ok" : "crit"}>{score.reached ? "raggiunto" : "non raggiunto"}</Chip>
          </p>
        ) : (
          <EmptyState title="Punteggio da calcolare">Si calcola quando sono verificate le qualifiche di responsabili, allenatori e staff.</EmptyState>
        )}
      </div>
    </Card>
  );
}

function EventsAndProjectsCard({ level }: { level: Level }) {
  const events = SGS_RULES.mandatoryEvents.filter((e) => e.fromLevel <= level);
  const qp = SGS_RULES.qualifyingProjects;
  return (
    <Card id="org-progetti" title="Manifestazioni e Progetto Qualificante">
      <div className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
        <b className="block text-[14px] uppercase tracking-normal text-[var(--in-sub)]">Manifestazioni SGS obbligatorie</b>
        <ul className="m-0 mt-1.5 list-disc pl-5 text-[15px] leading-relaxed">
          {events.map((e) => (
            <li key={e.id}>{e.label}</li>
          ))}
        </ul>
        <span className="mt-1 block text-[13.5px] text-[var(--in-sub)]">I tornei organizzati dai club non le sostituiscono.</span>
      </div>
      {level >= qp.fromLevel && (
        <div className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
          <b className="block text-[14px] uppercase tracking-normal text-[var(--in-sub)]">Progetto Qualificante (almeno uno)</b>
          <p className="m-0 mt-1 text-[14px] leading-snug text-[var(--in-sub)]">{qp.rule}</p>
          <ul className="m-0 mt-1.5 list-none p-0">
            {qp.options.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2 py-1 text-[14.5px]">
                <span className="min-w-0 flex-1">{o.label}</span>
                <Chip tone={o.startThisSeason ? "ok" : "mute"}>{o.startThisSeason ? "avviabile quest'anno" : "solo se già avviato"}</Chip>
              </li>
            ))}
          </ul>
        </div>
      )}
      <SourceLine>
        <a href={SGS_RULES.source.url} target="_blank" rel="noopener noreferrer" className="scd-focus inline-flex items-center gap-1 font-semibold text-[var(--in-info)]">
          {SGS_RULES.source.title}
          <ExternalLink className="size-3.5" aria-hidden="true" />
          <span className="sr-only"> (si apre in una nuova scheda)</span>
        </a>
      </SourceLine>
    </Card>
  );
}


import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, MonitorPlay, Radio } from "lucide-react";

import { SpotStatusBadge } from "@/components/SponsorSpots";
import { Card, Chip, SourceLine, type ChipTone } from "@/components/scd/interior-ui";
import { WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { GROW_AUDIENCE_LABEL, GROW_AUDIT_DATE, GROW_STATUS_LABEL, GROW_TOOLS, growStatusCounts, type GrowTool, type GrowToolStatus } from "@/lib/grow-hub";
import { coverageGroups, coverageLabel, coverageSummary, spotCoverage, type CoverageRow } from "@/lib/spot-coverage";
import { SPONSORS_AS_OF } from "@/lib/sponsors";
import { getWorkAreaGate } from "@/lib/work-areas.functions";
import { italianDate } from "@/lib/work-areas";

/**
 * SCD GROW hub (sponsor, partner, commercial CRM): internal page with the same access as /crm (work area "crm"),
 * never indexed. It gathers the GROW tools that exist (pipeline and kit on /crm, LED spots, LED wall player, the
 * public sponsor page and its proposal form) and shows the LED spot coverage of every season sponsor
 * (lib/spot-coverage.ts). It reads sponsors.ts and sponsor-spots.ts as they are: no second register, no prospects.
 */
export const Route = createFileRoute("/grow")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "crm" } });
    return { gate, interior: gate.view === "page" };
  },
  head: ({ loaderData }) => {
    const base = workAreaHead("crm", loaderData?.gate);
    if (loaderData?.gate.view !== "page") return base;
    return {
      meta: [
        { title: "SCD GROW · Sponsor e partner — SCD Dentro · S.C.D. ColicoDerviese" },
        { name: "description", content: "Strumenti commerciali del club: pipeline, kit partner, spot LED e copertura degli sponsor." },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: GrowRoute,
});

function GrowRoute() {
  const { gate } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="crm" gate={gate}>
      <GrowHub preview={gate.preview} />
    </WorkAreaGateView>
  );
}

function GrowHub({ preview }: { preview: boolean }) {
  const sum = coverageSummary();
  return (
    <WorkAreaShell
      id="crm"
      title="SCD GROW · Sponsor e partner"
      path="/grow"
      preview={preview}
      highlights={[
        { value: sum.sponsors, label: "sponsor della stagione" },
        { value: sum.withSpot, label: "con spot LED pronto" },
        { value: sum.withoutSpot, label: "spot da preparare" },
      ]}
      note={<>Sponsor: elenco della Direzione al {italianDate(SPONSORS_AS_OF)}. Spot: cartella Drive degli spot validati.</>}
    >
      <GrowBand withSpot={sum.withSpot} sponsors={sum.sponsors} />
      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <SpotCoverage />
        <GrowTools />
      </div>
    </WorkAreaShell>
  );
}

/** Brushed navy band: what GROW is for and the two most used actions. */
function GrowBand({ withSpot, sponsors }: { withSpot: number; sponsors: number }) {
  return (
    <section aria-labelledby="grow-band-title" className="scd-band relative overflow-hidden rounded-2xl text-white" data-testid="grow-band">
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_120%_at_88%_0%,rgb(127_208_255/0.22),transparent_70%)]" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,#8ea2c6,#ffffff_22%,#b8c5dd_50%,#ffffff_78%,#8ea2c6)]" />
      <div className="relative grid gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8 lg:py-6">
        <div className="grid min-w-0 gap-1.5">
          <span className="font-display text-[12.5px] font-bold uppercase tracking-[0.12em] text-[#ffd84a]">SCD GROW · Trova, connetti, sviluppa, rinnova</span>
          <h2 id="grow-band-title" className="m-0 font-display text-[24px] font-bold uppercase leading-[1.05] lg:text-[32px]">
            Sponsor e partner 2026/27
          </h2>
          <p className="m-0 max-w-[60ch] text-[14.5px] leading-snug text-[#dbe5f7] lg:text-[16px]">
            Tutto il lavoro commerciale del club in un posto: chi ci sostiene, gli spot del LED wall, le proposte alle aziende. {withSpot} sponsor su{" "}
            {sponsors} hanno già lo spot pronto.
          </p>
          <span className="text-[13px] text-[#b4c3de]">Un'azienda cercata non è uno sponsor, una proposta non è un contratto.</span>
        </div>
        <div className="flex flex-wrap gap-2.5 lg:flex-col lg:items-stretch">
          <Link
            to="/crm"
            className="scd-gold scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-bold"
            data-testid="grow-open-crm"
          >
            Apri pipeline e kit <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <a
            href="/ledwall/player"
            target="_blank"
            rel="noopener noreferrer"
            className="scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-white/45 px-4 text-[15px] font-semibold text-white hover:bg-white/10"
            data-testid="grow-open-player"
          >
            <MonitorPlay className="size-4" aria-hidden="true" /> Player LED wall <ArrowUpRight className="size-4" aria-hidden="true" />
            <span className="sr-only">(si apre in una nuova scheda)</span>
          </a>
          <a
            href="#grow-strumenti-title"
            className="scd-focus inline-flex min-h-11 items-center justify-center rounded-[10px] px-2 text-[15px] font-semibold text-[#ffd84a] underline underline-offset-2 xl:hidden"
            data-testid="grow-jump-tools"
          >
            Vai agli strumenti
          </a>
        </div>
      </div>
    </section>
  );
}

/** "Copertura spot LED": every sponsor of sponsors.ts with its spot (azzurro = ready) or without (sole = to prepare). */
function SpotCoverage() {
  const rows = spotCoverage();
  const { ready, missing } = coverageGroups(rows);
  const pct = rows.length ? Math.round((ready.length / rows.length) * 100) : 0;
  return (
    <Card id="grow-copertura" title="Copertura spot LED" sub="Ogni sponsor della stagione e il suo spot per il LED wall del campo.">
      <div className="grid gap-4 px-4 pb-4 sm:px-[18px]" data-testid="grow-coverage">
        <div>
          <div
            className="flex h-3 overflow-hidden rounded-full bg-[#fff3c4] ring-1 ring-[#e9cf6a]"
            role="img"
            aria-label={`${ready.length} sponsor su ${rows.length} con spot pronto, ${missing.length} da preparare`}
          >
            <span className="scd-band-azzurro block h-full" style={{ width: `${pct}%` }} />
          </div>
          <p className="m-0 mt-1.5 text-[13.5px] leading-snug text-[var(--in-sub)]">
            {ready.length} su {rows.length} con spot pronto · {missing.length} da preparare <span className="text-[12.5px]">(calcolato dai due elenchi)</span>
          </p>
        </div>

        <section aria-labelledby="grow-ready-title" className="overflow-hidden rounded-xl border border-[#b9d5ef]" data-testid="grow-coverage-ready">
          <h3 id="grow-ready-title" className="scd-band-azzurro m-0 flex items-center justify-between gap-2 px-3.5 py-2.5 text-[15.5px] font-bold text-white">
            <span className="flex items-center gap-2"><Radio className="size-4" aria-hidden="true" /> Spot pronto</span>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[13.5px]">{ready.length}</span>
          </h3>
          <ul className="m-0 grid list-none grid-cols-1 gap-px bg-[var(--in-line)] p-0 sm:grid-cols-2">
            {ready.map((r) => (
              <ReadyRow key={r.slug} row={r} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="grow-missing-title" className="overflow-hidden rounded-xl border border-[#e9cf6a]" data-testid="grow-coverage-missing">
          <h3 id="grow-missing-title" className="scd-band-sole m-0 flex items-center justify-between gap-2 px-3.5 py-2.5 text-[15.5px] font-bold">
            <span>Spot da preparare</span>
            <span className="rounded-full bg-[#13254d] px-2.5 py-0.5 text-[13.5px] text-white">{missing.length}</span>
          </h3>
          <ul className="m-0 grid list-none grid-cols-1 gap-px bg-[var(--in-line)] p-0 sm:grid-cols-2 2xl:grid-cols-3">
            {missing.map((r) => (
              <MissingRow key={r.slug} row={r} />
            ))}
          </ul>
        </section>

        <SourceLine>
          Spot: src/lib/sponsor-spots.ts (cartella Drive 02_V4_SPONSOR_VALIDATI). «Da preparare» vuol dire che lo spot non è ancora nell'app: può
          esistere sul Drive e va solo convertito. Lo stato diventa modificabile dal gestionale quando sarà approvato il registro spot.
        </SourceLine>
      </div>
    </Card>
  );
}

function Logo({ src }: { src: string }) {
  return (
    <span className="grid h-11 w-[72px] flex-none place-items-center rounded-lg border border-[var(--in-line)] bg-white p-1">
      <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
    </span>
  );
}

function NameBlock({ row }: { row: CoverageRow }) {
  return (
    <span className="grid min-w-0 gap-0.5">
      <b className="truncate text-[15px] leading-tight text-[var(--in-ink)]">{coverageLabel(row)}</b>
      {row.nameToConfirm && <span className="text-[12.5px] text-[var(--in-warn)]">Nome da confermare con la Direzione</span>}
    </span>
  );
}

function ReadyRow({ row }: { row: CoverageRow }) {
  const spot = row.spot!;
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-3 bg-white px-3 py-2.5 sm:[&:last-child:nth-child(odd)]:col-span-2" data-testid="grow-coverage-row" data-spot="ready">
      <Logo src={row.logoSrc} />
      <span className="grid min-w-0 flex-1 gap-1">
        <NameBlock row={row} />
        <span className="flex flex-wrap items-center gap-2">
          <SpotStatusBadge status={spot.status} />
          <Link
            to="/spot/$slug"
            params={{ slug: row.slug }}
            className="scd-focus inline-flex min-h-11 items-center gap-1 rounded-md text-[13.5px] font-semibold text-[var(--in-info)] underline-offset-2 hover:underline"
            aria-label={`Pagina dello spot di ${coverageLabel(row)}`}
          >
            Pagina dello spot <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </span>
      </span>
    </li>
  );
}

function MissingRow({ row }: { row: CoverageRow }) {
  return (
    <li className="flex min-w-0 items-center gap-3 bg-white px-3 py-2.5" data-testid="grow-coverage-row" data-spot="missing">
      <Logo src={row.logoSrc} />
      <NameBlock row={row} />
    </li>
  );
}

const STATUS_TONE: Readonly<Record<GrowToolStatus, ChipTone>> = { attivo: "ok", parziale: "warn", "da-fare": "mute" };

/** The GROW tools: what exists (with its link) and what is still to build (no link). */
function GrowTools() {
  const counts = growStatusCounts();
  return (
    <Card
      id="grow-strumenti"
      title="Strumenti GROW"
      sub={`${counts.attivo} attivi, ${counts.parziale} in parte, ${counts["da-fare"]} da fare · verifica del ${italianDate(GROW_AUDIT_DATE)}`}
    >
      <ul className="m-0 grid list-none gap-2 px-4 pb-4 sm:px-[18px]" data-testid="grow-tools">
        {GROW_TOOLS.map((t) => (
          <li key={t.id} data-tool={t.id} data-status={t.status}>
            <ToolRow tool={t} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ToolBody({ tool, linked }: { tool: GrowTool; linked: boolean }) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <b className="text-[15.5px] leading-tight text-[var(--in-ink)]">{tool.title}</b>
        <Chip tone={STATUS_TONE[tool.status]}>{GROW_STATUS_LABEL[tool.status]}</Chip>
        <span className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-[var(--in-sub)]">{GROW_AUDIENCE_LABEL[tool.audience]}</span>
      </span>
      <span className="mt-1 block text-[13.5px] leading-snug text-[var(--in-sub)]">{tool.text}</span>
      {linked && (
        <span className="mt-1.5 inline-flex items-center gap-1 text-[13.5px] font-semibold text-[var(--in-info)]">
          {tool.href ? <>Apri in una nuova scheda <ArrowUpRight className="size-3.5" aria-hidden="true" /></> : <>Apri <ArrowRight className="size-3.5" aria-hidden="true" /></>}
        </span>
      )}
    </>
  );
}

const ROW_CLS =
  "scd-focus block min-h-11 rounded-xl border border-[var(--in-line)] bg-[#fbfdff] px-3.5 py-3 transition-colors duration-150 hover:border-[#b9d5ef] hover:bg-white";

function ToolRow({ tool }: { tool: GrowTool }) {
  if (tool.href) {
    return (
      <a href={tool.href} target="_blank" rel="noopener noreferrer" className={ROW_CLS}>
        <ToolBody tool={tool} linked />
      </a>
    );
  }
  if (tool.to) {
    return (
      <Link to={tool.to} {...(tool.hash ? { hash: tool.hash } : {})} className={ROW_CLS}>
        <ToolBody tool={tool} linked />
      </Link>
    );
  }
  return (
    <div className="rounded-xl border border-dashed border-[#c9d9ec] bg-white px-3.5 py-3">
      <ToolBody tool={tool} linked={false} />
    </div>
  );
}

/**
 * Fondo Solidale, «piattaforma a sé» (Francesco 16/10/2026 15:44): one hub with three views, same login and same
 * database as the rest of the app (no new app, no new auth).
 *   - Gestione: the Fund management page (FundPage), identical to /tesoreria/fondo-solidale (same gate, same data);
 *   - Sostenitori: read-only supporters portal. «accesso al momento nessuno ancora»: built, nobody outside the club
 *     can enter it yet, so it shows only what it will contain;
 *   - Vetrina: the public page /sostieni/fondo-solidale.
 * Colours: navy METAL band for the hub head, azzurro for the supporters, sole for the showcase (one tone per meaning).
 */
import { Link } from "@tanstack/react-router";
import { ExternalLink, Eye, HandCoins, Info, Lock, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";

import { TONES } from "@/components/home/tones";
import { FUND_FISCAL_NOTE, FUND_SCOPE_TEXT, FONDO_PUBLIC_TEXT, type FundBoard, type FundReport } from "@/lib/giving";
import type { GivingGate } from "@/lib/giving.server";
import { FundPage } from "./FundPage";
import { GivingShell, showsStructure, type ShellOverride } from "./backoffice";

export const HUB_VIEWS = ["gestione", "sostenitori", "vetrina"] as const;
export type HubView = (typeof HUB_VIEWS)[number];
export const HUB_PATH = "/fondo";
export const HUB_TITLE = "Fondo Solidale";
/** The supporters portal has no external access yet (Francesco 16/10/2026: «accesso al momento nessuno ancora»). */
export const SUPPORTERS_ACCESS_OPEN = false;
export const SUPPORTERS_NO_ACCESS = "Nessun accesso attivo per ora";

const VIEW_LABEL: Readonly<Record<HubView, string>> = { gestione: "Gestione", sostenitori: "Sostenitori", vetrina: "Vetrina" };

export function parseHubView(v: unknown): HubView {
  return (HUB_VIEWS as readonly unknown[]).includes(v) ? (v as HubView) : "gestione";
}

function HubHead({ view }: { view: HubView }) {
  const t = TONES.navy;
  return (
    <div className={`${t.band} scd-metal-line rounded-2xl px-4 py-4 sm:px-6`} data-testid="fund-hub-head">
      <p className={`m-0 text-[12.5px] font-bold uppercase tracking-[0.12em] ${t.kicker}`}>Piattaforma a sé · stesso accesso del club</p>
      <h2 className="m-0 mt-1 font-title text-[22px] font-extrabold leading-tight text-white sm:text-[26px]">Fondo Solidale</h2>
      <p className={`m-0 mt-1 max-w-[62ch] text-[14.5px] leading-snug ${t.body}`}>{FUND_SCOPE_TEXT}</p>
      <nav aria-label="Viste del Fondo Solidale" className="mt-3 flex flex-wrap gap-2">
        {HUB_VIEWS.map((v) => (
          <Link
            key={v}
            to="/fondo"
            search={{ vista: v }}
            aria-current={v === view ? "page" : undefined}
            className={`scd-focus inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-bold ${v === view ? "scd-gold" : "border border-white/35 text-white hover:bg-white/10"}`}
          >
            {VIEW_LABEL[v]}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function ToneCard({ tone, kicker, title, children, testId }: { tone: "azzurro" | "sole"; kicker: string; title: string; children: ReactNode; testId: string }) {
  const t = TONES[tone];
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--in-line)] bg-white" data-testid={testId}>
      <header className={`${t.band} px-4 py-3.5 sm:px-6`}>
        <p className={`m-0 text-[12.5px] font-bold uppercase tracking-[0.12em] ${t.kicker}`}>{kicker}</p>
        <h3 className="m-0 mt-0.5 font-title text-[20px] font-extrabold leading-tight">{title}</h3>
      </header>
      <div className="space-y-3 px-4 py-4 text-[15px] leading-snug text-[var(--in-ink)] sm:px-6">{children}</div>
    </section>
  );
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex-none text-[var(--in-sub)]" aria-hidden="true">{icon}</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function SupportersView({ board, report }: { board: FundBoard | null; report: FundReport | null }) {
  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
      <ToneCard tone="azzurro" kicker="Portale sostenitori · sola lettura" title={SUPPORTERS_NO_ACCESS} testId="fund-supporters">
        <p className="m-0 flex items-start gap-2 rounded-xl bg-[#eef4fb] px-3 py-2.5 font-semibold">
          <Lock className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          Il portale è pronto ma nessun sostenitore può ancora entrare. Lo apre la Direzione quando decide.
        </p>
        <p className="m-0">Quando sarà aperto, chi sostiene il Fondo vedrà solo:</p>
        <ul className="m-0 list-none space-y-2 p-0">
          <Row icon={<HandCoins className="size-4" />}>le proprie donazioni registrate dalla Tesoreria, con la ricevuta quando c'è;</Row>
          <Row icon={<Users className="size-4" />}>quante quote sono state coperte nella stagione, in totale e senza nomi;</Row>
          <Row icon={<Eye className="size-4" />}>i totali del Fondo, solo se la Direzione li rende pubblici.</Row>
        </ul>
        <p className="m-0 text-[14px] text-[var(--in-sub)]">Mai nomi delle famiglie, mai fasce ISEE, mai importi di altre persone.</p>
      </ToneCard>
      <div className="flex min-w-0 flex-col gap-[18px]">
        <section className="rounded-2xl border border-[var(--in-line)] bg-white px-4 py-4 sm:px-5" aria-labelledby="fund-supporters-state">
          <h3 id="fund-supporters-state" className="m-0 text-[16px] font-extrabold">Stato del portale</h3>
          <dl className="m-0 mt-2 space-y-1.5 text-[14.5px]">
            <div className="flex justify-between gap-3"><dt>Accessi sostenitori</dt><dd className="m-0 font-semibold">{SUPPORTERS_ACCESS_OPEN ? "aperti" : "nessuno"}</dd></div>
            <div className="flex justify-between gap-3"><dt>Totali in pubblico</dt><dd className="m-0 font-semibold">{board ? (board.publicTotals ? "visibili" : "nascosti") : "da confermare"}</dd></div>
            <div className="flex justify-between gap-3"><dt>Quote coperte in stagione</dt><dd className="m-0 font-semibold">{report ? (report.benefits.QUOTA_COPERTA ?? 0) + (report.benefits.QUOTA_RIDOTTA ?? 0) : "da confermare"}</dd></div>
          </dl>
        </section>
        <section className="rounded-2xl border border-[var(--in-line)] bg-white px-4 py-4 sm:px-5" aria-labelledby="fund-fiscal" data-testid="fund-fiscal">
          <h3 id="fund-fiscal" className="m-0 flex items-center gap-2 text-[16px] font-extrabold"><Info className="size-4" aria-hidden="true" />Aspetti fiscali</h3>
          <p className="m-0 mt-2 text-[14.5px]">{FUND_FISCAL_NOTE.text}</p>
          <p className="m-0 mt-1.5 text-[13.5px] text-[var(--in-sub)]">{FUND_FISCAL_NOTE.source} Stato: {FUND_FISCAL_NOTE.status}, da verificare.</p>
        </section>
      </div>
    </div>
  );
}

function ShowcaseView({ board }: { board: FundBoard | null }) {
  const t = TONES.sole;
  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
      <ToneCard tone="sole" kicker="Vetrina pubblica" title="La pagina che vedono tutti" testId="fund-showcase">
        <p className="m-0">La vetrina del Fondo è la pagina pubblica del club: spiega cos'è il Fondo, come si fa domanda e come si dona. Non mostra nomi né dati delle famiglie.</p>
        <ul className="m-0 list-none space-y-2 p-0">
          <Row icon={<ShieldCheck className="size-4" />}>Testi della Direzione: {FONDO_PUBLIC_TEXT ? "pubblicati" : "in arrivo"}.</Row>
          <Row icon={<Eye className="size-4" />}>Totali del Fondo: {board ? (board.publicTotals ? "visibili" : "nascosti") : "da confermare"} (li decide la Direzione dalla Gestione).</Row>
          <Row icon={<HandCoins className="size-4" />}>L'app non incassa: per donare si scrive alla Tesoreria.</Row>
        </ul>
        <Link to="/sostieni/fondo-solidale" className={`scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 text-[15px] font-bold ${t.cta}`} data-testid="fund-showcase-link">
          Apri la vetrina <ExternalLink className="size-4" aria-hidden="true" />
        </Link>
      </ToneCard>
      <section className="rounded-2xl border border-[var(--in-line)] bg-white px-4 py-4 sm:px-5" aria-labelledby="fund-showcase-rules">
        <h3 id="fund-showcase-rules" className="m-0 text-[16px] font-extrabold">Regole della vetrina</h3>
        <ul className="m-0 mt-2 list-disc space-y-1.5 pl-5 text-[14.5px]">
          <li>Niente nomi, foto o volti di ragazzi.</li>
          <li>Niente fasce ISEE né importi delle famiglie.</li>
          <li>Totali solo aggregati e solo se la Direzione li accende.</li>
          <li>Nessuna promessa di detrazioni fiscali.</li>
        </ul>
      </section>
    </div>
  );
}

export function FundHub({ view, initial }: { view: HubView; initial: { gate: GivingGate; board: FundBoard | null; report: FundReport | null; error: string | null } }) {
  const shell: ShellOverride = { title: HUB_TITLE, path: HUB_PATH, rail: "tesoreria", top: <HubHead view={view} /> };
  if (view === "gestione") return <FundPage initial={initial} shell={shell} />;
  const { gate, board, report } = initial;
  const data = gate.state === "open" ? board : null;
  return (
    <GivingShell gate={gate} canWrite={false} shell={shell}>
      {showsStructure(gate) ? (view === "sostenitori" ? <SupportersView board={data} report={gate.state === "open" ? report : null} /> : <ShowcaseView board={data} />) : null}
    </GivingShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ImagePlus, Mail, MailPlus, Shirt, UsersRound } from "lucide-react";
import { useState, type ReactNode } from "react";

import { SpotLedList } from "@/components/SponsorSpots";
import { Card, SourceLine } from "@/components/scd/interior-ui";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { crmKitId, kitSubjectLabel, sponsorLogo, subjectFromSponsor } from "@/lib/partner-kit";
import { SPONSORS, SPONSORS_AS_OF } from "@/lib/sponsors";
import { getWorkAreaGate } from "@/lib/work-areas.functions";
import { CRM_PIPELINE, factStamp, italianDate } from "@/lib/work-areas";

/** CRM contatti (board CRM.dc.html): one register, pipeline with documented counts only. */
export const Route = createFileRoute("/crm")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "crm" } });
    return { gate, interior: gate.view === "page" };
  },
  head: ({ loaderData }) => workAreaHead("crm", loaderData?.gate),
  component: CrmRoute,
});

function CrmRoute() {
  const { gate } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="crm" gate={gate}>
      <CrmPage preview={gate.preview} />
    </WorkAreaGateView>
  );
}

const TABS = [
  { id: "sponsor", label: "Sponsor e partner" },
  { id: "tornei", label: "Tornei" },
  { id: "segreteria", label: "Contatti di segreteria" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const P = CRM_PIPELINE;

function Column({ title, count, children }: { title: string; count: number | null; children: ReactNode }) {
  return (
    <section aria-label={title} className="min-w-0 rounded-2xl bg-[#e9f2fb] p-3">
      <h3 className="m-0 flex items-center justify-between gap-2 px-1 pb-2.5 text-[16px] font-bold">
        {title}
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-[14px] font-bold">
          {count ?? "—"}
          {count === null && <span className="sr-only"> (dato non disponibile)</span>}
        </span>
      </h3>
      {children}
    </section>
  );
}

function NameList({ names, tone }: { names: readonly string[]; tone: "ok" | "warn" }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {names.map((n) => (
        <li key={n} className="rounded-xl border border-[var(--in-line)] bg-white px-3 py-2.5 shadow-[var(--in-card-shadow)]">
          <b className="block text-[15.5px] leading-tight">{n}</b>
          <span className={`mt-0.5 block text-[13px] ${tone === "ok" ? "text-[var(--in-ok)]" : "text-[var(--in-warn)]"}`}>
            {tone === "ok" ? "Contratto attivo" : "Scaduto, da rinnovare"}
          </span>
          <Link
            to="/gestionale/posta"
            search={{ scrivi: "sponsor", nome: n }}
            className="scd-focus mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-[9px] border border-[var(--in-line)] bg-[#f7fbff] px-2.5 text-[13.5px] font-semibold text-[var(--in-info)]"
            aria-label={`Scrivi allo sponsor ${n}`}
            data-testid="crm-write-sponsor"
          >
            <Mail className="size-4" aria-hidden="true" /> Scrivi allo sponsor
          </Link>
          <Link
            to="/crm/partner/$partnerId"
            params={{ partnerId: crmKitId(n) }}
            className="scd-focus ml-1.5 mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-[9px] border border-[var(--in-line)] bg-[#f7fbff] px-2.5 text-[13.5px] font-semibold text-[var(--in-info)]"
            aria-label={`Kit partner di ${n}`}
            data-testid="crm-partner-kit"
          >
            <Shirt className="size-4" aria-hidden="true" /> Kit partner
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CrmPage({ preview }: { preview: boolean }) {
  const [tab, setTab] = useState<Tab>("sponsor");
  return (
    <WorkAreaShell
      id="crm"
      preview={preview}
      highlights={[
        { value: P.active.length, label: "contratti sponsor attivi" },
        { value: P.expiredToRenew.length, label: "contratti scaduti da rinnovare" },
        { value: P.negotiations, label: "trattative: registro da importare" },
      ]}
      note={<>Contratti: {factStamp(P)}. Solo nomi delle aziende, nessun importo.</>}
    >
      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div role="tablist" aria-label="Viste del CRM" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[#e2edf8] p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`crm-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`crm-panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`scd-focus h-10 whitespace-nowrap rounded-[10px] px-3.5 text-[15px] font-semibold ${tab === t.id ? "bg-white text-[var(--in-ink)] shadow-[var(--in-card-shadow)]" : "text-[var(--in-sub)] hover:text-[var(--in-ink)]"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`crm-panel-${tab}`} aria-labelledby={`crm-tab-${tab}`} className="mt-4">
            {tab === "sponsor" ? (
              <>
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <Link
                  to="/gestionale/posta"
                  search={{ scrivi: "sponsor" }}
                  className="scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--in-action)] px-4 text-[15px] font-semibold text-[var(--in-ink)]"
                  data-testid="crm-write-all"
                >
                  <MailPlus className="size-4" aria-hidden="true" /> Scrivi a tutti i partner
                </Link>
                <Link
                  to="/crm/partner/nuovo"
                  className="scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold text-[var(--in-ink)]"
                  data-testid="crm-new-partner-kit"
                >
                  <ImagePlus className="size-4" aria-hidden="true" /> Kit nuovo partner
                </Link>
                <span className="text-[13.5px] leading-snug text-[var(--in-sub)]">
                  Parte da sportclubcolico@gmail.com con il tuo nome; una mail separata per ogni partner, le risposte tornano nella Posta del club.
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4" data-testid="crm-pipeline">
                <Column title="Da contattare" count={P.prospects}>
                  <EmptyState title="Elenco da importare">I target arriveranno dal Master Sponsor e dal MASTER CONTATTI, senza contarli a mano.</EmptyState>
                </Column>
                <Column title="In trattativa" count={P.negotiations}>
                  <EmptyState title="Registro non ancora importato" />
                </Column>
                <Column title="Partner attivi" count={P.active.length}>
                  <NameList names={P.active} tone="ok" />
                </Column>
                <Column title="Da rinnovare" count={P.expiredToRenew.length}>
                  <NameList names={P.expiredToRenew} tone="warn" />
                </Column>
              </div>
              <PartnerKitGrid />
              <SpotLedList />
              </>
            ) : (
              <Card>
                <div className="p-4 sm:p-[18px]">
                  <EmptyState title={tab === "tornei" ? "Contatti dei tornei da importare" : "Contatti di segreteria da importare"}>
                    Arriveranno dallo stesso MASTER CONTATTI: nessun secondo elenco.
                  </EmptyState>
                </div>
              </Card>
            )}
          </div>
          <p className="mt-4 flex items-start gap-2 text-[14px] leading-snug text-[var(--in-sub)]">
            <UsersRound className="mt-[1px] size-4 flex-none" strokeWidth={1.8} aria-hidden="true" />
            Un solo registro: sponsor, tornei e segreteria leggono lo stesso MASTER CONTATTI. Nessun secondo CRM.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="crm-fatti" title="Dati documentati" sub="Cosa sappiamo oggi, con la sua fonte.">
            <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 px-4 pb-4 text-[14.5px] sm:px-[18px]">
              <dt className="text-[var(--in-sub)]">Contratti attivi</dt><dd className="m-0 font-bold">{P.active.length}</dd>
              <dt className="text-[var(--in-sub)]">Scaduti da rinnovare</dt><dd className="m-0 font-bold">{P.expiredToRenew.length}</dd>
              <dt className="text-[var(--in-sub)]">Da contattare</dt><dd className="m-0 font-bold">—</dd>
              <dt className="text-[var(--in-sub)]">In trattativa</dt><dd className="m-0 font-bold">—</dd>
            </dl>
            <SourceLine>{factStamp(P)}. I loghi ufficiali dei partner sono ancora da raccogliere.</SourceLine>
          </Card>
          <SourcesBox id="crm" />
        </div>
      </div>
    </WorkAreaShell>
  );
}

/** Kit partner of every season sponsor (UD-109): official logo tiles, each opening /crm/partner/<slug>. */
function PartnerKitGrid() {
  return (
    <section aria-labelledby="crm-kit-title" className="mt-4 rounded-2xl border border-[var(--in-line)] bg-white p-3 sm:p-4" data-testid="crm-kit-grid">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1 pb-3">
        <h3 id="crm-kit-title" className="m-0 text-[16px] font-bold">
          Kit partner · sponsor 2026/27
        </h3>
        <span className="text-[13px] text-[var(--in-sub)]">
          {SPONSORS.length} partner, elenco della Direzione al {italianDate(SPONSORS_AS_OF)}
        </span>
      </div>
      <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {SPONSORS.map((s) => {
          const subject = subjectFromSponsor(s);
          const label = kitSubjectLabel(subject);
          return (
            <li key={s.slug} className="min-w-0">
              <Link
                to="/crm/partner/$partnerId"
                params={{ partnerId: s.slug }}
                className="scd-focus group flex h-full min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--in-line)] bg-[#fbfdff] px-2 py-2.5 text-center transition-colors duration-150 hover:border-[#b9d5ef] hover:bg-white"
                aria-label={`Kit partner di ${label}`}
              >
                <img src={sponsorLogo(s).src} alt="" aria-hidden="true" loading="lazy" decoding="async" className="h-9 w-auto max-w-[80%] object-contain" />
                <span className="line-clamp-2 text-[12.5px] font-semibold leading-tight text-[var(--in-ink)]">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { FilterPills, IntakeLinksCard, IntakeNoticesCard, IntakeRowCard } from "@/components/intake/IntakeViews";
import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import {
  INTAKE_AREAS,
  INTAKE_AREA_LABEL,
  INTAKE_KINDS,
  INTAKE_KIND_LABEL,
  INTAKE_PHASES,
  INTAKE_PHASE_LABEL,
  INTAKE_SITES,
  INTAKE_SITE_LABEL,
  paymentsToFollow,
  phaseCounts,
} from "@/lib/intake-kinds";
import { allIntakeLinks } from "@/lib/intake-links";
import { emptyIntakeDesk, getIntakeDesk, intakeFiltersSchema, type IntakeDesk, type IntakeFilters } from "@/lib/intake.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Vetrina richieste · catalogue (UD-163, Francesco 16/10/2026 14:57 and 15:44). ONE catalogue of what arrives from
 * outside (tournament registrations, sponsors, convenzioni, field rentals, visits, other): public.scd_requests, r139
 * STAGED. Filters by kind, phase, area and site (URL search, so a filtered view can be shared). Actions and payment
 * fields come from the database answer per row (chi-fa-cosa deciders, Tesoreria only for payments) and are checked
 * again on every click. Until r139 is applied the page says "Funzione in preparazione" and reads nothing.
 * Public links: the single Tally form, «Modulo in preparazione» while config intakeTallyFormUrl is null.
 * Desktop VR-026 (catalogue + side column), phone VR-025 (pills, cards with coloured bar).
 */
export const Route = createFileRoute("/gestionale/richieste")({
  validateSearch: (raw: Record<string, unknown>): IntakeFilters => intakeFiltersSchema.catch({}).parse(raw),
  loaderDeps: ({ search }) => ({ ...search }),
  loader: async ({ deps }): Promise<IntakeDesk> => {
    const gate = await getWorkAreaGate({ data: { area: "intake" } });
    if (gate.view !== "page") return emptyIntakeDesk(gate, deps);
    return getIntakeDesk({ data: deps });
  },
  head: ({ loaderData }) => workAreaHead("intake", loaderData?.gate),
  component: IntakeRoute,
});

function IntakeRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="intake" gate={data.gate}>
      {data.gate.view === "page" && <IntakePage data={data} />}
    </WorkAreaGateView>
  );
}

function IntakePage({ data }: { data: IntakeDesk }) {
  const f = data.filters;
  const counts = phaseCounts(data.rows);
  const payments = paymentsToFollow(data.rows);
  const withFilter = (patch: Partial<IntakeFilters>) => {
    const next: Record<string, string | undefined> = { ...f, ...patch };
    for (const k of Object.keys(next)) if (next[k] === undefined || next[k] === null) delete next[k];
    return next;
  };
  const filtered = Boolean(f.kind || f.phase || f.area || f.site);

  return (
    <WorkAreaShell
      id="intake"
      preview={data.gate.preview}
      editable
      status={data.ready ? <Chip tone="ok">Collegata al database del club</Chip> : <Chip tone="warn">Funzione in preparazione</Chip>}
      note="Decide chi ha il ruolo; il DG conferma tutto. Nessuna mail automatica."
      highlights={[
        { value: counts ? counts.RICEVUTA : null, label: "ricevute da guardare" },
        { value: counts ? counts.IN_VALUTAZIONE : null, label: "in valutazione" },
        { value: payments, label: "pagamenti da seguire" },
      ]}
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-[18px]">
        <div className="flex min-w-0 flex-col gap-3 lg:gap-[18px]">
          <Card id="intake-filtri" title="Catalogo" sub="Un solo registro per tutte le richieste che arrivano da fuori. Ogni ruolo vede i tipi che gestisce.">
            <div className="flex flex-col gap-2.5 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
              <FilterPills
                label="Fase"
                current={f.phase ?? null}
                options={[{ value: null, text: "Tutte" }, ...INTAKE_PHASES.map((p) => ({ value: p, text: INTAKE_PHASE_LABEL[p] }))]}
                hrefFor={(v) => withFilter({ phase: v ?? undefined })}
              />
              <FilterPills
                label="Tipo"
                current={f.kind ?? null}
                options={[{ value: null, text: "Tutti" }, ...INTAKE_KINDS.map((k) => ({ value: k, text: INTAKE_KIND_LABEL[k] }))]}
                hrefFor={(v) => withFilter({ kind: v ?? undefined })}
              />
              <FilterPills
                label="Area"
                current={f.area ?? null}
                options={[{ value: null, text: "Tutte" }, ...INTAKE_AREAS.map((a) => ({ value: a, text: INTAKE_AREA_LABEL[a] }))]}
                hrefFor={(v) => withFilter({ area: v ?? undefined })}
              />
              <FilterPills
                label="Sede"
                current={f.site ?? null}
                options={[{ value: null, text: "Tutte" }, ...INTAKE_SITES.map((s) => ({ value: s, text: INTAKE_SITE_LABEL[s] }))]}
                hrefFor={(v) => withFilter({ site: v ?? undefined })}
              />
            </div>
          </Card>

          {data.rows === null ? (
            <EmptyState title={!data.connected ? "Entra con il tuo account" : data.ready ? "Catalogo non letto" : "Funzione in preparazione"}>
              {data.message ??
                "La Vetrina richieste si attiva quando la Direzione applica la migrazione r139. Fino ad allora nessuna richiesta viene letta o scritta."}
            </EmptyState>
          ) : data.rows.length === 0 ? (
            <EmptyState title={filtered ? "Nessuna richiesta con questi filtri" : "Nessuna richiesta aperta"}>
              Le richieste arrivano dal modulo pubblico «Richieste alla SCD» e compaiono qui come «Ricevuta».
            </EmptyState>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label="Richieste">
              {data.rows.map((r) => (
                <IntakeRowCard key={r.id} row={r} canPay={data.canPay} />
              ))}
            </ul>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-3 lg:gap-[18px]" aria-label="Avvisi e link pubblici">
          {data.ready && <IntakeNoticesCard notices={data.notices} />}
          <IntakeLinksCard links={allIntakeLinks()} />
          <Card id="intake-regole" title="Come funziona" sub="Regole decise da Francesco il 16/10/2026">
            <ul className="m-0 list-none p-0 text-[14px] leading-snug">
              {[
                "Esterni (società, aziende, scuole, privati adulti): un solo modulo Tally. Soci e famiglie chiedono dall'app.",
                "Fasi: Ricevuta → In valutazione → Accettata o Non accolta → In gestione → Chiusa.",
                "Il pagamento parte solo dopo «Accettata»: il link lo crea una persona della Tesoreria e lo registra qui.",
                "Mai nomi o dati di salute di minori. I recapiti degli esterni si cancellano da soli.",
                "Avvisi solo nell'app; all'esterno risponde sempre una persona.",
              ].map((t) => (
                <li key={t} className="border-t border-[var(--in-line)] px-4 py-2.5 sm:px-[18px]">
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </WorkAreaShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { FilterPills, IntakeLinksCard, IntakeNoticesCard, IntakeRowCard } from "@/components/intake/IntakeViews";
import { Card, Chip, SourceLine } from "@/components/scd/interior-ui";
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
import { INTAKE_READ_FAILED, emptyIntakeDesk, getIntakeDesk, intakeFiltersSchema, type IntakeDesk, type IntakeFilters } from "@/lib/intake.functions";
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
  const readFailed = data.connected && !data.ready && data.message === INTAKE_READ_FAILED;

  return (
    <WorkAreaShell
      id="intake"
      preview={data.gate.preview}
      editable
      status={
        data.ready ? (
          <Chip tone="ok">Collegata al database del club</Chip>
        ) : readFailed ? (
          <Chip tone="crit">Lettura non riuscita</Chip>
        ) : (
          <Chip tone="warn">Funzione in preparazione</Chip>
        )
      }
      note="Decide chi ha il ruolo; il DG conferma tutto tranne affitti e visite (Presidente e Consiglio; il DG decide anche lui come membro del Consiglio). Nessuna mail automatica."
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
            <EmptyState title={!data.connected ? "Entra con il tuo account" : readFailed ? "Lettura non riuscita" : data.ready ? "Catalogo non letto" : "Funzione in preparazione"}>
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
          <Card id="intake-decise" title="Deciso da Francesco" sub="16/10/2026, parole sue tra virgolette">
            <RuleList
              items={[
                "«Esterni Tally, soci app»: società, aziende, scuole e privati adulti usano un solo modulo Tally; soci e famiglie chiedono dall'app.",
                "«Li crea la Tesoreria»: il link di pagamento lo crea una persona della Tesoreria, solo dopo «Accettata», e lo registra qui.",
                "«DG conferma tutto» (13:31): il Direttore Generale conferma le richieste, tranne affitto campi e visite.",
                "«Decide presidente e consiglio direttivo» (16:39): affitto dei campi e visite ai centri li decidono il Presidente e il Consiglio Direttivo (in app: chi ha il ruolo Direzione).",
                "«Preparo e inoltro» (16:55): su affitti e visite il DG prepara e inoltra. «Tengo anche Direzione» (17:00): come membro del Consiglio può decidere anche lui.",
                "«Tutte e due gratis» (17:10): le visite ai centri non si pagano; gratis anche visite mediche, massaggi e nutrizione quando arriveranno.",
                "«12 mesi» (~19:20): i recapiti di chi scrive dall'esterno si tengono 12 mesi dall'arrivo, al più 6 mesi dopo «Non accolta» o «Annullata», 12 mesi dopo «Chiusa»; la cancellazione automatica gira ogni notte.",
              ]}
            />
          </Card>
          <Card id="intake-proposte" title="Proposte da confermare" sub="Disegno della Vetrina: in uso finché Francesco non decide diversamente">
            <RuleList
              items={[
                "Fasi: Ricevuta → In valutazione → Accettata o Non accolta → In gestione → Chiusa.",
                "Chi decide gli altri tipi: tornei responsabile tornei, DG e Presidente; sponsor e convenzioni DG, Presidente e Consiglio; altro Segreteria, DG e Presidente.",
                "Chi prepara e chi è informato per ogni tipo.",
                "Sponsor e convenzioni: contratto e fattura, nessun link di pagamento. Tornei, affitti e altro: pagamento dopo «Accettata».",
                "Al massimo 60 richieste all'ora dal modulo pubblico.",
              ]}
            />
            <SourceLine>Sempre valide (regole del club): mai nomi o dati di salute di minori; avvisi solo nell'app, all'esterno risponde una persona.</SourceLine>
          </Card>
        </aside>
      </div>
    </WorkAreaShell>
  );
}

function RuleList({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 list-none p-0 text-[14px] leading-snug">
      {items.map((t) => (
        <li key={t} className="border-t border-[var(--in-line)] px-4 py-2.5 sm:px-[18px]">
          {t}
        </li>
      ))}
    </ul>
  );
}

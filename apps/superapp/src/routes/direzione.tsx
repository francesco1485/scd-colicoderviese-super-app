import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, CalendarDays, ChevronRight, ClipboardList, HandCoins, HeartHandshake, KeyRound, Lightbulb, Mail, Package, Shirt, UserCheck, Users, Wallet } from "lucide-react";
import { useMemo } from "react";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";
import { ControlRoom } from "@/components/scd/ControlRoom";
import { Chip, useRomeNow } from "@/components/scd/interior-ui";
import { InteriorShell } from "@/components/scd/InteriorShell";
import { ShareLink } from "@/components/scd/ShareLink";
import { getAccessRequests } from "@/lib/access-requests.functions";
import { getSession } from "@/lib/auth.functions";
import { getCommInbox } from "@/lib/comm.functions";
import type { ControlRoomSources } from "@/lib/control-room";
import { getFeeBoard } from "@/lib/fees.functions";
import { searchKnowledge } from "@/lib/knowledge.functions";
import { getProposalQueue } from "@/lib/proposals.functions";
import { loadCalendar } from "@/lib/public-snapshots";
import { getTrainingQuadro } from "@/lib/quadro.functions";
import { getTransportBoard } from "@/lib/transport.functions";

/** A source that fails to load is shown as "not connected", never as an empty truth. */
async function soft<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

/**
 * Direzione landing. Signed in with an office position: shortcuts to the working pages and the pending access
 * requests. Everyone else: the access screen of the registry (src/lib/areas.ts ACCESS_SCREEN_IDS), as before.
 */
export const Route = createFileRoute("/direzione")({
  loader: async () => {
    const session = await getSession();
    const office = session.roles.includes("direzione") || session.roles.includes("dirigenza");
    // interior: the Control Room brings its own shell (no public chrome around it); the access screen keeps it.
    const base = { office, interior: office, roles: session.roles, badge: session.badge, email: session.user?.email ?? null };
    if (!office) return { ...base, pending: 0, cr: null };
    const cal = loadCalendar();
    const [requests, due, queue, inbox, fees, transport, quadro] = await Promise.all([
      soft(getAccessRequests()),
      soft(searchKnowledge({ data: { onlyDue: true, limit: 40 } })),
      soft(getProposalQueue()),
      soft(getCommInbox()),
      soft(getFeeBoard({ data: {} })),
      soft(getTransportBoard()),
      soft(getTrainingQuadro()),
    ]);
    const pending = requests ? requests.filter((r) => r.status === "PENDING").length : 0;
    return {
      ...base,
      pending,
      cr: {
        calendar: { events: cal.events, groups: cal.groups, sourceModifiedAt: cal.sourceModifiedAt, season: cal.season },
        quadro: quadro?.authorized ? { slots: quadro.quadro.slots, days: quadro.quadro.days, generatedUTC: quadro.quadro.generatedUTC } : null,
        queue,
        inbox,
        fees,
        transport,
        due,
        pendingAccess: requests ? pending : null,
      },
    };
  },
  head: () => accessHead("direzione"),
  component: DirezioneRoute,
});

const LINKS = [
  { to: "/tesoreria/compensi", icon: Wallet, title: "Compensi e stipendi", sub: "Verifica, autorizza e passa alla Tesoreria entro il 15 del mese." },
  { to: "/gestionale/posta", icon: Mail, title: "Posta del club", sub: "Mail a tesserati, famiglie, sponsor e fornitori da sportclubcolico@gmail.com; risposte qui. Collega la casella." },
  { to: "/direzione/cervellone", icon: Brain, title: "Cervellone", sub: "Cerca in documenti, file, posta, economia, storia e impianti. Scadenze in vista." },
  { to: "/direzione/accessi", icon: KeyRound, title: "Accessi e permessi", sub: "Chi entra, con quale ruolo e quali aree in più. Sospendi, riattiva, storico." },
  { to: "/segreteria/persone", icon: UserCheck, title: "Persone e richieste di accesso", sub: "Anagrafica del club e registrazioni da verificare." },
  { to: "/gestionale/mister", icon: Shirt, title: "Rose e convocazioni", sub: "Rosa di ogni squadra, convocazioni con presa visione e impedimenti segnalati." },
  { to: "/segreteria", icon: ClipboardList, title: "Segreteria", sub: "Scadenze, tesseramenti, distinte." },
  { to: "/calendario", icon: CalendarDays, title: "Calendario", sub: "Gare ufficiali della stagione." },
  { to: "/gestionale/organigramma", icon: Users, title: "Organigramma", sub: "Dirigenza, responsabili e staff." },
  { to: "/tesoreria/fondo-solidale", icon: HandCoins, title: "Fondo Solidale", sub: "Domande riservate, decisioni, entrate e uscite del Fondo. Da attivare (r101)." },
  { to: "/tesoreria/donazioni", icon: Package, title: "Donazioni e materiale", sub: "Donazioni registrate con ricevuta, offerte per palestra e infermeria." },
  { to: "/direzione/adotta", icon: HeartHandshake, title: "Adotta un oggetto", sub: "Catalogo delle cose di cui il club ha bisogno, adozioni e posti numerati." },
  { to: "/direzione/proposte", icon: Lightbulb, title: "Proposte di miglioramento", sub: "Idee e bisogni segnalati da chiunque, anche anonimi: valutazione e pubblicazione." },
] as const;

function DirezioneRoute() {
  const d = Route.useLoaderData();
  const now = useRomeNow();
  const sources = useMemo<ControlRoomSources | null>(
    () => (d.cr ? { ...d.cr, today: now.date, nowHHMM: now.time, nowIso: new Date().toISOString() } : null),
    [d.cr, now.date, now.time],
  );
  if (!d.office || !sources) return <AccessScreenPage id="direzione" />;
  return (
    <InteriorShell title="Direzione" path="/direzione" activeAreaId="direzione" roles={new Set(d.roles)} roleLabel={d.badge ?? "Direzione"}>
      <ControlRoom sources={sources} path="/direzione" tools={<DirectionTools email={d.email} pending={d.pending} />} />
    </InteriorShell>
  );
}

/** The governance shortcuts of the Direzione, kept under the Control Room (same links as before). */
function DirectionTools({ email, pending }: { email: string | null; pending: number }) {
  return (
    <section aria-labelledby="dir-strumenti-t" className="ex-panel overflow-hidden" id="dir-scorciatoie">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5">
        <div className="min-w-0">
          <h2 id="dir-strumenti-t" className="ex-title m-0 text-[17px]">Strumenti di direzione</h2>
          {email && <p className="mt-1 text-[13px] text-[var(--ex-sub)]">Sei entrato come {email}.</p>}
        </div>
        <ShareLink path="/direzione" />
      </header>
      <ul className="m-0 grid list-none grid-cols-1 border-t border-[var(--ex-hair)] p-0 md:grid-cols-2 xl:grid-cols-3">
        {LINKS.map((l) => (
          <li key={l.to} className="border-b border-[var(--ex-hair)] md:border-r md:[&:nth-child(2n)]:border-r-0 xl:[&:nth-child(2n)]:border-r xl:[&:nth-child(3n)]:border-r-0">
            <Link to={l.to} className="scd-focus flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-[rgb(11_27_51/0.025)] sm:px-5">
              <l.icon className="size-5 flex-none text-[var(--ex-ink)]" strokeWidth={1.75} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <b className="block text-[14.5px] font-semibold leading-tight">{l.title}</b>
                <span className="block text-[12.5px] leading-snug text-[var(--ex-sub)]">{l.sub}</span>
              </span>
              {l.to === "/segreteria/persone" && pending > 0 && <Chip tone="warn">{pending} da verificare</Chip>}
              <ChevronRight className="size-4 flex-none text-[var(--ex-sub)]" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

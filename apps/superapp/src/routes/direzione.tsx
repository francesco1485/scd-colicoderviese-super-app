import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, CalendarDays, ChevronRight, ClipboardList, KeyRound, Shirt, UserCheck, Users, Wallet } from "lucide-react";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";
import { Card, Chip } from "@/components/scd/interior-ui";
import { InteriorShell } from "@/components/scd/InteriorShell";
import { getAccessRequests } from "@/lib/access-requests.functions";
import { getSession } from "@/lib/auth.functions";
import { ClubDeadlinesCard } from "@/components/scd/ClubDeadlines";
import { ShareLink } from "@/components/scd/ShareLink";
import { useRomeNow } from "@/components/scd/interior-ui";
import { searchKnowledge } from "@/lib/knowledge.functions";

/**
 * Direzione landing. Signed in with an office position: shortcuts to the working pages and the pending access
 * requests. Everyone else: the access screen of the registry (src/lib/areas.ts ACCESS_SCREEN_IDS), as before.
 */
export const Route = createFileRoute("/direzione")({
  loader: async () => {
    const session = await getSession();
    const office = session.roles.includes("direzione") || session.roles.includes("dirigenza");
    const [requests, due] = office
      ? await Promise.all([getAccessRequests(), searchKnowledge({ data: { onlyDue: true, limit: 8 } })])
      : [[], null];
    return { due, office, roles: session.roles, badge: session.badge, email: session.user?.email ?? null, pending: requests.filter((r) => r.status === "PENDING").length };
  },
  head: () => accessHead("direzione"),
  component: DirezioneRoute,
});

const LINKS = [
  { to: "/tesoreria/compensi", icon: Wallet, title: "Compensi e stipendi", sub: "Verifica, autorizza e passa alla Tesoreria entro il 15 del mese." },
  { to: "/direzione/cervellone", icon: Brain, title: "Cervellone", sub: "Cerca in documenti, file, posta, economia, storia e impianti. Scadenze in vista." },
  { to: "/direzione/accessi", icon: KeyRound, title: "Accessi e permessi", sub: "Chi entra, con quale ruolo e quali aree in più. Sospendi, riattiva, storico." },
  { to: "/segreteria/persone", icon: UserCheck, title: "Persone e richieste di accesso", sub: "Anagrafica del club e registrazioni da verificare." },
  { to: "/gestionale/mister", icon: Shirt, title: "Rose e convocazioni", sub: "Rosa di ogni squadra, convocazioni con presa visione e impedimenti segnalati." },
  { to: "/segreteria", icon: ClipboardList, title: "Segreteria", sub: "Scadenze, tesseramenti, distinte." },
  { to: "/calendario", icon: CalendarDays, title: "Calendario", sub: "Gare ufficiali della stagione." },
  { to: "/gestionale/organigramma", icon: Users, title: "Organigramma", sub: "Dirigenza, responsabili e staff." },
] as const;

function DirezioneRoute() {
  const d = Route.useLoaderData();
  const now = useRomeNow();
  if (!d.office) return <AccessScreenPage id="direzione" />;
  return (
    <InteriorShell
      title="Direzione"
      path="/direzione"
      activeAreaId="direzione"
      roles={new Set(d.roles)}
      roleLabel={d.badge ?? "Direzione"}
      highlights={[{ value: d.pending, label: "richieste di accesso da verificare" }]}
    >
      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_400px]">
      <Card id="dir-scorciatoie" title="Da qui governi l'app" sub={d.email ? `Sei entrato come ${d.email}.` : undefined} aside={<ShareLink path="/direzione" />} className="xl:self-start">
        <ul className="m-0 list-none p-0">
          {LINKS.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="scd-focus flex min-h-16 items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 hover:bg-[#f7fbff] sm:px-[18px]">
                <l.icon className="size-6 flex-none text-[var(--in-info)]" strokeWidth={1.8} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <b className="block text-[16px] leading-tight">{l.title}</b>
                  <span className="block text-[13.5px] leading-snug text-[var(--in-sub)]">{l.sub}</span>
                </span>
                {l.to === "/segreteria/persone" && d.pending > 0 && <Chip tone="warn">{d.pending} da verificare</Chip>}
                <ChevronRight className="size-5 flex-none text-[var(--in-sub)]" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      {d.due && <ClubDeadlinesCard id="dir-scadenze" due={d.due} today={now.date} className="xl:self-start" />}
      </div>
    </InteriorShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { MembersOnlyScreen, membersOnlyHead } from "@/components/scd/MembersOnly";
import { SquadraCarte } from "@/components/squadre/SquadraCarte";
import { getSession } from "@/lib/auth.functions";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { hallTeams } from "@/lib/club-profile";
import { getPublicRoster } from "@/lib/public-roster.functions";
import { deckTeams, pickTeam } from "@/lib/squadra-carte";
import { getStaffRoster } from "@/lib/staff-roster.functions";

/**
 * /squadre/carte — carte della rosa (DG 15/10/2026 09:18). Teams are inside (UD-100): the loader asks the server for
 * the session first and loads nothing for anonymous visitors. For signed-in callers it uses only the existing
 * functions (calendar snapshot for the teams, getPublicRoster for the selected team, getStaffRoster for the staff),
 * which keep their own members-only checks and age rule.
 */
interface Search {
  squadra?: string;
}

export const Route = createFileRoute("/squadre_/carte")({
  validateSearch: (s: Record<string, unknown>): Search =>
    typeof s["squadra"] === "string" || typeof s["squadra"] === "number" ? { squadra: String(s["squadra"]).slice(0, 40) } : {},
  loaderDeps: ({ search }) => ({ squadra: search.squadra }),
  loader: async ({ deps }) => {
    const session = await getSession();
    if (!session.user) return { signedIn: false as const, squadra: deps.squadra ?? null };
    const calendar = await getPublicCalendarSnapshot();
    const teams = deckTeams(hallTeams(calendar.groups)).map((t) => ({ id: t.id, label: t.label, years: t.years, color: t.color }));
    const team = pickTeam(deps.squadra, teams.map((t) => t.id));
    const [roster, staff] = await Promise.all([team ? getPublicRoster({ data: { team } }) : Promise.resolve(null), getStaffRoster()]);
    return { signedIn: true as const, teams, team, roster, staff };
  },
  head: () => membersOnlyHead("Carte della rosa"),
  component: CarteRoute,
});

function CarteRoute() {
  const data = Route.useLoaderData();
  if (!data.signedIn)
    return <MembersOnlyScreen next={data.squadra ? `/squadre/carte?squadra=${encodeURIComponent(data.squadra)}` : "/squadre/carte"} />;
  return <SquadraCarte teams={data.teams} team={data.team} roster={data.roster} staff={data.staff} />;
}

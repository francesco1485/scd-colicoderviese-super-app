import { createFileRoute } from "@tanstack/react-router";

import { PersonGrantsPage } from "@/components/scd/PersonGrantsPage";
import { WorkAreaGateView, workAreaHead } from "@/components/scd/work-area-ui";
import { getPersonGrants } from "@/lib/person-grants.functions";

/**
 * Abilitazioni di una persona (r100, UD-112 — Direzione 14/10/2026): the Direzione enables each section for this
 * person with a level and a perimeter. Same gate as /direzione/accessi; writes are Direzione-only and stay off
 * ("Da attivare") until migration r100 is applied. Never indexed.
 */
export const Route = createFileRoute("/direzione_/accessi_/$personId")({
  loader: async ({ params }) => {
    const data = await getPersonGrants({ data: { personId: params.personId } });
    return { data };
  },
  head: ({ loaderData }) => {
    const base = workAreaHead("accessi", loaderData?.data.gate);
    if (loaderData?.data.gate.view !== "page") return base;
    const who = loaderData.data.person?.name;
    return { meta: [{ title: `Abilitazioni${who ? ` · ${who}` : ""} — SCD Dentro · S.C.D. ColicoDerviese` }, { name: "robots", content: "noindex" }] };
  },
  component: PersonGrantsRoute,
});

function PersonGrantsRoute() {
  const { data } = Route.useLoaderData();
  const { personId } = Route.useParams();
  return (
    <WorkAreaGateView id="accessi" gate={data.gate}>
      <PersonGrantsPage initial={data} personId={personId} />
    </WorkAreaGateView>
  );
}

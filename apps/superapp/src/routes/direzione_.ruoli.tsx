import { createFileRoute } from "@tanstack/react-router";

import { RoleTemplatesPage } from "@/components/scd/RoleTemplatesPage";
import { WorkAreaGateView, workAreaHead } from "@/components/scd/work-area-ui";
import { getRoleTemplates } from "@/lib/role-templates.functions";

/**
 * Ruoli (r111, Francesco 15/10/2026): roles per platform (SCD ONE, CORE, GROW), always creatable empty; only the
 * Presidente and the Direttore Generale create or edit them. Same gate as /direzione/accessi. Writes stay off
 * ("Da attivare") until migration r111 is applied. Never indexed.
 */
export const Route = createFileRoute("/direzione_/ruoli")({
  loader: async () => ({ data: await getRoleTemplates() }),
  head: ({ loaderData }) => {
    const base = workAreaHead("accessi", loaderData?.data.gate);
    if (loaderData?.data.gate.view !== "page") return base;
    return { meta: [{ title: "Ruoli — SCD Dentro · S.C.D. ColicoDerviese" }, { name: "robots", content: "noindex" }] };
  },
  component: RolesRoute,
});

function RolesRoute() {
  const { data } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="accessi" gate={data.gate}>
      <RoleTemplatesPage initial={data} />
    </WorkAreaGateView>
  );
}

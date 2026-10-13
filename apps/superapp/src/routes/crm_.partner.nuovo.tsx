import { createFileRoute } from "@tanstack/react-router";

import { PartnerKitPage } from "@/components/partner-kit/PartnerKitPage";
import { WorkAreaGateView, workAreaHead } from "@/components/scd/work-area-ui";
import { getPartnerKitData } from "@/lib/partner-kit.functions";

/**
 * Kit nuovo partner (UD-109): the same kit for a prospect. Staff pick a logo file on the device (object URL, never
 * uploaded or stored) and optionally type the company name. Same access as /crm; never indexed.
 */
export const Route = createFileRoute("/crm_/partner/nuovo")({
  loader: async () => {
    const data = await getPartnerKitData();
    return { data, interior: data.gate.view === "page" };
  },
  head: ({ loaderData }) => {
    const base = workAreaHead("crm", loaderData?.data.gate);
    if (loaderData?.data.gate.view !== "page") return base;
    return { meta: [{ title: "Kit nuovo partner — SCD Dentro · S.C.D. ColicoDerviese" }, { name: "robots", content: "noindex" }] };
  },
  component: NewPartnerKitRoute,
});

function NewPartnerKitRoute() {
  const { data } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="crm" gate={data.gate}>
      <PartnerKitPage mode="new" data={data} />
    </WorkAreaGateView>
  );
}

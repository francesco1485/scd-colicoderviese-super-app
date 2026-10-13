import { createFileRoute } from "@tanstack/react-router";

import { PartnerKitPage } from "@/components/partner-kit/PartnerKitPage";
import { WorkAreaGateView, workAreaHead } from "@/components/scd/work-area-ui";
import { resolvePartnerSubject } from "@/lib/partner-kit";
import { getPartnerKitData } from "@/lib/partner-kit.functions";

/**
 * Kit partner (UD-109): internal page of the sponsor area, same access as /crm (work area "crm"). The subject is a
 * season sponsor (slug) or a CRM record ("crm-<name>"); unknown ids show "partner non trovato". Never indexed, never
 * linked from public pages.
 */
export const Route = createFileRoute("/crm_/partner/$partnerId")({
  loader: async ({ params }) => {
    const data = await getPartnerKitData();
    const interior = data.gate.view === "page";
    return { data, interior, subject: interior ? resolvePartnerSubject(params.partnerId) : null };
  },
  head: ({ loaderData }) => {
    const base = workAreaHead("crm", loaderData?.data.gate);
    if (loaderData?.data.gate.view !== "page") return base;
    return { meta: [{ title: "Kit partner — SCD Dentro · S.C.D. ColicoDerviese" }, { name: "robots", content: "noindex" }] };
  },
  component: PartnerKitRoute,
});

function PartnerKitRoute() {
  const { data, subject } = Route.useLoaderData();
  const { partnerId } = Route.useParams();
  return (
    <WorkAreaGateView id="crm" gate={data.gate}>
      <PartnerKitPage mode="partner" subject={subject} requestedId={partnerId} data={data} />
    </WorkAreaGateView>
  );
}

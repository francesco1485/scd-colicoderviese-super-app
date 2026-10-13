import { createFileRoute } from "@tanstack/react-router";

import { CommHubPage } from "@/components/scd/CommHub";
import { SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { getCommInbox, type InboxData } from "@/lib/comm.functions";
import { inboxCounts } from "@/lib/comm/rules";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/** Posta del club (r95, UD-101): Direzione, Segreteria and Tesoreria write and receive from the web app. */
export const Route = createFileRoute("/gestionale/posta")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "posta" } });
    const data: InboxData = gate.view === "page" ? await getCommInbox() : { connected: false, inbox: null, error: null };
    return { gate, interior: gate.view === "page", data };
  },
  head: ({ loaderData }) => workAreaHead("posta", loaderData?.gate),
  component: PostaRoute,
});

function PostaRoute() {
  const d = Route.useLoaderData();
  const c = inboxCounts(d.data.inbox);
  const s = d.data.inbox?.settings ?? null;
  return (
    <WorkAreaGateView id="posta" gate={d.gate}>
      {d.interior && (
        <WorkAreaShell
          id="posta"
          title="Posta del club"
          preview={d.gate.preview}
          editable
          highlights={[
            { value: d.data.inbox ? c.unread : null, label: "conversazioni non lette" },
            { value: d.data.inbox ? c.open : null, label: "aperte" },
            { value: d.data.inbox ? c.proposals : null, label: "nuovi contatti da decidere" },
            { value: s ? s.sentToday : null, label: s ? `inviate oggi su ${s.dailyCap}` : "inviate oggi" },
            { value: s ? s.queued : null, label: "in coda" },
          ]}
          note="Mail da sportclubcolico@gmail.com con il nome di chi scrive; le risposte tornano qui. Safeguarding escluso: ha il suo canale riservato."
        >
          <CommHubPage initial={d.data} />
          <SourcesBox id="posta" />
        </WorkAreaShell>
      )}
    </WorkAreaGateView>
  );
}

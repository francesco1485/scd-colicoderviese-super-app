import { createFileRoute } from "@tanstack/react-router";

import { Card, Chip, SourceLine } from "@/components/scd/interior-ui";
import { DirectoryStatusNote, PhoneShareCard, StaffDirectoryList, staffSummary } from "@/components/scd/StaffDirectory";
import { SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { getStaffDirectory, type DirectoryView } from "@/lib/staff-directory.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Rubrica staff (UD-167, Francesco 17/10/2026 11:11-11:13). Engines: PERSONE and TEMPO. One read of
 * scd_staff_directory (r141, caller's session): the database decides who sees whom (Direzione / Segreteria all; a
 * mister his teams plus pulmini, campi, magazzino, palestra, segreteria) and shows a number only with the person's
 * consent. The own consent ("Il mio numero") sits on top for staff members. Families see their card on /famiglia.
 */
const VIEWER_LABEL = { OFFICE: "Vedi tutto lo staff", STAFF: "Vedi lo staff delle tue squadre e i responsabili di società", FAMILY: "Vedi lo staff della squadra di tuo figlio e la Segreteria" } as const;

export const Route = createFileRoute("/gestionale/rubrica")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "rubrica" } });
    const view: DirectoryView = gate.view === "page" ? await getStaffDirectory() : { status: "unavailable", directory: null };
    return { gate, view };
  },
  head: ({ loaderData }) => workAreaHead("rubrica", loaderData?.gate),
  component: RubricaRoute,
});

function RubricaRoute() {
  const { gate, view } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="rubrica" gate={gate}>
      <WorkAreaShell id="rubrica" preview={gate.preview} status={<Chip tone="info">Chi fa cosa nello staff</Chip>}>
        <RubricaPage view={view} />
      </WorkAreaShell>
    </WorkAreaGateView>
  );
}

function RubricaPage({ view }: { view: DirectoryView }) {
  const d = view.status === "live" ? view.directory : null;
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-[18px]">
      <div className="flex min-w-0 flex-col gap-3">
        <Card id="rubrica-elenco" title="Rubrica staff" sub={d ? `${VIEWER_LABEL[d.viewer]} · ${staffSummary(d)}` : "Nome, ruolo e squadra dall'organigramma della società."}>
          <div className="px-4 pb-4 sm:px-[18px]">
            {view.status !== "live" ? (
              <DirectoryStatusNote status={view.status} />
            ) : d ? (
              <StaffDirectoryList directory={d} emptyText="Il tuo ruolo non è ancora collegato a una squadra o a un'area: lo collega la Segreteria." />
            ) : (
              <DirectoryStatusNote status="signed-out" />
            )}
          </div>
          <SourceLine>Organigramma 2026/27 dichiarato dalla Direzione il 17/10/2026, registro persone e ruoli del club. I numeri compaiono solo con il consenso della persona.</SourceLine>
        </Card>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        {d?.me && <PhoneShareCard me={d.me} />}
        <Card id="rubrica-regole" title="Chi vede cosa" sub="Regole decise dalla Direzione il 17/10/2026.">
          <ul className="m-0 flex list-disc flex-col gap-1.5 py-1 pl-9 pr-4 text-[14.5px] leading-snug">
            <li>Direzione e Segreteria vedono tutto lo staff.</li>
            <li>Il mister vede lo staff delle sue squadre e i responsabili di pulmini, campi, magazzino, palestra e segreteria.</li>
            <li>Le famiglie vedono lo staff della squadra del figlio e la Segreteria.</li>
            <li>Il numero si vede solo se la persona lo ha condiviso; altrimenti la Segreteria inoltra il messaggio.</li>
            <li>Mai minori, mai e-mail o dati sanitari nella rubrica.</li>
          </ul>
        </Card>
        <SourcesBox id="rubrica" />
      </div>
    </div>
  );
}

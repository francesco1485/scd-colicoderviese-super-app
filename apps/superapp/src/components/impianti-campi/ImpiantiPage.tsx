/**
 * /gestionale/impianti — "Impianti e campi" (boards Rotazione-campi, Rotazione-Dervio).
 * Layout of the 2D work environments: panoramica, colico, dervio, simulazione,
 * nuova, approvazioni (child routes, each with its own deep link).
 * Access: verified session with an allowed club position, or the staging
 * preview with a visible banner; otherwise the area access screen.
 */
import { EMPTY_QUADRO_SNAPSHOT, type QuadroSnapshot } from "@/features/impianti/snapshot";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Lock, MessageCircle } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { InteriorShell } from "@/components/scd/InteriorShell";
import { areaBadgeFor } from "@/lib/internal-badges";
import { SkyMascot } from "@/components/SkyChat";
import type { AssistantAction } from "@/lib/facility-assistant";
import {
  IMPIANTI_POSITIONS,
  POSITION_LABEL,
  approvalsAccess,
  impiantiAccess,
} from "@/lib/impianti-access";
import type { ImpiantiAccessState } from "@/lib/impianti.functions";
import type { BookingDraft } from "./BookingPlanner";
import { ImpiantiContext, type ImpiantiContextValue } from "./context";
import { useImpiantiModel } from "./model";
import { SkyPanel } from "./SkyPanel";
import { btnPrimary } from "./ui";

const IMPIANTI_PATH = "/gestionale/impianti";
const TITLE = "Impianti e campi";

type NavPath =
  | "/gestionale/impianti"
  | "/gestionale/impianti/colico"
  | "/gestionale/impianti/dervio"
  | "/gestionale/impianti/simulazione"
  | "/gestionale/impianti/nuova"
  | "/gestionale/impianti/approvazioni";

const NAV: { to: NavPath; label: string; approvers?: boolean }[] = [
  { to: "/gestionale/impianti", label: "Panoramica" },
  { to: "/gestionale/impianti/colico", label: "Colico" },
  { to: "/gestionale/impianti/dervio", label: "Dervio" },
  { to: "/gestionale/impianti/simulazione", label: "Simulazione" },
  { to: "/gestionale/impianti/nuova", label: "Nuova prenotazione" },
  {
    to: "/gestionale/impianti/approvazioni",
    label: "Approvazioni",
    approvers: true,
  },
];

export function AccessScreen({
  title = TITLE,
  path = IMPIANTI_PATH,
  positions = IMPIANTI_POSITIONS,
  inside,
}: {
  title?: string;
  path?: string;
  positions?: readonly string[];
  inside?: readonly string[];
}) {
  const items = inside ?? [
    "Chi usa quale parte del campo, giorno per giorno",
    "Conflitti sul campo 1 e avvisi per le gare a Dervio",
    "Simulazioni e nuove prenotazioni con anteprima 2D",
    "Chiedi a Iride: risposte dal calendario reale",
  ];
  return (
    <div className="mx-auto grid max-w-[720px] gap-5">
      <section
        aria-labelledby="h-access"
        className="overflow-hidden rounded-2xl text-white shadow-[var(--in-card-shadow)]"
        style={{
          background:
            "linear-gradient(180deg,#062a52 0%,#0860A8 62%,#1898D8 100%)",
        }}
      >
        <div className="grid gap-4 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex size-12 flex-none items-center justify-center rounded-xl bg-white/14">
              <Lock className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="h-access"
                className="m-0 font-title text-[34px] font-extrabold leading-none"
              >
                {title}
              </h2>
              <span className="mt-1 inline-block rounded-full bg-white/16 px-2.5 py-0.5 text-[13px] font-semibold">
                Riservata
              </span>
            </div>
          </div>
          <ul className="m-0 grid gap-1.5 pl-5 text-[15px] text-[#e6f3fc]">
            {items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <div>
            <Link
              to="/aree/$area"
              params={{ area: "direzione" }}
              className={btnPrimary}
            >
              Entra
            </Link>
          </div>
          <p className="m-0 text-[14px] text-[#d6ebfb]">
            Link diretto {path}. Un solo account SCD apre tutte le aree a cui
            hai accesso. Il login SCD è in attivazione: finché non è attivo
            l'area resta chiusa.
          </p>
        </div>
      </section>
      <section
        aria-labelledby="h-who"
        className="rounded-2xl border border-[var(--in-line)] bg-white p-5 shadow-[var(--in-card-shadow)]"
      >
        <h2 id="h-who" className="m-0 text-[19px] font-bold">
          Chi può entrare
        </h2>
        <ul className="m-0 mt-2 grid gap-1 pl-5 text-[15px]">
          {positions.map((p) => (
            <li key={p}>{POSITION_LABEL[p] ?? p}</li>
          ))}
        </ul>
        <p className="m-0 mt-3 text-[14px] text-[var(--in-sub)]">
          Ruoli decisi dalla società l'11 ottobre 2026; valgono quando il login
          SCD sarà attivo. Non hai accesso? Scrivi alla segreteria.
        </p>
      </section>
    </div>
  );
}

function Tool({
  access,
  quadro,
  preview,
  position,
}: {
  access: ImpiantiAccessState;
  quadro: QuadroSnapshot;
  preview: boolean;
  position: string | null;
}) {
  const model = useImpiantiModel();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [sky, setSky] = useState(false);
  const canApprove =
    approvalsAccess(access.session, access.stagingPreview).mode !== "access";
  const requestedBy = position ? (POSITION_LABEL[position] ?? position) : "";

  const onAction = useCallback(
    (a: AssistantAction) => {
      if (a.type === "open-day")
        void navigate({
          to: "/gestionale/impianti/simulazione",
          search: { giorno: a.date },
        });
      else if (a.type === "open-tab")
        void navigate({ to: `/gestionale/impianti/${a.tab}` as NavPath });
      else {
        setDraft({ ...a.draft });
        void navigate({ to: "/gestionale/impianti/nuova" });
      }
    },
    [navigate],
  );

  const upcomingConflicts = model.analysis.conflictDays.filter(
    (d) => d >= model.today,
  ).length;
  const dervioMatches = model.analysis.dervio.filter(
    (d) => d.match.kind === "match",
  ).length;
  const highlights = useMemo(
    () => [
      {
        value: upcomingConflicts,
        label: "giorni con conflitti sul campo 1 da oggi",
      },
      { value: 3, label: "campi reali: Colico 1 e 2, Dervio" },
      { value: dervioMatches, label: "gare a Dervio nello scenario" },
      { value: null, label: "turni confermati nel foglio rotazione" },
    ],
    [upcomingConflicts, dervioMatches],
  );
  const roles = useMemo(
    () => new Set<string>(position ? [position] : ["direzione"]),
    [position],
  );
  const ctx = useMemo<ImpiantiContextValue>(
    () => ({
      model,
      quadro,
      preview,
      position,
      requestedBy,
      canApprove,
      draft,
      setDraft,
    }),
    [model, quadro, preview, position, requestedBy, canApprove, draft],
  );

  return (
    <ImpiantiContext.Provider value={ctx}>
      <InteriorShell
        title={TITLE}
        path={IMPIANTI_PATH}
        activeAreaId="impianti-campi"
        roles={roles}
        roleLabel={
          position
            ? (POSITION_LABEL[position] ?? position)
            : "Anteprima staging"
        }
        highlights={highlights}
        badge={areaBadgeFor("impianti-campi")}
      >
        <div className={`grid grid-cols-[minmax(0,1fr)] gap-[18px] ${sky ? "lg:pr-[416px]" : ""}`}>
          {preview && (
            <p
              role="status"
              className="m-0 rounded-xl border-2 border-dashed border-[var(--in-warn)] bg-[var(--in-warn-bg)] px-4 py-2.5 text-[15px] font-semibold text-[var(--in-warn)]"
            >
              Anteprima staging — accesso reale da attivare con il login. Qui
              chiunque abbia la password dello staging vede lo strumento.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav
              aria-label="Ambienti di lavoro"
              className="-mx-1 w-full min-w-0 max-w-full overflow-x-auto px-1 pb-1 xl:w-auto"
            >
              <ul className="m-0 flex w-max list-none gap-1 rounded-xl bg-[#e2edf8] p-1">
                {NAV.filter((n) => !n.approvers || canApprove).map((n) => (
                  <li key={n.to}>
                    <Link
                      to={n.to}
                      activeOptions={{ exact: true, includeSearch: false }}
                      className="scd-focus flex min-h-10 items-center whitespace-nowrap rounded-[10px] px-3.5 text-[15px] font-semibold text-[var(--in-sub)] hover:text-[var(--in-ink)]"
                      activeProps={{
                        className: "bg-white !text-[var(--in-ink)] shadow-sm",
                        "aria-current": "page",
                      }}
                    >
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <button
              type="button"
              onClick={() => setSky((s) => !s)}
              aria-expanded={sky}
              className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--in-line)] bg-white py-1 pl-1 pr-4 text-[15px] font-semibold text-[var(--in-info)] shadow-[var(--in-card-shadow)] hover:bg-[var(--in-info-bg)]"
            >
              <SkyMascot size={34} persona="vera" />
              Chiedi a Iride
              <MessageCircle className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="@container min-w-0">
            <Outlet />
          </div>
        </div>
        <SkyPanel
          model={model}
          open={sky}
          onClose={() => setSky(false)}
          onAction={onAction}
        />
      </InteriorShell>
    </ImpiantiContext.Provider>
  );
}

export function ImpiantiLayout({ access, quadro }: { access: ImpiantiAccessState; quadro: QuadroSnapshot | null }) {
  const decision = impiantiAccess(access.session, access.stagingPreview);
  if (decision.mode === "access") {
    return (
      <InteriorShell
        title={TITLE}
        path={IMPIANTI_PATH}
        activeAreaId="impianti-campi"
        roles={new Set<string>()}
        roleLabel="Accesso non verificato"
      >
        <AccessScreen />
      </InteriorShell>
    );
  }
  return (
    <Tool
      access={access}
      quadro={quadro ?? EMPTY_QUADRO_SNAPSHOT}
      preview={decision.mode === "preview"}
      position={decision.mode === "tool" ? decision.position : null}
    />
  );
}

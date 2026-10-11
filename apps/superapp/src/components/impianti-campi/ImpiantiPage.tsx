/**
 * /gestionale/impianti — "Impianti e campi" (boards Rotazione-campi, Rotazione-Dervio).
 * Access: verified session with an allowed club position, or the staging
 * preview with a visible banner; otherwise the area access screen.
 */
import { Link } from "@tanstack/react-router";
import { Lock, MessageCircle } from "lucide-react";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { InteriorShell } from "@/components/scd/InteriorShell";
import { SkyMascot } from "@/components/SkyChat";
import { findArea } from "@/lib/areas";
import type { AssistantAction } from "@/lib/facility-assistant";
import {
  IMPIANTI_POSITIONS,
  POSITION_LABEL,
  impiantiAccess,
} from "@/lib/impianti-access";
import type { ImpiantiAccessState } from "@/lib/impianti.functions";
import { ColicoTab } from "./ColicoTab";
import { DervioTab } from "./DervioTab";
import { useImpiantiModel, type TabId } from "./model";
import type { BookingDraft } from "./BookingPlanner";
import { SimulazioneTab } from "./SimulazioneTab";
import { SkyPanel } from "./SkyPanel";
import { btnPrimary } from "./ui";

const PATH = "/gestionale/impianti";
const TITLE = "Impianti e campi";
const TABS: { id: TabId; label: string }[] = [
  { id: "colico", label: "Colico" },
  { id: "dervio", label: "Dervio" },
  { id: "simulazione", label: "Simulazione" },
];

function AccessScreen() {
  const area = findArea("impianti-campi");
  return (
    <InteriorShell
      title={TITLE}
      path={PATH}
      activeAreaId="impianti-campi"
      roles={new Set<string>()}
      roleLabel="Accesso non verificato"
    >
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
              <span className="flex size-12 items-center justify-center rounded-xl bg-white/14">
                <Lock className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h2
                  id="h-access"
                  className="m-0 font-title text-[34px] font-extrabold leading-none"
                >
                  {TITLE}
                </h2>
                <span className="mt-1 inline-block rounded-full bg-white/16 px-2.5 py-0.5 text-[13px] font-semibold">
                  Riservata
                </span>
              </div>
            </div>
            <p className="m-0 text-[16px] leading-snug text-[#e6f3fc]">
              Mappe dei campi di Colico e Dervio, rotazioni e simulazioni per
              decidere dove giocare, con le ipotesi di affitto e di eventi.
            </p>
            <ul className="m-0 grid gap-1.5 pl-5 text-[15px] text-[#e6f3fc]">
              <li>Chi usa quale parte del campo, giorno per giorno</li>
              <li>Conflitti sul campo 1 e avvisi al Comune di Dervio</li>
              <li>Simulazioni e ipotesi: nessuna gara spostata davvero</li>
              <li>Chiedi a Sky: risposte dal calendario reale</li>
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
              Un solo account SCD apre tutte le aree a cui hai accesso. Il login
              SCD è in attivazione: finché non è attivo l'area resta chiusa.
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
            {IMPIANTI_POSITIONS.map((p) => (
              <li key={p}>{POSITION_LABEL[p] ?? p}</li>
            ))}
          </ul>
          <p className="m-0 mt-3 text-[14px] text-[var(--in-sub)]">
            Ruoli decisi dalla società l'11 ottobre 2026
            {area?.access_note
              ? "; valgono quando il login SCD sarà attivo"
              : ""}
            . Non hai accesso? Scrivi alla segreteria.
          </p>
        </section>
      </div>
    </InteriorShell>
  );
}

function Tool({
  preview,
  position,
}: {
  preview: boolean;
  position: string | null;
}) {
  const model = useImpiantiModel();
  const [tab, setTab] = useState<TabId>("colico");
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [sky, setSky] = useState(false);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const go = useCallback((t: TabId, date: string | null = null) => {
    setTab(t);
    setFocusDate(date);
  }, []);
  const onAction = useCallback(
    (a: AssistantAction) => {
      if (a.type === "open-day") go("simulazione", a.date);
      else if (a.type === "open-tab") go(a.tab);
      else {
        setDraft({ ...a.draft });
        go("simulazione");
      }
    },
    [go],
  );
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next =
      e.key === "ArrowRight"
        ? (i + 1) % TABS.length
        : e.key === "ArrowLeft"
          ? (i - 1 + TABS.length) % TABS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? TABS.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    const t = TABS[next]!;
    go(t.id);
    tabRefs.current[t.id]?.focus();
  };

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

  return (
    <InteriorShell
      title={TITLE}
      path={PATH}
      activeAreaId="impianti-campi"
      roles={roles}
      roleLabel={
        position ? (POSITION_LABEL[position] ?? position) : "Anteprima staging"
      }
      highlights={highlights}
    >
      <div className={`grid gap-[18px] ${sky ? "lg:pr-[416px]" : ""}`}>
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
          <div
            role="tablist"
            aria-label="Centro sportivo e simulazione"
            className="flex gap-1 rounded-xl bg-[#e2edf8] p-1"
          >
            {TABS.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                id={`tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => go(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`scd-focus min-h-10 rounded-[10px] px-4 text-[15px] font-semibold ${tab === t.id ? "bg-white text-[var(--in-ink)] shadow-sm" : "text-[var(--in-sub)]"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSky((s) => !s)}
            aria-expanded={sky}
            className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--in-line)] bg-white py-1 pl-1 pr-4 text-[15px] font-semibold text-[var(--in-info)] shadow-[var(--in-card-shadow)] hover:bg-[var(--in-info-bg)]"
          >
            <SkyMascot size={34} />
            Chiedi a Sky
            <MessageCircle className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className="@container min-w-0"
        >
          {tab === "colico" && (
            <ColicoTab
              model={model}
              focusDate={focusDate}
              onSimulate={(d) => go("simulazione", d)}
            />
          )}
          {tab === "dervio" && (
            <DervioTab
              model={model}
              onTryAuto={() => model.applyPreset("auto")}
            />
          )}
          {tab === "simulazione" && (
            <SimulazioneTab model={model} focusDate={focusDate} draft={draft} />
          )}
        </div>
      </div>
      <SkyPanel
        model={model}
        open={sky}
        onClose={() => setSky(false)}
        onAction={onAction}
      />
    </InteriorShell>
  );
}

export function ImpiantiPage({ access }: { access: ImpiantiAccessState }) {
  const decision = impiantiAccess(access.session, access.stagingPreview);
  if (decision.mode === "access") return <AccessScreen />;
  return (
    <Tool
      preview={decision.mode === "preview"}
      position={decision.mode === "tool" ? decision.position : null}
    />
  );
}

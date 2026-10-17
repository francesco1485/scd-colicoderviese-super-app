import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardCheck, Clock, Lock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Card, Chip, SourceLine } from "@/components/scd/interior-ui";
import { EmptyState, PendingButton, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import type { WorkAreaGate } from "@/lib/access";
import { GAP_KINDS, GAP_LABEL, MONTHLY_CHECK_PLAN, gapCounts, isMonth, monthLabel, previousMonth } from "@/lib/monthly-check";
import { AREA_ALLENAMENTI_LIVE, AREA_PARTITE_LIVE, NOT_LIVE_TEXT } from "@/lib/team-area";
import { createMonthlyRequests, getMonthlyCheck, type MonthlyCheck } from "@/lib/team-area.functions";
import { freshnessLabel } from "@/lib/public-snapshots";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

function todayRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/**
 * Verifica mensile della Segreteria (UD-181): for each team, the matches of the month without convocazione, distinta,
 * tabellino, resoconto or referto, and the trainings without attendance. Nothing is sent by itself: the Segreteria
 * reads the list and presses «Crea le richieste»; the teams answer «integrato» or «giustifica» in their area.
 */
export const Route = createFileRoute("/segreteria_/verifiche")({
  validateSearch: (s: Record<string, unknown>): { mese?: string } => (typeof s["mese"] === "string" && isMonth(s["mese"]) ? { mese: s["mese"] } : {}),
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "segreteria" } });
    return { gate };
  },
  head: ({ loaderData }) => {
    const h = workAreaHead("segreteria", loaderData?.gate);
    return loaderData?.gate.view === "page" ? { ...h, meta: [{ title: "Verifica mensile — SCD Dentro · S.C.D. ColicoDerviese" }, { name: "robots", content: "noindex" }] } : h;
  },
  component: VerificheRoute,
});

function VerificheRoute() {
  const { gate } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="segreteria" gate={gate}>
      <VerifichePage gate={gate} />
    </WorkAreaGateView>
  );
}

const LIVE = AREA_PARTITE_LIVE && AREA_ALLENAMENTI_LIVE;

function VerifichePage({ gate }: { gate: WorkAreaGate }) {
  const { mese } = Route.useSearch();
  const navigate = useNavigate({ from: "/segreteria/verifiche" });
  const today = todayRome();
  const month = mese ?? previousMonth(today);
  const load = useServerFn(getMonthlyCheck);
  const create = useServerFn(createMonthlyRequests);
  const [check, setCheck] = useState<MonthlyCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const reload = useCallback(async () => {
    try {
      setCheck(await load({ data: { month } }));
    } catch {
      setCheck({ state: "error", month, gaps: [], requests: [], calendarCopy: "" });
    }
  }, [load, month]);
  useEffect(() => {
    if (LIVE) void reload();
  }, [reload]);

  const months = [0, 1, 2, 3, 4, 5].map((i) => {
    let m = today.slice(0, 7);
    for (let k = 0; k < i; k++) m = previousMonth(`${m}-01`);
    return m;
  });
  const counts = check ? gapCounts(check.gaps) : null;
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;
  const run = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await create({ data: { month } });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) await reload();
    } catch {
      setMsg({ ok: false, text: "Richieste non create, riprova." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <WorkAreaShell
      id="segreteria"
      path="/segreteria/verifiche"
      title="Verifica mensile delle squadre"
      preview={gate.preview}
      editable={LIVE}
      status={LIVE ? undefined : <Chip tone="warn">In arrivo (serve r117 e r118)</Chip>}
      highlights={[
        { value: LIVE ? total : null, label: `cose da integrare · ${monthLabel(month)}` },
        { value: LIVE && check ? check.gaps.length : null, label: "squadre con qualcosa da chiedere" },
        { value: LIVE && check ? check.requests.filter((r) => r.status === "OPEN").length : null, label: "richieste ancora aperte" },
      ]}
    >
      <div className="flex flex-col gap-[18px]">
        <label className="flex flex-wrap items-center gap-3 text-[15px] font-semibold">
          Mese
          <select value={month} onChange={(e) => void navigate({ search: { mese: e.target.value }, replace: true })}
            className="scd-focus h-11 min-w-[200px] rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-medium">
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </label>

        <Card id="ver-piano" title="Quando parte" sub="La verifica prepara la lista; le richieste le crea una persona della Segreteria.">
          <p className="m-0 flex items-start gap-2 px-4 pb-4 text-[14.5px] leading-snug sm:px-[18px]">
            <Clock className="mt-0.5 size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />
            <span>{MONTHLY_CHECK_PLAN.text}</span>
          </p>
        </Card>

        {!LIVE ? (
          <Card id="ver-off" title="Cosa controlla">
            <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
              <p className="m-0 flex items-start gap-2 rounded-xl bg-[#fffbe6] px-3 py-3 text-[14.5px] leading-snug">
                <Lock className="mt-0.5 size-4 flex-none text-[var(--in-warn)]" aria-hidden="true" />
                <span>{NOT_LIVE_TEXT.verifiche}</span>
              </p>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[14.5px]">
                <li>Per ogni gara giocata nel mese: convocazione, distinta pronta, tabellino, resoconto e referto.</li>
                <li>Per ogni allenamento registrato e fatto: le presenze.</li>
                <li>Per ogni cosa che manca, una richiesta alla squadra: integrare o giustificare.</li>
              </ul>
              <PendingButton reason="Serve l'aggiornamento r117 e r118 del database">Crea le richieste</PendingButton>
            </div>
          </Card>
        ) : !check ? (
          <p className="m-0 text-[14px] text-[var(--in-sub)]" role="status">Controllo il mese…</p>
        ) : check.state !== "ok" ? (
          <EmptyState title={check.state === "forbidden" || check.state === "signed-out" ? "Solo Segreteria e Direzione" : "Verifica non disponibile"}>
            {check.state === "forbidden" || check.state === "signed-out" ? "La verifica mensile la fanno la Segreteria e la Direzione." : "Lettura non riuscita, riprova tra poco."}
          </EmptyState>
        ) : (
          <>
            <Card id="ver-esito" title={`${monthLabel(month)}: cosa manca`} sub="Dal calendario ufficiale e da quello che le squadre hanno registrato nell'app."
              aside={<button type="button" disabled={busy || check.gaps.length === 0} onClick={() => void run()} className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--scd-blue)] px-4 text-[15px] font-semibold text-white disabled:opacity-60"><ClipboardCheck className="size-4" aria-hidden="true" />Crea le richieste</button>}>
              <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-[18px]">
                {counts && GAP_KINDS.map((k) => <Chip key={k} tone={counts[k] ? "warn" : "ok"}>{GAP_LABEL[k]} {counts[k]}</Chip>)}
              </div>
              <p role="status" aria-live="polite" className={`m-0 px-4 pb-2 text-[14px] sm:px-[18px] ${msg?.ok === false ? "text-[var(--in-crit)]" : "text-[var(--in-sub)]"}`}>{msg?.text}</p>
              {check.gaps.length === 0 ? (
                <div className="px-4 pb-4 sm:px-[18px]"><EmptyState title="Niente da chiedere">Tutte le squadre hanno completato il mese.</EmptyState></div>
              ) : (
                check.gaps.map((t) => (
                  <section key={t.teamCode} aria-label={t.label} className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
                    <b className="block text-[15.5px]">{t.label} <span className="font-normal text-[var(--in-sub)]">· {t.items.length}</span></b>
                    <ul className="m-0 mt-1 flex list-disc flex-col gap-0.5 pl-5 text-[14.5px]">
                      {t.items.map((i) => <li key={`${i.kind}-${i.ref}`}>{i.label}</li>)}
                    </ul>
                  </section>
                ))
              )}
              <SourceLine>Calendario: copia del {freshnessLabel(check.calendarCopy)}. Le gare senza nessun dato registrato contano come «da compilare», mai come complete.</SourceLine>
            </Card>
            {check.requests.length > 0 && (
              <Card id="ver-richieste" title="Richieste già create">
                <ul className="m-0 list-none p-0">
                  {check.requests.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2 border-t border-[var(--in-line)] px-4 py-2.5 text-[14.5px] sm:px-[18px]">
                      <span className="min-w-0 flex-1">{r.label}{r.answerNote ? <span className="block text-[13px] text-[var(--in-sub)]">{r.answerNote}</span> : null}</span>
                      <Chip tone={r.status === "OPEN" ? "warn" : "ok"}>{r.status === "OPEN" ? "Aperta" : r.status === "INTEGRATED" ? "Integrata" : r.status === "JUSTIFIED" ? "Giustificata" : "Chiusa"}</Chip>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>
    </WorkAreaShell>
  );
}

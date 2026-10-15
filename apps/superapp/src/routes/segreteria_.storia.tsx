/**
 * /segreteria/storia — "Storia dei calciatori" (r131). Who stays, who comes back, who arrives and
 * from where, who did not come back, season by season, from the FIGC/LND portal data.
 * Same access as /segreteria/persone (Direzione, Segreteria). Every name is "Nome C." + birth year.
 * Engines: PERSONE (retention and recovery list) and TEMPO (no manual portal reconciliation).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronDown, ClipboardCopy, Search, Upload } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";

import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { FIGC_EXPORT_BOOKMARKLET, FIGC_EXPORT_SOURCE } from "@/lib/figc-export-script";
import {
  CLASS_HINT,
  CLASS_LABEL,
  MAX_EXPORT_BYTES,
  SECTOR_LABEL,
  SECTOR_SHORT,
  filterDepartures,
  groupByBirthYear,
  parseExportFile,
  searchPlayers,
  shortSeason,
  type CurrentPlayer,
  type HistoryView,
  type ParsedImport,
  type PlayerClass,
  type PlayerRef,
  type Sector,
} from "@/lib/figc-history";
import { getFigcHistory, importFigcHistory, type FigcHistoryData } from "@/lib/figc-history.functions";
import { itDate } from "@/lib/people";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

const PATH = "/segreteria/storia";

export const Route = createFileRoute("/segreteria_/storia")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "persone" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const data = await getFigcHistory();
    return { gate, interior: true as const, data };
  },
  head: ({ loaderData }) => {
    const h = workAreaHead("persone", loaderData?.gate);
    if (!loaderData?.gate || loaderData.gate.view !== "page") return h;
    return {
      meta: [
        { title: "Storia dei calciatori — SCD Dentro · S.C.D. ColicoDerviese" },
        { name: "description", content: "Chi resta, chi torna, chi arriva e chi non è tornato, stagione per stagione, dai dati FIGC. Direzione e Segreteria." },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: StoriaRoute,
});

function StoriaRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="persone" gate={d.gate}>
      {d.interior && <StoriaPage initial={d.data} preview={d.gate.preview} />}
    </WorkAreaGateView>
  );
}

const CLASSES: readonly PlayerClass[] = ["CONFERMATO", "RIENTRO", "NUOVO", "PRIMO"];
const CLASS_TONE: Record<PlayerClass, ChipTone> = { CONFERMATO: "ok", RIENTRO: "info", NUOVO: "warn", PRIMO: "mute" };
const num = (n: number | null | undefined) => (n === null || n === undefined ? "—" : String(n));
const pad = "px-4 pb-4 sm:px-[18px]";
const inputCls = "h-11 w-full bg-transparent text-[15px] outline-none";

function StoriaPage({ initial, preview }: { initial: FigcHistoryData; preview: boolean }) {
  const [data, setData] = useState(initial);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const reload = useServerFn(getFigcHistory);
  const v = data.view;
  const cur = v?.current ? v.table.find((t) => t.season === v.current) ?? null : null;
  const nuovi = v ? v.breakdown.D.NUOVO + v.breakdown.S.NUOVO : null;

  async function refresh() {
    try {
      setData(await reload());
      setRefreshError(null);
    } catch {
      // Keep the current view and say it plainly.
      setRefreshError("Non sono riuscito ad aggiornare la pagina, riprova.");
    }
  }

  return (
    <WorkAreaShell
      id="persone"
      title="Storia dei calciatori"
      path={PATH}
      preview={preview}
      editable
      status={
        data.lastReadAt ? (
          <Chip tone="info">Dati FIGC aggiornati al {itDate(data.lastReadAt)}</Chip>
        ) : (
          <Chip tone="mute">Dati FIGC non ancora caricati</Chip>
        )
      }
      highlights={[
        { value: cur?.rosa ?? null, label: v?.current ? `tesserati ${shortSeason(v.current)}` : "tesserati" },
        { value: cur?.confermati ?? null, label: "confermati" },
        { value: nuovi, label: "nuovi da altre società" },
        { value: v && v.previous ? v.departures.length : null, label: "non tornati" },
      ]}
      note={<>Fonte: portale FIGC/LND, letto dalla Segreteria. Nomi abbreviati e solo anno di nascita.</>}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]" data-testid="storia-page">
        <div className="flex min-w-0 flex-col gap-[18px]">
          {refreshError && (
            <p className="m-0 text-[14px] font-semibold text-[var(--in-crit)]" role="alert">
              {refreshError}
            </p>
          )}
          {!data.connected ? (
            <Card title="Storia dei calciatori">
              <div className={pad}>
                <EmptyState title="Collegamento al database non attivo">{data.error ?? "Serve un accesso Direzione o Segreteria."}</EmptyState>
              </div>
            </Card>
          ) : !data.ready ? (
            <Card title="Storia dei calciatori">
              <div className={pad}>
                <EmptyState title="Funzione in preparazione">La storia FIGC va ancora attivata nel database dalla Direzione. Appena attiva, si carica con il file del portale (vedi "Come aggiornare").</EmptyState>
              </div>
            </Card>
          ) : data.error ? (
            <Card title="Storia dei calciatori">
              <div className={pad}>
                <EmptyState title="Lettura non riuscita">{data.error}</EmptyState>
              </div>
            </Card>
          ) : !v ? (
            <Card title="Storia dei calciatori">
              <div className={pad}>
                <EmptyState title="Nessun dato FIGC caricato">
                  Dal portale FIGC/LND si scarica un file con il tabulato e lo storico di ogni calciatore; caricato qui, mostra chi resta, chi torna, chi arriva e chi non è tornato. Segui "Come aggiornare dal portale FIGC".
                </EmptyState>
              </div>
            </Card>
          ) : (
            <>
              <SeasonTable view={v} />
              <Breakdown view={v} />
              <Departures view={v} />
              <PlayerSearch view={v} />
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          {v && v.arrivals.length > 0 && <Arrivals view={v} />}
          {data.canImport && <ImportPanel ready={data.ready} onDone={refresh} />}
          <HowTo />
          <SourcesBox id="persone" />
        </div>
      </div>
    </WorkAreaShell>
  );
}

function SeasonTable({ view }: { view: HistoryView }) {
  const rows = [...view.table].reverse();
  return (
    <Card id="storia-stagioni" title="Stagione per stagione" sub="Confermati: con noi anche l'anno prima. Entrati: tutti gli altri. Usciti: c'erano l'anno prima e non ci sono più.">
      <div className="overflow-x-auto px-4 pb-4 sm:px-[18px]">
        <table className="w-full min-w-[520px] border-collapse text-[14.5px]" data-testid="storia-season-table">
          <caption className="sr-only">Tesserati per stagione</caption>
          <thead>
            <tr className="border-b border-[var(--in-line)] text-left text-[13px] text-[var(--in-sub)]">
              <th scope="col" className="py-2 pr-3 font-semibold">Stagione</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Rosa</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Dilettanti</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">SGS</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Confermati</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Entrati</th>
              <th scope="col" className="py-2 text-right font-semibold">Usciti</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.season} className={`border-b border-[var(--in-line)] last:border-0 ${t.season === view.current ? "font-semibold" : ""}`}>
                <th scope="row" className="py-2 pr-3 text-left font-semibold">{t.season}</th>
                <td className="py-2 pr-3 text-right tabular-nums">{t.rosa}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{t.bySector.D}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{t.bySector.S}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{num(t.confermati)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{num(t.entrati)}</td>
                <td className="py-2 text-right tabular-nums">{num(t.usciti)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="m-0 mt-2 text-[13px] text-[var(--in-sub)]">"—" = non noto: manca il tabulato o la storia FIGC della stagione prima.</p>
      </div>
    </Card>
  );
}

function Breakdown({ view }: { view: HistoryView }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!view.current || !view.previous) return null;
  return (
    <Card id="storia-oggi" title={`Da dove viene la rosa ${view.current}`} sub="Ogni tesserato di questa stagione, secondo la sua storia FIGC.">
      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-[18px]">
        {(["D", "S"] as const).map((s) => {
          const players = view.currentPlayers.filter((p) => p.sector === s);
          return (
            <section key={s} aria-labelledby={`storia-sec-${s}`} className="rounded-[12px] border border-[var(--in-line)] p-3">
              <h3 id={`storia-sec-${s}`} className="m-0 text-[16px] font-bold">
                {SECTOR_LABEL[s]} <span className="font-semibold text-[var(--in-sub)] tabular-nums">· {players.length}</span>
              </h3>
              <ul className="m-0 mt-2 list-none p-0">
                {CLASSES.map((c) => {
                  const list = players.filter((p) => p.cls === c);
                  const key = `${s}-${c}`;
                  const isOpen = open === key;
                  return (
                    <li key={c} className="border-t border-[var(--in-line)] first:border-0">
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : key)}
                        aria-expanded={isOpen}
                        aria-controls={`storia-list-${key}`}
                        disabled={list.length === 0}
                        className="scd-focus grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg px-1 py-1.5 text-left disabled:cursor-default"
                      >
                        <span className="min-w-0">
                          <b className="block text-[15px] leading-tight">{CLASS_LABEL[c]}</b>
                          <small className="block text-[12.5px] text-[var(--in-sub)]">{CLASS_HINT[c]}</small>
                        </span>
                        <Chip tone={CLASS_TONE[c]}>{view.breakdown[s][c]}</Chip>
                        <ChevronDown className={`size-4 text-[var(--in-sub)] transition-transform ${isOpen ? "rotate-180" : ""} ${list.length === 0 ? "opacity-0" : ""}`} aria-hidden="true" />
                      </button>
                      {isOpen && (
                        <ul id={`storia-list-${key}`} className="m-0 mb-2 list-none space-y-1 p-0 pl-1">
                          {list.map((p) => (
                            <li key={p.matricola} className="text-[14px] leading-snug">
                              <PlayerLine p={p} />
                              {c === "NUOVO" && p.originClub && <span className="text-[var(--in-sub)]"> · da {p.originClub}</span>}
                              {c === "RIENTRO" && p.lastOwnSeason && <span className="text-[var(--in-sub)]"> · con noi nel {shortSeason(p.lastOwnSeason)}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Card>
  );
}

function PlayerLine({ p }: { p: PlayerRef | CurrentPlayer }) {
  return (
    <>
      <b className="font-semibold">{p.name}</b>
      <span className="text-[var(--in-sub)]">{p.birthYear ? ` · ${p.birthYear}` : ""}</span>
    </>
  );
}

function Arrivals({ view }: { view: HistoryView }) {
  const max = view.arrivals[0]?.count ?? 1;
  return (
    <Card id="storia-arrivi" title="Da dove arrivano" sub={`Società di provenienza dei nuovi ${view.current ?? ""}.`}>
      <ul className="m-0 list-none px-4 pb-4 sm:px-[18px]" data-testid="storia-arrivals">
        {view.arrivals.map((a) => (
          <li key={a.club} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-1.5">
            <span className="truncate text-[14.5px] font-semibold">{a.club}</span>
            <span className="tabular-nums text-[14px] text-[var(--in-sub)]">{a.count}</span>
            <span className="col-span-2 mt-1 h-1.5 overflow-hidden rounded-full bg-[#eef3f9]" aria-hidden="true">
              <span className="block h-full rounded-full bg-[var(--in-info)]" style={{ width: `${Math.round((a.count / max) * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Departures({ view }: { view: HistoryView }) {
  const [sector, setSector] = useState<Sector | "tutti">("tutti");
  const [q, setQ] = useState("");
  const shown = useMemo(() => filterDepartures(view.departures, sector, q), [view, sector, q]);
  const groups = useMemo(() => groupByBirthYear(shown), [shown]);
  if (!view.current || !view.previous) return null;
  const counts = { tutti: view.departures.length, D: view.departures.filter((d) => d.sector === "D").length, S: view.departures.filter((d) => d.sector === "S").length };
  return (
    <Card id="storia-persi" title="Chi non è tornato" sub={`Con noi nel ${view.previous}, non nel tabulato ${view.current}. Da richiamare, annata per annata.`}>
      <div className={pad}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5" role="group" aria-label="Settore">
            {(["tutti", "D", "S"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={sector === s}
                onClick={() => setSector(s)}
                className={`scd-focus h-11 shrink-0 rounded-full px-3.5 text-[14px] font-semibold ${sector === s ? "bg-[var(--in-info)] text-white" : "bg-[#eef3f9] text-[var(--in-ink)]"}`}
              >
                {s === "tutti" ? "Tutti" : SECTOR_SHORT[s]} <span className="tabular-nums opacity-80">{counts[s]}</span>
              </button>
            ))}
          </div>
          <label className="flex min-w-[180px] flex-1 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3">
            <Search className="size-4 text-[var(--in-sub)]" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nome, anno o matricola" aria-label="Cerca tra chi non è tornato" className={inputCls} />
          </label>
        </div>
        {view.departures.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Nessuno da richiamare">Tutti i tesserati della stagione scorsa sono nel tabulato di quest'anno (o manca il tabulato {view.previous}).</EmptyState>
          </div>
        ) : groups.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Nessun risultato">Prova a cambiare settore o ricerca.</EmptyState>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3" data-testid="storia-departures">
            {groups.map((g) => (
              <section key={String(g.birthYear)} aria-label={g.birthYear ? `Annata ${g.birthYear}` : "Anno non noto"}>
                <h3 className="m-0 text-[15px] font-bold">
                  {g.birthYear ? `Annata ${g.birthYear}` : "Anno non noto"} <span className="font-semibold text-[var(--in-sub)] tabular-nums">· {g.items.length}</span>
                </h3>
                <ul className="m-0 mt-1 list-none divide-y divide-[var(--in-line)] p-0">
                  {g.items.map((d) => (
                    <li key={d.matricola} className="py-2 text-[14.5px] leading-snug">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <b className="font-semibold">{d.name}</b>
                        {d.sector && <Chip tone="mute">{SECTOR_SHORT[d.sector]}</Chip>}
                        {d.nowAt && <Chip tone="warn">ora: {d.nowAt}</Chip>}
                      </span>
                      <small className="mt-0.5 block text-[13px] text-[var(--in-sub)]">
                        {d.lastOwnSeason ? `Ultima stagione con noi ${shortSeason(d.lastOwnSeason)}` : "Stagione con noi non nota"}
                        {d.releaseLabel ? ` · ${d.releaseLabel}` : ""}
                        {d.releaseDate ? ` dal ${itDate(d.releaseDate)}` : ""}
                      </small>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        {view.lossesByYear.length > 0 && (
          <p className="m-0 mt-3 text-[13px] text-[var(--in-sub)]">
            Per annata: {view.lossesByYear.map((l) => `${l.birthYear ?? "n.d."} ${l.total}`).join(" · ")}
          </p>
        )}
      </div>
    </Card>
  );
}

function PlayerSearch({ view }: { view: HistoryView }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const found = useMemo(() => searchPlayers(view.players, q), [view, q]);
  const player = sel ? view.players.find((p) => p.matricola === sel) ?? null : null;
  const rows = sel ? view.timelines[sel] ?? [] : [];
  const resultsId = useId();
  return (
    <Card id="storia-calciatore" title="La storia di un calciatore" sub="Cerca per nome, cognome, anno o matricola FIGC: stagioni, società e movimenti.">
      <div className={pad}>
        <label className="flex items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3">
          <Search className="size-4 text-[var(--in-sub)]" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Almeno 2 lettere" aria-label="Cerca un calciatore" aria-controls={resultsId} className={inputCls} data-testid="storia-search" />
        </label>
        <ul id={resultsId} className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0" aria-live="polite">
          {found.map((p) => (
            <li key={p.matricola}>
              <button
                type="button"
                aria-pressed={sel === p.matricola}
                onClick={() => setSel(p.matricola)}
                className={`scd-focus min-h-11 rounded-full px-3.5 text-[14px] font-semibold ${sel === p.matricola ? "bg-[var(--in-info)] text-white" : "bg-[#eef3f9] text-[var(--in-ink)]"}`}
              >
                {p.name}
                {p.birthYear ? ` · ${p.birthYear}` : ""}
              </button>
            </li>
          ))}
          {q.trim().length >= 2 && found.length === 0 && <li className="text-[14px] text-[var(--in-sub)]">Nessun calciatore trovato.</li>}
        </ul>
        {player && (
          <div className="mt-3 rounded-[12px] border border-[var(--in-line)] p-3" data-testid="storia-timeline">
            <h3 className="m-0 text-[16px] font-bold">
              {player.name}
              <span className="font-semibold text-[var(--in-sub)]">
                {player.birthYear ? ` · ${player.birthYear}` : ""}
                {player.sector ? ` · ${SECTOR_SHORT[player.sector]}` : ""} · matricola {player.matricola}
              </span>
            </h3>
            {rows.length === 0 ? (
              <p className="m-0 mt-2 text-[14px] text-[var(--in-sub)]">Nessun movimento FIGC registrato.</p>
            ) : (
              <ol className="m-0 mt-2 list-none space-y-1.5 border-l-2 border-[var(--in-line)] p-0 pl-3">
                {rows.map((r, i) => (
                  <li key={`${r.season}-${i}`} className={`rounded-lg px-2 py-1.5 text-[14px] leading-snug ${r.own ? "bg-[var(--in-info-bg)]" : ""}`}>
                    <b className="tabular-nums">{shortSeason(r.season)}</b> · <span className={r.own ? "font-bold text-[var(--in-info)]" : "font-semibold"}>{r.club}</span>
                    <small className="block text-[13px] text-[var(--in-sub)]">
                      {r.movement}
                      {r.date ? ` · ${itDate(r.date)}` : ""}
                      {r.status ? ` · ${r.status.toLowerCase()}` : ""}
                      {r.release ? ` · ${r.release}` : ""}
                    </small>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function ImportPanel({ ready, onDone }: { ready: boolean; onDone: () => Promise<void> }) {
  const upload = useServerFn(importFigcHistory);
  const inputId = useId();
  const [text, setText] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedImport | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    setMsg(null);
    setPreview(null);
    setText(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_EXPORT_BYTES) {
      setMsg({ ok: false, text: "File troppo grande (massimo 3 MB)." });
      return;
    }
    const t = await f.text();
    const r = parseExportFile(t);
    if (!r.ok) {
      setMsg({ ok: false, text: r.error });
      return;
    }
    setText(t);
    setPreview(r.data);
  }

  async function submit() {
    if (!text || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await upload({ data: { text } });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        setText(null);
        setPreview(null);
        await onDone();
      }
    } catch {
      setMsg({ ok: false, text: "Caricamento non riuscito, riprova." });
    } finally {
      setBusy(false);
    }
  }

  const seasons = preview ? [...new Set(preview.roster.map((r) => r.season))].sort() : [];
  return (
    <Card id="storia-carica" title="Carica i dati FIGC" sub="Il file scaricato dal portale con il segnalibro SCD.">
      <div className={`${pad} grid gap-3`}>
        {!ready && <p className="m-0 text-[14px] text-[var(--in-sub)]">Il caricamento si attiva quando la Direzione attiva la storia FIGC nel database.</p>}
        <label htmlFor={inputId} className="grid gap-1 text-[14px] font-semibold">
          File .json del portale
          <input id={inputId} type="file" accept=".json,application/json" onChange={onFile} disabled={!ready || busy} className="scd-focus block w-full rounded-[10px] border border-[var(--in-line)] bg-white p-2 text-[14px] font-normal" data-testid="storia-file" />
        </label>
        {preview && (
          <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-1 rounded-[12px] bg-[#f7fbff] p-3 text-[14px]" data-testid="storia-preview">
            <dt className="text-[var(--in-sub)]">Calciatori</dt>
            <dd className="m-0 text-right font-semibold tabular-nums">{preview.players}</dd>
            <dt className="text-[var(--in-sub)]">Righe di tabulato</dt>
            <dd className="m-0 text-right font-semibold tabular-nums">{preview.roster.length}</dd>
            <dt className="text-[var(--in-sub)]">Movimenti FIGC</dt>
            <dd className="m-0 text-right font-semibold tabular-nums">{preview.career.length}</dd>
            <dt className="text-[var(--in-sub)]">Stagioni del tabulato</dt>
            <dd className="m-0 text-right font-semibold">{seasons.length ? seasons.map(shortSeason).join(", ") : "—"}</dd>
            <dt className="text-[var(--in-sub)]">Letto il</dt>
            <dd className="m-0 text-right font-semibold">{itDate(preview.readAt)}</dd>
            {preview.skipped > 0 && (
              <>
                <dt className="text-[var(--in-sub)]">Righe saltate</dt>
                <dd className="m-0 text-right font-semibold tabular-nums">{preview.skipped}</dd>
              </>
            )}
          </dl>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={!ready || !text || busy}
          className="scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-bold text-white disabled:opacity-50"
          data-testid="storia-import"
        >
          <Upload className="size-4" aria-hidden="true" />
          {busy ? "Carico…" : "Carica nel gestionale"}
        </button>
        {msg && (
          <p className={`m-0 text-[14px] font-semibold ${msg.ok ? "text-[var(--in-ok)]" : "text-[var(--in-crit)]"}`} role={msg.ok ? "status" : "alert"}>
            {msg.text}
          </p>
        )}
        <p className="m-0 text-[13px] text-[var(--in-sub)]">Nel gestionale resta solo l'anno di nascita, mai il codice fiscale. Dopo il caricamento cancella il file dal computer.</p>
      </div>
    </Card>
  );
}

function HowTo() {
  const [copied, setCopied] = useState(false);
  const areaId = useId();
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(FIGC_EXPORT_BOOKMARKLET);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }
  return (
    <Card id="storia-come" title="Come aggiornare dal portale FIGC">
      <details className="px-4 pb-4 sm:px-[18px]">
        <summary className="scd-focus cursor-pointer text-[14.5px] font-semibold text-[var(--in-info)]">Mostra i passi</summary>
        <ol className="m-0 mt-2 grid list-decimal gap-1.5 pl-5 text-[14.5px] leading-snug">
          <li>Sul computer della segreteria apri iscrizioni.lnd.it ed entra con l'utente della società.</li>
          <li>Crea un nuovo segnalibro nel browser: nome "SCD storia FIGC", come indirizzo incolla il testo qui sotto.</li>
          <li>Apri il tabulato calciatori Dilettanti e clicca il segnalibro: legge tutte le pagine e lo storico di ogni calciatore (qualche minuto).</li>
          <li>Alla domanda premi Annulla, apri il tabulato SGS e clicca di nuovo il segnalibro. Se il portale mostra anche la stagione precedente, ripeti: serve per sapere chi non è tornato.</li>
          <li>All'ultima domanda premi OK: si scarica il file scd-figc-storico-(data).json.</li>
          <li>Caricalo qui con "Carica nel gestionale", poi cancellalo dal computer.</li>
        </ol>
        <label htmlFor={areaId} className="mt-3 block text-[14px] font-semibold">
          Indirizzo del segnalibro
        </label>
        <textarea id={areaId} readOnly value={FIGC_EXPORT_BOOKMARKLET} rows={3} className="scd-focus mt-1 block w-full resize-none rounded-[10px] border border-[var(--in-line)] bg-[#f7fbff] p-2 font-mono text-[12px]" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" onClick={copy} className="scd-focus mt-2 inline-flex h-11 items-center gap-2 rounded-[10px] border border-[var(--in-info)] bg-white px-3.5 text-[14.5px] font-bold text-[var(--in-info)]" data-testid="storia-copy">
          {copied ? <Check className="size-4" aria-hidden="true" /> : <ClipboardCopy className="size-4" aria-hidden="true" />}
          {copied ? "Copiato" : "Copia"}
        </button>
        <span className="sr-only" role="status">{copied ? "Indirizzo copiato" : ""}</span>
        <p className="m-0 mt-2 text-[13px] text-[var(--in-sub)]">
          Il segnalibro lavora solo dentro il portale, con il tuo accesso: non manda dati a nessuno, non legge il codice fiscale e scarica il file sul tuo computer.
        </p>
        <details className="mt-2">
          <summary className="scd-focus cursor-pointer text-[13.5px] font-semibold text-[var(--in-sub)]">Codice leggibile</summary>
          <pre className="mt-1 max-h-[320px] overflow-auto rounded-[10px] bg-[#f7fbff] p-2 text-[11.5px] leading-snug">{FIGC_EXPORT_SOURCE}</pre>
        </details>
      </details>
    </Card>
  );
}

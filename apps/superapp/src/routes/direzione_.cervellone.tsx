import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, ExternalLink, MessageCircle, Search } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import {
  KB_AREAS,
  KB_KINDS,
  KIND_LABEL,
  areaLabel,
  dueIn,
  dueText,
  dueTone,
  hasSearchText,
  highlightParts,
  kbSearchTerms,
  seasonsUntil,
  splitByMatch,
  topAreas,
  type KbItem,
  type KbKind,
} from "@/lib/knowledge";
import { searchKnowledge, type KbData, type KbQuery } from "@/lib/knowledge.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

function romeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Cervellone: search the club's catalogue (documents, Drive files, mail index, economy, history, facilities). */
export const Route = createFileRoute("/direzione_/cervellone")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "cervellone" } });
    const today = romeToday();
    const due: KbData = gate.view === "page" ? await searchKnowledge({ data: { onlyDue: true, limit: 25 } }) : { connected: false, result: null, error: null };
    return { gate, interior: gate.view === "page", today, due };
  },
  head: ({ loaderData }) => workAreaHead("cervellone", loaderData?.gate),
  component: CervelloneRoute,
});

function CervelloneRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="cervellone" gate={d.gate}>
      {d.interior && <CervellonePage due={d.due} today={d.today} preview={d.gate.preview} />}
    </WorkAreaGateView>
  );
}

/** Search as you type: wait this long after the last keystroke or filter change (r98). */
const SEARCH_DEBOUNCE_MS = 250;

const inputCls = "h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] text-[var(--in-ink)] outline-none focus:border-[var(--in-info)]";

function CervellonePage({ due, today, preview }: { due: KbData; today: string; preview: boolean }) {
  const search = useServerFn(searchKnowledge);
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [season, setSeason] = useState("");
  const [kind, setKind] = useState("");
  const [shown, setShown] = useState<{ data: KbData; terms: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seasons = useMemo(() => seasonsUntil(today), [today]);
  const counts = useMemo(() => due.result?.counts ?? {}, [due.result]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const suggestions = useMemo(() => topAreas(counts), [counts]);
  const data = shown?.data ?? null;

  async function run(query: { q: string; area: string; season: string; kind: string }) {
    const id = ++seq.current;
    const req: KbQuery = { limit: 60 };
    const text = query.q.trim();
    if (text) req.q = text;
    if (query.area) req.area = query.area as (typeof KB_AREAS)[number];
    if (query.season) req.season = query.season;
    if (query.kind) req.kind = query.kind as KbKind;
    setBusy(true);
    let out: KbData;
    try {
      out = await search({ data: req });
    } catch {
      out = { connected: true, result: null, error: "Ricerca non riuscita. Riprova tra poco." };
    }
    // Only the latest request may update the page: slower, older answers are dropped.
    if (id !== seq.current) return;
    setShown({ data: out, terms: kbSearchTerms(text) });
    setBusy(false);
  }

  // Debounced search as you type or change a filter; nothing to search for clears the results.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!hasSearchText(q) && !area && !season && !kind) {
      seq.current++;
      setBusy(false);
      setShown(null);
      return;
    }
    timer.current = setTimeout(() => void run({ q, area, season, kind }), SEARCH_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // run is recreated every render; the four inputs are what decide a new search
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, area, season, kind]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    void run({ q, area, season, kind });
  }

  function browseArea(a: string) {
    setQ("");
    setArea(a);
  }

  return (
    <WorkAreaShell
      id="cervellone"
      title="Cervellone"
      preview={preview}
      editable
      highlights={[
        { value: due.result ? total : null, label: "voci catalogate" },
        { value: due.result ? due.result.items.length : null, label: "scadenze in vista" },
        { value: due.result ? Object.keys(counts).length : null, label: "aree" },
      ]}
      note={<>Catalogo e memoria della società: ogni voce porta all'originale nel Drive o nella posta. Niente dati di famiglie o minori nel catalogo.</>}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="kb-cerca" title="Cerca" sub="Parole libere: un ente, un fornitore, un torneo, un documento, una stagione.">
            <form onSubmit={submit} className="flex flex-col gap-2 px-4 pb-4 sm:px-[18px]" role="search">
              <label className="flex items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3">
                <Search className="size-4 text-[var(--in-sub)]" aria-hidden="true" />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="es. omologazione Dervio, Memorial Nasazzi, Panizza, torri faro" className="h-11 w-full bg-transparent text-[15px] outline-none" aria-label="Cerca nel Cervellone" />
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select value={area} onChange={(e) => setArea(e.target.value)} className={inputCls} aria-label="Area">
                  <option value="">Tutte le aree</option>
                  {KB_AREAS.map((a) => <option key={a} value={a}>{areaLabel(a)}{counts[a] ? ` (${counts[a]})` : ""}</option>)}
                </select>
                <select value={season} onChange={(e) => setSeason(e.target.value)} className={inputCls} aria-label="Stagione">
                  <option value="">Tutte le stagioni</option>
                  {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls} aria-label="Tipo">
                  <option value="">Tutti i tipi</option>
                  {KB_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </select>
              </div>
              <p className="sr-only" aria-live="polite">
                {busy ? "Ricerca in corso" : data?.result ? `${data.result.items.length} voci trovate` : ""}
              </p>
              <button type="submit" disabled={busy} className="scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-bold text-white disabled:opacity-50">
                <Search className="size-4" aria-hidden="true" /> {busy ? "Cerco…" : "Cerca"}
              </button>
              {/* r99 (UD-104): same chat component, opened in place; Genny reads the Cervellone with this session's permissions. */}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("genny:open"))}
                className="scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-bold text-[var(--in-ink)]"
              >
                <MessageCircle className="size-4" aria-hidden="true" /> Chiedi a Genny
              </button>
            </form>
          </Card>

          {data && (
            <Card id="kb-risultati" title="Risultati" sub={data.result ? resultsSub(data.result.items) : undefined}>
              <div className="px-4 pb-4 sm:px-[18px]">
                {!data.connected ? (
                  <EmptyState title="Entra con il tuo account">Il Cervellone è riservato a Direzione, Segreteria e Tesoreria.</EmptyState>
                ) : !data.result ? (
                  <EmptyState title={data.error ? "Ricerca non riuscita" : "Area riservata"}>{data.error ?? "Il tuo account non ha un ruolo d'ufficio."}</EmptyState>
                ) : data.result.items.length === 0 ? (
                  <EmptyState
                    title="Nessuna voce trovata"
                    action={suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5" data-testid="kb-suggestions">
                        {suggestions.map((a) => (
                          <button key={a} type="button" onClick={() => browseArea(a)} className="scd-focus inline-flex min-h-[32px] items-center rounded-full border border-[var(--in-line)] bg-white px-3 text-[13px] font-semibold text-[var(--in-ink)] hover:border-[var(--in-info)]">
                            {areaLabel(a)}{counts[a] ? ` (${counts[a]})` : ""}
                          </button>
                        ))}
                      </div>
                    )}
                  >
                    Prova con meno parole, controlla l'ortografia o togli un filtro.{suggestions.length > 0 && " Oppure sfoglia un'area:"}
                  </EmptyState>
                ) : (
                  <KbResults items={data.result.items} terms={shown?.terms ?? []} today={today} areaCounts={shown && shown.terms.length > 0 && !area ? data.result.counts : {}} onArea={setArea} />
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="kb-scadenze" title="Scadenze in vista" sub="Documenti, omologazioni, bandi e contratti con una data.">
            <div className="px-4 pb-4 sm:px-[18px]">
              {!due.connected ? (
                <EmptyState title="Entra con il tuo account">Le scadenze compaiono dopo l'accesso personale.</EmptyState>
              ) : !due.result || due.result.items.length === 0 ? (
                <EmptyState title="Nessuna scadenza registrata">Le date arrivano dai documenti catalogati.</EmptyState>
              ) : (
                <ul className="m-0 list-none divide-y divide-[var(--in-line)] p-0" data-testid="kb-due">
                  {due.result.items.map((it) => {
                    const days = it.due ? dueIn(today, it.due) : null;
                    return (
                      <li key={it.id} className="flex items-start gap-2 py-2">
                        <CalendarClock className="mt-0.5 size-4 flex-none text-[var(--in-sub)]" aria-hidden="true" />
                        <span className="min-w-0 flex-1 text-[14px] leading-snug">
                          {it.link ? <a href={it.link} target="_blank" rel="noopener noreferrer" className="font-semibold underline-offset-4 hover:underline">{it.title}</a> : <b>{it.title}</b>}
                          <small className="block text-[12.5px] text-[var(--in-sub)]">{areaLabel(it.area)}</small>
                        </span>
                        {days !== null && <Chip tone={dueTone(days)}>{dueText(days)}</Chip>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
          <SourcesBox id="cervellone" />
        </div>
      </div>
    </WorkAreaShell>
  );
}

function resultsSub(items: readonly KbItem[]): string {
  const { exact, similar } = splitByMatch(items);
  return similar.length ? `${exact.length} voci · ${similar.length} simili` : `${exact.length} voci`;
}

/** Text with the searched words marked; parts are rendered as text nodes (no HTML from the data). */
function Hl({ text, terms }: { text: string; terms: readonly string[] }) {
  return (
    <>
      {highlightParts(text, terms).map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded-[3px] bg-[#fff1a8] px-0.5 text-inherit">{p.text}</mark>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}

function KbResults({
  items,
  terms,
  today,
  areaCounts,
  onArea,
}: {
  items: readonly KbItem[];
  terms: readonly string[];
  today: string;
  areaCounts: Readonly<Record<string, number>>;
  onArea: (area: string) => void;
}) {
  const { exact, similar } = splitByMatch(items);
  const areas = Object.entries(areaCounts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  return (
    <>
      {areas.length > 1 && (
        <div className="mb-1 flex flex-wrap items-center gap-1.5" data-testid="kb-area-facets">
          <span className="text-[12.5px] text-[var(--in-sub)]">Per area:</span>
          {areas.map(([a, n]) => (
            <button key={a} type="button" onClick={() => onArea(a)} className="scd-focus inline-flex min-h-[28px] items-center rounded-full border border-[var(--in-line)] bg-white px-2.5 text-[12.5px] font-semibold text-[var(--in-ink)] hover:border-[var(--in-info)]">
              {areaLabel(a)} ({n})
            </button>
          ))}
        </div>
      )}
      {exact.length > 0 && (
        <ul className="m-0 list-none divide-y divide-[var(--in-line)] p-0" data-testid="kb-results">
          {exact.map((it) => <KbRow key={it.id} item={it} today={today} terms={terms} />)}
        </ul>
      )}
      {similar.length > 0 && (
        <section aria-labelledby="kb-simili" className={exact.length ? "mt-3 border-t border-[var(--in-line)] pt-3" : ""}>
          <h3 id="kb-simili" className="m-0 text-[14px] font-bold">Risultati simili</h3>
          <p className="m-0 mt-0.5 text-[12.5px] text-[var(--in-sub)]">
            {exact.length ? "Altre voci con titolo, ente o tag simili a quanto scritto." : "Nessuna voce con tutte le parole: queste hanno titolo, ente o tag simili (forse un errore di battitura)."}
          </p>
          <ul className="m-0 list-none divide-y divide-[var(--in-line)] p-0" data-testid="kb-results-similar">
            {similar.map((it) => <KbRow key={it.id} item={it} today={today} terms={terms} />)}
          </ul>
        </section>
      )}
    </>
  );
}

function KbRow({ item: it, today, terms }: { item: KbItem; today: string; terms: readonly string[] }) {
  const days = it.due ? dueIn(today, it.due) : null;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone="info">{KIND_LABEL[it.kind]}</Chip>
        <Chip tone="mute">{areaLabel(it.area)}</Chip>
        {it.season && <Chip tone="mute">{it.season}</Chip>}
        {days !== null && <Chip tone={dueTone(days)}>{dueText(days)}</Chip>}
      </div>
      <p className="m-0 mt-1.5 text-[15.5px] font-bold leading-snug">
        {it.link ? (
          <a href={it.link} target="_blank" rel="noopener noreferrer" className="scd-focus inline-flex items-start gap-1.5 rounded-sm underline-offset-4 hover:underline">
            <span><Hl text={it.title} terms={terms} /></span> <ExternalLink className="mt-1 size-3.5 flex-none" aria-hidden="true" />
          </a>
        ) : <Hl text={it.title} terms={terms} />}
      </p>
      {it.summary && <p className="m-0 mt-1 line-clamp-3 text-[14px] leading-snug text-[var(--in-sub)]"><Hl text={it.summary} terms={terms} /></p>}
      <p className="m-0 mt-1 text-[12.5px] text-[var(--in-sub)]">
        {[it.entity, it.date, it.status, it.amount !== null ? new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(it.amount) : null].filter(Boolean).join(" · ")}
      </p>
    </li>
  );
}

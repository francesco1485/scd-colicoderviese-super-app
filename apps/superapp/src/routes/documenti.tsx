import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, FileText, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { PUBLIC_WRAP, PublicPageHeader } from "@/components/home/PublicPageHeader";
import { Dialog } from "@/components/scd/Dialog";
import { Card, Chip } from "@/components/scd/interior-ui";
import { InteriorShell } from "@/components/scd/InteriorShell";
import { EmptyState } from "@/components/scd/work-area-ui";
import { getSession } from "@/lib/auth.functions";
import { CLUB_DOCUMENTS } from "@/lib/club-documents";
import {
  AUDIENCES,
  AUDIENCE_HELP,
  AUDIENCE_LABEL,
  appCopy,
  filterDocs,
  groupByArea,
  needsPublic,
  openHref,
  upcoming,
  type Audience,
  type DocFilter,
  type LibraryDoc,
} from "@/lib/documents";
import { getDocLibrary, setDocAudiences, type LibraryData } from "@/lib/documents.functions";
import { itDay } from "@/lib/fees";

function romeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/**
 * Documenti (r81, telaio T4, UD-085). One library for everyone: the database returns only the documents meant
 * for the caller (famiglie, atleti, staff, dirigenti, ufficio). Signed out: the public club documents.
 */
export const Route = createFileRoute("/documenti")({
  loader: async () => {
    const [session, data] = await Promise.all([getSession(), getDocLibrary()]);
    return { roles: session.roles, badge: session.badge, signedIn: session.user !== null, data, today: romeToday() };
  },
  head: () => ({
    meta: [
      { title: "Documenti — SCD ColicoDerviese" },
      { name: "description", content: "Regolamenti, moduli e documenti della S.C.D. ColicoDerviese, ognuno per chi deve leggerlo." },
    ],
  }),
  component: DocumentsRoute,
});

function DocumentsRoute() {
  const d = Route.useLoaderData();
  if (!d.signedIn || !d.data.connected) return <PublicDocuments />;
  return <LibraryPage initial={d.data} roles={d.roles} badge={d.badge} today={d.today} />;
}

function PublicDocuments() {
  // Signed-out view. /documenti is a board route (no site header on phones), so the page brings its own public band
  // and uses the light "inside" tokens for text on the light ground (the "out" tokens are for dark backgrounds).
  return (
    <main data-screen="documenti-pubblici" className="min-h-dvh bg-[#eef3f9] pb-10 text-[var(--in-ink)]">
      <PublicPageHeader eyebrow="Stagione 2026/27" title="Documenti" accent="del club">
        I regolamenti pubblici della stagione. Famiglie, atleti e staff trovano gli altri documenti che li riguardano dopo l'accesso.
      </PublicPageHeader>
      <div className={`${PUBLIC_WRAP} pt-5 lg:pt-8`}>
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3" data-testid="documenti-pubblici">
          {CLUB_DOCUMENTS.map((doc) => (
            <li key={doc.id}>
              <a
                href={doc.file}
                target="_blank"
                rel="noopener noreferrer"
                className="scd-focus flex h-full min-h-[72px] items-start gap-3 rounded-[14px] border border-[var(--in-line)] bg-white px-3 py-2.5 hover:border-[#9fbbe0]"
              >
                <FileText className="mt-0.5 size-5 shrink-0 text-[var(--out-blue)]" strokeWidth={1.8} aria-hidden="true" />
                <span className="min-w-0">
                  <b className="block text-[15px] leading-tight">{doc.title}</b>
                  <span className="mt-0.5 block text-[13px] leading-snug text-[var(--in-sub)]">
                    {doc.audience} · PDF, {doc.pages} pagine
                  </span>
                </span>
                <ExternalLink className="ml-auto mt-0.5 size-4 shrink-0 text-[var(--in-sub)]" aria-label="apre il PDF in una nuova scheda" />
              </a>
            </li>
          ))}
        </ul>
        <Link
          to="/accedi"
          search={{ next: "/documenti" }}
          className="scd-focus mt-6 inline-flex h-11 items-center rounded-[10px] bg-[var(--out-yellow)] px-5 text-[15px] font-bold text-[var(--out-night)] hover:bg-[var(--out-yellow-hover)]"
        >
          Entra per i tuoi documenti
        </Link>
      </div>
    </main>
  );
}

const btnGhost = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold disabled:opacity-50";
const btnMain = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#F8D000] px-4 text-[15px] font-bold text-[#062a52] disabled:opacity-50";

function LibraryPage({ initial, roles, badge, today }: { initial: LibraryData; roles: string[]; badge: string | null; today: string }) {
  const [items, setItems] = useState(initial.library?.items ?? []);
  const [filter, setFilter] = useState<DocFilter>("tutti");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const lib = initial.library;
  const mine = lib?.audiences ?? [];
  const canEdit = lib?.canEdit ?? false;
  const shown = useMemo(() => filterDocs(items, filter, q, today), [items, filter, q, today]);
  const groups = useMemo(() => groupByArea(shown), [shown]);
  const next = useMemo(() => upcoming(items, today), [items, today]);
  const filters: DocFilter[] = canEdit ? ["tutti", ...AUDIENCES, "scadenze"] : ["tutti", "scadenze"];
  const current = items.find((d) => d.ref === editing) ?? null;

  return (
    <InteriorShell
      title="Documenti"
      path="/documenti"
      roles={new Set(roles)}
      roleLabel={badge ?? "Area riservata"}
      highlights={[
        { value: items.length, label: "documenti per te" },
        { value: items.filter((d) => d.due !== null && d.due >= today).length, label: "con scadenza" },
        { value: items.filter((d) => d.sensitivity === "PUBBLICO").length, label: "pubblici" },
      ]}
    >
      <div className="flex flex-col gap-[18px]">
        {initial.error ? (
          <EmptyState title="Dati non disponibili">{initial.error}</EmptyState>
        ) : !lib || mine.length === 0 ? (
          <EmptyState title="Nessun documento per il tuo profilo">Il tuo account non ha ancora un ruolo nella società. I regolamenti pubblici sono nella pagina Società.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-[18px]">
              <Card id="documenti-elenco" title="Biblioteca"
                sub={<>Vedi i documenti per: <b>{mine.map((a) => AUDIENCE_LABEL[a]).join(", ")}</b>.{canEdit ? " Come Direzione vedi tutto e decidi chi vede cosa." : ""}</>}>
                <div className="flex flex-col gap-3 px-4 pb-3 sm:px-[18px]">
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtra i documenti">
                    {filters.map((f) => (
                      <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
                        className={`scd-focus inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[14px] font-semibold ${filter === f ? "border-[var(--in-info)] bg-[var(--in-info)] text-white" : "border-[var(--in-line)] bg-white"}`}>
                        {f === "tutti" ? "Tutti" : f === "scadenze" ? "Con scadenza" : AUDIENCE_LABEL[f]}
                        <span className="tabular-nums opacity-80">{filterDocs(items, f, "", today).length}</span>
                      </button>
                    ))}
                  </div>
                  <label className="relative block">
                    <span className="sr-only">Cerca un documento</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--in-sub)]" aria-hidden="true" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca titolo o argomento"
                      className="h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white pl-9 pr-3 text-[15px] outline-none focus:border-[var(--in-info)]" />
                  </label>
                </div>
                {groups.length === 0 ? (
                  <div className="px-4 pb-4 sm:px-[18px]"><EmptyState title="Nessun documento">Niente con questo filtro.</EmptyState></div>
                ) : (
                  <div data-testid="documenti-lista">
                    {groups.map((g) => (
                      <section key={g.area} aria-label={g.label} className="border-t border-[var(--in-line)]">
                        <h3 className="m-0 px-4 pb-1 pt-3 text-[13px] font-bold uppercase tracking-[0.04em] text-[var(--in-sub)] sm:px-[18px]">{g.label}</h3>
                        <ul className="m-0 list-none p-0">
                          {g.items.map((doc) => <DocRow key={doc.ref} d={doc} canEdit={canEdit} today={today} onEdit={() => setEditing(doc.ref)} />)}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </Card>
            </div>
            <div className="flex min-w-0 flex-col gap-[18px]">
              <Card id="documenti-scadenze" title="Prossime scadenze" sub="Documenti da consegnare o rinnovare.">
                {next.length === 0 ? (
                  <div className="px-4 pb-4 sm:px-[18px]"><EmptyState title="Nessuna scadenza">Nessun documento in scadenza tra quelli che vedi.</EmptyState></div>
                ) : (
                  <ol className="m-0 list-none p-0">
                    {next.map((doc) => (
                      <li key={doc.ref} className="flex items-center gap-3 border-t border-[var(--in-line)] px-4 py-2.5 sm:px-[18px]">
                        <span className="w-12 flex-none text-[13.5px] font-semibold tabular-nums">{itDay(doc.due).slice(0, 5)}</span>
                        <span className="min-w-0 flex-1 text-[14px] leading-snug">{doc.title}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
              <Card id="documenti-regole" title="Chi vede cosa">
                <ul className="m-0 flex list-none flex-col gap-2 px-4 pb-4 text-[14px] leading-snug sm:px-[18px]">
                  {AUDIENCES.map((a) => (
                    <li key={a} className="flex gap-2"><Users className="mt-0.5 size-4 flex-none text-[var(--in-sub)]" aria-hidden="true" /><span><b>{AUDIENCE_LABEL[a]}</b> · {AUDIENCE_HELP[a]}</span></li>
                  ))}
                  <li className="rounded-[10px] bg-[var(--in-info-bg)] px-3 py-2 text-[13.5px]">I file restano nel Drive della società: l'app non li copia e non li sposta. Ogni modifica di chi vede un documento resta registrata.</li>
                </ul>
              </Card>
            </div>
          </div>
        )}
      </div>
      {current && canEdit && (
        <AudienceDialog d={current} onClose={() => setEditing(null)}
          onSaved={(aud, sens) => setItems((prev) => prev.map((x) => (x.ref === current.ref ? { ...x, audiences: aud, sensitivity: sens } : x)))} />
      )}
    </InteriorShell>
  );
}

function DocRow({ d, canEdit, today, onEdit }: { d: LibraryDoc; canEdit: boolean; today: string; onEdit: () => void }) {
  const href = openHref(d);
  const copy = appCopy(d);
  return (
    <li className="flex items-start gap-3 border-t border-[var(--in-line)] px-4 py-3 first:border-t-0 sm:px-[18px]">
      <FileText className="mt-0.5 size-5 flex-none text-[var(--in-info)]" strokeWidth={1.8} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <b className="block text-[15px] leading-snug">{d.title}</b>
        <span className="mt-1 flex flex-wrap gap-1">
          {d.sensitivity === "PUBBLICO" && <Chip tone="ok">Pubblico</Chip>}
          {d.due && <Chip tone={d.due < today ? "mute" : "warn"}>{d.due < today ? "scaduto il" : "scade il"} {itDay(d.due)}</Chip>}
          {canEdit && d.audiences.map((a) => <Chip key={a} tone="info">{AUDIENCE_LABEL[a]}</Chip>)}
          {canEdit && d.audiences.length === 0 && <Chip tone="mute">nessun pubblico</Chip>}
        </span>
        {copy && <span className="mt-1 block text-[12.5px] text-[var(--in-sub)]">PDF, {copy.pages} pagine</span>}
      </span>
      <span className="flex flex-none flex-col items-end gap-1.5">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="scd-focus inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14px] font-semibold">
            <ExternalLink className="size-4" aria-hidden="true" />Apri
          </a>
        ) : (
          <span className="text-[12.5px] text-[var(--in-sub)]">in archivio</span>
        )}
        {canEdit && (
          <button type="button" onClick={onEdit} className="scd-focus rounded-sm text-[13px] font-semibold text-[var(--in-info)] underline underline-offset-2">Chi lo vede</button>
        )}
      </span>
    </li>
  );
}

function AudienceDialog({ d, onClose, onSaved }: { d: LibraryDoc; onClose: () => void; onSaved: (a: Audience[], s: LibraryDoc["sensitivity"]) => void }) {
  const [sel, setSel] = useState<Audience[]>(d.audiences);
  const [makePublic, setMakePublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = useServerFn(setDocAudiences);
  const mustPublic = needsPublic(sel, d);

  function toggle(a: Audience) {
    setSel((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : AUDIENCES.filter((x) => x === a || prev.includes(x))));
  }

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const out = await save({ data: { ref: d.ref, audiences: sel, makePublic } });
      setMsg({ ok: out.ok, text: out.message });
      if (out.ok) onSaved(out.audiences ?? sel, out.sensitivity === "PUBBLICO" ? "PUBBLICO" : d.sensitivity);
    } catch {
      setMsg({ ok: false, text: "Salvataggio non riuscito. Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Chi vede questo documento" onClose={onClose} testId="documenti-pubblico">
      <div className="mt-3 flex flex-col gap-3 text-[14.5px]">
        <p className="m-0 font-semibold">{d.title}</p>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-[13.5px] text-[var(--in-sub)]">Scegli i pubblici</legend>
          {AUDIENCES.map((a) => (
            <label key={a} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[10px] border border-[var(--in-line)] px-3 py-2">
              <input type="checkbox" checked={sel.includes(a)} onChange={() => toggle(a)} className="mt-1 size-4" />
              <span><b className="block">{AUDIENCE_LABEL[a]}</b><span className="text-[13px] text-[var(--in-sub)]">{AUDIENCE_HELP[a]}</span></span>
            </label>
          ))}
        </fieldset>
        {mustPublic && (
          <label className="flex items-start gap-3 rounded-[10px] bg-[#fff6d6] px-3 py-2 text-[14px]">
            <input type="checkbox" checked={makePublic} onChange={(e) => setMakePublic(e.target.checked)} className="mt-1 size-4" />
            <span>Il documento diventa <b>pubblico</b>: confermo che non contiene dati personali, dati di minori o informazioni riservate.</span>
          </label>
        )}
        {msg && <p role="status" className={`m-0 rounded-[10px] px-3 py-2 text-[14px] ${msg.ok ? "bg-[var(--in-ok-bg)]" : "bg-[#fdecea]"}`}>{msg.text}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void run()} disabled={busy || (mustPublic && !makePublic)} className={btnMain} data-testid="documenti-salva">Salva</button>
          <button type="button" onClick={onClose} className={btnGhost}>Chiudi</button>
        </div>
      </div>
    </Dialog>
  );
}

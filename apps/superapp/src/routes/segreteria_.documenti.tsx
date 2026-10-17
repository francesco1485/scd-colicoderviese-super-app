import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ExternalLink, Search, X } from "lucide-react";
import { useState } from "react";

import { Dialog } from "@/components/scd/Dialog";
import { Card, Chip } from "@/components/scd/interior-ui";
import {
  EmptyState,
  SourcesBox,
  WorkAreaGateView,
  WorkAreaShell,
  workAreaHead,
} from "@/components/scd/work-area-ui";
import { itDay } from "@/lib/fees";
import { DOC_KINDS, kindInfo, kindLabel } from "@/lib/my-documents";
import {
  createDocRequest,
  getDocOfficeBoard,
  reviewDocument,
  setExpiryMail,
  type OfficeData,
  type OfficeRow,
} from "@/lib/my-documents.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Documenti dei tesserati (r142, office side of «I miei documenti»): verify what families uploaded, ask a document,
 * switch the expiry mails (Direzione). The database filters every row by class (Tesoreria: ISEE only).
 */
export const Route = createFileRoute("/segreteria_/documenti")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "documenti-soci" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const data = await getDocOfficeBoard({ data: {} });
    return { gate, interior: true as const, data };
  },
  head: ({ loaderData }) => workAreaHead("documenti-soci", loaderData?.gate),
  component: DocumentiSociRoute,
});

function DocumentiSociRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="documenti-soci" gate={d.gate}>
      {d.interior && (
        <DocumentiSociPage data={d.data} preview={d.gate.preview} />
      )}
    </WorkAreaGateView>
  );
}

const btnMain =
  "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#F8D000] px-4 text-[15px] font-bold text-[#062a52] disabled:opacity-50";
const btnGhost =
  "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold disabled:opacity-50";
const field =
  "h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] outline-none focus:border-[var(--in-info)]";
const driveLink = (id: string) => `https://drive.google.com/file/d/${id}/view`;

function DocumentiSociPage({
  data,
  preview,
}: {
  data: OfficeData;
  preview: boolean;
}) {
  const b = data.board;
  const [review, setReview] = useState<OfficeRow | null>(null);
  const [asking, setAsking] = useState(false);
  return (
    <WorkAreaShell
      id="documenti-soci"
      preview={preview}
      editable
      highlights={[
        { value: b ? b.toVerify.length : null, label: "da verificare" },
        { value: b ? b.requests.length : null, label: "richieste aperte" },
        { value: b ? b.due.expired : null, label: "scaduti" },
        { value: b ? b.due.expiring : null, label: "in scadenza (30 gg)" },
      ]}
      note={
        data.uploadEnabled
          ? "Caricamento dall'app attivo."
          : "Caricamento dall'app in preparazione (scenario Make da collegare)."
      }
    >
      {data.error ? (
        <EmptyState title="Dati non disponibili">{data.error}</EmptyState>
      ) : !data.live || !b ? (
        <EmptyState title="In preparazione">
          La migrazione r142 non è ancora attiva: la Direzione la approva con
          «applica r142». Poi qui arrivano i documenti caricati dalle famiglie.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <Card
              id="doc-da-verificare"
              title="Da verificare"
              sub="Apri il file nel Drive, poi approva o rifiuta con il motivo."
            >
              {b.toVerify.length === 0 ? (
                <div className="px-4 pb-4 sm:px-[18px]">
                  <EmptyState title="Niente da verificare">
                    Nessun documento in attesa.
                  </EmptyState>
                </div>
              ) : (
                <ul
                  className="m-0 list-none p-0"
                  data-testid="doc-verifica-lista"
                >
                  {b.toVerify.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 first:border-t-0 sm:px-[18px]"
                    >
                      <span className="min-w-0 flex-1">
                        <b className="block text-[15px] leading-snug">
                          {kindLabel(r.kind)}
                        </b>
                        <span className="text-[14px] text-[var(--in-sub)]">
                          {r.label} · caricato il {itDay(r.uploadedAt)}
                        </span>
                      </span>
                      {r.driveFileId && (
                        <a
                          href={driveLink(r.driveFileId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={btnGhost}
                        >
                          <ExternalLink className="size-4" aria-hidden="true" />
                          Apri
                        </a>
                      )}
                      <button
                        type="button"
                        className={btnMain}
                        onClick={() => setReview(r)}
                      >
                        Verifica
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card
              id="doc-richieste-aperte"
              title="Richieste aperte"
              aside={
                <button
                  type="button"
                  className={btnMain}
                  onClick={() => setAsking(true)}
                >
                  Chiedi un documento
                </button>
              }
            >
              {b.requests.length === 0 ? (
                <div className="px-4 pb-4 sm:px-[18px]">
                  <EmptyState title="Nessuna richiesta aperta" />
                </div>
              ) : (
                <ul className="m-0 list-none p-0">
                  {b.requests.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 first:border-t-0 sm:px-[18px]"
                    >
                      <span className="min-w-0 flex-1">
                        <b className="block text-[15px] leading-snug">
                          {kindLabel(r.kind)}
                        </b>
                        <span className="text-[14px] text-[var(--in-sub)]">
                          {r.label}
                          {r.due ? ` · entro il ${itDay(r.due)}` : ""}
                        </span>
                      </span>
                      <Chip
                        tone={
                          r.status === "CARICATO_IN_VERIFICA"
                            ? "info"
                            : r.status === "RIFIUTATO"
                              ? "crit"
                              : "warn"
                        }
                      >
                        {r.status === "CARICATO_IN_VERIFICA"
                          ? "caricato"
                          : r.status === "RIFIUTATO"
                            ? "da ricaricare"
                            : "in attesa"}
                      </Chip>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <div className="flex min-w-0 flex-col gap-[18px]">
            <ExpiryMailCard data={data} />
            <Card id="doc-regole" title="Chi vede cosa">
              <ul className="m-0 flex list-none flex-col gap-2 px-4 pb-4 text-[14px] leading-snug sm:px-[18px]">
                <li>
                  Certificati e documenti d'identità: Segreteria e Direzione.
                  Mister e staff vedono solo «in regola».
                </li>
                <li>ISEE: Segreteria, Tesoreria e Direzione.</li>
                <li>
                  Certificato approvato: la scadenza va nel registro dei
                  certificati (una sola fonte).
                </li>
                <li>
                  Ogni verifica e richiesta resta nello storico con il tuo nome.
                </li>
              </ul>
            </Card>
            <SourcesBox id="documenti-soci" />
          </div>
        </div>
      )}
      {review && <ReviewDialog row={review} onClose={() => setReview(null)} />}
      {asking && b && (
        <RequestDialog classes={b.classes} onClose={() => setAsking(false)} />
      )}
    </WorkAreaShell>
  );
}

function ExpiryMailCard({ data }: { data: OfficeData }) {
  const router = useRouter();
  const save = useServerFn(setExpiryMail);
  const em = data.board?.expiryMail ?? null;
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function toggle(on: boolean) {
    setBusy(true);
    try {
      const out = await save({ data: { enabled: on } });
      setMsg(out.message);
      if (out.ok) void router.invalidate();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card
      id="doc-avvisi"
      title="Avvisi di scadenza via mail"
      sub="Ogni mattina: una mail generica per persona con documenti scaduti o in scadenza. Mai a un ragazzo sotto i 14 anni: ai genitori."
    >
      <div className="flex flex-col gap-2 px-4 pb-4 text-[14px] sm:px-[18px]">
        <span className="flex flex-wrap gap-1">
          <Chip tone={em?.enabled ? "ok" : "mute"}>
            {em?.enabled ? "Accesi" : "Spenti"}
          </Chip>
          <Chip tone="info">
            partono solo se è attivo anche l'invio della Posta del club
          </Chip>
        </span>
        {data.board?.canSwitchMail ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggle(!em?.enabled)}
            className={em?.enabled ? btnGhost : btnMain}
          >
            {em?.enabled ? "Spegni gli avvisi" : "Accendi gli avvisi"}
          </button>
        ) : (
          <span className="text-[var(--in-sub)]">Li accende la Direzione.</span>
        )}
        {msg && (
          <p
            role="status"
            className="m-0 rounded-[10px] bg-[var(--in-info-bg)] px-3 py-2"
          >
            {msg}
          </p>
        )}
      </div>
    </Card>
  );
}

function ReviewDialog({
  row,
  onClose,
}: {
  row: OfficeRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const send = useServerFn(reviewDocument);
  const info = kindInfo(row.kind);
  const isCert = row.kind === "CERTIFICATO_MEDICO";
  const [expires, setExpires] = useState("");
  const [certKind, setCertKind] = useState<"AGONISTICO" | "NON_AGONISTICO">(
    "AGONISTICO",
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(decision: "APPROVA" | "RIFIUTA") {
    setBusy(true);
    setMsg(null);
    try {
      const out = await send({
        data: {
          documentId: row.id,
          decision,
          expiresAt:
            decision === "APPROVA" && info?.hasExpiry && expires
              ? expires
              : null,
          certKind: isCert && decision === "APPROVA" ? certKind : null,
          note: note.trim() ? note.trim() : null,
        },
      });
      setMsg({ ok: out.ok, text: out.message });
      if (out.ok) void router.invalidate();
    } catch {
      setMsg({ ok: false, text: "Operazione non riuscita. Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Verifica il documento"
      onClose={onClose}
      testId="doc-verifica-dialog"
    >
      <div className="mt-3 flex flex-col gap-3 text-[14.5px]">
        <p className="m-0">
          <b>{kindLabel(row.kind)}</b> · {row.label}
        </p>
        {info?.hasExpiry && (
          <label className="flex flex-col gap-1">
            <span className="font-semibold">
              Scadenza{isCert ? " (obbligatoria)" : " (se presente)"}
            </span>
            <input
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className={field}
            />
          </label>
        )}
        {isCert && (
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Tipo di certificato</span>
            <select
              value={certKind}
              onChange={(e) =>
                setCertKind(e.target.value as "AGONISTICO" | "NON_AGONISTICO")
              }
              className={field}
            >
              <option value="AGONISTICO">Agonistico</option>
              <option value="NON_AGONISTICO">Non agonistico</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="font-semibold">
            Nota per la famiglia (obbligatoria se rifiuti)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 300))}
            rows={2}
            className="w-full rounded-[10px] border border-[var(--in-line)] px-3 py-2 text-[15px]"
          />
        </label>
        {msg && (
          <p
            role="status"
            className={`m-0 rounded-[10px] px-3 py-2 ${msg.ok ? "bg-[var(--in-ok-bg)]" : "bg-[#fdecea]"}`}
          >
            {msg.text}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || (isCert && !expires)}
            onClick={() => void run("APPROVA")}
            className={btnMain}
          >
            <Check className="size-4" aria-hidden="true" />
            Approva
          </button>
          <button
            type="button"
            disabled={busy || !note.trim()}
            onClick={() => void run("RIFIUTA")}
            className={btnGhost}
          >
            <X className="size-4" aria-hidden="true" />
            Rifiuta
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function RequestDialog({
  classes,
  onClose,
}: {
  classes: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const send = useServerFn(createDocRequest);
  const search = useServerFn(getDocOfficeBoard);
  const kinds = DOC_KINDS.filter(
    (k) => k.section === "CONSEGNATO" && classes.includes(k.docClass),
  );
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<{ id: string; label: string }[]>([]);
  const [person, setPerson] = useState<{ id: string; label: string } | null>(
    null,
  );
  const [kind, setKind] = useState(kinds[0]?.code ?? "");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function find() {
    if (q.trim().length < 2) return;
    const out = await search({ data: { q: q.trim() } });
    setPeople(out.board?.people ?? []);
  }
  async function run() {
    if (!person || !kind) return;
    setBusy(true);
    setMsg(null);
    try {
      const out = await send({
        data: {
          personId: person.id,
          kind,
          note: note.trim() || null,
          due: due || null,
        },
      });
      setMsg({ ok: out.ok, text: out.message });
      if (out.ok) void router.invalidate();
    } catch {
      setMsg({ ok: false, text: "Operazione non riuscita. Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Chiedi un documento"
      onClose={onClose}
      testId="doc-richiesta-dialog"
    >
      <div className="mt-3 flex flex-col gap-3 text-[14.5px]">
        {person ? (
          <p className="m-0 flex items-center gap-2">
            <b>{person.label}</b>
            <button
              type="button"
              className="scd-focus text-[13px] font-semibold text-[var(--in-info)] underline"
              onClick={() => setPerson(null)}
            >
              cambia
            </button>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void find();
              }}
            >
              <label className="relative flex-1">
                <span className="sr-only">Cerca la persona</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--in-sub)]"
                  aria-hidden="true"
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cognome o nome"
                  className={`${field} pl-9`}
                />
              </label>
              <button type="submit" className={btnGhost}>
                Cerca
              </button>
            </form>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {people.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setPerson(p)}
                    className="scd-focus min-h-11 w-full rounded-[10px] border border-[var(--in-line)] px-3 text-left"
                  >
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Documento</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className={field}
          >
            {kinds.map((k) => (
              <option key={k.code} value={k.code}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Entro il (facoltativo)</span>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Nota per la famiglia</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 300))}
            rows={2}
            className="w-full rounded-[10px] border border-[var(--in-line)] px-3 py-2 text-[15px]"
          />
        </label>
        {msg && (
          <p
            role="status"
            className={`m-0 rounded-[10px] px-3 py-2 ${msg.ok ? "bg-[var(--in-ok-bg)]" : "bg-[#fdecea]"}`}
          >
            {msg.text}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !person || !kind}
            onClick={() => void run()}
            className={btnMain}
          >
            Invia la richiesta
          </button>
          <button type="button" onClick={onClose} className={btnGhost}>
            Chiudi
          </button>
        </div>
        <p className="m-0 text-[13px] text-[var(--in-sub)]">
          La famiglia la vede in «I miei documenti» con il bottone Carica.
          Nessuna mail parte da qui.
        </p>
      </div>
    </Dialog>
  );
}

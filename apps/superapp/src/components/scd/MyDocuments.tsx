/**
 * «I miei documenti» (r144): drawer of the signed-in member. Sections A «Firmati all'iscrizione», B «Consegnati»,
 * C «Richiesti dalla Segreteria», one tab per person for guardians of several children, the «lampadina» banner and the
 * «Carica» dialog (file goes to the club Drive through the server; nothing is kept in the browser).
 */
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ExternalLink,
  FileCheck2,
  Lightbulb,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Dialog } from "@/components/scd/Dialog";
import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import { CLUB_DOCUMENTS } from "@/lib/club-documents";
import { itDay } from "@/lib/fees";
import {
  CONSENT_LABEL,
  MAX_UPLOAD_BYTES,
  REQUEST_LABEL,
  REQUEST_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  kindInfo,
  kindLabel,
  lampMessage,
  personTodo,
  type DeliveredDoc,
  type DrawerPerson,
} from "@/lib/my-documents";
import {
  uploadMyDocument,
  type MyDocumentsData,
} from "@/lib/my-documents.functions";

const btnMain =
  "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#F8D000] px-4 text-[15px] font-bold text-[#062a52] disabled:opacity-50";
const btnGhost =
  "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold disabled:opacity-50";
function firstToOpen(people: DrawerPerson[]): string | null {
  const busiest = [...people].sort((a, b) => personTodo(b) - personTodo(a))[0];
  if (busiest && personTodo(busiest) > 0) return busiest.personId;
  const withDocs = people.find(
    (p) => p.delivered.length + p.signed.length + p.requests.length > 0,
  );
  return (withDocs ?? people[0])?.personId ?? null;
}

const clubPdf = (id: string | null) =>
  id ? (CLUB_DOCUMENTS.find((d) => d.id === id)?.file ?? null) : null;

interface UploadTarget {
  personId: string;
  personLabel: string;
  kind: string;
  requestId: string | null;
}

export function MyDrawer({ data }: { data: MyDocumentsData }) {
  const people = data.drawer?.people ?? [];
  // Open on whoever needs something first (often a child), else the first person with documents, else the caller.
  const [sel, setSel] = useState(() => firstToOpen(people));
  const [upload, setUpload] = useState<UploadTarget | null>(null);
  const person = people.find((p) => p.personId === sel) ?? people[0] ?? null;
  const lampText = data.lamp ? lampMessage(data.lamp) : null;

  if (data.error)
    return <EmptyState title="Dati non disponibili">{data.error}</EmptyState>;
  if (!data.live || !data.drawer) {
    return (
      <div className="flex flex-col gap-[18px]">
        <EmptyState title="Il tuo archivio personale è in preparazione">
          Qui vedrai i documenti firmati con il modulo d'iscrizione, quelli
          consegnati con la loro scadenza e quelli che ti chiede la Segreteria.
          Intanto trovi i regolamenti del club qui sotto.
        </EmptyState>
        <ClubRegulations />
      </div>
    );
  }
  if (people.length === 0) {
    return (
      <div className="flex flex-col gap-[18px]">
        <EmptyState title="Il tuo account non è ancora collegato a una persona del club">
          La Segreteria collega il tuo accesso alla scheda d'iscrizione (tua o
          di tuo figlio). Poi qui trovi i tuoi documenti.
        </EmptyState>
        <ClubRegulations />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]" data-testid="miei-documenti">
      {lampText && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-[14px] border border-[#f0c400] bg-[#fff6c7] px-4 py-3 text-[#3d3000]"
          data-testid="doc-lampadina"
        >
          <Lightbulb
            className="mt-0.5 size-6 flex-none text-[#b88a00]"
            fill="#ffd600"
            aria-hidden="true"
          />
          <p className="m-0 text-[15px] leading-snug">
            <b>Lampadina accesa:</b> {lampText}.
          </p>
        </div>
      )}

      {people.length > 1 && (
        <div
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
          role="group"
          aria-label="Di chi sono i documenti"
        >
          {people.map((p) => {
            const todo = personTodo(p);
            return (
              <button
                key={p.personId}
                type="button"
                aria-pressed={person?.personId === p.personId}
                onClick={() => setSel(p.personId)}
                className={`scd-focus inline-flex h-11 flex-none items-center gap-2 rounded-full border px-4 text-[15px] font-semibold ${person?.personId === p.personId ? "border-[#1e90e0] bg-[#1e90e0] text-white" : "border-[var(--in-line)] bg-white"}`}
              >
                {p.relationship === "SELF" ? "Io" : p.label}
                {todo > 0 && (
                  <span className="grid min-w-6 place-items-center rounded-full bg-[#ffd600] px-1.5 text-[13px] font-bold text-[#0b1e3a]">
                    {todo}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {person && (
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            {person.requests.length > 0 && (
              <RequestsCard
                p={person}
                uploadEnabled={data.uploadEnabled}
                onUpload={setUpload}
              />
            )}
            <DeliveredCard
              p={person}
              importDone={data.drawer.importDone}
              uploadEnabled={data.uploadEnabled}
              onUpload={setUpload}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-[18px]">
            <SignedCard p={person} importDone={data.drawer.importDone} />
            <Card id="doc-chi-vede" title="Chi vede i tuoi documenti">
              <ul className="m-0 flex list-none flex-col gap-2 px-4 pb-4 text-[14px] leading-snug sm:px-[18px]">
                <li className="flex gap-2">
                  <ShieldCheck
                    className="mt-0.5 size-4 flex-none text-[#1e90e0]"
                    aria-hidden="true"
                  />
                  I file restano nel Drive del club: l'app tiene solo l'elenco e
                  lo stato.
                </li>
                <li className="flex gap-2">
                  <ShieldCheck
                    className="mt-0.5 size-4 flex-none text-[#1e90e0]"
                    aria-hidden="true"
                  />
                  Certificato e documenti d'identità: solo tu (o il genitore),
                  Segreteria e Direzione. Mister e staff sanno solo se sei in
                  regola.
                </li>
                <li className="flex gap-2">
                  <ShieldCheck
                    className="mt-0.5 size-4 flex-none text-[#1e90e0]"
                    aria-hidden="true"
                  />
                  Attestazione ISEE: solo Segreteria, Tesoreria e Direzione.
                </li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {upload && (
        <UploadDialog target={upload} onClose={() => setUpload(null)} />
      )}
    </div>
  );
}

function ClubRegulations() {
  return (
    <Card
      id="doc-regolamenti"
      title="Regolamenti del club"
      sub="Stagione 2026/27, PDF ufficiali."
    >
      <ul className="m-0 list-none p-0">
        {CLUB_DOCUMENTS.map((doc) => (
          <li key={doc.id} className="border-t border-[var(--in-line)]">
            <a
              href={doc.file}
              target="_blank"
              rel="noopener noreferrer"
              className="scd-focus flex min-h-12 items-center gap-3 px-4 py-2.5 sm:px-[18px]"
            >
              <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">
                {doc.title}
              </span>
              <ExternalLink
                className="size-4 flex-none text-[var(--in-sub)]"
                aria-label="apre il PDF"
              />
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RequestsCard({
  p,
  uploadEnabled,
  onUpload,
}: {
  p: DrawerPerson;
  uploadEnabled: boolean;
  onUpload: (t: UploadTarget) => void;
}) {
  return (
    <Card
      id="doc-richiesti"
      title="Richiesti dalla Segreteria"
      sub="Documenti che servono alla Segreteria: carica una foto o un PDF."
    >
      <ul className="m-0 list-none p-0" data-testid="doc-richieste">
        {p.requests.map((q) => (
          <li
            key={q.id}
            className="flex flex-wrap items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]"
          >
            <span className="min-w-0 flex-1">
              <b className="block text-[15px] leading-snug">
                {kindLabel(q.kind)}
              </b>
              {q.note && (
                <span className="mt-0.5 block text-[14px] text-[var(--in-sub)]">
                  {q.note}
                </span>
              )}
              <span className="mt-1 flex flex-wrap gap-1">
                <Chip tone={REQUEST_TONE[q.status]}>
                  {REQUEST_LABEL[q.status]}
                </Chip>
                {q.due && <Chip tone="mute">entro il {itDay(q.due)}</Chip>}
              </span>
            </span>
            {(q.status === "APERTA" || q.status === "RIFIUTATO") && (
              <UploadButton
                enabled={uploadEnabled}
                onClick={() =>
                  onUpload({
                    personId: p.personId,
                    personLabel: p.label,
                    kind: q.kind,
                    requestId: q.id,
                  })
                }
              />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DeliveredCard({
  p,
  importDone,
  uploadEnabled,
  onUpload,
}: {
  p: DrawerPerson;
  importDone: boolean;
  uploadEnabled: boolean;
  onUpload: (t: UploadTarget) => void;
}) {
  return (
    <Card
      id="doc-consegnati"
      title="Consegnati"
      sub={
        importDone
          ? "Stato di ogni documento: in regola, in scadenza (30 giorni), scaduto o mancante."
          : "Stiamo collegando i documenti consegnati con l'iscrizione: quelli «da collegare» non sono mancanti."
      }
    >
      {p.delivered.length === 0 ? (
        <div className="px-4 pb-4 sm:px-[18px]">
          <EmptyState title="Nessun documento da consegnare">
            Per questo profilo non servono documenti.
          </EmptyState>
        </div>
      ) : (
        <ul className="m-0 list-none p-0" data-testid="doc-consegnati-lista">
          {p.delivered.map((d) => (
            <DeliveredRow
              key={d.kind}
              d={d}
              uploadEnabled={uploadEnabled}
              onUpload={() =>
                onUpload({
                  personId: p.personId,
                  personLabel: p.label,
                  kind: d.kind,
                  requestId: null,
                })
              }
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function DeliveredRow({
  d,
  uploadEnabled,
  onUpload,
}: {
  d: DeliveredDoc;
  uploadEnabled: boolean;
  onUpload: () => void;
}) {
  const canUpload = d.status !== "IN_VERIFICA";
  return (
    <li className="flex flex-wrap items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 first:border-t-0 sm:px-[18px]">
      <FileCheck2
        className="size-5 flex-none text-[#1e90e0]"
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <b className="block text-[15px] leading-snug">{kindLabel(d.kind)}</b>
        <span className="mt-1 flex flex-wrap gap-1">
          <Chip tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Chip>
          {d.expiresAt && (
            <Chip tone="mute">
              {d.status === "SCADUTO" ? "scaduto il" : "scade il"}{" "}
              {itDay(d.expiresAt)}
            </Chip>
          )}
          {d.pending && d.status !== "IN_VERIFICA" && (
            <Chip tone="info">nuovo file in verifica</Chip>
          )}
        </span>
        {d.status === "RIFIUTATO" && d.reviewNote && (
          <span className="mt-1 block text-[14px] text-[var(--in-crit)]">
            Motivo: {d.reviewNote}
          </span>
        )}
      </span>
      {canUpload && (
        <UploadButton
          enabled={uploadEnabled}
          label={d.status === "IN_REGOLA" ? "Aggiorna" : "Carica"}
          ghost={d.status === "IN_REGOLA"}
          onClick={onUpload}
        />
      )}
    </li>
  );
}

function UploadButton({
  enabled,
  onClick,
  label = "Carica",
  ghost = false,
}: {
  enabled: boolean;
  onClick: () => void;
  label?: string;
  ghost?: boolean;
}) {
  if (!enabled)
    return (
      <span
        className="text-[13px] font-semibold text-[var(--in-sub)]"
        data-testid="doc-carica-off"
      >
        Caricamento in preparazione
      </span>
    );
  return (
    <button
      type="button"
      onClick={onClick}
      className={ghost ? btnGhost : btnMain}
      data-testid="doc-carica"
    >
      <Upload className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function SignedCard({
  p,
  importDone,
}: {
  p: DrawerPerson;
  importDone: boolean;
}) {
  const liberatoria = p.signed.some((s) => s.kind === "LIBERATORIA_IMMAGINI");
  return (
    <Card
      id="doc-firmati"
      title="Firmati all'iscrizione"
      sub="Documenti accettati con il modulo d'iscrizione."
    >
      {p.signed.length === 0 ? (
        <div className="px-4 pb-4 sm:px-[18px]">
          <EmptyState
            title={
              importDone
                ? "Nessuna accettazione registrata"
                : "Da collegare al modulo d'iscrizione"
            }
          >
            {importDone
              ? "Se hai compilato il modulo, scrivi alla Segreteria."
              : "Le accettazioni del modulo 2026/27 arrivano qui appena la Segreteria le collega."}
          </EmptyState>
        </div>
      ) : (
        <ul className="m-0 list-none p-0" data-testid="doc-firmati-lista">
          {p.signed.map((s) => {
            const href = clubPdf(kindInfo(s.kind)?.clubDocId ?? null);
            return (
              <li
                key={s.kind}
                className="flex items-center gap-3 border-t border-[var(--in-line)] px-4 py-2.5 first:border-t-0 sm:px-[18px]"
              >
                <span className="min-w-0 flex-1">
                  <b className="block text-[14.5px] leading-snug">
                    {kindLabel(s.kind)}
                  </b>
                  <span className="text-[13px] text-[var(--in-sub)]">
                    {s.acceptedAt
                      ? `accettato il ${itDay(s.acceptedAt)}`
                      : "accettato"}
                  </span>
                </span>
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="scd-focus inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14px] font-semibold"
                  >
                    <ExternalLink className="size-4" aria-hidden="true" />
                    PDF
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {liberatoria && p.consents.length > 0 && (
        <div className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
          <p className="m-0 mb-1.5 text-[13px] font-bold uppercase tracking-[0.04em] text-[var(--in-sub)]">
            Consensi scelti
          </p>
          <span className="flex flex-wrap gap-1">
            {p.consents.map((c) => (
              <Chip key={c.type} tone={c.granted ? "ok" : "mute"}>
                {CONSENT_LABEL[c.type] ?? c.type}: {c.granted ? "sì" : "no"}
              </Chip>
            ))}
          </span>
        </div>
      )}
    </Card>
  );
}

function UploadDialog({
  target,
  onClose,
}: {
  target: UploadTarget;
  onClose: () => void;
}) {
  const router = useRouter();
  const send = useServerFn(uploadMyDocument);
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const tooBig = useMemo(
    () => (file ? file.size > MAX_UPLOAD_BYTES : false),
    [file],
  );

  async function run() {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("personId", target.personId);
      fd.set("kind", target.kind);
      if (target.requestId) fd.set("requestId", target.requestId);
      const out = await send({ data: fd });
      setMsg({ ok: out.ok, text: out.message });
      if (out.ok) {
        setFile(null);
        if (input.current) input.current.value = "";
        void router.invalidate();
      }
    } catch {
      setMsg({
        ok: false,
        text: "Caricamento non riuscito. Riprova tra poco.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Carica un documento"
      onClose={onClose}
      testId="doc-carica-dialog"
    >
      <div className="mt-3 flex flex-col gap-3 text-[14.5px]">
        <p className="m-0">
          <b>{kindLabel(target.kind)}</b> · {target.personLabel}
        </p>
        <label className="flex min-h-12 cursor-pointer flex-col gap-1 rounded-[12px] border border-dashed border-[#9fbbe0] bg-[#f4f8fd] px-3 py-3">
          <span className="font-semibold">Scegli una foto o un PDF</span>
          <span className="text-[13px] text-[var(--in-sub)]">
            JPG, PNG, HEIC o PDF, fino a 10 MB. Fronte e retro: due caricamenti.
          </span>
          <input
            ref={input}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/heic,.heic,.pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 text-[14px]"
            data-testid="doc-file"
          />
        </label>
        {tooBig && (
          <p className="m-0 rounded-[10px] bg-[#fdecea] px-3 py-2">
            Il file supera 10 MB: scatta la foto con qualità più bassa o carica
            un PDF più leggero.
          </p>
        )}
        {msg && (
          <p
            role="status"
            className={`m-0 rounded-[10px] px-3 py-2 ${msg.ok ? "bg-[var(--in-ok-bg)]" : "bg-[#fdecea]"}`}
          >
            {msg.text}
          </p>
        )}
        <p className="m-0 text-[13px] text-[var(--in-sub)]">
          Il file va nella cartella della persona nel Drive del club; la
          Segreteria lo verifica.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void run()}
            disabled={!file || tooBig || busy}
            className={btnMain}
            data-testid="doc-invia"
          >
            <Upload className="size-4" aria-hidden="true" />
            {busy ? "Caricamento…" : "Carica"}
          </button>
          <button type="button" onClick={onClose} className={btnGhost}>
            Chiudi
          </button>
        </div>
      </div>
    </Dialog>
  );
}

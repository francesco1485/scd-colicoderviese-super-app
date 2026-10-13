/**
 * Posta del club (r95, UD-101): inbox, thread, composer and new-contact proposals for Direzione, Segreteria and
 * Tesoreria. Mobile first: on phones the list and the thread are two steps; from lg up they sit side by side.
 * Every action goes through src/lib/comm.functions.ts (database functions with the caller's session).
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowLeft, Check, Inbox as InboxIcon, Lock, LockOpen, Mail, MailPlus, Paperclip, RefreshCw, Reply, Search, Send, Undo2, UserPlus, Users, X } from "lucide-react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";

import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import {
  getCommInbox,
  getCommThread,
  linkCommContact,
  queueCommMessage,
  resolveCommAudience,
  saveCommDraft,
  searchCommDirectory,
  setCommConfidentiality,
  setCommThreadStatus,
  type CommOutcome,
  type InboxData,
} from "@/lib/comm.functions";
import {
  AGE_BAND_LABEL,
  AUDIENCE_OPTIONS,
  CONTACT_KIND_LABEL,
  DELIVERY_LABEL,
  EXCLUDED_LABEL,
  INBOX_FILTERS,
  OFFICES,
  OFFICE_LABEL,
  capSummary,
  envelopeBreakdown,
  filterThreads,
  inboxCounts,
  parseEmailList,
  replyAudience,
  replySubject,
  type Audience,
  type AudienceKind,
  type Confidentiality,
  type ContactKind,
  type ContactProposal,
  type Delivery,
  type Directory,
  type Inbox,
  type InboxFilter,
  type Office,
  type ResolvePreview,
  type ThreadDetail,
  type ThreadMessage,
  type ThreadSummary,
} from "@/lib/comm/rules";
import { itDateTime } from "@/lib/fees";

const btn = "scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const btnGhost = `${btn} border border-[var(--in-line)] bg-white text-[var(--in-ink)]`;
const btnPrimary = `${btn} bg-[var(--in-info)] text-white`;
const btnAction = `${btn} bg-[var(--in-action)] text-[var(--in-ink)]`;
const input = "scd-focus min-h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] text-[var(--in-ink)]";

const DELIVERY_TONE: Readonly<Record<Delivery, ChipTone>> = { DRAFT: "mute", PENDING: "info", QUEUED: "warn", SENT: "ok", FAILED: "crit" };

function shortTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(d);
  if (day === today) return new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(d);
  return new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit" }).format(d);
}

function Notice({ tone, children }: { tone: "ok" | "warn" | "crit"; children: ReactNode }) {
  const cls = tone === "ok" ? "border-[#bfe3cd] bg-[var(--in-ok-bg)]" : tone === "warn" ? "border-[#f1dc7a] bg-[var(--in-warn-bg)]" : "border-[#f3c1bb] bg-[var(--in-crit-bg)]";
  return (
    <div role="status" className={`rounded-xl border px-3.5 py-2.5 text-[14.5px] font-semibold leading-snug text-[var(--in-ink)] ${cls}`}>
      {children}
    </div>
  );
}

// ------------------------------------------------------------------ page

export function CommHubPage({ initial }: { initial: InboxData }) {
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<InboxFilter>("tutte");
  const [office, setOffice] = useState<Office | "TUTTI">("TUTTI");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [composer, setComposer] = useState<ComposerSeed | null>(null);
  const [toast, setToast] = useState<CommOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const reloadInbox = useServerFn(getCommInbox);
  const loadThread = useServerFn(getCommThread);

  const inbox = data.inbox;
  const counts = inboxCounts(inbox);
  const shown = useMemo(() => (inbox ? filterThreads(inbox.threads, filter, office, q) : []), [inbox, filter, office, q]);

  async function refresh() {
    setBusy(true);
    try {
      setData(await reloadInbox());
      if (openId) setThread(await loadThread({ data: { id: openId } }));
    } catch {
      setToast({ ok: false, message: "Aggiornamento non riuscito. Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  }

  async function open(id: string) {
    setOpenId(id);
    setLoadingThread(true);
    setThread(null);
    try {
      setThread(await loadThread({ data: { id } }));
      setData((d) => (d.inbox ? { ...d, inbox: { ...d.inbox, threads: d.inbox.threads.map((t) => (t.id === id ? { ...t, unread: false } : t)) } } : d));
    } finally {
      setLoadingThread(false);
    }
  }

  async function after(o: CommOutcome, threadId?: string | null) {
    setToast(o);
    const next = await reloadInbox();
    setData(next);
    const id = threadId ?? openId;
    if (id) {
      setOpenId(id);
      setThread(await loadThread({ data: { id } }));
    }
  }

  if (!data.connected) return <EmptyState title="Accesso non attivo">Entra con il tuo account della società per vedere la posta del club.</EmptyState>;
  if (data.error)
    return (
      <EmptyState title="Posta non disponibile" action={<button type="button" className={btnGhost} onClick={() => void refresh()}>Riprova</button>}>
        {data.error}
      </EmptyState>
    );
  if (!inbox) return <EmptyState title="Area riservata">La posta del club è per Direzione, Segreteria e Tesoreria. Se ti serve l'accesso chiedilo alla Direzione.</EmptyState>;

  const isDirection = inbox.offices.includes("DIREZIONE");

  return (
    <div className="flex flex-col gap-3 lg:gap-[18px]" data-testid="comm-hub">
      <SendingBanner inbox={inbox} isDirection={isDirection} />
      {toast && (
        <div className="flex items-start gap-2" data-testid="comm-toast">
          <div className="min-w-0 flex-1">
            <Notice tone={toast.ok ? "ok" : "crit"}>{toast.message}</Notice>
          </div>
          <button type="button" aria-label="Chiudi avviso" className="scd-focus grid size-11 flex-none place-items-center rounded-full bg-[#eef3f9]" onClick={() => setToast(null)}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-[18px]">
        <div className={openId ? "hidden lg:block" : "block"}>
          <Card
            id="comm-list"
            title="Conversazioni"
            sub={`${counts.unread} non lette · ${counts.open} aperte`}
            aside={
              <>
                <button type="button" className={btnGhost} onClick={() => void refresh()} disabled={busy} aria-label="Aggiorna la posta">
                  <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
                </button>
                <button type="button" className={btnAction} data-testid="comm-new" onClick={() => setComposer({ mode: "new", office: inbox.offices[0] ?? "SEGRETERIA" })}>
                  <MailPlus className="size-4" aria-hidden="true" /> Nuovo
                </button>
              </>
            }
          >
            <ListFilters
              filter={filter}
              setFilter={setFilter}
              office={office}
              setOffice={setOffice}
              q={q}
              setQ={setQ}
              counts={{ "non-lette": counts.unread, "nuovi-contatti": counts.proposals, bozze: counts.drafts }}
            />
            {filter === "nuovi-contatti" ? (
              <ProposalsList proposals={inbox.proposals} onDone={(o) => void after(o, null)} />
            ) : (
              <ThreadList threads={shown} openId={openId} onOpen={(id) => void open(id)} />
            )}
          </Card>
        </div>
        <div className={openId ? "block" : "hidden lg:block"}>
          {openId ? (
            <ThreadView
              thread={thread}
              loading={loadingThread}
              sendingOn={inbox.settings.sendingEnabled && inbox.settings.gmailConnected}
              onBack={() => {
                setOpenId(null);
                setThread(null);
              }}
              onReply={(t) =>
                setComposer({
                  mode: "reply",
                  threadId: t.id,
                  office: inbox.offices.includes(t.office) || isDirection ? t.office : inbox.offices[0] ?? "SEGRETERIA",
                  confidentiality: t.confidentiality,
                  subject: replySubject(t.subject),
                  audience: replyAudience(t),
                })
              }
              onEditDraft={(t, m) =>
                setComposer({
                  mode: "edit",
                  threadId: t.id,
                  messageId: m.id,
                  office: m.office ?? t.office,
                  confidentiality: t.confidentiality,
                  subject: m.subject,
                  body: m.body,
                  audience: m.audience,
                })
              }
              onDone={(o) => void after(o)}
            />
          ) : (
            <Card id="comm-empty">
              <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                <InboxIcon className="size-10 text-[var(--in-info)]" strokeWidth={1.6} aria-hidden="true" />
                <b className="text-[17px]">Scegli una conversazione</b>
                <p className="m-0 max-w-[420px] text-[14.5px] text-[var(--in-sub)]">
                  Ogni mail parte da {inbox.settings.mailbox} con il nome di chi la scrive; le risposte tornano qui, nella stessa conversazione.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
      {composer && (
        <Composer
          seed={composer}
          inbox={inbox}
          onClose={() => setComposer(null)}
          onDone={(o) => {
            setComposer(null);
            void after(o, o.threadId ?? null);
          }}
        />
      )}
    </div>
  );
}

function SendingBanner({ inbox, isDirection }: { inbox: Inbox; isDirection: boolean }) {
  const s = inbox.settings;
  const on = s.sendingEnabled && s.gmailConnected;
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border px-4 py-3 ${on ? "border-[#bfe3cd] bg-[var(--in-ok-bg)]" : "border-[#f1dc7a] bg-[var(--in-warn-bg)]"}`}
      data-testid="comm-sending"
    >
      {on ? <Send className="size-5 flex-none text-[var(--in-ok)]" aria-hidden="true" /> : <AlertTriangle className="size-5 flex-none text-[var(--in-warn)]" aria-hidden="true" />}
      <div className="min-w-0 flex-1 text-[14.5px] leading-snug">
        <b className="block text-[15.5px]">{on ? "Invio attivo" : "Invio non ancora attivo"}</b>
        {on ? (
          <span>{capSummary({ sentToday: s.sentToday, cap: s.dailyCap, queued: s.queued })}{s.failedToday ? ` · ${s.failedToday} non inviate oggi` : ""}</span>
        ) : (
          <span>
            Puoi scrivere e salvare bozze. L'invio parte da {s.mailbox} quando la Direzione {s.gmailConnected ? "attiva l'invio" : "collega la casella e attiva l'invio"}.
          </span>
        )}
      </div>
      {isDirection && (
        <Link to="/direzione/posta/collega" className={btnGhost} data-testid="comm-setup-link">
          {s.gmailConnected ? "Gestisci invio" : "Collega la casella"}
        </Link>
      )}
    </div>
  );
}

function ListFilters(p: {
  filter: InboxFilter;
  setFilter: (f: InboxFilter) => void;
  office: Office | "TUTTI";
  setOffice: (o: Office | "TUTTI") => void;
  q: string;
  setQ: (q: string) => void;
  counts: Partial<Record<InboxFilter, number>>;
}) {
  const searchId = useId();
  return (
    <div className="flex flex-col gap-2.5 px-4 pb-3 sm:px-[18px]">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_170px] lg:grid-cols-1">
        <div className="relative min-w-0">
          <label htmlFor={searchId} className="sr-only">Cerca nella posta</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--in-sub)]" aria-hidden="true" />
          <input id={searchId} type="search" value={p.q} onChange={(e) => p.setQ(e.target.value)} placeholder="Cerca oggetto, persona, testo" className={`${input} pl-9`} />
        </div>
        <div className="min-w-0">
          <label className="sr-only" htmlFor={`${searchId}-office`}>Ufficio</label>
          <select id={`${searchId}-office`} value={p.office} onChange={(e) => p.setOffice(e.target.value as Office | "TUTTI")} className={input}>
            <option value="TUTTI">Tutti gli uffici</option>
            {OFFICES.map((o) => (
              <option key={o} value={o}>{OFFICE_LABEL[o]}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filtri">
        {INBOX_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={p.filter === f.id}
            onClick={() => p.setFilter(f.id)}
            className={`scd-focus inline-flex min-h-10 flex-none items-center gap-1.5 rounded-full border px-3 text-[14px] font-semibold ${p.filter === f.id ? "border-[var(--in-info)] bg-[var(--in-info)] text-white" : "border-[var(--in-line)] bg-white text-[var(--in-ink)]"}`}
          >
            {f.label}
            {(p.counts[f.id] ?? 0) > 0 && <span className={`rounded-full px-1.5 text-[12px] ${p.filter === f.id ? "bg-white/25" : "bg-[var(--in-warn-bg)] text-[var(--in-warn)]"}`}>{p.counts[f.id]}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function ThreadList({ threads, openId, onOpen }: { threads: readonly ThreadSummary[]; openId: string | null; onOpen: (id: string) => void }) {
  if (threads.length === 0)
    return (
      <div className="px-4 pb-4 sm:px-[18px]">
        <EmptyState title="Nessuna conversazione">Con questi filtri non c'è nulla. Le risposte e le mail nuove arrivano qui quando la casella è collegata.</EmptyState>
      </div>
    );
  return (
    <ul className="m-0 max-h-none list-none p-0 lg:max-h-[calc(100vh-330px)] lg:overflow-y-auto" data-testid="comm-threads">
      {threads.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => onOpen(t.id)}
            aria-current={openId === t.id ? "true" : undefined}
            className={`scd-focus flex w-full items-start gap-3 border-t border-[var(--in-line)] px-4 py-3 text-left sm:px-[18px] ${openId === t.id ? "bg-[var(--in-info-bg)]" : "hover:bg-[#f7fbff]"}`}
          >
            <span className={`mt-1.5 size-2.5 flex-none rounded-full ${t.unread ? "bg-[var(--in-info)]" : "bg-transparent"}`} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <b className={`min-w-0 flex-1 truncate text-[15.5px] ${t.unread ? "font-extrabold" : "font-bold"}`}>{t.counterpartLabel ?? "Destinatari"}</b>
                <span className="flex-none text-[12.5px] text-[var(--in-sub)]">{shortTime(t.lastMessageAt)}</span>
              </span>
              <span className="block truncate text-[14.5px] font-semibold">{t.subject}</span>
              <span className="block truncate text-[13.5px] text-[var(--in-sub)]">
                {t.last ? `${t.last.direction === "OUT" ? `${t.last.senderName ?? "Staff"}: ` : ""}${t.last.snippet || "(senza testo)"}` : ""}
              </span>
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                <Chip tone="info">{OFFICE_LABEL[t.office]}</Chip>
                {t.confidentiality === "RISERVATO" && <Chip tone="warn"><Lock className="size-3.5" aria-hidden="true" /> Riservato</Chip>}
                {t.drafts > 0 && <Chip tone="mute">{t.drafts === 1 ? "1 bozza" : `${t.drafts} bozze`}</Chip>}
                {t.queued > 0 && <Chip tone="warn">In coda</Chip>}
                {t.status === "CHIUSO" && <Chip tone="mute">Chiusa</Chip>}
              </span>
              {t.unread && <span className="sr-only">Non letta</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ thread

function ThreadView(p: {
  thread: ThreadDetail | null;
  loading: boolean;
  sendingOn: boolean;
  onBack: () => void;
  onReply: (t: ThreadDetail) => void;
  onEditDraft: (t: ThreadDetail, m: ThreadMessage) => void;
  onDone: (o: CommOutcome) => void;
}) {
  const setConf = useServerFn(setCommConfidentiality);
  const setStatus = useServerFn(setCommThreadStatus);
  const queue = useServerFn(queueCommMessage);
  const [busy, setBusy] = useState<string | null>(null);
  const t = p.thread;

  async function run(key: string, fn: () => Promise<CommOutcome>) {
    setBusy(key);
    try {
      p.onDone(await fn());
    } catch {
      p.onDone({ ok: false, message: "Operazione non riuscita. Riprova tra poco." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card id="comm-thread" className="flex min-h-[420px] flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--in-line)] px-3 py-2 lg:hidden">
        <button type="button" className={`${btnGhost} border-0 px-2`} onClick={p.onBack} data-testid="comm-back">
          <ArrowLeft className="size-5" aria-hidden="true" /> Tutte le conversazioni
        </button>
      </div>
      {p.loading || !t ? (
        <div className="px-5 py-10 text-[15px] text-[var(--in-sub)]">{p.loading ? "Apro la conversazione…" : "Conversazione non disponibile."}</div>
      ) : (
        <>
          <header className="flex flex-col gap-2 px-4 pb-3 pt-4 sm:px-[18px]">
            <h2 className="m-0 text-[20px] font-bold leading-tight" data-testid="comm-thread-subject">{t.subject}</h2>
            <p className="m-0 text-[14.5px] text-[var(--in-sub)]">
              <Users className="mr-1 inline size-4 align-[-3px]" aria-hidden="true" />
              {t.counterpartLabel ?? "Destinatari"}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip tone="info">{OFFICE_LABEL[t.office]}</Chip>
              {t.confidentiality === "RISERVATO" ? (
                <Chip tone="warn"><Lock className="size-3.5" aria-hidden="true" /> Riservato · Direzione e {OFFICE_LABEL[t.office]}</Chip>
              ) : (
                <Chip tone="mute">Ordinario · i tre uffici</Chip>
              )}
              {t.status === "CHIUSO" && <Chip tone="mute">Chiusa</Chip>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} onClick={() => p.onReply(t)} data-testid="comm-reply">
                <Reply className="size-4" aria-hidden="true" /> Rispondi
              </button>
              {t.canManage && (
                <button
                  type="button"
                  className={btnGhost}
                  disabled={busy !== null}
                  onClick={() => void run("conf", () => setConf({ data: { threadId: t.id, level: t.confidentiality === "RISERVATO" ? "ORDINARIO" : "RISERVATO" } }))}
                >
                  {t.confidentiality === "RISERVATO" ? <LockOpen className="size-4" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
                  {t.confidentiality === "RISERVATO" ? "Rendi ordinaria" : "Rendi riservata"}
                </button>
              )}
              <button
                type="button"
                className={btnGhost}
                disabled={busy !== null}
                onClick={() => void run("status", () => setStatus({ data: { threadId: t.id, status: t.status === "APERTO" ? "CHIUSO" : "APERTO" } }))}
              >
                {t.status === "APERTO" ? <Check className="size-4" aria-hidden="true" /> : <Undo2 className="size-4" aria-hidden="true" />}
                {t.status === "APERTO" ? "Chiudi" : "Riapri"}
              </button>
            </div>
          </header>
          <ol className="m-0 flex list-none flex-col gap-3 border-t border-[var(--in-line)] bg-[var(--in-ground)] px-3 py-4 sm:px-[18px]" data-testid="comm-messages">
            {t.messages.map((m) => (
              <MessageBubble
                key={m.id}
                m={m}
                sendingOn={p.sendingOn}
                busy={busy === m.id}
                onEdit={() => p.onEditDraft(t, m)}
                onQueue={() => void run(m.id, () => queue({ data: { messageId: m.id } }))}
              />
            ))}
          </ol>
        </>
      )}
    </Card>
  );
}

function MessageBubble({ m, sendingOn, busy, onEdit, onQueue }: { m: ThreadMessage; sendingOn: boolean; busy: boolean; onEdit: () => void; onQueue: () => void }) {
  const out = m.direction === "OUT";
  const when = out ? m.sentAt ?? m.queuedAt ?? m.createdAt : m.receivedAt ?? m.createdAt;
  const failed = m.status["FAILED"] ?? 0;
  const sent = m.status["SENT"] ?? 0;
  const queued = (m.status["QUEUED"] ?? 0) + (m.status["SENDING"] ?? 0);
  return (
    <li className={`flex ${out ? "justify-end" : "justify-start"}`}>
      <article
        className={`w-full max-w-[640px] rounded-2xl border px-4 py-3 ${out ? "border-[#b9d5ef] bg-[var(--in-info-bg)]" : "border-[var(--in-line)] bg-white"}`}
        aria-label={out ? `Messaggio inviato da ${m.senderName ?? "staff"}` : `Messaggio ricevuto da ${m.fromName ?? m.from ?? "mittente"}`}
      >
        <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <b className="text-[14.5px]">
            {out ? `Inviato da ${m.senderName ?? "staff"}${m.office ? ` · ${OFFICE_LABEL[m.office]}` : ""}` : m.fromName ? `${m.fromName}` : m.from}
          </b>
          {!out && m.fromName && <span className="text-[13px] text-[var(--in-sub)]">{m.from}</span>}
          <span className="ml-auto text-[12.5px] text-[var(--in-sub)]">{itDateTime(when)}</span>
        </header>
        {out && m.delivery && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip tone={DELIVERY_TONE[m.delivery]}>{DELIVERY_LABEL[m.delivery]}</Chip>
            {m.recipients > 0 && <Chip tone="mute">{m.recipients === 1 ? "1 destinatario" : `${m.recipients} destinatari`}</Chip>}
            {sent > 0 && m.recipients > 1 && <Chip tone="ok">{sent} inviati</Chip>}
            {queued > 0 && m.delivery === "QUEUED" && <Chip tone="warn">{queued} in attesa</Chip>}
            {failed > 0 && <Chip tone="crit">{failed} non inviati</Chip>}
          </div>
        )}
        {m.subject && <p className="mb-0 mt-2 text-[14px] font-semibold">{m.subject}</p>}
        <div className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{m.body || <i className="text-[var(--in-sub)]">(senza testo)</i>}</div>
        {m.attachments > 0 && (
          <p className="mb-0 mt-2 flex items-center gap-1.5 text-[13.5px] text-[var(--in-sub)]">
            <Paperclip className="size-4" aria-hidden="true" /> {m.attachments === 1 ? "1 allegato" : `${m.attachments} allegati`} nella casella della società
          </p>
        )}
        {out && m.delivery === "DRAFT" && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className={btnGhost} onClick={onEdit}>Modifica bozza</button>
            <button type="button" className={btnPrimary} onClick={onQueue} disabled={!sendingOn || busy} aria-describedby={!sendingOn ? `why-${m.id}` : undefined}>
              <Send className="size-4" aria-hidden="true" /> Metti in coda
            </button>
            {!sendingOn && (
              <span id={`why-${m.id}`} className="text-[13px] text-[var(--in-sub)]">Invio non ancora attivo: resta in bozza.</span>
            )}
          </div>
        )}
      </article>
    </li>
  );
}

// ------------------------------------------------------------------ proposals

function ProposalsList({ proposals, onDone }: { proposals: readonly ContactProposal[]; onDone: (o: CommOutcome) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (proposals.length === 0)
    return (
      <div className="px-4 pb-4 sm:px-[18px]">
        <EmptyState title="Nessun nuovo contatto">Quando scrive un indirizzo che il club non conosce, compare qui: una persona decide se accettarlo, collegarlo o scartarlo.</EmptyState>
      </div>
    );
  return (
    <ul className="m-0 list-none p-0" data-testid="comm-proposals">
      {proposals.map((c) => (
        <li key={c.id} className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
          <div className="flex items-start gap-3">
            <UserPlus className="mt-0.5 size-5 flex-none text-[var(--in-info)]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[15.5px]">{c.displayName ?? c.email}</b>
              <span className="block truncate text-[13.5px] text-[var(--in-sub)]">{c.email}</span>
              <span className="block text-[13.5px] text-[var(--in-sub)]">
                {c.messages === 1 ? "1 mail" : `${c.messages} mail`}
                {c.lastSubject ? ` · ultima: ${c.lastSubject}` : ""}
              </span>
            </div>
            <button type="button" className={btnGhost} onClick={() => setOpenId(openId === c.id ? null : c.id)} aria-expanded={openId === c.id}>
              Decidi
            </button>
          </div>
          {openId === c.id && <ProposalDecision c={c} onDone={onDone} />}
        </li>
      ))}
    </ul>
  );
}

function ProposalDecision({ c, onDone }: { c: ContactProposal; onDone: (o: CommOutcome) => void }) {
  const link = useServerFn(linkCommContact);
  const search = useServerFn(searchCommDirectory);
  const [kind, setKind] = useState<ContactKind>("EXTERNAL");
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState(c.displayName ?? "");
  const [q, setQ] = useState("");
  const [dir, setDir] = useState<Directory | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();

  async function act(payload: Parameters<typeof link>[0]["data"]) {
    setBusy(true);
    try {
      onDone(await link({ data: payload }));
    } catch {
      onDone({ ok: false, message: "Operazione non riuscita. Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-[var(--in-line)] bg-[#f7fbff] p-3">
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-[14px] font-bold">Accetta come contatto</legend>
        <label className="text-[13.5px] font-semibold" htmlFor={`${id}-k`}>Tipo</label>
        <select id={`${id}-k`} className={input} value={kind} onChange={(e) => setKind(e.target.value as ContactKind)}>
          {(Object.keys(CONTACT_KIND_LABEL) as ContactKind[]).map((k) => (
            <option key={k} value={k}>{CONTACT_KIND_LABEL[k]}</option>
          ))}
        </select>
        <label className="text-[13.5px] font-semibold" htmlFor={`${id}-n`}>Nome</label>
        <input id={`${id}-n`} className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={160} />
        <label className="text-[13.5px] font-semibold" htmlFor={`${id}-o`}>Organizzazione (facoltativo)</label>
        <input id={`${id}-o`} className={input} value={orgName} onChange={(e) => setOrgName(e.target.value)} maxLength={160} />
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void act({ contactId: c.id, action: "ACCEPT", kind, orgName: orgName || null, displayName: name || null })}>
          <Check className="size-4" aria-hidden="true" /> Accetta
        </button>
      </fieldset>
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-bold" htmlFor={`${id}-p`}>Oppure collega a una persona del club</label>
        <div className="flex gap-2">
          <input id={`${id}-p`} className={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome e cognome" />
          <button type="button" className={btnGhost} disabled={q.trim().length < 2} onClick={() => void search({ data: { q } }).then(setDir)}>Cerca</button>
        </div>
        {dir && (
          <ul className="m-0 list-none p-0">
            {dir.people.length === 0 && <li className="text-[13.5px] text-[var(--in-sub)]">Nessuna persona trovata.</li>}
            {dir.people.map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-1">
                <span className="min-w-0 flex-1 truncate text-[14.5px]">{p.label}</span>
                <button type="button" className={btnGhost} disabled={busy} onClick={() => void act({ contactId: c.id, action: "LINK_PERSON", personId: p.id })}>Collega</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" className={`${btnGhost} text-[var(--in-crit)]`} disabled={busy} onClick={() => void act({ contactId: c.id, action: "DISCARD" })}>
        <X className="size-4" aria-hidden="true" /> Scarta (le mail restano agli atti)
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ composer

export interface ComposerSeed {
  mode: "new" | "reply" | "edit";
  office: Office;
  threadId?: string;
  messageId?: string;
  confidentiality?: Confidentiality;
  subject?: string;
  body?: string;
  audience?: Audience | null;
}

function Composer({ seed, inbox, onClose, onDone }: { seed: ComposerSeed; inbox: Inbox; onClose: () => void; onDone: (o: CommOutcome) => void }) {
  const save = useServerFn(saveCommDraft);
  const queue = useServerFn(queueCommMessage);
  const resolve = useServerFn(resolveCommAudience);
  const id = useId();
  const isDirection = inbox.offices.includes("DIREZIONE");
  const officeChoices = isDirection ? OFFICES : inbox.offices;
  const [office, setOffice] = useState<Office>(seed.office);
  const [conf, setConf] = useState<Confidentiality>(seed.confidentiality ?? "ORDINARIO");
  const [audience, setAudience] = useState<Audience | null>(seed.audience ?? null);
  const [subject, setSubject] = useState(seed.subject ?? "");
  const [body, setBody] = useState(seed.body ?? "");
  const [preview, setPreview] = useState<ResolvePreview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendingOn = inbox.settings.sendingEnabled && inbox.settings.gmailConnected;
  const inThread = seed.mode !== "new";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => setPreview(null), [audience]);

  const valid = !!audience && subject.trim().length > 0 && body.length <= 20_000 && audienceComplete(audience);

  async function calc() {
    if (!audience || !audienceComplete(audience)) return;
    setPreviewBusy(true);
    try {
      setPreview(await resolve({ data: { audience: toInput(audience) } }));
    } finally {
      setPreviewBusy(false);
    }
  }

  async function submit(andQueue: boolean) {
    if (!audience) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await save({
        data: {
          threadId: seed.mode === "new" ? null : seed.threadId ?? null,
          messageId: seed.mode === "edit" ? seed.messageId ?? null : null,
          office,
          confidentiality: conf,
          subject: subject.trim(),
          body,
          audience: toInput(audience),
        },
      });
      if (!saved.ok || !andQueue || !saved.messageId) {
        if (!saved.ok) setError(saved.message);
        else onDone(saved);
        return;
      }
      const q = await queue({ data: { messageId: saved.messageId } });
      onDone(q.ok ? { ...q, ...(saved.threadId ? { threadId: saved.threadId } : {}) } : { ...q, ...(saved.threadId ? { threadId: saved.threadId } : {}), message: `Bozza salvata. ${q.message}` });
    } catch {
      setError("Salvataggio non riuscito. Riprova tra poco.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgb(2_15_40/0.6)] sm:items-center sm:p-4" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-[760px] flex-col rounded-t-[20px] bg-white text-[var(--in-ink)] shadow-[0_24px_48px_rgb(0_8_30/0.5)] sm:rounded-[20px]"
        data-testid="comm-composer"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--in-line)] px-5 py-4">
          <div>
            <h2 id={`${id}-t`} className="m-0 text-[21px] font-bold leading-tight">
              {seed.mode === "reply" ? "Rispondi" : seed.mode === "edit" ? "Modifica bozza" : "Nuovo messaggio"}
            </h2>
            <p className="m-0 mt-0.5 text-[13.5px] text-[var(--in-sub)]">Parte da {inbox.settings.mailbox}, con il tuo nome e il tuo ufficio in firma.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="scd-focus grid size-11 flex-none place-items-center rounded-full bg-[#eef3f9]">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-office`} className="text-[14px] font-bold">Ufficio che scrive</label>
              <select id={`${id}-office`} className={input} value={office} onChange={(e) => setOffice(e.target.value as Office)} data-testid="comm-office">
                {officeChoices.map((o) => (
                  <option key={o} value={o}>{OFFICE_LABEL[o]}</option>
                ))}
              </select>
            </div>
            <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0" disabled={inThread}>
              <legend className="mb-1.5 text-[14px] font-bold">Riservatezza</legend>
              <div className="grid grid-cols-2 gap-1 rounded-[12px] bg-[#eef3f9] p-1" role="radiogroup">
                {(["ORDINARIO", "RISERVATO"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={conf === c}
                    onClick={() => setConf(c)}
                    className={`scd-focus inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[9px] text-[14.5px] font-semibold disabled:opacity-60 ${conf === c ? "bg-white shadow-sm" : "text-[var(--in-sub)]"}`}
                    data-testid={`comm-conf-${c}`}
                  >
                    {c === "RISERVATO" && <Lock className="size-4" aria-hidden="true" />} {c === "ORDINARIO" ? "Ordinario" : "Riservato"}
                  </button>
                ))}
              </div>
              <p className="m-0 text-[12.5px] leading-snug text-[var(--in-sub)]">
                {conf === "RISERVATO" ? `La vedono solo la Direzione e la ${OFFICE_LABEL[office]}.` : "La vedono Direzione, Segreteria e Tesoreria."}
                {inThread ? " Si cambia dalla conversazione." : ""}
              </p>
            </fieldset>
          </div>

          <AudiencePicker value={audience} onChange={setAudience} locked={seed.mode === "reply" && !!seed.audience} />

          <div className="rounded-xl border border-[var(--in-line)] bg-[#f7fbff] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btnGhost} onClick={() => void calc()} disabled={!audience || !audienceComplete(audience) || previewBusy} data-testid="comm-calc">
                <Users className="size-4" aria-hidden="true" /> {previewBusy ? "Calcolo…" : "Calcola destinatari"}
              </button>
              {preview && <b className="text-[15px]" data-testid="comm-total">{preview.total === 1 ? "1 mail individuale" : `${preview.total} mail individuali`}</b>}
            </div>
            {preview && <PreviewSummary p={preview} cap={inbox.settings.dailyCap} sentToday={inbox.settings.sentToday} />}
            <p className="m-0 mt-2 text-[12.5px] leading-snug text-[var(--in-sub)]">
              Regola minori: mai a chi ha meno di 14 anni; per i minori scrivono i genitori; atleti 14-17 solo con i genitori in copia. Ogni destinatario riceve una mail separata.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-subject`} className="text-[14px] font-bold">Oggetto</label>
            <input id={`${id}-subject`} className={input} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={250} data-testid="comm-subject" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-body`} className="text-[14px] font-bold">Testo</label>
            <textarea id={`${id}-body`} className={`${input} min-h-[180px] py-2 leading-relaxed`} value={body} onChange={(e) => setBody(e.target.value)} maxLength={20_000} data-testid="comm-body" />
            <span className="self-end text-[12.5px] text-[var(--in-sub)]">{body.length.toLocaleString("it-IT")} / 20.000 · solo testo, la firma si aggiunge da sola</span>
          </div>
          {error && <Notice tone="crit">{error}</Notice>}
        </div>
        <footer className="flex flex-col gap-2 border-t border-[var(--in-line)] px-5 py-3 sm:flex-row sm:items-center sm:justify-end">
          {!sendingOn && (
            <p id={`${id}-why`} className="m-0 text-[13px] leading-snug text-[var(--in-sub)] sm:mr-auto sm:max-w-[320px]" data-testid="comm-why-disabled">
              Invio non ancora attivo: la Direzione deve collegare la casella e attivare l'invio. Intanto salva la bozza.
            </p>
          )}
          <button type="button" className={btnGhost} disabled={!valid || busy} onClick={() => void submit(false)} data-testid="comm-save">
            <Mail className="size-4" aria-hidden="true" /> Salva bozza
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={!valid || busy || !sendingOn}
            aria-describedby={!sendingOn ? `${id}-why` : undefined}
            onClick={() => void submit(true)}
            data-testid="comm-queue"
          >
            <Send className="size-4" aria-hidden="true" /> Metti in coda
          </button>
        </footer>
      </section>
    </div>
  );
}

function audienceComplete(a: Audience): boolean {
  switch (a.kind) {
    case "TEAM":
      return !!a.teamId;
    case "BIRTH_YEAR":
      return !!a.birthYear;
    case "PERSON":
      return !!a.personId;
    case "FAMILY":
      return !!a.familyId;
    case "CONTACT":
      return !!a.contactId;
    case "FREE":
      return (a.emails ?? []).length > 0;
    default:
      return true;
  }
}

function toInput(a: Audience) {
  return {
    kind: a.kind,
    ...(a.teamId ? { teamId: a.teamId } : {}),
    ...(a.birthYear ? { birthYear: a.birthYear } : {}),
    ...(a.personId ? { personId: a.personId } : {}),
    ...(a.familyId ? { familyId: a.familyId } : {}),
    ...(a.contactId ? { contactId: a.contactId } : {}),
    ...(a.emails ? { emails: a.emails } : {}),
  };
}

function PreviewSummary({ p, cap, sentToday }: { p: ResolvePreview; cap: number; sentToday: number }) {
  const excluded = Object.entries(p.excluded).filter(([, n]) => n > 0);
  const room = Math.max(0, cap - sentToday);
  return (
    <div className="mt-2 flex flex-col gap-2 text-[14px]" data-testid="comm-preview">
      <ul className="m-0 flex flex-wrap gap-1.5 p-0">
        {envelopeBreakdown(p.recipients).map((b) => (
          <li key={b.kind} className="list-none">
            <Chip tone="info">{b.count} {b.label}</Chip>
          </li>
        ))}
      </ul>
      {excluded.length > 0 && (
        <div>
          <b className="text-[13.5px]">Non ricevono:</b>
          <ul className="m-0 mt-1 list-disc pl-5 text-[13.5px] text-[var(--in-sub)]">
            {excluded.map(([k, n]) => (
              <li key={k}>{n} · {EXCLUDED_LABEL[k] ?? k}</li>
            ))}
          </ul>
        </div>
      )}
      {p.total > room && (
        <Notice tone="warn">Oggi restano {room} invii su {cap}: le altre {p.total - room} mail partono domani, in automatico.</Notice>
      )}
      {p.recipients.length > 0 && (
        <details>
          <summary className="scd-focus cursor-pointer text-[13.5px] font-semibold text-[var(--in-info)]">Vedi gli indirizzi ({p.recipients.length})</summary>
          <ul className="m-0 mt-1 max-h-48 list-none overflow-y-auto p-0 text-[13px]">
            {p.recipients.slice(0, 300).map((r) => (
              <li key={r.email} className="border-t border-[var(--in-line)] py-1">
                <b>{r.label}</b> · {r.email}
                {r.cc.length > 0 && <span className="text-[var(--in-sub)]"> · in copia {r.cc.join(", ")}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function AudiencePicker({ value, onChange, locked }: { value: Audience | null; onChange: (a: Audience | null) => void; locked: boolean }) {
  const search = useServerFn(searchCommDirectory);
  const [dir, setDir] = useState<Directory | null>(null);
  const [q, setQ] = useState("");
  const [freeText, setFreeText] = useState((value?.kind === "FREE" ? value.emails ?? [] : []).join(", "));
  const id = useId();

  useEffect(() => {
    let alive = true;
    void search({ data: { q: "" } }).then((d) => alive && setDir(d)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [search]);

  async function find() {
    const d = await search({ data: { q } });
    if (d) setDir(d);
  }

  if (locked && value)
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[14px] font-bold">A chi</span>
        <div className="flex items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-[#f7fbff] px-3 py-2.5 text-[15px]">
          <Reply className="size-4 text-[var(--in-info)]" aria-hidden="true" /> {value.label ?? ((value.emails ?? []).join(", ") || AUDIENCE_OPTIONS.find((o) => o.kind === value.kind)?.label)}
        </div>
      </div>
    );

  const pick = (kind: AudienceKind) => {
    if (kind === "FREE") onChange({ kind, emails: parseEmailList(freeText) });
    else onChange({ kind });
  };

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-1.5 text-[14px] font-bold">A chi</legend>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="radiogroup">
        {AUDIENCE_OPTIONS.map((o) => (
          <button
            key={o.kind}
            type="button"
            role="radio"
            aria-checked={value?.kind === o.kind || (o.kind === "PERSON" && value?.kind === "FAMILY")}
            onClick={() => pick(o.kind)}
            className={`scd-focus min-h-12 rounded-[10px] border px-2.5 py-2 text-left text-[13.5px] font-semibold leading-tight ${value?.kind === o.kind || (o.kind === "PERSON" && value?.kind === "FAMILY") ? "border-[var(--in-info)] bg-[var(--in-info-bg)] text-[var(--in-info)]" : "border-[var(--in-line)] bg-white"}`}
            data-testid={`comm-aud-${o.kind}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {value && <p className="m-0 text-[12.5px] text-[var(--in-sub)]">{AUDIENCE_OPTIONS.find((o) => o.kind === (value.kind === "FAMILY" ? "PERSON" : value.kind))?.hint}</p>}

      {value?.kind === "TEAM" && (
        <select aria-label="Squadra" className={input} value={value.teamId ?? ""} onChange={(e) => onChange({ kind: "TEAM", teamId: e.target.value, label: dir?.teams.find((t) => t.id === e.target.value)?.label ?? "" })}>
          <option value="">Scegli la squadra</option>
          {(dir?.teams ?? []).map((t) => (
            <option key={t.id} value={t.id}>{t.label} · {t.athletes} atleti</option>
          ))}
        </select>
      )}
      {value?.kind === "BIRTH_YEAR" && (
        <select aria-label="Annata" className={input} value={value.birthYear ?? ""} onChange={(e) => onChange({ kind: "BIRTH_YEAR", birthYear: Number(e.target.value), label: `Annata ${e.target.value}` })}>
          <option value="">Scegli l'annata</option>
          {(dir?.birthYears ?? []).map((y) => (
            <option key={y.year} value={y.year}>{y.year} · {y.athletes} atleti</option>
          ))}
        </select>
      )}
      {(value?.kind === "SPONSORS" || value?.kind === "SUPPLIERS") && (
        <p className="m-0 text-[13.5px]">
          {value.kind === "SPONSORS" ? `${dir?.counts.sponsors ?? "—"} contatti sponsor collegati.` : `${dir?.counts.suppliers ?? "—"} contatti fornitori collegati.`} I contatti si aggiungono accettando i nuovi indirizzi in arrivo.
        </p>
      )}
      {(value?.kind === "PERSON" || value?.kind === "FAMILY") && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <label htmlFor={`${id}-q`} className="sr-only">Cerca persona o famiglia</label>
            <input id={`${id}-q`} className={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void find())} placeholder="Nome, cognome o famiglia" />
            <button type="button" className={btnGhost} onClick={() => void find()} disabled={q.trim().length < 2}>Cerca</button>
          </div>
          {value.label && <Chip tone="info"><Check className="size-3.5" aria-hidden="true" /> {value.label}</Chip>}
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {(dir?.people ?? []).map((p) => (
              <li key={p.id}>
                <button type="button" className={`${btnGhost} w-full justify-start text-left`} onClick={() => onChange({ kind: "PERSON", personId: p.id, label: p.label })}>
                  <span className="min-w-0 flex-1 truncate">{p.label}</span>
                  <span className="text-[12.5px] font-medium text-[var(--in-sub)]">{AGE_BAND_LABEL[p.band]}{p.band === "ADULT" && !p.hasEmail ? " · senza e-mail" : ""}</span>
                </button>
              </li>
            ))}
            {(dir?.families ?? []).map((f) => (
              <li key={f.id}>
                <button type="button" className={`${btnGhost} w-full justify-start`} onClick={() => onChange({ kind: "FAMILY", familyId: f.id, label: f.label })}>
                  <Users className="size-4" aria-hidden="true" /> {f.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {value?.kind === "CONTACT" && (
        <select aria-label="Contatto" className={input} value={value.contactId ?? ""} onChange={(e) => onChange({ kind: "CONTACT", contactId: e.target.value, label: dir?.contacts.find((c) => c.id === e.target.value)?.label ?? "" })}>
          <option value="">Scegli il contatto</option>
          {(dir?.contacts ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.label} · {CONTACT_KIND_LABEL[c.kind as ContactKind] ?? c.kind}</option>
          ))}
        </select>
      )}
      {value?.kind === "FREE" && (
        <>
          <label htmlFor={`${id}-free`} className="sr-only">Indirizzi e-mail</label>
          <textarea
            id={`${id}-free`}
            className={`${input} min-h-[64px] py-2`}
            value={freeText}
            placeholder="nome@esempio.it, altro@esempio.it"
            onChange={(e) => {
              setFreeText(e.target.value);
              onChange({ kind: "FREE", emails: parseEmailList(e.target.value) });
            }}
            data-testid="comm-free"
          />
        </>
      )}
    </fieldset>
  );
}

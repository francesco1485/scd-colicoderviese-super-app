import { Mail, ShieldAlert } from "lucide-react";

import { OFFICIAL_CHANNELS, PAUSED_COPY, mailtoFor, type FormKind } from "@/lib/public-forms";

/** Shown instead of a public form while its channel is not live: official e-mail and PEC, nothing is sent. */
export function FormsPausedNotice({
  kind,
  topic,
  body,
  note,
  copy,
}: {
  kind: FormKind;
  topic?: string | undefined;
  body?: string | undefined;
  /** Extra line under the e-mail (e.g. what happens after the answer to a LED spot); ignored for safeguarding. */
  note?: string | undefined;
  /** Title and text for this use (the subject stays the official one); ignored for safeguarding. */
  copy?: { title: string; text: string } | undefined;
}) {
  const c = kind !== "safeguarding" && copy ? { ...PAUSED_COPY[kind], ...copy } : PAUSED_COPY[kind];
  const withTopic = kind !== "safeguarding" && topic;
  return (
    <section className="grid gap-3 rounded-2xl border border-border bg-card p-6" aria-labelledby={`paused-${kind}`} data-testid="forms-paused">
      <h2 id={`paused-${kind}`} className="m-0 text-[20px] font-bold">{c.title}</h2>
      <p className="m-0 text-[15.5px] leading-relaxed">{c.text}</p>
      {withTopic && (
        <p className="m-0 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[15px]" role="status" data-testid="forms-paused-topic">
          Hai scelto: <b>{topic}</b>. L'e-mail parte già con questo oggetto.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <a href={mailtoFor(kind, withTopic ? { topic, body } : {})} className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-[var(--scd-blue)] px-4 text-[16px] font-semibold text-white">
          <Mail className="size-5" aria-hidden="true" />
          {kind === "safeguarding" ? "Scrivi alla PEC riservata" : "Scrivi alla società"}
        </a>
        {kind === "safeguarding" ? (
          <span className="text-[15px]">
            PEC <b className="select-all">{OFFICIAL_CHANNELS.pec}</b>
            <span className="text-muted-foreground"> · oggetto <b className="select-all">{c.subject}</b></span>
          </span>
        ) : (
          <span className="text-[15px]">
            <b className="select-all">{OFFICIAL_CHANNELS.email}</b>
            <span className="text-muted-foreground"> · PEC <span className="select-all">{OFFICIAL_CHANNELS.pec}</span></span>
          </span>
        )}
      </div>
      {kind !== "safeguarding" && note && (
        <p className="m-0 text-[15px] text-muted-foreground" data-testid="forms-paused-note">{note}</p>
      )}
      {kind === "safeguarding" && (
        <p className="m-0 flex items-start gap-2 rounded-xl bg-[#fff4f2] px-3 py-2 text-[14.5px] leading-snug text-[#7a1d10]">
          <ShieldAlert className="mt-0.5 size-5 flex-none" aria-hidden="true" />
          <span>Se un minore è in pericolo adesso chiama il <b>112</b>. Per ragazzi e famiglie c'è anche <b>Telefono Azzurro 19696</b>, attivo giorno e notte.</span>
        </p>
      )}
    </section>
  );
}

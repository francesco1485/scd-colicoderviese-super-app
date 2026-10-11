import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Check, MapPin, Shirt, X } from "lucide-react";
import { useState } from "react";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";
import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { InteriorShell } from "@/components/scd/InteriorShell";
import { PushCard } from "@/components/scd/PushCard";
import { EmptyState } from "@/components/scd/work-area-ui";
import { getSession } from "@/lib/auth.functions";
import { MY_RESPONSE_LABEL, romeDay, romeTime, type CallupResponse } from "@/lib/callups";
import { getMyCallups, respondCallup, type MyCallup } from "@/lib/callups.functions";
import { CERT_LABEL, certificateState } from "@/lib/people";
import { registrationLabel } from "@/lib/roster";
import { getMyFamily, type FamilyMember } from "@/lib/roster.functions";

/**
 * Family area (UD-061, UD-062). Signed out: the access screen of the registry. Signed in: the caller's
 * own circle (themself + people of families where they are a guardian, r61) and their call-ups with
 * "Ci sarò" / "Non ci sarò" (r62). Only what the database functions return is shown.
 */
export const Route = createFileRoute("/famiglia")({
  loader: async () => {
    const [session, family, callups] = await Promise.all([getSession(), getMyFamily(), getMyCallups()]);
    return { roles: session.roles, badge: session.badge, family, callups };
  },
  head: () => accessHead("famiglia"),
  component: FamigliaRoute,
});

function FamigliaRoute() {
  const data = Route.useLoaderData();
  if (data.family.state !== "ok" && data.family.state !== "error") return <AccessScreenPage id="famiglia" />;
  return <FamilyHome roles={data.roles} badge={data.badge} members={data.family.members} callups={data.callups} failed={data.family.state === "error"} />;
}

const TONE: Readonly<Record<CallupResponse, ChipTone>> = { CONFIRMED: "ok", DECLINED: "crit", PENDING: "warn" };

function todayRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function FamilyHome({ roles, badge, members, callups, failed }: { roles: string[]; badge: string | null; members: FamilyMember[]; callups: MyCallup[]; failed: boolean }) {
  const [items, setItems] = useState(callups);
  const pending = items.filter((c) => c.response === "PENDING").length;
  const kids = members.filter((m) => m.relationship !== "SELF");
  const today = todayRome();
  return (
    <InteriorShell
      title={kids.length ? "La mia famiglia" : "Le mie convocazioni"}
      path="/famiglia"
      activeAreaId="famiglia"
      roles={new Set(roles)}
      roleLabel={badge ?? "Famiglia"}
      highlights={[
        { value: items.length, label: "convocazioni in arrivo" },
        { value: pending, label: "da confermare" },
        { value: kids.length || null, label: "ragazzi collegati" },
      ]}
    >
      <div className="flex flex-col gap-[18px]">
        <PushCard />
        <Card id="fam-convocazioni" title="Convocazioni" sub="Rispondi per ogni gara: il mister vede subito la risposta.">
          <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
            {failed ? (
              <EmptyState title="Dati non disponibili">Lettura dal database non riuscita. Riprova tra poco.</EmptyState>
            ) : items.length === 0 ? (
              <EmptyState title="Nessuna convocazione in arrivo">Quando il mister convoca, la gara compare qui con orario e luogo del ritrovo.</EmptyState>
            ) : (
              items.map((c) => <CallupCard key={c.callupId} c={c} onAnswered={(r) => setItems((prev) => prev.map((x) => (x.callupId === c.callupId ? { ...x, response: r } : x)))} />)
            )}
          </div>
        </Card>

        <Card id="fam-ragazzi" title={kids.length ? "I miei ragazzi" : "La mia scheda"} sub="Dati della segreteria: tesseramento e certificato medico.">
          {members.length === 0 ? (
            <div className="px-4 pb-4 sm:px-[18px]">
              <EmptyState title="Nessun ragazzo collegato">
                Il collegamento arriva dal modulo d'iscrizione. Se manca, scrivi alla segreteria con il nome del ragazzo e la tua e-mail.
              </EmptyState>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {members.map((m) => {
                const cert = certificateState(m.certificateExpiresAt, today);
                return (
                  <li key={m.personId} className="flex min-h-14 items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 text-[15px] sm:px-[18px]">
                    <span className="min-w-0 flex-1">
                      <b className="block truncate font-semibold">{m.displayName}{m.relationship === "SELF" ? " (tu)" : ""}</b>
                      <span className="block text-[13px] text-[var(--in-sub)]">
                        {[m.teamCodes.join(", ") || null, m.registrationStatus ? registrationLabel(m.registrationStatus) : null].filter(Boolean).join(" · ") || "Non tesserato"}
                      </span>
                    </span>
                    {m.registrationStatus && <Chip tone={cert === "ok" ? "ok" : cert === "sconosciuto" ? "mute" : "warn"}>{CERT_LABEL[cert]}</Chip>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </InteriorShell>
  );
}

function CallupCard({ c, onAnswered }: { c: MyCallup; onAnswered: (r: CallupResponse) => void }) {
  const answer = useServerFn(respondCallup);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const send = async (response: "CONFIRMED" | "DECLINED") => {
    setBusy(true);
    setNote(null);
    try {
      const res = await answer({ data: { callupId: c.callupId, response } });
      setNote(res.message);
      if (res.ok) onAnswered(response);
    } catch {
      setNote("Risposta non salvata, riprova.");
    } finally {
      setBusy(false);
    }
  };
  const kickoff = c.timeKnown ? romeTime(c.startsAt) : "orario da definire";
  return (
    <article className="rounded-xl border border-[var(--in-line)] bg-white p-3 sm:p-4" aria-label={`Convocazione di ${c.displayName}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 text-[13px] font-semibold text-[var(--in-sub)]">{c.displayName}{c.teamCode ? ` · ${c.teamCode}` : ""}</p>
          <h3 className="m-0 text-[17px] font-bold leading-snug">{c.title}</h3>
        </div>
        <Chip tone={TONE[c.response]}>{MY_RESPONSE_LABEL[c.response]}</Chip>
      </div>
      <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-[14.5px]">
        <li className="flex items-center gap-2"><CalendarDays className="size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />{romeDay(c.startsAt)}, calcio d'inizio {kickoff}</li>
        {(c.meetingAt || c.meetingPlace) && (
          <li className="flex items-center gap-2"><MapPin className="size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />Ritrovo{c.meetingAt ? ` alle ${romeTime(c.meetingAt)}` : ""}{c.meetingPlace ? ` · ${c.meetingPlace}` : ""}</li>
        )}
        {c.kitNote && <li className="flex items-center gap-2"><Shirt className="size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />{c.kitNote}</li>}
      </ul>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} aria-pressed={c.response === "CONFIRMED"} onClick={() => void send("CONFIRMED")}
          className={`scd-focus inline-flex h-12 items-center justify-center gap-2 rounded-[10px] text-[16px] font-semibold disabled:opacity-60 ${c.response === "CONFIRMED" ? "bg-[#128a2e] text-white" : "border border-[#128a2e] bg-white text-[#0e6b24]"}`}>
          <Check className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />Ci sarò
        </button>
        <button type="button" disabled={busy} aria-pressed={c.response === "DECLINED"} onClick={() => void send("DECLINED")}
          className={`scd-focus inline-flex h-12 items-center justify-center gap-2 rounded-[10px] text-[16px] font-semibold disabled:opacity-60 ${c.response === "DECLINED" ? "bg-[#b42318] text-white" : "border border-[#b42318] bg-white text-[#9a1d14]"}`}>
          <X className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />Non ci sarò
        </button>
      </div>
      <p role="status" aria-live="polite" className="m-0 mt-2 min-h-[1.2em] text-[13.5px] text-[var(--in-sub)]">{note}</p>
    </article>
  );
}

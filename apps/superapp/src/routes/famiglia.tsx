import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Check, MapPin, Shirt, X } from "lucide-react";
import { useState } from "react";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";
import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { InteriorShell } from "@/components/scd/InteriorShell";
import { PushCard } from "@/components/scd/PushCard";
import { TransportRequestCard } from "@/components/scd/TransportRequestCard";
import { EmptyState } from "@/components/scd/work-area-ui";
import { getSession } from "@/lib/auth.functions";
import { MY_RESPONSE_LABEL, romeDay, romeTime, type CallupResponse } from "@/lib/callups";
import { getMyCallups, respondCallup, type MyCallup } from "@/lib/callups.functions";
import { CERT_LABEL, certificateState } from "@/lib/people";
import { registrationLabel } from "@/lib/roster";
import { getMyFamily, type FamilyMember } from "@/lib/roster.functions";
import { FAMILY_GROUP_LABEL, euro, familyNext, type FeeGroup, type MyFee } from "@/lib/fees";
import { getMyFees } from "@/lib/fees.functions";
import { loadCalendar } from "@/lib/public-snapshots";
import { awayMatchesFor, type AwayMatch } from "@/lib/transport-requests";
import { getFamilyTransport, type FamilyTransport } from "@/lib/transport-requests.functions";

/**
 * Family area (UD-061, UD-062). Signed out: the access screen of the registry. Signed in: the caller's
 * own circle (themself + people of families where they are a guardian, r61) and their call-ups with
 * "Ci sarò" / "Non ci sarò" (r62). Only what the database functions return is shown.
 */
export const Route = createFileRoute("/famiglia")({
  loader: async () => {
    const [session, family, callups, fees, transport] = await Promise.all([getSession(), getMyFamily(), getMyCallups(), getMyFees(), getFamilyTransport()]);
    // Away matches of the family's teams from the official calendar copy (only what the family can ask a seat for).
    const teamCodes = family.state === "ok" ? [...new Set(family.members.flatMap((m) => m.teamCodes))] : [];
    const awayMatches: AwayMatch[] = teamCodes.length ? awayMatchesFor(loadCalendar().events, teamCodes, todayRome()) : [];
    return { roles: session.roles, badge: session.badge, family, callups, fees: fees.state === "ok" ? fees.fees : [], transport, awayMatches };
  },
  head: () => accessHead("famiglia"),
  component: FamigliaRoute,
});

function FamigliaRoute() {
  const data = Route.useLoaderData();
  if (data.family.state !== "ok" && data.family.state !== "error") return <AccessScreenPage id="famiglia" />;
  return <FamilyHome roles={data.roles} badge={data.badge} members={data.family.members} callups={data.callups} fees={data.fees} failed={data.family.state === "error"} transport={data.transport} awayMatches={data.awayMatches} />;
}

const TONE: Readonly<Record<CallupResponse, ChipTone>> = { CONFIRMED: "ok", DECLINED: "crit", PENDING: "warn" };

function todayRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function FamilyHome({ roles, badge, members, callups, fees, failed, transport, awayMatches }: { roles: string[]; badge: string | null; members: FamilyMember[]; callups: MyCallup[]; fees: MyFee[]; failed: boolean; transport: FamilyTransport; awayMatches: AwayMatch[] }) {
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

        {members.length > 0 && <TransportRequestCard members={members} matches={awayMatches} requests={transport.requests} stops={transport.stops} />}

        {fees.length > 0 && <FeesCard fees={fees} today={today} />}
        <Card id="fam-documenti" title="Documenti del club" sub="Regolamenti, codice di condotta, privacy e trasferte: quelli che riguardano la tua famiglia.">
          <div className="px-4 pb-4 sm:px-[18px]">
            <Link to="/documenti" className="scd-focus inline-flex h-11 items-center rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold" data-testid="fam-documenti-link">Apri i documenti</Link>
          </div>
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
          className={`scd-focus inline-flex h-12 items-center justify-center gap-2 rounded-[10px] text-[16px] font-semibold disabled:opacity-60 ${c.response === "CONFIRMED" ? "bg-[#0f7a28] text-white" : "border border-[#0f7a28] bg-white text-[#0e6b24]"}`}>
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

const FEE_TONE: Readonly<Record<FeeGroup, ChipTone>> = { IN_RITARDO: "warn", DA_COMUNICARE: "mute", DA_VERIFICARE: "mute", REGOLARE: "info", SALDATO: "ok", ESCLUSO: "mute" };

/** Quote of the caller's own circle (scd_my_fees): amounts and next instalment only, no internal notes. */
function FeesCard({ fees, today }: { fees: MyFee[]; today: string }) {
  return (
    <Card id="fam-quote" title="Quote 2026/27" sub="Dal Gestionale della società. Per dubbi o per una ricevuta scrivi alla segreteria.">
      <ul className="m-0 list-none p-0" data-testid="fam-fees">
        {fees.map((f) => (
          <li key={f.personId} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--in-line)] px-4 py-3 text-[15px] sm:px-[18px]">
            <span className="min-w-0 flex-1">
              <b className="block truncate font-semibold">{f.name}</b>
              <span className="block text-[13.5px] text-[var(--in-sub)]">{familyNext(f, "2026/27", today)}</span>
            </span>
            <span className="flex flex-none flex-col items-end gap-1 text-right">
              <Chip tone={FEE_TONE[f.group]}>{FAMILY_GROUP_LABEL[f.group]}</Chip>
              <span className="text-[13px] tabular-nums text-[var(--in-sub)]">pagato {euro(f.paid)} su {euro(f.feeTotal)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 border-t border-[var(--in-line)] px-4 py-3 text-[13px] text-[var(--in-sub)] sm:px-[18px]">
        L'app non incassa: il pagamento si fa con bonifico o in segreteria, come indicato nella mail della quota.
      </p>
    </Card>
  );
}

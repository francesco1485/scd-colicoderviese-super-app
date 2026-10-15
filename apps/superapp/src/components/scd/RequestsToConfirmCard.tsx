/**
 * "Da confermare" card of La mia SCD (UD-154): requests of the groups the person confirms (Responsabile Attività di
 * Base, Direttore Sportivo Agonistica/Generale when created, Direzione on behalf), with the days left and the
 * federal deadline, Confirm / Not possible. Confirming needs the opponent club (search bar or "Nuova società") and
 * asks the Segreteria to prepare the federal form. Direttore Generale and Coordinatore see the in-app notices.
 * Loads itself after the page: hidden for anybody with no part in the machine; "in preparazione" while r133 is off.
 */
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ClubPicker, type PickedClub } from "@/components/scd/ClubPicker";
import { romeParts } from "@/lib/home-week";
import {
  NOTICE_LABEL,
  STATUS_LABEL,
  confirmBy,
  daysLeft,
  daysLeftLabel,
  itDay,
  noticeDeadline,
  teamLabel,
  whenLabel,
  type RequestRow,
} from "@/lib/request-machine";
import { decideRequest, getMyConfirmations, type MyConfirmations } from "@/lib/request-machine.functions";

const card = "rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]";
const h2 = "mb-2.5 mt-0 text-[13px] font-bold tracking-[0.04em] text-[#1e7fd8]";
const btn = "scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] px-3.5 text-[15px] font-bold";

export function RequestsToConfirmCard({ initial }: { initial?: MyConfirmations }) {
  const load = useServerFn(getMyConfirmations);
  const [data, setData] = useState<MyConfirmations | null>(initial ?? null);
  const reload = useCallback(async () => {
    try {
      setData(await load());
    } catch {
      setData({ state: "off" });
    }
  }, [load]);
  useEffect(() => {
    if (!initial) void reload();
  }, [initial, reload]);

  if (!data || data.state === "none") return null;
  if (data.state === "off") {
    return (
      <section className={card} data-testid="requests-to-confirm" aria-labelledby="rtc-title">
        <h2 id="rtc-title" className={h2}>
          RICHIESTE DA CONFERMARE
        </h2>
        <p className="m-0 text-[15px] text-[#3e5272]">Funzione in preparazione: qui troverai le amichevoli da confermare per le tue squadre.</p>
      </section>
    );
  }
  const waiting = data.rows.filter((r) => r.status === "DA_CONFERMARE");
  const recent = data.rows.filter((r) => r.status !== "DA_CONFERMARE");
  return (
    <section className={card} data-testid="requests-to-confirm" aria-labelledby="rtc-title">
      <h2 id="rtc-title" className={h2}>
        RICHIESTE DA CONFERMARE {waiting.length ? `· ${waiting.length}` : ""}
      </h2>
      {waiting.length === 0 ? (
        <p className="m-0 text-[15px] text-[#3e5272]">Nessuna richiesta da confermare.</p>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {waiting.map((r) => (
            <ToConfirm key={r.id} r={r} nowMs={data.serverNow} onDone={reload} />
          ))}
        </ul>
      )}
      {recent.length > 0 && (
        <ul className="m-0 mt-3 grid list-none gap-1 border-t border-[#e3eaf3] p-0 pt-2">
          {recent.map((r) => (
            <li key={r.id} className="text-[14px] text-[#3e5272]">
              <b className="text-[#0b1e3a]">{STATUS_LABEL[r.status]}</b> · {teamLabel(r.teamKey)} – {r.club?.name ?? r.opponentText ?? "avversaria"} · {whenLabel(r.startsAt)}
            </li>
          ))}
        </ul>
      )}
      {data.notices.length > 0 && (
        <details className="mt-3 border-t border-[#e3eaf3] pt-1">
          <summary className="scd-focus flex min-h-11 cursor-pointer items-center text-[14px] font-semibold">Novità delle richieste ({data.notices.length})</summary>
          <ul className="m-0 grid list-none gap-1 p-0">
            {data.notices.map((n, i) => (
              <li key={`${n.requestId}-${n.at}-${i}`} className="text-[14px] text-[#3e5272]">
                <b className="text-[#0b1e3a]">{NOTICE_LABEL[n.action] ?? n.action}</b> · {teamLabel(n.teamKey)}
                {n.opponent ? ` – ${n.opponent}` : ""} · {whenLabel(n.at)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function ToConfirm({ r, nowMs, onDone }: { r: RequestRow; nowMs: number; onDone: () => void }) {
  const decide = useServerFn(decideRequest);
  const [mode, setMode] = useState<"idle" | "confirm" | "refuse">("idle");
  const [club, setClub] = useState<PickedClub | null>(r.club ? { id: r.club.id, name: r.club.name, city: r.club.city } : null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const day = r.startsAt ? romeParts(r.startsAt)?.date ?? null : null;
  const federal = noticeDeadline(r.teamKey, r.scope, day);
  const by = confirmBy(r.expiresAt, federal);
  const left = daysLeft(r.expiresAt, nowMs);
  const urgent = left !== null && left <= 3;

  async function submit(decision: "CONFERMA" | "RIFIUTA") {
    setBusy(true);
    setMsg(null);
    try {
      const o = await decide({ data: { id: r.id, decision, ...(note.trim() ? { note: note.trim() } : {}), clubId: club?.id ?? null } });
      setMsg({ ok: o.ok, text: o.message });
      if (o.ok) setTimeout(onDone, 1200);
    } catch {
      setMsg({ ok: false, text: "Operazione non riuscita, riprova." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-[16px] border border-[#d5e0ee] p-3" data-testid="request-to-confirm">
      <div className="flex items-start gap-3">
        <span className="grid size-11 flex-none place-items-center rounded-[12px] bg-[#ffd600] text-[#0b1e3a]" aria-hidden="true">
          <CalendarCheck className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[16px] leading-snug">
            Amichevole {teamLabel(r.teamKey)} – {r.club?.name ?? r.opponentText ?? "avversaria"}
          </b>
          <span className="block text-[14.5px] text-[#3e5272]">
            {whenLabel(r.startsAt)} · {r.venue ?? "campo da indicare"}
          </span>
          <span className={`mt-1 inline-flex min-h-[26px] items-center rounded-full px-2.5 text-[13.5px] font-bold ${urgent ? "bg-[#fde8e6] text-[#b3261e]" : "bg-[#fff4cc] text-[#7a5800]"}`}>
            {by.day ? `Conferma entro ${itDay(by.day)}` : "Termine non noto"} · {daysLeftLabel(left)}
          </span>
          <span className="mt-1 block text-[13.5px] text-[#3e5272]">{federal.text}</span>
          {r.note && <span className="mt-1 block text-[14px]">Nota della Segreteria: {r.note}</span>}
        </div>
      </div>
      {mode === "idle" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMode("confirm")} className={`${btn} bg-[#0b2a5b] text-white`} data-testid="request-confirm">
            <Check className="size-4" aria-hidden="true" />
            Conferma
          </button>
          <button type="button" onClick={() => setMode("refuse")} className={`${btn} border-2 border-[#0b2a5b] bg-white text-[#0b2a5b]`}>
            <X className="size-4" aria-hidden="true" />
            Non possibile
          </button>
        </div>
      )}
      {mode === "confirm" && (
        <div className="mt-3 grid gap-2.5">
          <ClubPicker value={club} onChange={setClub} initialQuery={r.opponentText ?? ""} label="Squadra avversaria: cercala o aggiungila" />
          <label className="grid gap-1 text-[14px] font-semibold text-[#3e5272]">
            Nota (facoltativa)
            <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className="scd-focus h-11 rounded-[10px] border border-[#b9c8dc] px-3 text-[15px] text-[#0b1e3a]" />
          </label>
          <p className="m-0 text-[14px] text-[#3e5272]">Confermando, l'amichevole compare in calendario e chiedi alla Segreteria di preparare il modulo amichevoli per la FIGC da far firmare.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy || !club} onClick={() => void submit("CONFERMA")} className={`${btn} bg-[#0b2a5b] text-white disabled:opacity-50`}>
              Conferma
            </button>
            <button type="button" onClick={() => setMode("idle")} className={`${btn} border border-[#b9c8dc] bg-white text-[#0b1e3a]`}>
              Indietro
            </button>
          </div>
        </div>
      )}
      {mode === "refuse" && (
        <div className="mt-3 grid gap-2.5">
          <label className="grid gap-1 text-[14px] font-semibold text-[#3e5272]">
            Perché non è possibile (facoltativo)
            <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className="scd-focus h-11 rounded-[10px] border border-[#b9c8dc] px-3 text-[15px] text-[#0b1e3a]" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => void submit("RIFIUTA")} className={`${btn} bg-[#b3261e] text-white`}>
              Non possibile
            </button>
            <button type="button" onClick={() => setMode("idle")} className={`${btn} border border-[#b9c8dc] bg-white text-[#0b1e3a]`}>
              Indietro
            </button>
          </div>
        </div>
      )}
      {msg && (
        <p className={`mb-0 mt-2 text-[14px] font-semibold ${msg.ok ? "text-[#1d7a4e]" : "text-[#b3261e]"}`} role={msg.ok ? "status" : "alert"}>
          {msg.text}
        </p>
      )}
    </li>
  );
}

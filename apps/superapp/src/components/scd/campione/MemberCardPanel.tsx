/**
 * Card Tifoso / Tesserato / Famiglia (UD-102). Which cards a member holds comes from the membership roles; the
 * credits balance is read-only from the club ledger (0 with an explanation when not connected). The earning list is
 * the Direzione's list, labelled "Valori in definizione". No QR yet, no prices, no gambling: credits are never money.
 */
import { Check, Coins, Info, Lock, QrCode } from "lucide-react";
import { useId, useState } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import {
  CARD_INFO,
  CARD_LABEL,
  CREDIT_EARN_WAYS,
  CREDITS_NOT_MONEY,
  CREDITS_RULES_STATUS,
  type CardKind,
  type CreditsView,
} from "@/lib/avatar-studio";

const KINDS: CardKind[] = ["TIFOSO", "TESSERATO", "FAMIGLIA"];
const SHORT: Record<CardKind, string> = { TIFOSO: "Tifoso", TESSERATO: "Tesserato", FAMIGLIA: "Famiglia" };

export function MemberCardPanel({
  cards,
  credits,
  nickname,
}: {
  cards: { primary: CardKind; held: CardKind[] };
  credits: CreditsView;
  nickname: string;
}) {
  const [kind, setKind] = useState<CardKind>(cards.primary);
  const id = useId();
  const held = cards.held.includes(kind);
  const info = CARD_INFO[kind];
  return (
    <section aria-labelledby={`${id}-t`} className="grid gap-4" data-testid="member-cards">
      <div className="flex items-end justify-between gap-3">
        <h2 id={`${id}-t`} className="m-0 font-uv text-[28px] uppercase leading-none text-[#0b2a5b]">
          Le mie card
        </h2>
        <span className="text-[13px] font-semibold text-[#4a5d7a]">Stagione 2026/27</span>
      </div>

      <div role="tablist" aria-label="Tipo di card" className="grid grid-cols-3 gap-1 rounded-[16px] bg-[#dfe8f3] p-1">
        {KINDS.map((k) => {
          const selected = k === kind;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              id={`${id}-tab-${k}`}
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setKind(k)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const i = KINDS.indexOf(kind);
                const next = KINDS[(i + (e.key === "ArrowRight" ? 1 : KINDS.length - 1)) % KINDS.length]!;
                setKind(next);
                document.getElementById(`${id}-tab-${next}`)?.focus();
              }}
              className={`scd-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] px-2 text-[15px] font-bold motion-safe:transition-colors ${
                selected ? "bg-white text-[#0b2a5b] shadow-[0_2px_6px_rgb(11_42_91/0.12)]" : "text-[#3e5272] hover:bg-white/60"
              }`}
            >
              {cards.held.includes(k) && <Check className="size-4 text-[#1a7f45]" aria-hidden="true" />}
              {SHORT[k]}
              <span className="sr-only">{cards.held.includes(k) ? " (attiva)" : " (non attiva)"}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${kind}`} className="grid gap-4">
        <div
          className={`relative overflow-hidden rounded-[22px] p-5 text-white shadow-[0_18px_40px_-20px_rgb(11_42_91/0.6)] ${
            held ? "bg-[linear-gradient(140deg,#1556c4,#0b2a5b_78%)]" : "bg-[linear-gradient(140deg,#5b6f8f,#33445f)]"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="flex items-center gap-2.5">
              <ClubCrestOfficial size={46} />
              <span className="grid gap-0.5">
                <span className="font-uv text-[20px] leading-none">
                  COLICO<span className="text-[#ffd600]">DERVIESE</span>
                </span>
                <span className="text-[12px] font-semibold tracking-[0.08em] text-[#dbe6f5]">CARD DIGITALE · 2026/27</span>
              </span>
            </span>
            <span className="text-right">
              <span className="block text-[12px] font-bold tracking-[0.1em] text-[#dbe6f5]">CARD</span>
              <span className="block font-uv text-[30px] uppercase leading-none">{SHORT[kind]}</span>
            </span>
          </div>
          <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-3">
            <span className="grid gap-1">
              <span className="text-[12px] font-bold tracking-[0.08em] text-[#dbe6f5]">NICKNAME</span>
              <span className="truncate font-uv text-[34px] uppercase leading-none">{nickname || "—"}</span>
            </span>
            <span className="grid justify-items-end gap-1">
              <span className="text-[12px] font-bold tracking-[0.08em] text-[#dbe6f5]">CREDITI</span>
              <span className="inline-flex items-center gap-1.5 font-uv text-[32px] leading-none" data-testid="credits-balance">
                <Coins className="size-6 text-[#ffd600]" aria-hidden="true" />
                {held ? credits.balance : "—"}
              </span>
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-[14px] bg-white/12 px-3 py-2.5 text-[13.5px] leading-snug">
            {held ? (
              <>
                <QrCode className="size-5 shrink-0 text-[#ffd600]" aria-hidden="true" />
                Card attiva. Il codice QR per presenze e sconti arriva in una fase successiva.
              </>
            ) : (
              <>
                <Lock className="size-5 shrink-0 text-[#ffd600]" aria-hidden="true" />
                Non attiva: {info.howToGet}
              </>
            )}
          </div>
        </div>

        <div className="grid gap-2 rounded-[18px] bg-white p-4 shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
          <p className="m-0 text-[15px] font-semibold text-[#0b1e3a]">{info.who}</p>
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {info.benefits.map((b) => (
              <li key={b} className="flex gap-2 text-[14.5px] leading-snug text-[#3e5272]">
                <Check className="mt-0.5 size-4 shrink-0 text-[#1556c4]" aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
          {held && <p className="m-0 text-[13.5px] text-[#4a5d7a]">{credits.note}</p>}
        </div>
      </div>

      <section aria-labelledby={`${id}-earn`} className="grid gap-3 rounded-[18px] bg-white p-4 shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id={`${id}-earn`} className="m-0 font-uv text-[22px] uppercase leading-none text-[#0b2a5b]">
            Come si guadagnano i crediti
          </h3>
          <span className="rounded-md border border-dashed border-[#8aa0bf] px-2 py-0.5 text-[12.5px] font-semibold text-[#3e5272]">
            {CREDITS_RULES_STATUS}
          </span>
        </div>
        <ul className="m-0 grid list-none gap-0 p-0 md:grid-cols-2 md:gap-x-5">
          {CREDIT_EARN_WAYS.map((w) => (
            <li key={w.code} className="grid gap-0.5 border-t border-[#eef3f9] py-2.5">
              <b className="text-[15px] text-[#0b1e3a]">{w.label}</b>
              <span className="text-[13.5px] leading-snug text-[#4a5d7a]">{w.detail}</span>
            </li>
          ))}
        </ul>
        <p className="m-0 flex gap-2 rounded-[12px] bg-[#fff8cc] p-3 text-[13.5px] leading-snug text-[#4d3d00]">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {CREDITS_NOT_MONEY} Le donazioni danno solo un riconoscimento simbolico, uguale per ogni importo.
        </p>
      </section>
    </section>
  );
}

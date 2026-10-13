/**
 * Card Tifoso / Tesserato / Famiglia (UD-102). Which cards a member holds comes from the membership roles; the
 * credits balance is read-only from the club ledger (0 with an explanation when not connected). The earning list is
 * the Direzione's list, labelled "Valori in definizione". No QR yet, no prices, no gambling: credits are never money.
 */
import { CalendarDays, Check, Coins, Info, Lock, QrCode } from "lucide-react";
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
/** Lake Como panorama already in the app (VENUE_PHOTO), as on the club's card boards. */
const CARD_PHOTO = "/media/scd/lario-header.webp";
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
        {/* Card face in the style of the club's 2026/27 card boards: lake, yellow brush, crest (Direzione 13/10/2026). */}
        <div
          className={`relative isolate overflow-hidden rounded-[22px] text-white shadow-[0_18px_40px_-20px_rgb(11_42_91/0.6)] ${held ? "bg-[#022456]" : "bg-[#2b3445]"}`}
          data-testid="member-card-face"
          data-held={held ? "1" : "0"}
        >
          <div
            aria-hidden="true"
            className={`absolute inset-x-0 top-0 -z-20 h-[66%] bg-cover bg-[center_45%] ${held ? "saturate-[1.25]" : "grayscale"}`}
            style={{
              backgroundImage: `url(${CARD_PHOTO})`,
              maskImage: "linear-gradient(180deg, #000 55%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(180deg, #000 55%, transparent 100%)",
            }}
          />
          <div
            aria-hidden="true"
            className={`absolute inset-0 -z-10 ${held ? "bg-[linear-gradient(180deg,rgb(4_44_104/0.4)_0%,rgb(4_44_104/0.08)_34%,rgb(2_36_86/0.6)_60%,transparent_100%)]" : "bg-[rgb(30_38_52/0.45)]"}`}
          />
          <div className="grid gap-3 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <ClubCrestOfficial size={48} />
                <span className="grid min-w-0 gap-0.5">
                  <span className="font-uv text-[21px] leading-none drop-shadow-[0_1px_2px_rgb(0_0_0/0.35)]">
                    COLICO<span className="text-[#ffd600]">DERVIESE</span>
                  </span>
                  <span className="text-[11.5px] font-semibold tracking-[0.12em] text-white/90">CARD DIGITALE · 2026/27</span>
                </span>
              </span>
              <span className="scd-motto shrink-0 pt-1 text-right text-[17px] text-[#ffe25a] drop-shadow-[0_1px_2px_rgb(0_0_0/0.45)]">
                Insieme
                <br />
                più lontano
              </span>
            </div>

            <p className="m-0 mt-3">
              <span className="scd-brush scd-brush--full font-uv text-[34px] uppercase leading-none text-[#0b2a5b] sm:text-[40px]">
                Card {SHORT[kind]}
              </span>
            </p>

            <div className="mt-1 grid grid-cols-[1fr_auto] gap-2 rounded-[14px] bg-white/95 p-3 text-[#0b2a5b]">
              <span className="grid min-w-0 gap-0.5">
                <span className="text-[11.5px] font-bold tracking-[0.08em] text-[#4a5d7a]">NICKNAME</span>
                <span className="truncate font-uv text-[26px] uppercase leading-none">{nickname || "—"}</span>
              </span>
              <span className="grid justify-items-end gap-0.5 border-l border-[#dbe3ee] pl-3">
                <span className="text-[11.5px] font-bold tracking-[0.08em] text-[#4a5d7a]">CREDITI</span>
                <span className="inline-flex items-center gap-1.5 font-uv text-[26px] leading-none" data-testid="credits-balance">
                  <Coins className="size-5 text-[#d9a600]" aria-hidden="true" />
                  {held ? credits.balance : "—"}
                </span>
              </span>
            </div>

            <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-semibold text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4 text-[#ffd600]" aria-hidden="true" />
                Valida per la stagione 2026/27
              </span>
              <span aria-hidden="true" className="hidden h-3.5 w-px bg-white/40 min-[400px]:inline-block" />
              <span className="inline-flex items-center gap-1.5">
                <Lock className="size-4 text-[#ffd600]" aria-hidden="true" />
                Personale e non cedibile
              </span>
            </p>

            <div className="flex items-center gap-2 rounded-[12px] bg-white/12 px-3 py-2.5 text-[13.5px] leading-snug backdrop-blur-[2px]">
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

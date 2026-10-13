/**
 * Club cards 2026/27 in the Super App (Direzione 13/10/2026): card face, benefits and rules, built only from
 * config/scd-club-cards.v1.json. Official crest, Lake Como panorama, yellow brush, motto: the look of the club's card
 * boards, with blank fields left for the Club House (name and code are never printed by the app).
 */
import { Link } from "@tanstack/react-router";
import { BadgeEuro, Check, ChevronRight, Coins, Lock, RefreshCw, Store, Ticket } from "lucide-react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import {
  CLUB_CARDS,
  activationText,
  clubCardPath,
  supporterPriceRows,
  ticketingText,
  type ClubCardTier,
} from "@/lib/club-cards";
import { euro } from "@/lib/match-extras";

/** Lake Como panorama already in the app (VENUE_PHOTO). */
const CARD_PHOTO = "/media/scd/lario-header.webp";

const FACE: Record<ClubCardTier["theme"], { bg: string; fade: string; title: string; brush: string; ink: string; field: string }> = {
  navy: {
    bg: "bg-[#022456]",
    fade: "bg-[linear-gradient(180deg,rgb(4_44_104/0.45)_0%,rgb(4_44_104/0.1)_34%,rgb(2_36_86/0.85)_62%,#022456_78%)]",
    title: "text-[#0b2a5b]",
    brush: "",
    ink: "text-white/90",
    field: "bg-white/95",
  },
  yellow: {
    bg: "bg-[#ffd21f]",
    fade: "bg-[linear-gradient(180deg,rgb(4_44_104/0.45)_0%,rgb(4_44_104/0.1)_34%,rgb(255_210_31/0.8)_60%,#ffd21f_74%)]",
    title: "text-[#ffd21f]",
    brush: "scd-brush--navy",
    ink: "text-[#0b2a5b]",
    field: "bg-white",
  },
  white: {
    bg: "bg-[#f6f8fc]",
    fade: "bg-[linear-gradient(180deg,rgb(4_44_104/0.45)_0%,rgb(4_44_104/0.1)_34%,rgb(246_248_252/0.85)_60%,#f6f8fc_74%)]",
    title: "text-[#0b2a5b]",
    brush: "",
    ink: "text-[#0b2a5b]",
    field: "bg-white border border-[#dbe3ee]",
  },
};

/** Card front, ISO ID-1 proportions (85.6 × 54 mm). Name and code fields stay blank on purpose. */
export function ClubCardFace({ tier, className = "" }: { tier: ClubCardTier; className?: string }) {
  const f = FACE[tier.theme];
  return (
    <div
      className={`relative isolate aspect-[856/540] w-full overflow-hidden rounded-[6%/9.5%] shadow-[0_18px_40px_-20px_rgb(11_42_91/0.6)] [container-type:inline-size] ${f.bg} ${className}`}
      data-testid={`club-card-face-${tier.id}`}
      role="img"
      aria-label={`Card ${tier.label} ColicoDerviese, stagione 2026/27`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-20 h-[62%] bg-cover bg-[center_45%] saturate-[1.2]"
        style={{ backgroundImage: `url(${CARD_PHOTO})` }}
      />
      <div aria-hidden="true" className={`absolute inset-0 -z-10 ${f.fade}`} />
      {tier.theme === "white" && <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2%] bg-[linear-gradient(90deg,#0b2a5b_0_70%,#ffd21f_70%_100%)]" />}
      <div aria-hidden="true" className="flex h-full flex-col gap-[2.2cqw] p-[4.6cqw]">
        <div className="flex items-start justify-between gap-[2cqw]">
          <span className="flex min-w-0 items-center gap-[2cqw]">
            <ClubCrestOfficial size={56} className="!h-[13cqw] !w-auto drop-shadow-[0_4px_8px_rgb(0_0_0/0.35)]" />
            <span className="grid gap-[0.6cqw]">
              <span className="font-uv text-[5.2cqw] leading-none text-white drop-shadow-[0_1px_3px_rgb(0_0_0/0.4)]">
                COLICO<span className="text-[#ffd21f]">DERVIESE</span>
              </span>
              <span className="text-[1.9cqw] font-bold tracking-[0.35cqw] text-white drop-shadow-[0_1px_3px_rgb(0_0_0/0.45)]">STAGIONE 2026/27</span>
            </span>
          </span>
          <span className="scd-motto shrink-0 rotate-[-6deg] pt-[1cqw] text-right text-[3.4cqw] leading-[1.05] text-[#ffe25a] drop-shadow-[0_1px_3px_rgb(0_0_0/0.5)]">
            Insieme
            <br />
            più lontano
          </span>
        </div>
        <p className="m-0 mt-[1.5cqw]">
          <span className={`scd-brush scd-brush--full font-uv text-[7.4cqw] uppercase leading-none ${f.title} ${f.brush}`}>Card {tier.label}</span>
        </p>
        <div className="mt-auto grid grid-cols-2 gap-[1.6cqw]">
          {[tier.id === "partner" ? "RAGIONE SOCIALE" : "NOME E COGNOME", "CODICE CARD"].map((l) => (
            <span key={l} className={`grid gap-[0.8cqw] rounded-[1.8cqw] px-[2cqw] pb-[1.6cqw] pt-[1.2cqw] ${f.field}`}>
              <span className="text-[1.6cqw] font-bold tracking-[0.18cqw] text-[#3e5272]">{l}</span>
              <span className="h-[3.6cqw] border-b-[0.25cqw] border-dashed border-[#9fb2cc]" />
            </span>
          ))}
        </div>
        <div className={`flex items-center justify-between gap-[2cqw] text-[1.95cqw] font-bold ${f.ink}`}>
          <span>{CLUB_CARDS.validity.label}</span>
          <span>Personale e non cedibile</span>
        </div>
      </div>
    </div>
  );
}

/** Benefits, activation and ticketing of one card. */
export function ClubCardDetails({ tier, headingLevel = 2 }: { tier: ClubCardTier; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const rows = supporterPriceRows(tier);
  return (
    <section className="scd-card grid gap-3 p-4 sm:p-5" aria-label={`Vantaggi della card ${tier.label}`} data-testid={`club-card-details-${tier.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <H className="m-0 font-uv text-[26px] uppercase leading-none text-[#0b2a5b]">Card {tier.label}</H>
        <span className="text-[13.5px] font-semibold text-[#4a5d7a]">{tier.who}</span>
      </div>
      <p className="m-0 flex items-start gap-2 rounded-[12px] bg-[#0b2a5b] px-3 py-2.5 text-[15px] font-semibold leading-snug text-white">
        <BadgeEuro className="mt-0.5 size-5 shrink-0 text-[#ffd21f]" aria-hidden="true" />
        <span>
          {tier.activation.total === 0 ? "Attivazione: " : "Attivazione "}
          {activationText(tier)}
        </span>
      </p>
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {tier.benefits.map((b) => (
          <li key={b} className="flex gap-2 text-[15px] leading-snug text-[#24364f]">
            <Check className="mt-0.5 size-4 shrink-0 text-[#1a7f45]" aria-hidden="true" />
            {b}
          </li>
        ))}
      </ul>
      <p className="m-0 flex gap-2 text-[14px] leading-snug text-[#3e5272]">
        <Ticket className="mt-0.5 size-4 shrink-0 text-[#1556c4]" aria-hidden="true" />
        {ticketingText(tier)}
      </p>
      {rows.length > 0 && (
        <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-3 sm:gap-2" data-testid="supporter-prices">
          {rows.map((r) => (
            <li key={r.label} className="grid gap-0.5 rounded-[12px] bg-[#f4f7fb] px-3 py-2">
              <span className="text-[13.5px] font-semibold text-[#0b1e3a]">{r.label}</span>
              <span className="text-[14px] text-[#3e5272]">
                Intero <b className="text-[#0b2a5b]">{euro(r.intero)}</b> <s className="text-[12.5px]">{euro(r.fullIntero)}</s> · Ridotto{" "}
                <b className="text-[#0b2a5b]">{euro(r.ridotto)}</b> <s className="text-[12.5px]">{euro(r.fullRidotto)}</s>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** How the card works: Club House only, credit, deposit, affiliates. */
export function ClubCardRules() {
  const r = CLUB_CARDS.rules;
  const items = [
    { icon: Store, t: "Si attiva e si ricarica alla Club House", d: r.topUp },
    { icon: Coins, t: "Credito", d: r.credit },
    { icon: RefreshCw, t: "Cauzione", d: r.deposit },
    { icon: Lock, t: "Personale", d: r.personal },
  ];
  return (
    <section className="scd-card grid gap-3 p-4 sm:p-5" aria-labelledby="club-card-rules-t" data-testid="club-card-rules">
      <h2 id="club-card-rules-t" className="m-0 font-uv text-[26px] uppercase leading-none text-[#0b2a5b]">
        Come <span className="scd-brush">funziona</span>
      </h2>
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
        {items.map((x) => (
          <li key={x.t} className="flex gap-3 rounded-[14px] border border-[#dbe3ee] bg-white p-3">
            <x.icon className="mt-0.5 size-5 shrink-0 text-[#1556c4]" aria-hidden="true" />
            <span className="grid gap-0.5">
              <b className="text-[15px] text-[#0b1e3a]">{x.t}</b>
              <span className="text-[14px] leading-snug text-[#3e5272]">{x.d}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 rounded-[12px] bg-[#fff8cc] px-3 py-2.5 text-[14px] leading-snug text-[#4d3d00]">
        <b>Attività convenzionate.</b> {r.affiliates}
      </p>
    </section>
  );
}

/** Three tiles linking to each card's web link. */
export function ClubCardLinks({ current }: { current?: ClubCardTier["id"] }) {
  return (
    <nav aria-label="Le tre card" className="grid gap-2 sm:grid-cols-3">
      {CLUB_CARDS.tiers.map((t) => (
        <Link
          key={t.id}
          to="/card/$tipo"
          params={{ tipo: t.id }}
          aria-current={current === t.id ? "page" : undefined}
          className={`scd-focus flex min-h-12 items-center justify-between gap-2 rounded-[14px] px-4 py-3 text-[16px] font-bold ${
            current === t.id ? "bg-[#0b2a5b] text-white" : "border border-[#dbe3ee] bg-white text-[#0b2a5b] hover:bg-[#f4f7fb]"
          }`}
          data-testid={`club-card-link-${t.id}`}
        >
          Card {t.label}
          <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}

export { clubCardPath };

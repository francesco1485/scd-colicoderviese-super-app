/**
 * Club cards 2026/27 (Tesserato, Sostenitore, Partner): the physical SQUBY QR badge with a Club House wallet.
 * Source of truth: config/scd-club-cards.v1.json, built from the Direzione's card policies (V1.2, V1.4) and the
 * confirmed ticketing rule (config/scd-ticketing.v1.json). SQUBY is the wallet authority: the Super App never keeps
 * balances, never tops up online and never shows a fiscal code. One public web link per card, managed at the Club House.
 *
 * Not to be confused with the in-app digital cards (Tifoso/Tesserato/Famiglia, UD-102, lib/avatar-studio.ts), whose
 * credits are virtual and never money.
 */
import raw from "../../../../config/scd-club-cards.v1.json";

import { TICKETING, euro } from "@/lib/match-extras";

export type ClubCardId = "tesserato" | "sostenitore" | "partner";
export type ClubCardTheme = "navy" | "yellow" | "white";

export interface ClubCardTier {
  id: ClubCardId;
  label: string;
  who: string;
  theme: ClubCardTheme;
  activation: { total: number; credit: number; deposit: number; creditIsGift?: boolean };
  clubHouseDiscountRef: number;
  benefits: string[];
  ticketing: "MEMBER_RULE" | "SUPPORTER_PRICES" | "NONE_UNTIL_DECIDED";
  supporterPrices?: { competition: string; intero: number; ridotto: number }[];
  codeRange?: { prefix: string; from: number; to: number };
  codeRule?: string;
}

export interface ClubCardsConfig {
  schemaVersion: number;
  asOf: string;
  status: string;
  sources: { id: string; label: string; drive: string | null }[];
  validity: { label: string; endDate: string | null; endDateStatus: string };
  tiers: ClubCardTier[];
  rules: Record<"topUp" | "credit" | "deposit" | "partnerGift" | "personal" | "affiliates", string>;
  squby: {
    role: string;
    entity: string;
    adminUrl: string;
    enrollmentUrl: string;
    enrollmentPublic: boolean;
    badge: string;
    license: { participantsUsed: number; participantsMax: number; expires: string; checkedAt: string; source: string };
    groups: string[];
    pilot: Record<ClubCardId, number>;
  };
  clubHouseProcedure: string[];
  privacy: string[];
}

export const CLUB_CARDS: ClubCardsConfig = raw as unknown as ClubCardsConfig;

export const CLUB_CARD_IDS: readonly ClubCardId[] = CLUB_CARDS.tiers.map((t) => t.id);

export function isClubCardId(v: string): v is ClubCardId {
  return (CLUB_CARD_IDS as readonly string[]).includes(v);
}

export function clubCard(id: ClubCardId): ClubCardTier {
  const t = CLUB_CARDS.tiers.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown club card: ${id}`);
  return t;
}

/** Public path of a card's web link (the link the Club House shares and prints as a QR code). */
export function clubCardPath(id: ClubCardId): `/card/${ClubCardId}` {
  return `/card/${id}`;
}

/** Absolute web link for sharing and QR codes. */
export function clubCardUrl(origin: string, id: ClubCardId): string {
  return `${origin.replace(/\/+$/, "")}${clubCardPath(id)}`;
}

/** "25 € (20 € di credito + 5 € di cauzione)" or the Partner wording. */
export function activationText(t: ClubCardTier): string {
  const a = t.activation;
  if (a.total === 0) return `Card in omaggio · ${euro(a.credit)} di credito in omaggio${a.deposit === 0 ? " · senza cauzione" : ""}`;
  return `${euro(a.total)} = ${euro(a.credit)} di credito + ${euro(a.deposit)} di cauzione`;
}

/** Card code range for the Club House desk, e.g. "020974201001 – 020974201200". Never derived from personal data. */
export function codeRangeText(t: ClubCardTier): string | null {
  const r = t.codeRange;
  if (!r) return null;
  const pad = (n: number) => String(n).padStart(3, "0");
  return `${r.prefix}${pad(r.from)} – ${r.prefix}${pad(r.to)}`;
}

export interface SupporterPriceRow {
  label: string;
  intero: number;
  ridotto: number;
  fullIntero: number;
  fullRidotto: number;
}

/** Supporter ticket prices joined with the official tariffs, so the full price always comes from the ticketing config. */
export function supporterPriceRows(t: ClubCardTier): SupporterPriceRow[] {
  if (t.ticketing !== "SUPPORTER_PRICES" || !t.supporterPrices) return [];
  const tariffs = TICKETING.tariffs as Record<string, { label: string; intero: number; ridotto: number }>;
  return t.supporterPrices.flatMap((p) => {
    const full = tariffs[p.competition];
    if (!full) return [];
    return [{ label: full.label, intero: p.intero, ridotto: p.ridotto, fullIntero: full.intero, fullRidotto: full.ridotto }];
  });
}

/** Ticketing line for a card, from the confirmed ticketing config only. */
export function ticketingText(t: ClubCardTier): string {
  switch (t.ticketing) {
    case "MEMBER_RULE":
      return `Gare di campionato in casa: ${TICKETING.membersShort}. ${TICKETING.cup}.`;
    case "SUPPORTER_PRICES":
      return "Biglietto agevolato alle gare di campionato in casa, mostrando la card alla biglietteria.";
    default:
      return "Nessun vantaggio di biglietteria previsto per ora.";
  }
}

export interface LicenseView {
  used: number;
  max: number;
  free: number;
  expires: string;
  /** The planned pilot alone must fit; a full roll-out needs more licences than the current pack. */
  pilotFits: boolean;
}

export function licenseView(c: ClubCardsConfig = CLUB_CARDS): LicenseView {
  const l = c.squby.license;
  const pilot = Object.values(c.squby.pilot).reduce((a, b) => a + b, 0);
  const free = Math.max(0, l.participantsMax - l.participantsUsed);
  return { used: l.participantsUsed, max: l.participantsMax, free, expires: l.expires, pilotFits: pilot <= free };
}

/** "30/09/2027" from an ISO date, without time-zone drift. */
export function itDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Invariants of the card contract; returns the list of problems (empty when valid). Used by tests and the desk. */
export function validateClubCards(c: ClubCardsConfig = CLUB_CARDS): string[] {
  const problems: string[] = [];
  const ids = c.tiers.map((t) => t.id);
  if (new Set(ids).size !== ids.length) problems.push("duplicate tier ids");
  for (const t of c.tiers) {
    const a = t.activation;
    if (a.total !== 0 && a.credit + a.deposit !== a.total) problems.push(`${t.id}: credit + deposit must equal activation`);
    if (a.total === 0 && !a.creditIsGift) problems.push(`${t.id}: a free card's credit must be marked as a gift`);
    if (t.benefits.length === 0) problems.push(`${t.id}: no benefits`);
    if (t.ticketing === "SUPPORTER_PRICES") {
      for (const p of t.supporterPrices ?? []) {
        const full = (TICKETING.tariffs as Record<string, { intero: number; ridotto: number }>)[p.competition];
        if (!full) problems.push(`${t.id}: unknown competition ${p.competition}`);
        else if (p.intero > full.intero || p.ridotto > full.ridotto) problems.push(`${t.id}: supporter price above the full price (${p.competition})`);
      }
    }
  }
  const ranges = c.tiers.flatMap((t) => (t.codeRange ? [{ id: t.id, ...t.codeRange }] : []));
  for (let i = 0; i < ranges.length; i++)
    for (let j = i + 1; j < ranges.length; j++) {
      const a = ranges[i]!;
      const b = ranges[j]!;
      if (a.prefix === b.prefix && a.from <= b.to && b.from <= a.to) problems.push(`code ranges overlap: ${a.id} / ${b.id}`);
    }
  if (!/^https:\/\/live\.squby\.it\//.test(c.squby.adminUrl)) problems.push("SQUBY admin URL must be on live.squby.it");
  if (!/^https:\/\/live\.squby\.it\/iscrizione\.aspx\?/.test(c.squby.enrollmentUrl)) problems.push("SQUBY enrollment URL must be the live.squby.it enrollment form");
  if (c.validity.endDate === null && c.validity.endDateStatus !== "DA_CONFERMARE") problems.push("missing end date must be marked DA_CONFERMARE");
  return problems;
}

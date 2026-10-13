/**
 * Sponsor entry points of the Posta del club (UD-101, Direzione 13/10/2026 12:16: "anche nel web link sponsor").
 * "Scrivi allo sponsor" / "Scrivi a tutti i partner" on the internal sponsor pages open the SAME composer of the
 * Posta del club, prefilled: no second mail system, no second contact list. Addresses come only from
 * scd_comm_external_contacts (kind SPONSOR, status COLLEGATO); the CRM page lists company names, never addresses.
 * Pure: no network.
 */
import type { Audience, Directory, Office, ThreadSummary } from "./rules";

/** Search params of /gestionale/posta that open the composer. */
export interface PostaComposeSearch {
  scrivi?: "sponsor";
  /** Sponsor company name as shown on the CRM page; absent = all active partners. */
  nome?: string;
}

export function parsePostaSearch(s: Record<string, unknown>): PostaComposeSearch {
  const out: PostaComposeSearch = {};
  if (s["scrivi"] === "sponsor") out.scrivi = "sponsor";
  if (typeof s["nome"] === "string") {
    // eslint-disable-next-line no-control-regex
    const n = s["nome"].replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 120);
    if (n) out.nome = n;
  }
  return out;
}

/** "Officine Pedroncelli S.r.l." → "officinepedroncelli": case, accents, punctuation and legal forms ignored. */
export function normalizeCompany(v: string | null | undefined): string {
  return (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(s\.?\s?r\.?\s?l\.?s?|s\.?\s?p\.?\s?a\.?|s\.?\s?n\.?\s?c\.?|s\.?\s?a\.?\s?s\.?|snc|sas|srl|spa|srls)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");
}

type Contact = Directory["contacts"][number];

/** Linked SPONSOR contacts whose company (or display name) is the given sponsor. */
export function sponsorContactsFor(name: string, contacts: readonly Contact[]): Contact[] {
  const key = normalizeCompany(name);
  if (key.length < 2) return [];
  return contacts.filter((c) => {
    if (c.kind !== "SPONSOR") return false;
    const org = normalizeCompany(c.orgName);
    const label = normalizeCompany(c.label);
    return org === key || label === key || (org.length >= 3 && (org.includes(key) || key.includes(org)));
  });
}

export interface SponsorSeed {
  office: Office;
  audience: Audience | null;
  /** Shown at the top of the composer (plain Italian), or null. */
  note: string | null;
  /** Sponsor company to which a new address can be linked from the composer (single-sponsor case without address). */
  sponsorName: string | null;
}

/** Sponsor mail is a Direzione matter (inbound sponsor mail is routed to Direzione by the database too). */
export function sponsorOffice(offices: readonly Office[]): Office {
  return offices.includes("DIREZIONE") ? "DIREZIONE" : offices[0] ?? "SEGRETERIA";
}

/**
 * Composer prefill for a sponsor entry point:
 *   - no name            → audience SPONSORS (all linked sponsor contacts, one individual e-mail each);
 *   - one address        → that contact;
 *   - several addresses  → the first, with a note to pick another in the list;
 *   - no address         → no audience, a note and the option to link the sponsor's address now.
 */
export function sponsorComposerSeed(input: { name?: string | null; contacts: readonly Contact[]; offices: readonly Office[]; sponsorsLinked?: number | null }): SponsorSeed {
  const office = sponsorOffice(input.offices);
  const name = (input.name ?? "").trim();
  if (!name) {
    const n = input.sponsorsLinked;
    return {
      office,
      audience: { kind: "SPONSORS", label: "Tutti gli sponsor e partner" },
      note:
        n === 0
          ? "Nessun indirizzo sponsor collegato finora: si aggiungono accettando le mail in arrivo come «Sponsor» o con «Scrivi allo sponsor» dalla pagina sponsor."
          : null,
      sponsorName: null,
    };
  }
  const found = sponsorContactsFor(name, input.contacts);
  const first = found[0];
  if (!first) {
    return {
      office,
      audience: null,
      note: `Per ${name} non c'è ancora un indirizzo e-mail collegato. Scrivilo qui sotto: resta tra i contatti sponsor della società.`,
      sponsorName: name,
    };
  }
  return {
    office,
    audience: { kind: "CONTACT", contactId: first.id, label: first.orgName ? `${first.label} · ${first.orgName}` : first.label },
    note: found.length > 1 ? `${name} ha ${found.length} indirizzi collegati: è scelto ${first.email}. Puoi cambiarlo nell'elenco «Un'organizzazione o contatto».` : null,
    sponsorName: null,
  };
}

/** A thread with a sponsor: the counterpart is a sponsor contact, or the audience was all sponsors. */
export function isSponsorThread(t: Pick<ThreadSummary, "counterpartKind" | "counterpartLabel">): boolean {
  return t.counterpartKind === "SPONSOR" || (t.counterpartKind === "AUDIENCE" && t.counterpartLabel === "Sponsor collegati");
}

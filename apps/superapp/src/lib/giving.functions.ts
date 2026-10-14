/**
 * Sostieni (r101, UD-113) server functions.
 *   - public: read published items / proposals / campaign counts; submit a proposal, a goods offer or an adoption
 *     pledge (honeypot + per-IP limiter here, validation and a global hourly limit in the database);
 *   - back office: one board per section (fondo-solidale, adotta, donazioni, proposte) and the write actions. Every call
 *     uses the caller's own session; the database checks scd_can again.
 * Until r101 is applied every function answers "not active" and nothing is sent or read.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createRateLimiter } from "./access-requests";
import { sessionView } from "./auth.functions";
import {
  CAMPAIGNS,
  CHANNELS,
  CONDITIONS,
  CONTRIBUTIONS,
  DONATION_PURPOSES,
  FUND_STATUSES,
  HANDOVERS,
  ITEM_CATEGORIES,
  ITEM_STATUSES,
  MANUAL_SOURCES,
  MEDICAL_KINDS,
  OFFER_STATUSES,
  PRICE_MODES,
  PROPOSAL_AREAS,
  PROPOSAL_STATUSES,
  SIBLING_OPTIONS,
  VISIBILITIES,
  parseAdoptBoard,
  parseDonationBoard,
  parseFundBoard,
  parseFundReport,
  parseProposalBoard,
  parsePublic,
  parseSubmit,
  type AdoptBoard,
  type DonationBoard,
  type FundBoard,
  type FundReport,
  type ProposalBoard,
  type PublicData,
  type SubmitOutcome,
} from "./giving";
import { givingEngineState, givingErrorText, givingGate, type GivingGate, type GivingSection } from "./giving.server";
import type { GrantsClient } from "./person-grants.server";
import { stagingPreviewEnabled } from "./impianti-access";
import { clientIp } from "./request-ip.server";
import { serverSupabase } from "./supabase.server";

const allowSubmit = createRateLimiter(6, 10 * 60 * 1000);

/* ------------------------------------------------------------------ public */

export interface GivingPublicView {
  engine: "applied" | "not-applied" | "unknown";
  data: PublicData | null;
}

export const getGivingPublic = createServerFn({ method: "GET" }).handler(async (): Promise<GivingPublicView> => {
  const sb = serverSupabase();
  const engine = await givingEngineState(sb as unknown as GrantsClient | null);
  if (!sb || engine !== "applied") return { engine, data: null };
  const { data, error } = await sb.rpc("scd_giving_public");
  if (error) return { engine: "unknown", data: null };
  return { engine, data: parsePublic(data) };
});

async function publicSubmit(fn: string, args: Record<string, unknown>, honeypot: string | undefined): Promise<SubmitOutcome> {
  if (honeypot) return { ok: true, reference: "—" };
  if (!allowSubmit(clientIp())) return { ok: false, code: "BUSY" };
  const sb = serverSupabase();
  const engine = await givingEngineState(sb as unknown as GrantsClient | null);
  if (!sb || engine === "not-applied") return { ok: false, code: "NOT_ACTIVE" };
  if (engine !== "applied") return { ok: false, code: "ERROR" };
  const { data, error } = await sb.rpc(fn as never, args as never);
  if (error) return { ok: false, code: "ERROR" };
  return parseSubmit(data);
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const text = (max: number) => z.string().max(max);
const optText = (max: number) => z.string().max(max).optional();

const ProposalIn = z.object({
  area: z.enum(PROPOSAL_AREAS),
  title: text(80),
  body: text(1000),
  anonymous: z.boolean(),
  contact: text(120),
  canContribute: z.array(z.enum(CONTRIBUTIONS)).max(3),
  privacy: z.boolean(),
  website: optText(200),
});
export const submitProposal = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof ProposalIn>) => ProposalIn.parse(d))
  .handler(async ({ data }): Promise<SubmitOutcome> => {
    // Personal data only with the privacy acknowledgement.
    if (!data.anonymous && !data.privacy) return { ok: false, code: "INVALID" };
    return publicSubmit(
      "scd_improvement_submit",
      {
        p_area: data.area,
        p_title: data.title,
        p_body: data.body,
        p_anonymous: data.anonymous,
        p_contact: data.anonymous ? null : data.contact.trim() || null,
        p_can_contribute: data.canContribute,
      },
      data.website,
    );
  });

const OfferIn = z.object({
  campaign: z.enum(["PALESTRA", "INFERMERIA", "ALTRO"]),
  itemId: z.string().uuid().nullable(),
  what: text(200),
  quantity: z.number().int().min(1).max(500),
  condition: z.enum(CONDITIONS),
  medicalKind: z.enum(MEDICAL_KINDS),
  sealed: z.boolean(),
  expiresOn: day.nullable(),
  professionalCheck: z.boolean(),
  hasPhotos: z.boolean(),
  handover: z.enum(HANDOVERS),
  town: text(60),
  note: text(500),
  visibility: z.enum(VISIBILITIES),
  donorName: text(120),
  donorContact: text(120),
  publicName: text(60),
  privacy: z.boolean(),
  website: optText(200),
});
export const submitOffer = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof OfferIn>) => OfferIn.parse(d))
  .handler(async ({ data }): Promise<SubmitOutcome> => {
    const anon = data.visibility === "COMPLETAMENTE_ANONIMO";
    if (!anon && !data.privacy) return { ok: false, code: "INVALID" };
    return publicSubmit(
      "scd_inkind_offer_submit",
      {
        p_campaign: data.campaign,
        p_item_id: data.itemId,
        p_what: data.what,
        p_quantity: data.quantity,
        p_condition: data.condition,
        p_medical_kind: data.medicalKind,
        p_sealed: data.sealed,
        p_expires_on: data.expiresOn,
        p_professional_check: data.professionalCheck,
        p_has_photos: data.hasPhotos,
        p_handover: data.handover,
        p_town: data.town.trim() || null,
        p_note: data.note,
        p_visibility: data.visibility,
        p_donor_name: anon ? null : data.donorName.trim() || null,
        p_donor_contact: anon ? null : data.donorContact.trim() || null,
        p_public_name: data.visibility === "NOME_PUBBLICO" ? data.publicName.trim() || null : null,
      },
      data.website,
    );
  });

const PledgeIn = z.object({
  itemId: z.string().uuid(),
  unitNumber: z.number().int().min(1).max(2000).nullable(),
  visibility: z.enum(VISIBILITIES),
  donorName: text(120),
  donorContact: text(120),
  publicName: text(60),
  plateText: text(60),
  showAmount: z.boolean(),
  pledgedAmount: z.number().positive().max(100000).nullable(),
  privacy: z.boolean(),
  website: optText(200),
});
export const submitPledge = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof PledgeIn>) => PledgeIn.parse(d))
  .handler(async ({ data }): Promise<SubmitOutcome> => {
    const anon = data.visibility === "COMPLETAMENTE_ANONIMO";
    const named = data.visibility === "NOME_PUBBLICO";
    if (!anon && !data.privacy) return { ok: false, code: "INVALID" };
    return publicSubmit(
      "scd_adopt_pledge",
      {
        p_item_id: data.itemId,
        p_unit_number: data.unitNumber,
        p_visibility: data.visibility,
        p_donor_name: anon ? null : data.donorName.trim() || null,
        p_donor_contact: anon ? null : data.donorContact.trim() || null,
        p_public_name: named ? data.publicName.trim() || null : null,
        p_plate_text: named ? data.plateText.trim() || null : null,
        p_show_amount: named && data.showAmount,
        p_pledged_amount: data.pledgedAmount,
      },
      data.website,
    );
  });

/* ------------------------------------------------------------------ back office */

async function backoffice(section: GivingSection) {
  const s = await sessionView();
  const org = s.configured && s.user ? (s.memberships[0] ?? null) : null;
  const sb = s.configured && s.user ? serverSupabase() : null;
  const preview = stagingPreviewEnabled(process.env, import.meta.env.PROD);
  const gate = await givingGate({
    section,
    signedIn: Boolean(s.user),
    organizationId: org?.organizationId ?? null,
    sb: (sb ?? (preview ? serverSupabase() : null)) as unknown as GrantsClient | null,
    preview,
  });
  return { gate, org, sb };
}

export interface BoardView<B> {
  gate: GivingGate;
  board: B | null;
  error: string | null;
  /** Interior chrome for the root layout. */
  interior: true;
}

const season = z.string().regex(/^\d{4}\/\d{2}$/);

export const getFundBoard = createServerFn({ method: "GET" })
  .inputValidator((d: { season?: string }) => z.object({ season: season.optional() }).parse(d ?? {}))
  .handler(async ({ data }): Promise<BoardView<FundBoard> & { report: FundReport | null }> => {
    const { gate, org, sb } = await backoffice("fondo-solidale");
    if (gate.state !== "open" || !sb || !org) return { gate, board: null, report: null, error: null, interior: true };
    const s = data.season ?? "2026/27";
    const [b, r] = await Promise.all([
      sb.rpc("scd_fund_board" as never, { p_organization_id: org.organizationId, p_season: s } as never),
      sb.rpc("scd_fund_report" as never, { p_organization_id: org.organizationId, p_season: s } as never),
    ]);
    if (b.error) return { gate, board: null, report: null, error: givingErrorText(b.error), interior: true };
    return { gate, board: parseFundBoard(b.data), report: r.error ? null : parseFundReport(r.data), error: null, interior: true };
  });

export const getDonationBoard = createServerFn({ method: "GET" }).handler(async (): Promise<BoardView<DonationBoard>> => {
  const { gate, org, sb } = await backoffice("donazioni");
  if (gate.state !== "open" || !sb || !org) return { gate, board: null, error: null, interior: true };
  const { data, error } = await sb.rpc("scd_donation_board" as never, { p_organization_id: org.organizationId } as never);
  if (error) return { gate, board: null, error: givingErrorText(error), interior: true };
  return { gate, board: parseDonationBoard(data), error: null, interior: true };
});

export const getAdoptBoard = createServerFn({ method: "GET" }).handler(async (): Promise<BoardView<AdoptBoard>> => {
  const { gate, org, sb } = await backoffice("adotta");
  if (gate.state !== "open" || !sb || !org) return { gate, board: null, error: null, interior: true };
  const { data, error } = await sb.rpc("scd_adopt_board" as never, { p_organization_id: org.organizationId } as never);
  if (error) return { gate, board: null, error: givingErrorText(error), interior: true };
  return { gate, board: parseAdoptBoard(data), error: null, interior: true };
});

export const getProposalBoard = createServerFn({ method: "GET" }).handler(async (): Promise<BoardView<ProposalBoard>> => {
  const { gate, org, sb } = await backoffice("proposte");
  if (gate.state !== "open" || !sb || !org) return { gate, board: null, error: null, interior: true };
  const { data, error } = await sb.rpc("scd_improvement_board" as never, { p_organization_id: org.organizationId } as never);
  if (error) return { gate, board: null, error: givingErrorText(error), interior: true };
  return { gate, board: parseProposalBoard(data), error: null, interior: true };
});

export interface ActionResult {
  ok: boolean;
  message: string;
  /** Reference returned by the database (code or id), when any. */
  ref?: string | null;
  /** What the office still has to copy into the Gestionale (Fund decisions). */
  todo?: string | null;
}

function refOf(data: unknown): { ref: string | null; todo: string | null } {
  if (typeof data === "string") return { ref: data, todo: null };
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const r = data as Record<string, unknown>;
    return { ref: typeof r["code"] === "string" ? r["code"] : null, todo: typeof r["gestionale_todo"] === "string" ? r["gestionale_todo"] : null };
  }
  return { ref: null, todo: null };
}

/** One write: only when the section is open for the caller; the database checks the level again. */
async function act(section: GivingSection, fn: string, args: (orgId: string) => Record<string, unknown>, done: string): Promise<ActionResult> {
  const { gate, org, sb } = await backoffice(section);
  if (gate.state === "not-active") return { ok: false, message: "Da attivare: serve l'OK della Direzione per applicare r101." };
  if (gate.state !== "open" || !sb || !org) return { ok: false, message: "Non sei abilitato a questa sezione: chiedi alla Direzione." };
  const { data, error } = await sb.rpc(fn as never, args(org.organizationId) as never);
  if (error) return { ok: false, message: givingErrorText(error) };
  return { ok: true, message: done, ...refOf(data) };
}

const uuid = z.string().uuid();
const money = z.number().nonnegative().max(1000000).nullable();

const FundAppIn = z.object({
  season,
  beneficiaryPersonId: uuid.nullable(),
  beneficiaryLabel: text(120),
  applicantName: text(120),
  contactEmail: text(120),
  contactPhone: text(30),
  feeSourceRecordId: text(60),
  iseeValue: money,
  iseeExpiresOn: day.nullable(),
  documentsRef: text(200),
  householdNote: text(1000),
  siblingDiscount: z.enum(SIBLING_OPTIONS),
});
export const fundSubmitApplication = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof FundAppIn>) => FundAppIn.parse(d))
  .handler(async ({ data }): Promise<ActionResult> => {
    // A guardian may apply for their own child without the section: the database checks the family link.
    const s = await sessionView();
    const org = s.configured && s.user ? (s.memberships[0] ?? null) : null;
    const sb = org ? serverSupabase() : null;
    if (!sb || !org) return { ok: false, message: "Accedi per fare domanda al Fondo Solidale." };
    const engine = await givingEngineState(sb as unknown as GrantsClient);
    if (engine !== "applied") return { ok: false, message: "Da attivare: serve l'OK della Direzione per applicare r101." };
    const { data: code, error } = await sb.rpc("scd_fund_submit_application" as never, {
      p_organization_id: org.organizationId,
      p_season: data.season,
      p_beneficiary_person_id: data.beneficiaryPersonId,
      p_beneficiary_label: data.beneficiaryLabel,
      p_applicant_name: data.applicantName,
      p_contact_email: data.contactEmail,
      p_contact_phone: data.contactPhone,
      p_fee_source_record_id: data.feeSourceRecordId,
      p_isee_value: data.iseeValue,
      p_isee_expires_on: data.iseeExpiresOn,
      p_documents_ref: data.documentsRef,
      p_household_note: data.householdNote,
      p_sibling_discount: data.siblingDiscount,
    } as never);
    if (error) return { ok: false, message: givingErrorText(error) };
    return { ok: true, message: `Domanda registrata (riferimento ${String(code)}). Resta riservata alla Direzione.`, ref: typeof code === "string" ? code : null };
  });

export const fundSetStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string | null; reviewDue: string | null; documentsDue: string | null; note: string }) =>
    z.object({ id: uuid, status: z.enum(FUND_STATUSES).nullable(), reviewDue: day.nullable(), documentsDue: day.nullable(), note: text(200) }).parse(d),
  )
  .handler(({ data }) =>
    act("fondo-solidale", "scd_fund_set_status", (o) => ({
      p_organization_id: o, p_application_id: data.id, p_status: data.status, p_review_due: data.reviewDue, p_documents_due: data.documentsDue, p_note: data.note,
    }), "Domanda aggiornata."),
  );

export const fundDecide = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; decision: "APPROVATA" | "RESPINTA"; baseFee: number | null; reducedFee: number | null; siblingDiscount: string; validUntil: string | null; reason: string }) =>
    z.object({ id: uuid, decision: z.enum(["APPROVATA", "RESPINTA"]), baseFee: money, reducedFee: money, siblingDiscount: z.enum(SIBLING_OPTIONS), validUntil: day.nullable(), reason: text(500) }).parse(d),
  )
  .handler(({ data }) =>
    act("fondo-solidale", "scd_fund_decide", (o) => ({
      p_organization_id: o, p_application_id: data.id, p_decision: data.decision, p_base_fee: data.baseFee, p_reduced_fee: data.reducedFee,
      p_sibling_discount: data.siblingDiscount, p_valid_until: data.validUntil, p_reason: data.reason,
    }), "Decisione registrata."),
  );

export const fundRecordMovement = createServerFn({ method: "POST" })
  .inputValidator((d: { season: string; source: string; amount: number; occurredOn: string; description: string; applicationId: string | null; ledgerRef: string }) =>
    z.object({
      season, source: z.enum(MANUAL_SOURCES as unknown as [string, ...string[]]), amount: z.number().positive().max(1000000), occurredOn: day,
      description: text(200), applicationId: uuid.nullable(), ledgerRef: text(80),
    }).parse(d),
  )
  .handler(({ data }) =>
    act("fondo-solidale", "scd_fund_record_movement", (o) => ({
      p_organization_id: o, p_season: data.season, p_source: data.source, p_amount: data.amount, p_occurred_on: data.occurredOn,
      p_description: data.description, p_application_id: data.applicationId, p_ledger_ref: data.ledgerRef,
    }), "Movimento registrato."),
  );

export const fundVoidMovement = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; reason: string }) => z.object({ id: uuid, reason: text(300) }).parse(d))
  .handler(({ data }) =>
    act("fondo-solidale", "scd_fund_void_movement", (o) => ({ p_organization_id: o, p_movement_id: data.id, p_reason: data.reason }), "Movimento annullato."),
  );

export const fundSetPublicTotals = createServerFn({ method: "POST" })
  .inputValidator((d: { on: boolean }) => z.object({ on: z.boolean() }).parse(d))
  .handler(({ data }) =>
    act("fondo-solidale", "scd_giving_set_public_totals", (o) => ({ p_organization_id: o, p_on: data.on }), data.on ? "Totali del Fondo visibili in pubblico." : "Totali del Fondo nascosti."),
  );

const DonationIn = z.object({
  donationId: uuid.nullable(),
  purpose: z.enum(DONATION_PURPOSES),
  itemId: uuid.nullable(),
  unitNumber: z.number().int().min(1).max(2000).nullable(),
  visibility: z.enum(VISIBILITIES),
  donorName: text(120),
  donorContact: text(120),
  donorFiscalCode: text(16),
  publicName: text(60),
  plateText: text(60),
  showAmount: z.boolean(),
  amount: z.number().positive().max(1000000),
  channel: z.enum(CHANNELS),
  receivedOn: day,
  season,
});
export const donationRecord = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof DonationIn>) => DonationIn.parse(d))
  .handler(({ data }) => {
    const anon = data.visibility === "COMPLETAMENTE_ANONIMO";
    const named = data.visibility === "NOME_PUBBLICO";
    return act("donazioni", "scd_donation_record", (o) => ({
      p_organization_id: o, p_donation_id: data.donationId, p_purpose: data.purpose, p_item_id: data.itemId, p_unit_number: data.unitNumber,
      p_visibility: data.visibility,
      p_donor_name: anon ? null : data.donorName, p_donor_contact: anon ? null : data.donorContact, p_donor_fiscal_code: anon ? null : data.donorFiscalCode,
      p_public_name: named ? data.publicName : null, p_plate_text: named ? data.plateText : null, p_show_amount: named && data.showAmount,
      p_amount: data.amount, p_channel: data.channel, p_received_on: data.receivedOn, p_season: data.season,
    }), "Donazione registrata come ricevuta.");
  });

export const donationSetReceipt = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; number: string; issuedOn: string }) => z.object({ id: uuid, number: text(40), issuedOn: day }).parse(d))
  .handler(({ data }) =>
    act("donazioni", "scd_donation_set_receipt", (o) => ({ p_organization_id: o, p_donation_id: data.id, p_receipt_number: data.number, p_issued_on: data.issuedOn }), "Ricevuta segnata."),
  );

export const donationVoid = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; reason: string }) => z.object({ id: uuid, reason: text(300) }).parse(d))
  .handler(({ data }) => act("donazioni", "scd_donation_void", (o) => ({ p_organization_id: o, p_donation_id: data.id, p_reason: data.reason }), "Donazione annullata."));

export const offerReview = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string; text: string; conditionOk: boolean; receivedOn: string | null; inventoryRef: string }) =>
    z.object({ id: uuid, status: z.enum(OFFER_STATUSES), text: text(300), conditionOk: z.boolean(), receivedOn: day.nullable(), inventoryRef: text(80) }).parse(d),
  )
  .handler(({ data }) =>
    act("donazioni", "scd_inkind_review", (o) => ({
      p_organization_id: o, p_offer_id: data.id, p_status: data.status, p_text: data.text, p_condition_ok: data.conditionOk,
      p_received_on: data.receivedOn, p_inventory_ref: data.inventoryRef,
    }), "Offerta aggiornata."),
  );

const ItemIn = z.object({
  id: uuid.nullable(),
  title: text(120),
  category: z.enum(ITEM_CATEGORIES),
  description: text(1500),
  supplier: text(120),
  supplierCode: text(60),
  productUrl: text(500),
  photoPath: text(200),
  priceMode: z.enum(PRICE_MODES),
  priceTotal: z.number().positive().max(10000000).nullable(),
  priceNote: text(200),
  quoteRef: text(200),
  quoteValidUntil: day.nullable(),
  unitLabel: text(30),
  unitsTotal: z.number().int().min(1).max(2000).nullable(),
  unitPrice: z.number().positive().max(1000000).nullable(),
  campaign: z.enum(CAMPAIGNS).nullable(),
  published: z.boolean(),
});
export const adoptSave = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof ItemIn>) => ItemIn.parse(d))
  .handler(({ data }) => {
    const { id, ...item } = data;
    return act("adotta", "scd_adopt_item_save", (o) => ({
      p_organization_id: o,
      p_item_id: id,
      p_item: {
        ...item,
        priceTotal: item.priceMode === "PREZZO" ? item.priceTotal : null,
        unitsTotal: item.unitsTotal,
        unitLabel: item.unitsTotal ? item.unitLabel : "",
        quoteValidUntil: item.quoteValidUntil ?? "",
        campaign: item.campaign ?? "",
      },
    }), "Oggetto salvato.");
  });

export const adoptSetStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string }) => z.object({ id: uuid, status: z.enum(ITEM_STATUSES) }).parse(d))
  .handler(({ data }) => act("adotta", "scd_adopt_item_set_status", (o) => ({ p_organization_id: o, p_item_id: data.id, p_status: data.status }), "Stato aggiornato."));

export const proposalTriage = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string; reason: string }) => z.object({ id: uuid, status: z.enum(PROPOSAL_STATUSES), reason: text(300) }).parse(d))
  .handler(({ data }) =>
    act("proposte", "scd_improvement_triage", (o) => ({ p_organization_id: o, p_proposal_id: data.id, p_status: data.status, p_reason: data.reason }), "Proposta aggiornata."),
  );

export const proposalPublish = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; publish: boolean; title: string; text: string }) =>
    z.object({ id: uuid, publish: z.boolean(), title: text(80), text: text(600) }).parse(d),
  )
  .handler(({ data }) =>
    act("proposte", "scd_improvement_publish", (o) => ({ p_organization_id: o, p_proposal_id: data.id, p_publish: data.publish, p_title: data.title, p_text: data.text }),
      data.publish ? "Pubblicata con il testo dello staff." : "Tolta dalla pagina pubblica."),
  );

export const proposalToItem = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; title: string; category: string }) => z.object({ id: uuid, title: text(120), category: z.enum(ITEM_CATEGORIES) }).parse(d))
  .handler(({ data }) =>
    act("proposte", "scd_improvement_to_item", (o) => ({ p_organization_id: o, p_proposal_id: data.id, p_title: data.title, p_category: data.category }),
      "Creato un oggetto in bozza in «Adotta un oggetto»."),
  );

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  FONDO_PUBLIC_TEXT,
  MIN_PUBLIC_CONTRIBUTIONS,
  SOSTIENI_VETRINA_SLOT,
  TRANSITIONS,
  adoptionProgress,
  autoItemStatus,
  canTransition,
  coverRoom,
  decisionProblem,
  donorErrors,
  effectivePriceMode,
  fundDeadlines,
  fundTotals,
  gestionaleTodo,
  hasContact,
  itemErrors,
  offerRefusal,
  parsePublic,
  parseSubmit,
  priceLine,
  proposalErrors,
  publicDonor,
  publishProblem,
  receiptPossible,
  reviewProblem,
  unitPriceOf,
  type ItemDraft,
  type OfferInput,
} from "./giving";
import { givingEngineState, givingErrorText, givingGate } from "./giving.server";
import type { GrantsClient } from "./person-grants.server";
import { VETRINA_SLOTS } from "./vetrina-slots.server";

const repo = (p: string) => fileURLToPath(new URL(`../../../../${p}`, import.meta.url));
const SQL = readFileSync(repo("supabase/migrations/20261014_r101_fondo_adotta.sql"), "utf8");
const routeTree = readFileSync(fileURLToPath(new URL("../routeTree.gen.ts", import.meta.url)), "utf8");
const TODAY = "2026-10-14";

/*
 * Real examples given by the Direzione on 14/10/2026 — TEST FIXTURES ONLY, never seeded into the database:
 * KOMPAN StreetBLOCK FSP10300 (outdoor fitness), KOMPAN Torre Doppia con Scivoli PCW200121, Doppia Torre con 2 Scivoli
 * PCW200321, fixed tribune for the Colico pitch from the SACO Multiservizi offer of 14/05/2026: 60 numbered seats,
 * 54.500 € + IVA 22% (66.490 €), offer validity expired. The validity date was not given: any day before today is
 * "expired", the offer day itself is used here.
 */
const draft = (over: Partial<ItemDraft>): ItemDraft => ({
  title: "", category: "", description: "", supplier: "", supplierCode: "", productUrl: "", photoPath: "", priceMode: "DA_PREVENTIVO",
  priceTotal: "", priceNote: "", quoteRef: "", quoteValidUntil: "", unitLabel: "", unitsTotal: "", unitPrice: "", campaign: "", published: false, ...over,
});
const KOMPAN_FITNESS = draft({ title: "KOMPAN StreetBLOCK", category: "AREA_FITNESS", supplier: "KOMPAN", supplierCode: "FSP10300" });
const KOMPAN_TORRE = draft({ title: "KOMPAN Torre Doppia con Scivoli", category: "AREA_GIOCHI_BAMBINI", supplier: "KOMPAN", supplierCode: "PCW200121" });
const KOMPAN_DOPPIA = draft({ title: "Doppia Torre con 2 Scivoli", category: "AREA_GIOCHI_BAMBINI", supplier: "KOMPAN", supplierCode: "PCW200321" });
const TRIBUNE = {
  priceMode: "PREZZO" as const,
  priceTotal: 66490,
  priceNote: "54.500 € + IVA 22%",
  quoteValidUntil: "2026-05-14",
  unitsTotal: 60,
  unitPrice: null,
};

function sqlLiteral(tag: string): unknown {
  const m = SQL.match(new RegExp(`\\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$`));
  if (!m) throw new Error(`literal $${tag}$ not found`);
  return JSON.parse(m[1]!);
}

describe("migration r101 (staged, mirrored by giving.ts)", () => {
  it("is written, not applied, and seeds nothing", () => {
    expect(SQL).toMatch(/STAGED: written, NOT applied/);
    expect(SQL).not.toMatch(/insert into public\.scd_(adopt_items|donations|fund_applications|inkind_offers|improvement_proposals|fund_movements)[^;]*values\s*\('/i);
    expect(SQL).not.toMatch(/KOMPAN|SACO|FSP10300|PCW2003?21/);
    expect(SQL).not.toMatch(/dfnwzwutvnwiitiffwvr/);
  });

  it("keeps the same status transitions as the app", () => {
    expect(sqlLiteral("tr")).toEqual(TRANSITIONS);
  });

  it("turns RLS on for every new table, with no direct policy and no table grant", () => {
    const tables = [...SQL.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]!);
    expect(tables.length).toBe(9);
    for (const t of tables) expect(SQL).toContain(`alter table public.${t} enable row level security;`);
    expect(SQL).not.toMatch(/create policy/i);
    expect(SQL).not.toMatch(/grant (select|insert|update|delete)[^;]* on (table )?public\.scd_/i);
  });

  it("pins search_path on every function and exposes only the public entry points to anon", () => {
    const fns = [...SQL.matchAll(/create or replace function public\.(\w+)\([\s\S]*?\$\$/g)];
    expect(fns.length).toBeGreaterThan(25);
    for (const f of fns) expect(f[0], f[1]).toMatch(/set search_path to 'public'/);
    const anon = [...SQL.matchAll(/grant execute on function public\.(\w+)\([^)]*\) to anon/g)].map((m) => m[1]);
    expect(anon.sort()).toEqual(["scd_adopt_pledge", "scd_giving_engine", "scd_giving_public", "scd_improvement_submit", "scd_inkind_offer_submit"]);
  });

  it("enforces the Direzione rules in the database too", () => {
    expect(SQL).toMatch(/constraint scd_fund_no_double_discount check \(status <> 'APPROVATA' or sibling_discount in \('NESSUNO','PRESENTE_RINUNCIA'\)\)/);
    expect(SQL).toMatch(/v_rule ~\* 'fratell'/);
    expect(SQL).toMatch(/constraint scd_donation_full_anonymity/);
    expect(SQL).toMatch(/constraint scd_inkind_medicine_sealed/);
    expect(SQL).toMatch(/return 'MEDICINE_REFUSED'/);
    expect(SQL).toMatch(/scd_can\('infermeria', 'WRITE'/);
    expect(SQL).toMatch(/constraint scd_proposal_publish_shape/);
    expect(SQL).toMatch(/it\.n_received >= 3/);
    expect(MIN_PUBLIC_CONTRIBUTIONS).toBe(3);
  });

  it("checks the section grant (r100 scd_can) in every back-office function", () => {
    for (const fn of ["scd_fund_board", "scd_fund_decide", "scd_fund_record_movement", "scd_donation_record", "scd_donation_board", "scd_inkind_review", "scd_adopt_item_save", "scd_adopt_board", "scd_improvement_board", "scd_improvement_triage", "scd_improvement_publish"]) {
      const body = SQL.slice(SQL.indexOf(`function public.${fn}(`));
      expect(body.slice(0, body.indexOf("$$;")), fn).toMatch(/scd_giving_need\('(fondo-solidale|donazioni|adotta|proposte)'/);
    }
  });
});

describe("personal data in free text", () => {
  it("finds e-mails, phone numbers, fiscal codes and IBANs", () => {
    expect(hasContact("scrivetemi a mario.rossi@example.com")).toBe(true);
    expect(hasContact("chiamate il 333 123 4567")).toBe(true);
    expect(hasContact("cf RSSMRA80A01F205X")).toBe(true);
    expect(hasContact("IT60 X054 2811 1010 0000 0123 456")).toBe(true);
    expect(hasContact("Servono nuove luci sul campo a 7 per l'inverno 2026")).toBe(false);
  });
});

describe("donor visibility and anonymity", () => {
  it("completely anonymous: no personal data at all, no receipt", () => {
    expect(donorErrors({ visibility: "COMPLETAMENTE_ANONIMO" })).toEqual({});
    expect(donorErrors({ visibility: "COMPLETAMENTE_ANONIMO", name: "Mario" }).name).toBeDefined();
    expect(donorErrors({ visibility: "COMPLETAMENTE_ANONIMO", showAmount: true }).showAmount).toBeDefined();
    expect(receiptPossible("COMPLETAMENTE_ANONIMO")).toBe(false);
    expect(receiptPossible("ANONIMO_PUBBLICO")).toBe(true);
  });

  it("anonymous in public: name kept for the treasury, nothing shown", () => {
    expect(donorErrors({ visibility: "ANONIMO_PUBBLICO", name: "Ada Rossi", contact: "ada@x.it" })).toEqual({});
    expect(donorErrors({ visibility: "ANONIMO_PUBBLICO", name: "Ada Rossi" }).contact).toBeDefined();
    expect(donorErrors({ visibility: "ANONIMO_PUBBLICO", name: "Ada Rossi", contact: "a@x.it", publicName: "Ada" }).publicName).toBeDefined();
    expect(publicDonor({ visibility: "ANONIMO_PUBBLICO", publicName: null, plateText: null, showAmount: false, amount: 50, status: "RICEVUTA" })).toBeNull();
  });

  it("public name: shown only when received, amount only with consent, no contacts on plates", () => {
    const base = { visibility: "NOME_PUBBLICO" as const, publicName: "Bar Sport", plateText: null, showAmount: false, amount: 100, status: "RICEVUTA" as const };
    expect(publicDonor(base)).toEqual({ name: "Bar Sport", plate: null, amount: null });
    expect(publicDonor({ ...base, showAmount: true })?.amount).toBe(100);
    expect(publicDonor({ ...base, status: "PROMESSA" })).toBeNull();
    expect(donorErrors({ visibility: "NOME_PUBBLICO", name: "Ada", contact: "a@x.it", publicName: "Ada", plateText: "chiama 3331234567", unit: true }).plateText).toBeDefined();
    expect(donorErrors({ visibility: "NOME_PUBBLICO", name: "Ada", contact: "a@x.it", publicName: "Ada", plateText: "In ricordo di nonno" }).plateText).toBeDefined();
    expect(donorErrors({ visibility: "NOME_PUBBLICO", name: "Ada", contact: "a@x.it", publicName: "Ada", plateText: "In ricordo di nonno", unit: true })).toEqual({});
  });
});

describe("adotta un oggetto: prices, partial adoption, units", () => {
  it("the Direzione's examples are valid catalogue entries (price on quote)", () => {
    for (const d of [KOMPAN_FITNESS, KOMPAN_TORRE, KOMPAN_DOPPIA]) expect(itemErrors(d)).toEqual({});
    expect(itemErrors({ ...KOMPAN_FITNESS, priceTotal: "1000" }).priceTotal).toBeDefined();
    expect(itemErrors({ ...KOMPAN_FITNESS, photoPath: "https://www.kompan.com/catalog/fsp10300.jpg" }).photoPath).toMatch(/Mai foto del catalogo/);
    expect(itemErrors({ ...KOMPAN_FITNESS, photoPath: "/foto/club/fitness-colico.webp" })).toEqual({});
    expect(itemErrors({ ...KOMPAN_FITNESS, productUrl: "www.kompan.com" }).productUrl).toBeDefined();
  });

  it("tribune: 54.500 € + IVA 22% is 66.490 €, 60 seats, expired offer shows 'da preventivo aggiornato'", () => {
    expect(Math.round(54500 * 1.22 * 100) / 100).toBe(TRIBUNE.priceTotal);
    expect(effectivePriceMode(TRIBUNE.priceMode, TRIBUNE.quoteValidUntil, TODAY)).toBe("DA_PREVENTIVO_AGGIORNATO");
    expect(effectivePriceMode(TRIBUNE.priceMode, "2026-12-31", TODAY)).toBe("PREZZO");
    expect(effectivePriceMode("PREZZO", null, TODAY)).toBe("PREZZO");
    expect(priceLine({ priceMode: "DA_PREVENTIVO_AGGIORNATO", priceTotal: null, priceNote: null })).toMatch(/riconfermato/);
    expect(unitPriceOf(TRIBUNE)).toBe(1108.17);
    const p = adoptionProgress({ ...TRIBUNE, unitsAdopted: 7, contributions: [] }, TODAY);
    expect(p.target).toBeNull();
    expect(p.pct).toBeNull();
    expect(p.unitsPct).toBe(11);
    expect(itemErrors(draft({ title: "Tribuna fissa campo di Colico", category: "TRIBUNA_IMPIANTO", supplier: "SACO Multiservizi", priceMode: "PREZZO", priceTotal: "66490", unitLabel: "posto", unitsTotal: "60" }))).toEqual({});
    expect(itemErrors(draft({ title: "Tribuna", category: "TRIBUNA_IMPIANTO", unitsTotal: "60" })).unitLabel).toBeDefined();
  });

  it("many adopters toward one item; amounts public only with 3+ contributions or everybody's consent", () => {
    const item = { priceMode: "PREZZO" as const, priceTotal: 1000, quoteValidUntil: null, unitsTotal: null, unitsAdopted: 0 };
    const two = adoptionProgress({ ...item, contributions: [{ amount: 100, showAmount: false }, { amount: 150, showAmount: true }] }, TODAY);
    expect(two.collected).toBe(250);
    expect(two.amountPublic).toBe(false);
    expect(two.pct).toBeNull();
    const consent = adoptionProgress({ ...item, contributions: [{ amount: 100, showAmount: true }, { amount: 150, showAmount: true }] }, TODAY);
    expect(consent.pct).toBe(25);
    const three = adoptionProgress({ ...item, contributions: [{ amount: 0.1, showAmount: false }, { amount: 0.2, showAmount: false }, { amount: 999.7, showAmount: false }] }, TODAY);
    expect(three.amountPublic).toBe(true);
    expect(three.collected).toBe(1000);
    expect(three.pct).toBe(100);
    expect(three.complete).toBe(true);
    expect(adoptionProgress({ ...item, contributions: [] }, TODAY).pct).toBe(0);
  });

  it("units complete the item when all are adopted; status follows what was received", () => {
    const p = adoptionProgress({ ...TRIBUNE, unitsAdopted: 60, contributions: [] }, TODAY);
    expect(p.complete).toBe(true);
    expect(autoItemStatus("IN_RACCOLTA", { complete: true, contributions: 60 })).toBe("ADOTTATO");
    expect(autoItemStatus("DA_ADOTTARE", { complete: false, contributions: 1 })).toBe("IN_RACCOLTA");
    expect(autoItemStatus("IN_RACCOLTA", { complete: false, contributions: 0 })).toBe("DA_ADOTTARE");
    expect(autoItemStatus("CONSEGNATO", { complete: false, contributions: 0 })).toBe("CONSEGNATO");
    expect(autoItemStatus("BOZZA", { complete: true, contributions: 3 })).toBe("BOZZA");
  });
});

describe("goods offers (palestra / infermeria)", () => {
  const offer = (o: Partial<OfferInput>): OfferInput => ({
    campaign: "INFERMERIA", what: "Ghiaccio istantaneo", quantity: 10, condition: "NUOVO_SIGILLATO", medicalKind: "FARMACO", sealed: true,
    expiresOn: "2027-10-01", professionalCheck: false, handover: "CONSEGNA", note: "", visibility: "ANONIMO_PUBBLICO", ...o,
  });

  it("medicines: only sealed and not expired; opened or expired never accepted", () => {
    expect(offerRefusal(offer({}), TODAY)).toBeNull();
    expect(offerRefusal(offer({ sealed: false }), TODAY)).toBe("MEDICINE_REFUSED");
    expect(offerRefusal(offer({ expiresOn: "2026-10-13" }), TODAY)).toBe("MEDICINE_REFUSED");
    expect(offerRefusal(offer({ expiresOn: null }), TODAY)).toBe("MEDICINE_REFUSED");
  });

  it("other medical items: new and sealed or verifiable by a professional", () => {
    expect(offerRefusal(offer({ medicalKind: "DISPOSITIVO", condition: "BUONO", sealed: false, expiresOn: null }), TODAY)).toBe("MEDICAL_NOT_VERIFIABLE");
    expect(offerRefusal(offer({ medicalKind: "DISPOSITIVO", condition: "BUONO", professionalCheck: true, expiresOn: null }), TODAY)).toBeNull();
    expect(offerRefusal(offer({ medicalKind: "ARREDO", condition: "BUONO", expiresOn: null }), TODAY)).toBeNull();
  });

  it("gym equipment; completely anonymous donors must deliver and leave no contact in the text", () => {
    const gym = offer({ campaign: "PALESTRA", what: "Manubri 10 kg", quantity: 2, condition: "BUONO", medicalKind: "NON_MEDICO", expiresOn: null });
    expect(offerRefusal(gym, TODAY)).toBeNull();
    expect(offerRefusal({ ...gym, visibility: "COMPLETAMENTE_ANONIMO", handover: "RITIRO" }, TODAY)).toBe("ANONYMOUS_NEEDS_DELIVERY");
    expect(offerRefusal({ ...gym, visibility: "COMPLETAMENTE_ANONIMO", note: "scrivete a a@b.it" }, TODAY)).toBe("CONTACT_IN_ANONYMOUS");
    expect(offerRefusal({ ...gym, quantity: 0 }, TODAY)).toBe("INVALID");
  });

  it("staff review: infermeria approves medical items, reasons and checks required", () => {
    const o = { status: "NUOVA" as const, campaign: "INFERMERIA" as const, medicalKind: "MATERIALE_CONSUMO" as const, sealed: true, expiresOn: null };
    const input = { canInfermeria: false, text: "", conditionOk: false, receivedOn: null, inventoryRef: "" };
    expect(reviewProblem(o, "ACCETTATA", input, TODAY)).toMatch(/infermeria/);
    expect(reviewProblem(o, "ACCETTATA", { ...input, canInfermeria: true }, TODAY)).toBeNull();
    expect(reviewProblem(o, "RIFIUTATA", input, TODAY)).toMatch(/motivo/);
    expect(reviewProblem(o, "RICEVUTA", input, TODAY)).toMatch(/Passaggio/);
    const accepted = { ...o, status: "ACCETTATA" as const };
    expect(reviewProblem(accepted, "RICEVUTA", { ...input, canInfermeria: true, receivedOn: TODAY }, TODAY)).toMatch(/controllo/);
    expect(reviewProblem(accepted, "RICEVUTA", { ...input, canInfermeria: true, conditionOk: true, receivedOn: TODAY }, TODAY)).toBeNull();
    const medicine = { ...accepted, medicalKind: "FARMACO" as const, expiresOn: "2026-10-20" };
    expect(reviewProblem(medicine, "RICEVUTA", { ...input, canInfermeria: true, conditionOk: true, receivedOn: "2026-10-21" }, "2026-10-21")).toMatch(/Farmaci/);
    expect(reviewProblem({ ...o, status: "RICEVUTA" as const }, "INVENTARIATA", input, TODAY)).toMatch(/magazzino/);
  });
});

describe("proposte di miglioramento", () => {
  const base = { area: "CAMPI" as const, title: "Luci campo a 7", body: "Servono luci nuove per gli allenamenti invernali.", anonymous: true, contact: "", canContribute: ["TEMPO" as const], signedIn: false };
  it("validates and keeps anonymous proposals anonymous", () => {
    expect(proposalErrors(base)).toEqual({});
    expect(proposalErrors({ ...base, body: "Servono luci, scrivetemi a mario@example.com" }).body).toMatch(/recapito/);
    expect(proposalErrors({ ...base, contact: "333 1234567" }).contact).toBeDefined();
    expect(proposalErrors({ ...base, anonymous: false }).contact).toMatch(/recapito oppure accedi/);
    expect(proposalErrors({ ...base, anonymous: false, signedIn: true })).toEqual({});
    expect(proposalErrors({ ...base, area: "" }).area).toBeDefined();
    expect(proposalErrors({ ...base, title: "Luci" }).title).toBeDefined();
  });
  it("publishes only staff text without contacts, for proposals under evaluation or accepted", () => {
    expect(publishProblem({ status: "NUOVA" }, "Luci nuove", "Stiamo valutando le luci.")).toMatch(/valutazione/);
    expect(publishProblem({ status: "IN_VALUTAZIONE" }, "Luci nuove", "Info al 3331234567")).toMatch(/recapiti/);
    expect(publishProblem({ status: "ACCETTATA" }, "Luci nuove", "Stiamo valutando le luci del campo a 7.")).toBeNull();
  });
});

describe("Fondo Solidale", () => {
  const ok = { decision: "APPROVATA" as const, baseFee: 300, reducedFee: 150, siblingDiscount: "NESSUNO" as const, feeFamilyRule: null, reason: "ISEE sotto soglia" };
  it("never cumulates Fondo and sibling discount", () => {
    expect(decisionProblem(ok)).toBeNull();
    expect(decisionProblem({ ...ok, siblingDiscount: "PRESENTE" })).toMatch(/non sono cumulabili/);
    expect(decisionProblem({ ...ok, siblingDiscount: "DA_VERIFICARE" })).toMatch(/non sono cumulabili/);
    expect(decisionProblem({ ...ok, feeFamilyRule: "Fratelli -10%" })).toMatch(/Gestionale/);
    expect(decisionProblem({ ...ok, feeFamilyRule: "Fratelli -10%", siblingDiscount: "PRESENTE_RINUNCIA" })).toBeNull();
  });
  it("checks fees and reasons", () => {
    expect(decisionProblem({ ...ok, reducedFee: 400 })).toMatch(/ridotta/);
    expect(decisionProblem({ ...ok, baseFee: null })).toMatch(/ridotta/);
    expect(decisionProblem({ ...ok, reason: "" })).toMatch(/motivazione/);
    expect(decisionProblem({ ...ok, decision: "RESPINTA", baseFee: null, reducedFee: null, siblingDiscount: "PRESENTE" })).toBeNull();
  });
  it("says what to copy into the Gestionale", () => {
    expect(gestionaleTodo({ status: "APPROVATA", siblingDiscount: "PRESENTE_RINUNCIA", feeFundInSheet: false })).toMatch(/Togliere lo sconto fratelli/);
    expect(gestionaleTodo({ status: "APPROVATA", siblingDiscount: "NESSUNO", feeFundInSheet: null })).toBe("Segnare il Fondo nel Gestionale");
    expect(gestionaleTodo({ status: "APPROVATA", siblingDiscount: "NESSUNO", feeFundInSheet: true })).toBeNull();
    expect(gestionaleTodo({ status: "IN_ESAME", siblingDiscount: "NESSUNO", feeFundInSheet: false })).toBeNull();
  });
  it("covers fees only up to the decided reduction; totals skip voided rows", () => {
    expect(coverRoom({ baseFee: 300, reducedFee: 150, covered: 100 })).toBe(50);
    expect(coverRoom({ baseFee: 300, reducedFee: 150, covered: 200 })).toBe(0);
    expect(coverRoom({ baseFee: null, reducedFee: null, covered: 0 })).toBe(0);
    const t = fundTotals([
      { direction: "ENTRATA", source: "DONAZIONE", amount: 200, voided: false },
      { direction: "ENTRATA", source: "EVENTO", amount: 350.1, voided: false },
      { direction: "USCITA", source: "QUOTA_COPERTA", amount: 100, voided: false },
      { direction: "ENTRATA", source: "SPONSOR_DEDICATO", amount: 999, voided: true },
    ]);
    expect(t).toMatchObject({ income: 550.1, outgoings: 100, balance: 450.1 });
    expect(t.bySource.SPONSOR_DEDICATO).toBeUndefined();
  });
  it("lists deadlines most urgent first and flags late ones", () => {
    const d = fundDeadlines([
      { code: "FS-B", status: "IN_ESAME", reviewDue: "2026-10-20", documentsDue: null },
      { code: "FS-A", status: "INTEGRAZIONE", reviewDue: "2026-11-01", documentsDue: "2026-10-10" },
      { code: "FS-C", status: "APPROVATA", reviewDue: "2026-09-01", documentsDue: null },
    ], TODAY);
    expect(d.map((x) => `${x.code}:${x.kind}:${x.late}`)).toEqual(["FS-A:documenti:true", "FS-B:esame:false", "FS-A:esame:false"]);
  });
  it("public text comes only from the Direzione", () => {
    expect(FONDO_PUBLIC_TEXT).toBeNull();
  });
});

describe("status transitions", () => {
  it("follows the agreed flows", () => {
    expect(canTransition("FUND_APPLICATION", "INVIATA", "APPROVATA")).toBe(false);
    expect(canTransition("FUND_APPLICATION", "IN_ESAME", "APPROVATA")).toBe(true);
    expect(canTransition("DONATION", "ANNULLATA", "RICEVUTA")).toBe(false);
    expect(canTransition("ADOPT_ITEM", "ADOTTATO", "CONSEGNATO")).toBe(true);
    expect(canTransition("ADOPT_ITEM", "CONSEGNATO", "DA_ADOTTARE")).toBe(false);
    expect(canTransition("INKIND_OFFER", "NUOVA", "INVENTARIATA")).toBe(false);
    expect(canTransition("PROPOSAL", "NON_FATTIBILE", "ACCETTATA")).toBe(false);
  });
});

describe("parsing and outcomes", () => {
  it("reads submit codes", () => {
    expect(parseSubmit("RECEIVED:PR-1A2B3C")).toEqual({ ok: true, reference: "PR-1A2B3C" });
    expect(parseSubmit("MEDICINE_REFUSED")).toEqual({ ok: false, code: "MEDICINE_REFUSED" });
    expect(parseSubmit("whatever")).toEqual({ ok: false, code: "ERROR" });
    expect(parseSubmit(null)).toEqual({ ok: false, code: "ERROR" });
  });
  it("reads the public payload defensively", () => {
    const p = parsePublic({ items: [{ id: "x", title: "T", category: "NOPE", priceMode: "PREZZO", priceTotal: "100", units: [{ n: 1, status: "ADOTTATO", plate: "Nonno" }], adopters: [{ name: "Bar", amount: null }, { amount: 5 }] }], fund: null });
    expect(p.items[0]).toMatchObject({ category: "ALTRO", priceTotal: 100, units: [{ n: 1, adopted: true, plate: "Nonno" }], adopters: [{ name: "Bar", amount: null }] });
    expect(p.fund).toBeNull();
    expect(parsePublic(null).items).toEqual([]);
  });
});

describe("fail-closed gate (no behaviour change before r101)", () => {
  function client(engine: { data?: unknown; error: { code?: string; message: string } | null }, can?: boolean, grants = true): GrantsClient {
    const head = Promise.resolve({ error: grants ? null : { code: "PGRST205", message: "Could not find the table" } });
    return {
      from: () => ({ select: () => Object.assign(head, { limit: () => head }) }),
      rpc: (fn: string) => Promise.resolve(fn === "scd_giving_engine" ? { data: engine.data ?? null, error: engine.error } : { data: can ?? false, error: null }),
    };
  }
  const missing = { error: { code: "PGRST202", message: "Could not find the function public.scd_giving_engine" } };

  it("detects r101", async () => {
    expect(await givingEngineState(null)).toBe("unknown");
    expect(await givingEngineState(client(missing))).toBe("not-applied");
    expect(await givingEngineState(client({ data: "r101", error: null }))).toBe("applied");
    expect(await givingEngineState(client({ error: { code: "08006", message: "connection failure" } }))).toBe("unknown");
  });

  it("opens only with r101 applied and a per-person grant", async () => {
    const base = { section: "fondo-solidale" as const, signedIn: true, organizationId: "org", preview: false };
    expect((await givingGate({ ...base, sb: client(missing) })).state).toBe("not-active");
    expect((await givingGate({ ...base, sb: client({ data: "r101", error: null }, false) })).state).toBe("denied");
    expect((await givingGate({ ...base, sb: client({ data: "r101", error: null }, true) })).state).toBe("open");
    expect((await givingGate({ ...base, sb: client({ data: "r101", error: null }, true, false) })).state).toBe("unavailable");
    expect((await givingGate({ ...base, signedIn: false, sb: null })).state).toBe("signed-out");
    expect((await givingGate({ ...base, signedIn: false, sb: client(missing), preview: true })).state).toBe("not-active");
    expect((await givingGate({ ...base, signedIn: false, sb: client({ data: "r101", error: null }, true), preview: true })).state).toBe("signed-out");
  });

  it("explains database refusals in plain words", () => {
    expect(givingErrorText({ code: "22023", message: "double discount: Fondo and sibling discount are not cumulative" })).toMatch(/non sono cumulabili/);
    expect(givingErrorText({ code: "42501", message: "medical items: the infermeria responsible approves" })).toMatch(/infermeria/);
    expect(givingErrorText({ code: "42501", message: "not enabled: donazioni WRITE" })).toMatch(/Direzione/);
    expect(givingErrorText({ code: "PGRST202", message: "Could not find the function" })).toMatch(/r101/);
  });
});

describe("public entry points", () => {
  it("vetrina slot is ready but not on air (home unchanged)", () => {
    expect(routeTree).toMatch(new RegExp(`fullPath: '${SOSTIENI_VETRINA_SLOT.href}/?'`));
    expect(VETRINA_SLOTS.some((s) => s.href.startsWith("/sostieni"))).toBe(false);
  });
});

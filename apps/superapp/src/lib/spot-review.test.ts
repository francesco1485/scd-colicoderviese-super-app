import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { mailtoFor } from "./public-forms";
import { partnerLeadSchema } from "./club.functions";
import { SPONSOR_FAQ, SPOT_STANDARD_TEXT as PROCESS_STANDARD } from "./sponsor-process";
import { packageById, requestablePackages } from "./sponsor-packages";
import { SPONSOR_SPOTS, SPOT_STATUS_LABEL, type SponsorSpot } from "./sponsor-spots";
import { SPONSORS } from "./sponsors";
import {
  MODIFICHE_MAX,
  PARTNER_MESSAGE_MAX,
  SPOT_ANSWER_AFTER_MAIL,
  SPOT_ANSWER_LABEL,
  SPOT_ANSWER_RECEIVED,
  SPOT_STANDARD_TEXT,
  SPOT_WHERE,
  findSpot,
  spotAirNote,
  spotAnswerMessage,
  spotAnswerTopic,
  spotReviewMeta,
  spotReviewPath,
  spotReviewShareText,
  spotReviewUrl,
  spotReviewWhatsapp,
  spotStatusLabel,
  sponsorLogoSrc,
  validateSpotAnswer,
} from "./spot-review";

const APP = resolve(__dirname, "../..");
const carcano = SPONSOR_SPOTS.find((s) => s.slug === "carcano")!;
const SITE = "https://app.colicoderviese.it";

describe("spot review page logic (B1, UD-119)", () => {
  it("finds every ready spot by slug and nothing else", () => {
    for (const s of SPONSOR_SPOTS) expect(findSpot(s.slug)?.slug).toBe(s.slug);
    expect(findSpot(" Carcano ")?.slug).toBe("carcano");
    for (const bad of ["", "x", "iperal", "legea", "atl-iveco", "../crm", "carcano/../x", "a".repeat(61), null, undefined]) {
      expect(findSpot(bad as string), String(bad)).toBeUndefined();
    }
  });

  it("builds the path and the absolute link on the official origin", () => {
    expect(spotReviewPath("carcano")).toBe("/spot/carcano");
    expect(spotReviewUrl("carcano", SITE)).toBe(`${SITE}/spot/carcano`);
    expect(spotReviewUrl("dell-oca", SITE)).toBe(`${SITE}/spot/dell-oca`);
  });

  it("uses the official logo listed in sponsors.ts only, and the file exists", () => {
    for (const s of SPONSOR_SPOTS) {
      const src = sponsorLogoSrc(s.slug);
      expect(src, s.slug).toBe(SPONSORS.find((x) => x.slug === s.slug)!.src);
      expect(existsSync(resolve(APP, "public", src!.slice(1))), src!).toBe(true);
    }
    expect(sponsorLogoSrc("non-esiste")).toBeNull();
  });

  it("reuses the status labels and the spot standard of the existing libs", () => {
    for (const s of SPONSOR_SPOTS) expect(spotStatusLabel(s)).toBe(SPOT_STATUS_LABEL[s.status]);
    expect(SPOT_STANDARD_TEXT).toBe(PROCESS_STANDARD);
  });

  it("says where the spot runs only as the FAQ already states it", () => {
    const faq = SPONSOR_FAQ.find((f) => f.id === "spot-dove")!.a;
    expect(faq).toContain("LED wall a bordo campo a Colico");
    expect(faq).not.toMatch(/vetrina/i);
    expect(SPOT_WHERE.map((w) => w.id)).toEqual(["ledwall"]);
    expect(SPOT_WHERE[0]!.text).toContain("LED wall a bordo campo a Colico");
    expect(SPOT_WHERE.some((w) => /vetrina|pagina iniziale/i.test(w.text))).toBe(false);
    for (const status of ["DA_APPROVARE", "IN_ONDA", "APPROVATO"] as const) {
      expect(spotAirNote({ slug: "carcano", status })).not.toMatch(/due posti/);
    }
  });

  it("air note follows the home / LED wall rule (never 'in rotation' with changes requested)", () => {
    expect(spotAirNote({ slug: "carcano", status: "DA_APPROVARE" })).toMatch(/già in rotazione/);
    expect(spotAirNote({ slug: "carcano", status: "IN_ONDA" })).toMatch(/in rotazione/);
    expect(spotAirNote({ slug: "carcano", status: "APPROVATO" })).toMatch(/in rotazione/);
    const changes = spotAirNote({ slug: "carcano", status: "MODIFICHE_RICHIESTE" });
    expect(changes).toMatch(/non va in onda/);
    expect(changes).not.toMatch(/in rotazione/);
  });

  it("validates the answer: approval needs nothing, changes need a short text", () => {
    expect(validateSpotAnswer("approvato")).toBeNull();
    expect(validateSpotAnswer("modifiche", "")).toMatch(/cosa vuoi cambiare/);
    expect(validateSpotAnswer("modifiche", "   ab  ")).toMatch(/cosa vuoi cambiare/);
    expect(validateSpotAnswer("modifiche", "Logo più grande")).toBeNull();
    expect(validateSpotAnswer("modifiche", "x".repeat(MODIFICHE_MAX + 1))).toMatch(/troppo lungo/);
  });

  it("builds clear subjects and messages", () => {
    expect(spotAnswerTopic("carcano", "approvato")).toBe("Spot carcano: approvato");
    expect(spotAnswerTopic("carcano", "modifiche")).toBe("Spot carcano: modifiche richieste");
    expect(spotAnswerMessage(carcano, "approvato", "", SITE)).toBe(
      `Spot carcano: approvato.\nAzienda: Carcano\nPagina dello spot: ${SITE}/spot/carcano`,
    );
    expect(spotAnswerMessage(carcano, "modifiche", "  Logo   più\n grande ", SITE)).toBe(
      `Spot carcano: modifiche richieste — Logo più grande\nAzienda: Carcano\nPagina dello spot: ${SITE}/spot/carcano`,
    );
  });

  it("the message fits the existing proposal path (partnerLeadSchema) and its e-mail fallback", () => {
    const longest = SPONSOR_SPOTS.reduce<SponsorSpot>((a, b) => (b.sponsorName.length > a.sponsorName.length ? b : a), carcano);
    const msg = spotAnswerMessage(longest, "modifiche", "x".repeat(MODIFICHE_MAX + 200), SITE);
    expect(msg.length).toBeLessThanOrEqual(PARTNER_MESSAGE_MAX);
    const lead = partnerLeadSchema.parse({
      tipo: "sponsor",
      azienda: longest.sponsorName,
      referente: "Mario Rossi",
      email: "mario@example.org",
      telefono: "0341 000000",
      settore: "Altro",
      interessi: ["ledwall"],
      messaggio: msg,
      privacy: true,
    });
    expect(lead.messaggio).toBe(msg);
    // "ledwall" is a known requestable package of the same form.
    expect(packageById("ledwall")).toBeDefined();
    expect(requestablePackages().some((p) => p.id === "ledwall")).toBe(true);
    const mail = new URL(mailtoFor("partner", { topic: spotAnswerTopic(carcano.slug, "approvato"), body: spotAnswerMessage(carcano, "approvato", "", SITE) }));
    expect(mail.searchParams.get("subject")).toBe("Partnership · Spot carcano: approvato");
    expect(mail.searchParams.get("body")).toContain("Azienda: Carcano");
  });

  it("never claims an automatic status change", () => {
    expect(SPOT_ANSWER_RECEIVED).toBe("Ricevuto: il club aggiorna lo stato dopo aver letto la risposta.");
    expect(SPOT_ANSWER_AFTER_MAIL).toMatch(/il club aggiorna lo stato dopo aver letto la risposta/);
    expect(SPOT_ANSWER_LABEL).toEqual({ approvato: "Approvo lo spot", modifiche: "Chiedo modifiche" });
  });

  it("share text and WhatsApp link: facts only, no recipient, official link", () => {
    const text = spotReviewShareText(carcano);
    expect(text).toContain("Carcano");
    expect(text).not.toMatch(/€|\d{2,}|gratis|incredibil|straordinari/i);
    const wa = spotReviewWhatsapp(carcano, SITE);
    expect(wa.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(wa.slice("https://wa.me/?text=".length))).toBe(`${text} ${SITE}/spot/carcano`);
  });

  it("head is always noindex, nofollow, also for an unknown slug", () => {
    for (const meta of [spotReviewMeta(carcano), spotReviewMeta(undefined)]) {
      expect(meta).toContainEqual({ name: "robots", content: "noindex, nofollow" });
    }
    expect(spotReviewMeta(carcano)).toContainEqual({ title: "Spot LED di Carcano — S.C.D. ColicoDerviese" });
  });
});

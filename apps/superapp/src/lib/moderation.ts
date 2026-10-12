/**
 * Moderatore automatico, parte pura (r87): il prompt con le regole della società e quelle esterne, e la lettura
 * del verdetto. Le regole deterministiche (nomi dei minori, dati di contatto, link, risultati dell'attività di base,
 * parole offensive) vivono nel database (scd_auto_rules) e non si possono aggirare dal browser: qui c'è il secondo
 * livello, il giudizio sul senso del testo.
 */

export type AutoVerdict = "ALLOW" | "REVIEW" | "BLOCK";

export interface ModerationResult {
  verdict: AutoVerdict;
  reason: string;
  engine: "ai" | "trust" | "rules";
  categories: string[];
}

export const MODERATION_CATEGORIES = [
  "MINORE",
  "ODIO_DISCRIMINAZIONE",
  "OFFESE_MINACCE",
  "DATI_PERSONALI",
  "VIOLENZA",
  "SESSUALE",
  "SCOMMESSE",
  "SPAM_PUBBLICITA",
  "RISULTATO_ATTIVITA_BASE",
  "FALSO_DIFFAMAZIONE",
  "FUORI_TEMA",
] as const;

/** The rulebook the AI judges against: SCD code of conduct, FIGC/SGS rules, Italian and EU law, platform norms. */
export const MODERATION_RULES = `Sei il moderatore automatico della S.C.D. ColicoDerviese, società di calcio dilettantistico (Colico e Dervio, Lombardia) con settore giovanile. Giudichi un post scritto da un tesserato (staff, atleta o genitore) per il feed pubblico dell'app, letto anche da bambini e famiglie.

Regole (in ordine di importanza):
1. Minori. Nessun nome e cognome di ragazzi, nessun dato che li renda identificabili (classe, scuola, indirizzo, orari personali), nessun commento sul corpo o sulle prestazioni individuali di un minore in tono negativo. Codice di condotta SCD e Modello organizzativo safeguarding (D.Lgs. 39/2021), GDPR art. 8, Codice privacy art. 2-quinquies.
2. Rispetto. Niente insulti, minacce, bullismo, discriminazione per origine, religione, genere, orientamento, disabilità (art. 604-bis c.p., Carta dei principi FIGC, regolamento UEFA/FIFA contro le discriminazioni). Niente attacchi ad arbitri, avversari, dirigenti o altre società.
3. Dati personali di chiunque: numeri di telefono, e-mail, targhe, documenti, indirizzi di casa. Codice fiscale e IBAN: sempre BLOCK.
4. Attività di base (Piccoli Amici, Primi Calci, Pulcini, Esordienti): i risultati e le classifiche non si pubblicano (Comunicato Ufficiale SGS n.2 2026/27). "Abbiamo vinto 5-2" è BLOCK; "bella partita, tanti gol" va bene.
5. Niente scommesse, quote, pronostici a premio, alcol o fumo rivolti a giovani, contenuti sessuali o violenti, vendita o pubblicità personale non autorizzata.
6. Niente affermazioni false o diffamatorie su persone reali; niente notizie non verificate presentate come ufficiali.
7. Resta nel tema: calcio, squadra, società, territorio, eventi, scuola calcio. Politica e temi divisivi non c'entrano.
8. Lingua anche colorita ma affettuosa ("forza ragazzi", "che partita!") va bene. Ironia innocua va bene.

Verdetti:
- ALLOW: rispetta tutto.
- REVIEW: dubbio ragionevole (ironia ambigua, possibile dato personale, tono borderline, link non chiaro): lo vede una persona.
- BLOCK: viola chiaramente una regola.

Rispondi SOLO con JSON: {"verdict":"ALLOW|REVIEW|BLOCK","reason":"una frase in italiano, max 160 caratteri, senza ripetere il contenuto","categories":["..."]}. Le categorie ammesse sono: ${MODERATION_CATEGORIES.join(", ")}.`;

export function moderationUserMessage(input: {
  channelLabel: string;
  baseActivity: boolean;
  authorKind: string;
  title: string | null;
  body: string;
}): string {
  return [
    `Canale: ${input.channelLabel}${input.baseActivity ? " (attività di base: niente risultati)" : ""}`,
    `Autore: ${input.authorKind === "ATHLETE" ? "atleta" : input.authorKind === "FAMILY" ? "genitore" : "staff"}`,
    input.title ? `Titolo: ${input.title}` : null,
    "Testo:",
    input.body,
  ]
    .filter((x): x is string => !!x)
    .join("\n");
}

/** Reads the model's answer strictly; anything unreadable becomes REVIEW (a person looks), never ALLOW. */
export function parseModerationAnswer(raw: string): ModerationResult {
  const fallback: ModerationResult = {
    verdict: "REVIEW",
    reason: "Risposta del moderatore non leggibile.",
    engine: "ai",
    categories: [],
  };
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return fallback;
  let v: unknown;
  try {
    v = JSON.parse(m[0]);
  } catch {
    return fallback;
  }
  if (!v || typeof v !== "object") return fallback;
  const o = v as Record<string, unknown>;
  const verdict =
    typeof o["verdict"] === "string" ? o["verdict"].toUpperCase() : "";
  if (verdict !== "ALLOW" && verdict !== "REVIEW" && verdict !== "BLOCK")
    return fallback;
  const reason =
    typeof o["reason"] === "string" ? o["reason"].trim().slice(0, 200) : "";
  const categories = Array.isArray(o["categories"])
    ? o["categories"].filter(
        (c): c is string =>
          typeof c === "string" &&
          (MODERATION_CATEGORIES as readonly string[]).includes(c),
      )
    : [];
  return {
    verdict: verdict as AutoVerdict,
    reason:
      reason ||
      (verdict === "ALLOW" ? "Nessuna regola violata." : "Da controllare."),
    engine: "ai",
    categories,
  };
}

/** Without AI: a trusted author (approved posts, no rejection in 90 days) publishes; a new one goes to a person once. */
export function trustVerdict(trusted: boolean): ModerationResult {
  return trusted
    ? {
        verdict: "ALLOW",
        reason: "Autore affidabile: post precedenti approvati.",
        engine: "trust",
        categories: [],
      }
    : {
        verdict: "REVIEW",
        reason: "Primo post dell'autore: lo vede una persona.",
        engine: "trust",
        categories: [],
      };
}

export const REPORT_REASONS = [
  "MINORE",
  "OFFESA",
  "DATI_PERSONALI",
  "FALSO",
  "ALTRO",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_LABEL: Readonly<Record<ReportReason, string>> = {
  MINORE: "C'è un minore riconoscibile o il suo nome",
  OFFESA: "Offese, minacce o discriminazione",
  DATI_PERSONALI: "Dati personali di qualcuno",
  FALSO: "Notizia falsa o diffamazione",
  ALTRO: "Altro",
};

/** Plain Italian for the automatic reasons stored by the database rules. */
export const RULE_REASON_LABEL: Readonly<Record<string, string>> = {
  NOME_MINORE: "nome di un minore della società",
  LINGUAGGIO: "linguaggio offensivo",
  RISULTATO_ATTIVITA_BASE: "risultato di una gara dell'attività di base",
  DATI_CONTATTO: "telefono o e-mail nel testo",
  LINK_ESTERNO: "link fuori dai canali ufficiali",
};

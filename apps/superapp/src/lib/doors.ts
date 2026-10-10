/**
 * Ingresso unico della Super App SCD.
 *
 * Quattro porte, una sola base. Le porte visibili dipendono dal profilo che R20
 * restituisce dopo il login (`auth.login` + `auth.identity.resolve`). Questa
 * mappa riusa le regole già in uso nel server della PWA (`sponsorRoleKey`) e i
 * ruoli del manifest (`identity_and_access.roles`): non introduce ruoli nuovi.
 *
 * Il controllo qui serve solo a decidere cosa MOSTRARE. Ogni lettura di dati
 * passa comunque dal token di sessione e R20 verifica il permesso lato server.
 */

export type DoorId = "pubblico" | "famiglie" | "direzione" | "commerciale";

/** Stato reale di un modulo: niente "fatto" se non funziona davvero. */
export type ModuleStatus = "attivo" | "in-arrivo" | "bloccato";

export type DoorModule = {
  id: string;
  nome: string;
  testo: string;
  status: ModuleStatus;
  /** Dove si apre, se è già attivo. */
  to?: string;
  /** Da dove arriva il modulo (progetto o fonte), per chi legge. */
  origine: string;
};

export type Door = {
  id: DoorId;
  nome: string;
  era: string;
  testo: string;
  /** Pagina dell'area riservata collegata (`/aree/$area`), assente per il Pubblico. */
  area?: "famiglia" | "staff" | "direzione" | "commerciale";
  moduli: DoorModule[];
};

export const DOORS: readonly Door[] = [
  {
    id: "pubblico",
    nome: "Pubblico",
    era: "era SCD ONE",
    testo: "Quello che vede chiunque: calendario, allenamenti, eventi e la società.",
    moduli: [
      { id: "calendario", nome: "Calendario gare", testo: "Tutte le gare 2026/27 per annata.", status: "attivo", to: "/calendario", origine: "Master calendario" },
      { id: "allenamenti", nome: "Allenamenti", testo: "Orari, campi e spogliatoi della settimana.", status: "attivo", to: "/allenamenti", origine: "Quadro allenamenti" },
      { id: "eventi", nome: "Eventi e news", testo: "Appuntamenti e notizie della società.", status: "attivo", to: "/eventi", origine: "R20" },
      { id: "crovi", nome: "CROVI", testo: "L'assistente che risponde su orari, campi e procedure.", status: "attivo", to: "/", origine: "Assistente SCD" },
      { id: "sponsor-pubblico", nome: "Sponsor e partner", testo: "Chi sostiene la società e come diventare partner.", status: "attivo", to: "/sponsor", origine: "SCD GROW" },
    ],
  },
  {
    id: "famiglie",
    nome: "Famiglie",
    era: "area privata di ONE",
    testo: "Genitori e atleti: solo i dati della propria famiglia.",
    area: "famiglia",
    moduli: [
      { id: "riepilogo", nome: "Il mio riepilogo", testo: "Indicatori del profilo dal gestionale.", status: "attivo", to: "/aree/famiglia", origine: "R20 · dashboard" },
      { id: "allenamenti-miei", nome: "Allenamenti della mia squadra", testo: "Le sedute della propria annata.", status: "attivo", to: "/aree/famiglia", origine: "R20 · training" },
      { id: "quote", nome: "Quote e pagamenti", testo: "Rate, ricevute e scadenze.", status: "in-arrivo", origine: "Gestionale P05" },
      { id: "convocazioni", nome: "Convocazioni", testo: "Chiamate e trasferte confermate.", status: "in-arrivo", origine: "Gestionale P05" },
      { id: "pulmini", nome: "Pulmini", testo: "Posto, orario e autista.", status: "bloccato", origine: "Capienze mezzi da confermare" },
      { id: "documenti", nome: "Documenti", testo: "Certificati e moduli, solo dopo consenso.", status: "in-arrivo", origine: "Supabase SCD PULSE" },
    ],
  },
  {
    id: "direzione",
    nome: "Direzione e staff",
    era: "era SCD CORE",
    testo: "Chi gestisce la società: campi, calendari, urgenze e persone.",
    area: "staff",
    moduli: [
      { id: "impianti", nome: "Impianti e calendari", testo: "Quadro allenamenti, calendario annuale, rotazione, impianti, Dervio e pulmini. Fotografia dei master, sola lettura.", status: "attivo", to: "/aree/staff", origine: "Command Center" },
      { id: "oggi", nome: "Oggi e Attenzione", testo: "Le cose da fare oggi, in ordine di urgenza.", status: "in-arrivo", origine: "SCD CORE · proposta #138" },
      { id: "email", nome: "Email smistate", testo: "Il presidio orario etichetta la posta; il riepilogo arriverà qui.", status: "in-arrivo", origine: "Presidio posta SCD" },
      { id: "organigramma", nome: "Organigramma", testo: "Dirigenza, responsabili e staff della stagione.", status: "in-arrivo", origine: "Organigramma 2026/27" },
      { id: "moderazione", nome: "Moderazione", testo: "Contenuti in attesa di approvazione. Il safeguarding resta separato.", status: "in-arrivo", origine: "R20 · da attivare" },
    ],
  },
  {
    id: "commerciale",
    nome: "Commerciale",
    era: "era SCD GROW",
    testo: "Sponsor e partner: contratti, rinnovi, listino e proposte.",
    area: "commerciale",
    moduli: [
      { id: "pipeline", nome: "Pipeline sponsor", testo: "Lead e trattative per fase.", status: "in-arrivo", to: "/aree/commerciale", origine: "R20 · da attivare" },
      { id: "rinnovi", nome: "Contratti e rinnovi", testo: "Scadenze dei contratti 2025/26 e rinnovi da chiudere.", status: "in-arrivo", origine: "Master Sponsor Intelligence" },
      { id: "listino", nome: "Listino a fasce", testo: "Pacchetti e prezzi 2026/27.", status: "in-arrivo", origine: "P02 Sponsor e commerciale" },
      { id: "dossier", nome: "Dossier e lettere", testo: "Proposte pronte, inviate solo dopo approvazione.", status: "in-arrivo", origine: "P02 Sponsor e commerciale" },
    ],
  },
];

/** Profilo normalizzato restituito dal login. Nessun dato personale oltre al nome. */
export type AccessProfile = {
  name: string;
  role: string;
  personType: string;
  email: string;
};

const STAFF_ROLES = new Set(["STAFF", "MISTER", "MANAGER", "SECRETARIAT", "REGISTRATION", "TOURNAMENTS", "DIRECTION", "ADMIN"]);
const FAMILY_ROLES = new Set(["FAMILY", "ATHLETE", "USER_BASE"]);

function norm(v: string): string {
  return v.trim().toUpperCase();
}

/** Stessa regola della PWA esistente (server.js · sponsorRoleKey). */
export function isDirection(p: AccessProfile): boolean {
  const role = norm(p.role);
  const type = norm(p.personType);
  return (
    p.email.trim().toLowerCase() === "sportclubcolico@gmail.com" ||
    role === "DG" ||
    role === "DIREZIONE" ||
    role === "DIRECTION" ||
    role === "ADMIN" ||
    type === "DIREZIONE"
  );
}

export function isCommercial(p: AccessProfile): boolean {
  return isDirection(p) || /COMMERCIAL|COMMERCIALE|SPONSOR|PARTNER|MARKETING|ACCOUNT/.test(`${norm(p.role)} ${norm(p.personType)}`);
}

export function isStaff(p: AccessProfile): boolean {
  return isDirection(p) || STAFF_ROLES.has(norm(p.role)) || /STAFF|MISTER|ALLENATORE|DIRIGENTE|SEGRETERIA/.test(norm(p.personType));
}

export function isFamily(p: AccessProfile): boolean {
  return FAMILY_ROLES.has(norm(p.role)) || /FAMIGLIA|GENITORE|ATLETA|FAMILY|ATHLETE/.test(norm(p.personType));
}

/** Porte aperte per un profilo. Il Pubblico è sempre aperto. */
export function doorsFor(p: AccessProfile | null): DoorId[] {
  const open: DoorId[] = ["pubblico"];
  if (!p) return open;
  if (isFamily(p) || isStaff(p)) open.push("famiglie");
  if (isStaff(p)) open.push("direzione");
  if (isCommercial(p)) open.push("commerciale");
  return open;
}

/** L'area riservata `/aree/$area` è consentita a questo profilo? */
export function areaAllowed(area: string, p: AccessProfile | null): boolean {
  if (!p) return false;
  const doors = doorsFor(p);
  if (area === "famiglia" || area === "atleta") return doors.includes("famiglie");
  if (area === "staff") return doors.includes("direzione");
  if (area === "direzione") return isDirection(p);
  if (area === "commerciale") return doors.includes("commerciale");
  return false;
}

export function countByStatus(): Record<ModuleStatus, number> {
  const out: Record<ModuleStatus, number> = { attivo: 0, "in-arrivo": 0, bloccato: 0 };
  for (const d of DOORS) for (const m of d.moduli) out[m.status] += 1;
  return out;
}

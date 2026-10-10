/** Modello dati client-safe dell'ecosistema SCD. Nessun dato demo qui dentro. */

export type Audience = "public" | "famiglia" | "atleta" | "staff" | "direzione";

/** P1 emergenze … P7 community. */
export type PriorityLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ClubLogo = {
  url: string | null;
  /** true solo se lo stemma arriva dal DB CLUBS verificato. */
  verified: boolean;
  source: "db" | "favicon" | "none";
};

export type Club = {
  id: string;
  nome: string;
  citta?: string | undefined;
  sito?: string | undefined;
  social?: string | undefined;
  maps?: string | undefined;
  logo: ClubLogo;
};

export type Match = {
  id: string;
  competizione: string;
  squadra: string;
  casa: string;
  ospite: string;
  avversario?: Club | undefined;
  startAt: string | null;
  dataLabel: string;
  campo?: string | undefined;
  golCasa?: number | null | undefined;
  golOspite?: number | null | undefined;
  /** Public, club-verified match-center data only; absence must not imply zero. */
  stats?: {
    classifica?: string | undefined;
    forma?: string | undefined;
    precedenti?: string | undefined;
    live?: boolean | undefined;
    ingressoUrl?: string | undefined;
  } | undefined;
};

export type FeedKind = "alert" | "match" | "result" | "event" | "news" | "sponsor" | "community";

export type FeedItem = {
  id: string;
  kind: FeedKind;
  title: string;
  body?: string | undefined;
  image?: string | undefined;
  link?: string | undefined;
  source?: string | undefined;
  priority: PriorityLevel;
  priorityScore: number;
  startAt: string | null;
  endAt: string | null;
  pinned: boolean;
  audience: Audience[];
  match?: Match | undefined;
  venue?: string | undefined;
  category?: string | undefined;
};

export type SyncState = "live" | "syncing";

export type PublicFeed = {
  state: SyncState;
  items: FeedItem[];
  nextMatch: Match | null;
  lastResult: Match | null;
  syncedAt: string;
  note: string | null;
};

export type RequestStatus = "ricevuta" | "da_contattare" | "invitato" | "completata";

export type CrmStage =
  | "NUOVO_LEAD"
  | "CONTATTATO"
  | "INTERESSATO"
  | "PROPOSTA_INVIATA"
  | "NEGOZIAZIONE"
  | "CHIUSO"
  | "PERSO";

export type TicketStatus = "aperto" | "in_lavorazione" | "chiuso";

/** Esito invio: dice sempre la verità su dove è finita la richiesta. */
export type SubmitOutcome = {
  ok: boolean;
  delivered: boolean;
  reference: string | null;
  status: string;
  message: string;
};

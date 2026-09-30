export type MatchData = Readonly<{
  date: string;
  time: string;
  opponent: string;
  location: string;
  team: string;
}>;

export type WeekEvent = Readonly<{
  date: string;
  time: string;
  title: string;
  team: string;
  opponent?: string;
  venue?: string;
  type: string;
}>;

export type NewsCard = Readonly<{
  category: string;
  title: string;
  dek: string;
  body: string;
  evidence: unknown[];
}>;

export type MobilePublicDashboard = Readonly<{
  nextMatch: MatchData | null;
  week: WeekEvent[];
  news: NewsCard[];
}>;

const API_BASE =
  process.env.EXPO_PUBLIC_SCD_API_BASE ??
  'https://scd-colicoderviese-official-r21.onrender.com';

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function pick(obj: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  for (const key of keys) {
    const v = obj?.[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return '';
}

function normalizeMatch(feed: Record<string, unknown>): MatchData | null {
  const raw = (feed.nextMatch ?? feed.next_match ?? null) as Record<string, unknown> | null;
  if (!raw) return null;
  const opponent = pick(raw, 'opponentName', 'opponent', 'avversario', 'title');
  const date = pick(raw, 'date', 'data');
  const time = pick(raw, 'time', 'ora');
  const location = pick(raw, 'venue', 'luogo', 'field');
  const team = pick(raw, 'team', 'teamName', 'squadra') || 'SCD ColicoDerviese';
  if (!opponent && !date && !time) return null;
  return Object.freeze({
    date: date || 'Data in aggiornamento',
    time: time || '',
    opponent: opponent || 'Avversario in aggiornamento',
    location: location || 'Luogo in aggiornamento',
    team
  });
}

function normalizeWeek(newsroom: Record<string, unknown>): WeekEvent[] {
  const calendar = newsroom.calendar as Record<string, unknown> | undefined;
  const rows = Array.isArray(calendar?.rows) ? calendar?.rows : [];
  return rows.map((row) => {
    const r = (row ?? {}) as Record<string, unknown>;
    return Object.freeze({
      date: pick(r, 'date', 'data'),
      time: pick(r, 'time', 'ora'),
      title: pick(r, 'title', 'event', 'name') || 'Attività SCD',
      team: pick(r, 'team', 'teamName', 'squadra') || 'SCD',
      opponent: pick(r, 'opponentName', 'opponent', 'avversario') || undefined,
      venue: pick(r, 'venue', 'luogo', 'field') || undefined,
      type: pick(r, 'type', 'kind', 'category') || 'ATTIVITÀ'
    });
  });
}

function normalizeNews(newsroom: Record<string, unknown>): NewsCard[] {
  const cards = Array.isArray(newsroom.cards) ? newsroom.cards : [];
  return cards.map((card) => {
    const c = (card ?? {}) as Record<string, unknown>;
    return Object.freeze({
      category: pick(c, 'category') || 'SCD NEWSROOM AI',
      title: pick(c, 'title') || 'Sintesi settimanale',
      dek: pick(c, 'dek'),
      body: pick(c, 'body'),
      evidence: Array.isArray(c.evidence) ? c.evidence : []
    });
  });
}

async function getJson(path: string): Promise<Record<string, unknown>> {
  const response = await fetch(API_BASE + path, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('Fonte SCD non disponibile (' + response.status + ')');
  const json = await response.json();
  if (!json || typeof json !== 'object') throw new Error('Risposta SCD non valida');
  return json as Record<string, unknown>;
}

export async function loadMobilePublicDashboard(): Promise<MobilePublicDashboard> {
  const [publicFeed, newsroom] = await Promise.all([
    getJson('/api/public'),
    getJson('/api/newsroom')
  ]);

  const feed =
    (publicFeed.data && typeof publicFeed.data === 'object'
      ? publicFeed.data
      : publicFeed) as Record<string, unknown>;

  return Object.freeze({
    nextMatch: normalizeMatch(feed),
    week: normalizeWeek(newsroom),
    news: normalizeNews(newsroom)
  });
}

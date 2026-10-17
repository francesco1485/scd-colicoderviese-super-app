/**
 * Club House, Convenzioni and Tessere register on the server (migration r115, STAGED until "applica r115").
 *
 * Every read and write goes through the caller's own Supabase session (publishable key + request cookies): the
 * SECURITY DEFINER functions of r115 check roles and positions themselves, nothing here trusts the browser. Fail closed:
 * function missing on the database = "not-applied" (the editor says why and stays closed; the public pages say
 * "da confermare"); any other failure = "unavailable". Only error codes are logged, never messages or details.
 * The public read (published rows inside their validity) is anonymous and cached for one minute.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import {
  CATALOG_DENIED,
  CATALOG_FAILED,
  CATALOG_NO_SESSION,
  CATALOG_NOT_APPLIED,
  CATALOG_PLATFORMS,
  CATALOG_STATUSES,
  CATALOG_KINDS,
  CATALOG_SITES,
  CATALOG_WRITE_MESSAGES,
  catalogWritablePlatforms,
  isCatalogWriteCode,
  parseCatalogEntries,
  validateCatalogDraft,
  type CatalogEntry,
  type CatalogPlatform,
  type CatalogWriteOutcome,
  type CatalogWriteState,
} from "./club-catalog";
import { CLUB_CARD_IDS } from "./club-cards";
import { machineMissing } from "./request-machine.functions";
import { serverSupabase } from "./supabase.server";

const ORG_SLUG = "scd-colicoderviese";

type DbError = { code?: string | null; message?: string | null } | null | undefined;
const missing = (e: NonNullable<DbError>) => machineMissing({ code: e.code ?? undefined, message: e.message ?? "" } as Parameters<typeof machineMissing>[0]);

export interface CatalogDeskPlatform {
  platform: CatalogPlatform;
  state: CatalogWriteState;
  /** Null when not read (state other than "on"): unknown, never an empty list. */
  entries: CatalogEntry[] | null;
}

export interface CatalogDesk {
  platforms: CatalogDeskPlatform[];
}

const platformsSchema = z.object({ platforms: z.array(z.enum(CATALOG_PLATFORMS)).min(1).max(3) });

/** Club organization of the caller: the first where the session rule makes them a writer of a platform, else the first. */
function pickOrg(memberships: ReadonlyArray<{ organizationId: string; role: string }>, positions: ReadonlySet<string>) {
  const orgs = [...new Set(memberships.map((m) => m.organizationId))];
  const id = orgs.find((o) => catalogWritablePlatforms(memberships.filter((m) => m.organizationId === o).map((m) => m.role), positions).length > 0);
  return id ?? orgs[0] ?? null;
}

/** Editors of the asked platforms, with every row (drafts included) for the platforms the database lets the caller write. */
export const getClubCatalogDesk = createServerFn({ method: "GET" })
  .inputValidator((d: { platforms: CatalogPlatform[] }) => platformsSchema.parse(d))
  .handler(async ({ data }): Promise<CatalogDesk> => {
    const off = (state: CatalogWriteState): CatalogDesk => ({ platforms: data.platforms.map((platform) => ({ platform, state, entries: null })) });
    const s = await sessionView();
    if (!s.configured || !s.user) return off("off");
    const positions = new Set(s.roles);
    const org = pickOrg(s.memberships, positions);
    const sb = org ? serverSupabase() : null;
    if (!sb || !org) return off("off");
    const sessionWriter = new Set(catalogWritablePlatforms(s.memberships.filter((m) => m.organizationId === org).map((m) => m.role), positions));

    const access = await sb.rpc("scd_club_catalog_access", { p_organization_id: org });
    if (access.error) {
      const state: CatalogWriteState = missing(access.error) ? "not-applied" : "unavailable";
      if (state === "unavailable") console.warn(`[club-catalog] access non riuscita: codice ${access.error.code || "unknown"}`);
      // Only writers by session learn why; everybody else simply has no editor.
      return { platforms: data.platforms.map((platform) => ({ platform, state: sessionWriter.has(platform) ? state : "off", entries: null })) };
    }
    const raw = (access.data as { platforms?: unknown } | null)?.platforms;
    const allowed = new Set(Array.isArray(raw) ? raw.filter((p): p is CatalogPlatform => (CATALOG_PLATFORMS as readonly unknown[]).includes(p)) : []);

    const platforms = await Promise.all(
      data.platforms.map(async (platform): Promise<CatalogDeskPlatform> => {
        if (!allowed.has(platform)) return { platform, state: "off", entries: null };
        const list = await sb.rpc("scd_club_catalog_list", { p_organization_id: org, p_platform: platform });
        if (list.error) {
          if (!missing(list.error)) console.warn(`[club-catalog] list ${platform} non riuscita: codice ${list.error.code || "unknown"}`);
          return { platform, state: missing(list.error) ? "not-applied" : "unavailable", entries: null };
        }
        const entries = parseCatalogEntries(list.data);
        if (entries === null) {
          console.warn(`[club-catalog] list ${platform}: risposta non valida`);
          return { platform, state: "unavailable", entries: null };
        }
        return { platform, state: "on", entries };
      }),
    );
    return { platforms };
  });

const draftSchema = z.object({
  kind: z.enum(CATALOG_KINDS),
  site: z.enum(CATALOG_SITES).nullable(),
  category: z.string().max(30).nullable(),
  title: z.string().max(200),
  body: z.string().max(1200),
  howTo: z.string().max(600),
  cards: z.array(z.enum(CLUB_CARD_IDS as unknown as [string, ...string[]])).max(3),
  linkUrl: z.string().max(600),
  price: z.string().max(20),
  days: z.string().max(120),
  opens: z.string().max(5),
  closes: z.string().max(5),
  validFrom: z.string().max(10),
  validUntil: z.string().max(10),
  status: z.enum(CATALOG_STATUSES),
  sort: z.number().int().min(0).max(9999),
});

const saveSchema = z.object({
  platform: z.enum(CATALOG_PLATFORMS),
  id: z.string().uuid().nullable(),
  draft: draftSchema,
});

/** Outcome of scd_club_catalog_save in plain words. */
export function catalogWriteOutcome(data: unknown, error: DbError): CatalogWriteOutcome {
  if (error) {
    if (missing(error)) return { ok: false, message: CATALOG_NOT_APPLIED };
    if (error.code === "42501") return { ok: false, message: CATALOG_DENIED };
    console.warn(`[club-catalog] salvataggio non riuscito: codice ${error.code || "unknown"}`);
    return { ok: false, message: CATALOG_FAILED };
  }
  const r = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  if (r["ok"] !== true) {
    const code = r["code"];
    return { ok: false, message: isCatalogWriteCode(code) ? CATALOG_WRITE_MESSAGES[code] : CATALOG_FAILED };
  }
  if (r["unchanged"] === true) return { ok: true, message: "Nessuna modifica da salvare." };
  return { ok: true, message: "Salvato." };
}

export const saveClubCatalogEntry = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof saveSchema>) => saveSchema.parse(d))
  .handler(async ({ data }): Promise<CatalogWriteOutcome> => {
    const s = await sessionView();
    if (!s.configured || !s.user) return { ok: false, message: CATALOG_NO_SESSION };
    const org = pickOrg(s.memberships, new Set(s.roles));
    const sb = org ? serverSupabase() : null;
    if (!sb || !org) return { ok: false, message: CATALOG_NO_SESSION };
    const checked = validateCatalogDraft(data.platform, data.draft as Parameters<typeof validateCatalogDraft>[1]);
    if (!checked.ok) return { ok: false, message: CATALOG_WRITE_MESSAGES[checked.code] };
    const res = await sb.rpc("scd_club_catalog_save", { p_organization_id: org, p_id: data.id, p_entry: checked.value });
    return catalogWriteOutcome(res.data, res.error);
  });

/* ------------------------------------------------------------------------------------------------ public read */

export interface PublicClubCatalog {
  /** False when the register is not readable (r115 not applied, keys missing, failure): pages say "da confermare". */
  ready: boolean;
  entries: CatalogEntry[];
}

const PUBLIC_TTL_OK = 60_000;
const PUBLIC_TTL_FAIL = 15_000;
let cache: { value: PublicClubCatalog; expiresAt: number } | null = null;

async function loadPublic(): Promise<PublicClubCatalog> {
  const sb = serverSupabase();
  if (!sb) return { ready: false, entries: [] };
  const { data, error } = await sb.rpc("scd_public_club_catalog", { p_org_slug: ORG_SLUG });
  if (error) {
    if (!missing(error)) console.warn(`[club-catalog] lettura pubblica non riuscita: codice ${error.code || "unknown"}`);
    return { ready: false, entries: [] };
  }
  const entries = parseCatalogEntries(data, { publicRead: true });
  return entries === null ? { ready: false, entries: [] } : { ready: true, entries };
}

export const getPublicClubCatalog = createServerFn({ method: "GET" }).handler(async (): Promise<PublicClubCatalog> => {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;
  const value = await loadPublic().catch(() => ({ ready: false, entries: [] }));
  cache = { value, expiresAt: now + (value.ready ? PUBLIC_TTL_OK : PUBLIC_TTL_FAIL) };
  return value;
});

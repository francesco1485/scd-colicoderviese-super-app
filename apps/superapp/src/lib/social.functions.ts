/**
 * Social structure on the server (r86). The public feed is read by anyone through scd_public_feed (approved posts only);
 * following, reacting, writing and approving go through database functions that check the membership and the role.
 * Nothing here trusts the browser for permissions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import {
  CHANNEL_RE,
  parseCounts,
  parseFollows,
  parsePosts,
  postError,
  POST_KINDS,
  type Post,
} from "./social";
import { serverSupabase } from "./supabase.server";

const ORG_SLUG = "scd-colicoderviese";

async function context() {
  const s = await sessionView();
  const org = s.memberships[0] ?? null;
  return {
    session: s,
    org,
    sb: s.configured && s.user ? serverSupabase() : null,
  };
}

export interface PublicSocial {
  posts: Post[];
  counts: Record<string, number>;
  /** The caller's follows (empty when signed out). */
  follows: string[];
  signedIn: boolean;
  /** True when the caller may write a post (any staff membership). */
  canPost: boolean;
  /** True for the content office (publishes directly, approves the queue). */
  office: boolean;
}

const EMPTY: PublicSocial = {
  posts: [],
  counts: {},
  follows: [],
  signedIn: false,
  canPost: false,
  office: false,
};

const OFFICE_ROLES = new Set(["DIRECTION", "SECRETARIAT"]);
const AUTHOR_ROLES = new Set([
  "DIRECTION",
  "SECRETARIAT",
  "REGISTRATION",
  "MANAGER",
  "MISTER",
  "STAFF",
  "TOURNAMENTS",
]);

/** Feed, follower counts and the caller's own follows. Works signed out (public part only). */
export const getPublicSocial = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicSocial> => {
    const sb = serverSupabase();
    if (!sb) return EMPTY;
    const s = await sessionView();
    const org = s.memberships[0] ?? null;
    const [feed, counts, follows] = await Promise.all([
      sb.rpc("scd_public_feed", { p_org_slug: ORG_SLUG, p_limit: 40 }),
      sb.rpc("scd_follow_counts", { p_org_slug: ORG_SLUG }),
      org
        ? sb.rpc("scd_my_follows", { p_organization_id: org.organizationId })
        : Promise.resolve({ data: [], error: null }),
    ]);
    const office =
      !!org &&
      (OFFICE_ROLES.has(org.role) ||
        s.roles.includes("direzione") ||
        s.roles.includes("segreteria"));
    return {
      posts: feed.error ? [] : parsePosts(feed.data),
      counts: counts.error ? {} : parseCounts(counts.data),
      follows: follows.error ? [] : parseFollows(follows.data),
      signedIn: !!s.user,
      canPost: !!org && (AUTHOR_ROLES.has(org.role) || office),
      office,
    };
  },
);

/** Approved posts of one channel (team or event page). Public. */
export const getChannelFeed = createServerFn({ method: "GET" })
  .inputValidator((d: { channel: string }) =>
    z.object({ channel: z.string().regex(CHANNEL_RE) }).parse(d),
  )
  .handler(async ({ data }): Promise<Post[]> => {
    const sb = serverSupabase();
    if (!sb) return [];
    const { data: out, error } = await sb.rpc("scd_channel_feed", {
      p_org_slug: ORG_SLUG,
      p_channel: data.channel,
      p_limit: 20,
    });
    return error ? [] : parsePosts(out);
  });

export interface SocialOutcome {
  ok: boolean;
  message: string;
  on?: boolean;
  forza?: number;
  id?: string;
  status?: string;
}

export const setFollow = createServerFn({ method: "POST" })
  .inputValidator((d: { channel: string; on: boolean }) =>
    z
      .object({ channel: z.string().regex(CHANNEL_RE), on: z.boolean() })
      .parse(d),
  )
  .handler(async ({ data }): Promise<SocialOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org)
      return {
        ok: false,
        message: "Iscriviti o entra per seguire squadre ed eventi.",
      };
    const { data: out, error } = await sb.rpc("scd_set_follow", {
      p_organization_id: org.organizationId,
      p_channel: data.channel,
      p_on: data.on,
    });
    if (error) return { ok: false, message: postError(null) };
    const r = (out ?? {}) as { ok?: boolean; code?: string; on?: boolean };
    if (!r.ok) return { ok: false, message: postError(r.code) };
    return {
      ok: true,
      on: r.on === true,
      message: r.on
        ? 'Ora lo segui: lo trovi in "Per te".'
        : "Non lo segui più.",
    };
  });

export const toggleForza = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }): Promise<SocialOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org)
      return { ok: false, message: "Iscriviti o entra per fare il tifo." };
    const { data: out, error } = await sb.rpc("scd_toggle_reaction", {
      p_organization_id: org.organizationId,
      p_post_id: data.id,
    });
    if (error) return { ok: false, message: postError(null) };
    const r = (out ?? {}) as {
      ok?: boolean;
      code?: string;
      on?: boolean;
      forza?: number;
    };
    if (!r.ok) return { ok: false, message: postError(r.code) };
    return {
      ok: true,
      on: r.on === true,
      forza: Number(r.forza ?? 0),
      message: "",
    };
  });

const createSchema = z.object({
  channel: z.string().regex(CHANNEL_RE),
  kind: z.enum(POST_KINDS as [string, ...string[]]),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(1).max(2000),
  mediaUrl: z.string().trim().max(500).optional(),
  liveUrl: z.string().trim().max(500).optional(),
  minorsOk: z.boolean(),
  noNamesOk: z.boolean(),
  noResultOk: z.boolean(),
  baseActivity: z.boolean(),
});

export const createPost = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof createSchema>) => createSchema.parse(d))
  .handler(async ({ data }): Promise<SocialOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org)
      return { ok: false, message: "Entra con il tuo account per pubblicare." };
    const payload = {
      ...data,
      mediaUrl: data.mediaUrl || null,
      liveUrl: data.liveUrl || null,
      title: data.title || null,
    };
    const { data: out, error } = await sb.rpc("scd_create_post", {
      p_organization_id: org.organizationId,
      p_payload: payload,
    });
    if (error) return { ok: false, message: postError(null) };
    const r = (out ?? {}) as {
      ok?: boolean;
      code?: string;
      id?: string;
      status?: string;
    };
    if (!r.ok) return { ok: false, message: postError(r.code) };
    return {
      ok: true,
      message:
        r.status === "APPROVED"
          ? "Pubblicato: è già nel feed."
          : "Inviato alla Direzione: esce nel feed dopo l'ok.",
      ...(r.id ? { id: r.id } : {}),
      ...(r.status ? { status: r.status } : {}),
    };
  });

export const getMyPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<Post[]> => {
    const { org, sb } = await context();
    if (!sb || !org) return [];
    const { data, error } = await sb.rpc("scd_my_posts", {
      p_organization_id: org.organizationId,
    });
    return error ? [] : parsePosts(data);
  },
);

/** The approval queue; null when the caller is not in the content office. */
export const getPostsQueue = createServerFn({ method: "GET" }).handler(
  async (): Promise<Post[] | null> => {
    const { org, sb } = await context();
    if (!sb || !org) return null;
    const { data, error } = await sb.rpc("scd_posts_queue", {
      p_organization_id: org.organizationId,
    });
    if (error || data === null) return null;
    return parsePosts(data);
  },
);

const decideSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED", "ARCHIVED"]),
  note: z.string().trim().max(300).optional(),
});

export const decidePost = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof decideSchema>) => decideSchema.parse(d))
  .handler(async ({ data }): Promise<SocialOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return { ok: false, message: "Accesso non valido." };
    const { data: out, error } = await sb.rpc("scd_decide_post", {
      p_organization_id: org.organizationId,
      p_post_id: data.id,
      p_decision: data.decision,
      p_note: data.note ?? null,
    });
    if (error) return { ok: false, message: postError(null) };
    const r = (out ?? {}) as { ok?: boolean; code?: string; status?: string };
    if (!r.ok) return { ok: false, message: postError(r.code) };
    const msg =
      data.decision === "APPROVED"
        ? "Pubblicato nel feed."
        : data.decision === "REJECTED"
          ? "Non pubblicato: l'autore legge il motivo."
          : "Tolto dal feed.";
    return {
      ok: true,
      message: msg,
      ...(r.status ? { status: r.status } : {}),
    };
  });

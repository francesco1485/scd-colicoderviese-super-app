/**
 * "Crea il tuo campione" on the server (UD-102, members area only, not published).
 *   - getAvatarStudio: session, age band and credits from the database (r97 scd_my_member_profile), cards from the
 *     membership roles. When r97 is not applied yet the page gets a preview mode: age UNKNOWN (treated as minor),
 *     credits 0 with an explanation, saving not active. Nothing is invented.
 *   - saveMyAvatar: validates here, then scd_set_my_avatar re-checks in the database. Never claims a save that did
 *     not happen.
 *   - generateAvatarFromText: only with SCD_AVATAR_GEN_ENABLED=true and Vertex EU credentials; moderation and caps
 *     first; otherwise nothing is sent anywhere.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import {
  AVATAR_GEN_DAILY_CAP,
  AVATAR_GEN_MONTHLY_CAP,
  asAgeBand,
  avatarGenConfig,
  baseByKey,
  buildAvatarPrompt,
  canUseBase,
  capState,
  cardsFromRoles,
  creditsView,
  genDisabledText,
  validateNickname,
  validateShirtNumber,
  type AgeBand,
  type CardKind,
  type CreditsView,
  type GenDisabledReason,
} from "./avatar-studio";
import { serverSupabase } from "./supabase.server";
import { generateImagen } from "./vertex-imagen.server";

export interface SavedAvatar {
  baseKey: string;
  nickname: string;
  shirtNumber: number;
}

export interface AvatarStudioData {
  signedIn: boolean;
  ageBand: AgeBand;
  /** DATABASE when r97 answered; NOT_AVAILABLE when the age could not be read (treated as minor). */
  ageSource: "DATABASE" | "NOT_AVAILABLE";
  cards: { primary: CardKind; held: CardKind[] };
  credits: CreditsView;
  saved: SavedAvatar | null;
  /** ACTIVE when r97 is applied and the save RPC can be used; otherwise the page is a local preview. */
  storage: "ACTIVE" | "NOT_ACTIVE";
  generation: { enabled: boolean; reason: GenDisabledReason | null };
  caps: { daily: number; monthly: number; usedToday: number; usedMonth: number };
}

function orgOf(v: Awaited<ReturnType<typeof sessionView>>): string | null {
  return v.memberships[0]?.organizationId ?? null;
}

export async function loadAvatarStudio(): Promise<AvatarStudioData> {
  const view = await sessionView();
  const gen = avatarGenConfig(process.env);
  const base: AvatarStudioData = {
    signedIn: Boolean(view.user),
    ageBand: "UNKNOWN",
    ageSource: "NOT_AVAILABLE",
    cards: cardsFromRoles(view.memberships.map((m) => m.role)),
    credits: creditsView(null),
    saved: null,
    storage: "NOT_ACTIVE",
    generation: gen.enabled ? { enabled: true, reason: null } : { enabled: false, reason: gen.reason },
    caps: { daily: AVATAR_GEN_DAILY_CAP, monthly: AVATAR_GEN_MONTHLY_CAP, usedToday: 0, usedMonth: 0 },
  };
  if (!view.user) return base;
  const sb = serverSupabase();
  const org = orgOf(view);
  if (!sb || !org) return base;
  const { data, error } = await sb.rpc("scd_my_member_profile", { p_organization_id: org });
  if (error || !data || typeof data !== "object") return base;
  const o = data as Record<string, unknown>;
  const av = o["avatar"] && typeof o["avatar"] === "object" ? (o["avatar"] as Record<string, unknown>) : null;
  const saved: SavedAvatar | null =
    av && typeof av["base_key"] === "string" && typeof av["nickname"] === "string" && typeof av["shirt_number"] === "number"
      ? { baseKey: av["base_key"], nickname: av["nickname"], shirtNumber: av["shirt_number"] }
      : null;
  return {
    ...base,
    ageBand: asAgeBand(o["age_band"]),
    ageSource: "DATABASE",
    credits: creditsView(typeof o["credits_balance"] === "number" ? o["credits_balance"] : null),
    saved,
    storage: "ACTIVE",
    caps: {
      ...base.caps,
      usedToday: typeof o["gen_today"] === "number" ? o["gen_today"] : 0,
      usedMonth: typeof o["gen_month"] === "number" ? o["gen_month"] : 0,
    },
  };
}

export const getAvatarStudio = createServerFn({ method: "GET" }).handler(async (): Promise<AvatarStudioData> => loadAvatarStudio());

export type SaveOutcome =
  | { saved: true; message: string }
  | { saved: false; preview: boolean; message: string };

const SaveInput = z.object({
  baseKey: z.string().min(1).max(40),
  nickname: z.string().max(60),
  shirtNumber: z.number().int(),
});

const SAVE_MESSAGES: Record<string, string> = {
  BACK_VIEW_ONLY: "Per gli under 18 (o se l'età non è verificata) si usano solo basi di spalle.",
  INVALID_BASE: "Base non valida.",
  INVALID_NICKNAME: "Nickname non valido.",
  INVALID_NUMBER: "Numero non valido: da 1 a 99.",
  NOT_MEMBER: "Il tuo account non è ancora collegato al club.",
  NOT_SIGNED_IN: "Entra per salvare il tuo campione.",
};

export const saveMyAvatar = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof SaveInput>) => SaveInput.parse(d))
  .handler(async ({ data }): Promise<SaveOutcome> => {
    const studio = await loadAvatarStudio();
    if (!studio.signedIn) return { saved: false, preview: false, message: SAVE_MESSAGES["NOT_SIGNED_IN"]! };
    const b = baseByKey(data.baseKey);
    if (!b) return { saved: false, preview: false, message: SAVE_MESSAGES["INVALID_BASE"]! };
    if (!canUseBase(studio.ageBand, b)) return { saved: false, preview: false, message: SAVE_MESSAGES["BACK_VIEW_ONLY"]! };
    const nick = validateNickname(data.nickname);
    if (!nick.ok) return { saved: false, preview: false, message: nick.error };
    const num = validateShirtNumber(data.shirtNumber);
    if (!num.ok) return { saved: false, preview: false, message: num.error };
    if (studio.storage !== "ACTIVE") {
      return {
        saved: false,
        preview: true,
        message: "Anteprima valida, ma il salvataggio non è ancora attivo: la Direzione deve approvare l'archivio degli avatar.",
      };
    }
    const sb = serverSupabase();
    const view = await sessionView();
    const org = orgOf(view);
    if (!sb || !org) return { saved: false, preview: true, message: "Salvataggio non disponibile su questo server." };
    const { data: res, error } = await sb.rpc("scd_set_my_avatar", {
      p_organization_id: org,
      p_base_key: b.key,
      p_nickname: nick.value,
      p_shirt_number: num.value,
    });
    if (error) return { saved: false, preview: false, message: "Salvataggio non riuscito, riprova tra poco." };
    if (res === "SAVED") return { saved: true, message: "Campione salvato." };
    return { saved: false, preview: false, message: SAVE_MESSAGES[String(res)] ?? "Salvataggio non riuscito." };
  });

export type GenerateOutcome =
  | { ok: true; dataUrl: string; remainingToday: number; remainingMonth: number }
  | { ok: false; disabled: boolean; message: string };

const GenInput = z.object({
  description: z.string().max(600),
  quick: z.record(z.string().max(40)).default({}),
  nickname: z.string().max(60),
  shirtNumber: z.number().int(),
});

export const generateAvatarFromText = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof GenInput>) => GenInput.parse(d))
  .handler(async ({ data }): Promise<GenerateOutcome> => {
    const cfg = avatarGenConfig(process.env);
    if (!cfg.enabled) return { ok: false, disabled: true, message: genDisabledText(cfg.reason) };
    const studio = await loadAvatarStudio();
    if (!studio.signedIn) return { ok: false, disabled: false, message: "Entra per creare il tuo campione." };
    if (studio.storage !== "ACTIVE")
      return { ok: false, disabled: true, message: "Il contatore delle creazioni non è ancora attivo: generazione spenta." };
    const built = buildAvatarPrompt(
      { description: data.description, quick: data.quick, nickname: data.nickname, shirtNumber: data.shirtNumber },
      studio.ageBand,
    );
    if (!built.ok) return { ok: false, disabled: false, message: built.error };
    const pre = capState(studio.caps.usedToday, studio.caps.usedMonth);
    if (!pre.allowed) return { ok: false, disabled: false, message: pre.message ?? "Limite raggiunto." };
    const sb = serverSupabase();
    const org = orgOf(await sessionView());
    if (!sb || !org) return { ok: false, disabled: true, message: "Generazione non disponibile su questo server." };
    const reserve = await sb.rpc("scd_avatar_generation_reserve", {
      p_organization_id: org,
      p_daily_cap: AVATAR_GEN_DAILY_CAP,
      p_monthly_cap: AVATAR_GEN_MONTHLY_CAP,
    });
    const r = (reserve.data ?? {}) as Record<string, unknown>;
    if (reserve.error || r["allowed"] !== true || typeof r["id"] !== "number") {
      const st = capState(Number(r["today"] ?? AVATAR_GEN_DAILY_CAP), Number(r["month"] ?? 0));
      return { ok: false, disabled: false, message: st.message ?? "Limite di creazioni raggiunto." };
    }
    const out = await generateImagen(cfg, built.prompt).catch(() => ({
      ok: false as const,
      blocked: false,
      message: "Generazione non riuscita, riprova più tardi.",
    }));
    await sb.rpc("scd_avatar_generation_close", { p_id: r["id"], p_outcome: out.ok ? "DONE" : out.blocked ? "BLOCKED" : "FAILED" });
    if (!out.ok) return { ok: false, disabled: false, message: out.message };
    const after = capState(Number(r["today"]), Number(r["month"]));
    return { ok: true, dataUrl: out.dataUrl, remainingToday: after.remainingToday, remainingMonth: after.remainingMonth };
  });

/**
 * Server side of the simple access (UD-117): registration with password, social sign-in, profile completion for
 * social accounts, confirmation e-mail resend, enabled providers. Every call uses the caller's own cookies; the
 * database decides what opens (r85 base access; staged r104 automatic checks and office notifications).
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { z } from "zod";

import { cleanPhone, createRateLimiter } from "./access-requests";
import { PASSWORD_MAX } from "./auth-remember";
import { configuredSiteUrl } from "./http-policy";
import { clientIp } from "./request-ip.server";
import { safeNext } from "./session";
import {
  SOCIAL_PROVIDERS,
  enabledProviders,
  normalizeDeclaration,
  signupMetadata,
  validateSignup,
  type Declaration,
  type SignupOutcome,
  type SocialProvider,
} from "./signup";
import {
  serverSupabase,
  setRememberPreference,
  supabaseEnv,
} from "./supabase.server";

const allowSignup = createRateLimiter(5, 10 * 60 * 1000);
const allowResend = createRateLimiter(3, 10 * 60 * 1000);

function todayRome(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function siteOrigin(): string {
  return configuredSiteUrl(process.env) ?? getRequestUrl().origin;
}

const DeclarationInput = z.object({
  kinds: z.array(z.string().max(20)).max(12),
  children: z
    .array(
      z.object({
        firstName: z.string().max(80),
        lastName: z.string().max(80),
        birthYear: z.string().max(4),
      }),
    )
    .max(8),
  note: z.string().max(400),
  tesserato: z.enum(["SI", "NO", "NON_SO"]).optional(),
});

function asDeclaration(d: z.infer<typeof DeclarationInput>): Declaration {
  return normalizeDeclaration({
    kinds: d.kinds as Declaration["kinds"],
    children: d.children,
    note: d.note,
    tesserato: d.tesserato ?? "NON_SO",
  });
}

type Sb = NonNullable<ReturnType<typeof serverSupabase>>;

/**
 * Records the registration in the office queue. Uses `scd_request_access_v2` (staged r104: stores the declaration
 * and runs the automatic checks) and falls back to the live r85 function while r104 is not applied.
 */
async function recordRequest(
  sb: Sb,
  p: {
    firstName: string;
    lastName: string;
    birthDate: string;
    email: string;
    phone: string;
    consent: boolean;
    declaration: Declaration;
  },
): Promise<string | null> {
  const base = {
    p_first_name: p.firstName.trim(),
    p_last_name: p.lastName.trim(),
    p_birth_date: p.birthDate,
    p_email: p.email.trim().toLowerCase(),
    p_phone: cleanPhone(p.phone),
    p_consent: p.consent,
  };
  const v2 = await sb.rpc("scd_request_access_v2", {
    ...base,
    p_declared: p.declaration,
  });
  if (!v2.error) return typeof v2.data === "string" ? v2.data : "RECEIVED";
  // PGRST202 = function not in the schema cache (r104 not applied yet).
  if (
    v2.error.code !== "PGRST202" &&
    !/could not find the function/i.test(v2.error.message)
  )
    return null;
  const v1 = await sb.rpc("scd_request_access", base);
  if (v1.error) return null;
  return typeof v1.data === "string" ? v1.data : "RECEIVED";
}

const SignupSchema = z.object({
  firstName: z.string().max(80),
  lastName: z.string().max(80),
  birthDate: z.string().max(10),
  email: z.string().max(120),
  phone: z.string().max(30),
  password: z.string().max(PASSWORD_MAX + 1),
  confirm: z.string().max(PASSWORD_MAX + 1),
  consent: z.boolean(),
  declaration: DeclarationInput,
  website: z.string().max(200).optional(),
});

export const signUpWithPassword = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof SignupSchema>) => SignupSchema.parse(d))
  .handler(async ({ data }): Promise<{ outcome: SignupOutcome }> => {
    // Honeypot: answer as if done, nothing is created.
    if (data.website) return { outcome: "CHECK_EMAIL" };
    if (!allowSignup(clientIp())) return { outcome: "BUSY" };
    const declaration = asDeclaration(data.declaration);
    const input = { ...data, declaration };
    const errors = validateSignup(input, todayRome());
    if (errors.birthDate && /genitore/.test(errors.birthDate))
      return { outcome: "MINOR_UNDER_14" };
    if (Object.keys(errors).length) return { outcome: "INVALID" };
    const sb = serverSupabase();
    if (!sb) return { outcome: "ERROR" };
    const email = data.email.trim().toLowerCase();
    const { data: created, error } = await sb.auth.signUp({
      email,
      password: data.password,
      options: {
        emailRedirectTo: `${siteOrigin()}/accedi/conferma`,
        data: signupMetadata(input, declaration),
      },
    });
    // An account with this e-mail already exists (e.g. the families loaded by the office, who never chose a
    // password): Supabase answers with an empty identity list and sends nothing. Send the "scegli la password" e-mail
    // instead, so everybody can register "from scratch" the same way (Direzione 14/10/2026). Same answer either way.
    if (!error && created.user && (created.user.identities?.length ?? 0) === 0) {
      await sb.auth.resetPasswordForEmail(email, { redirectTo: `${siteOrigin()}/accedi/conferma` });
    }
    if (error) {
      const m = `${error.code ?? ""} ${error.message}`;
      if (/weak_password|pwned|leaked|weak/i.test(m))
        return { outcome: "WEAK_PASSWORD" };
      if (error.status === 429 || /rate limit|too many/i.test(m))
        return { outcome: "BUSY" };
      // "User already registered" is not revealed (no account enumeration): same answer as a new registration.
      if (!/already registered|user_already_exists|email_exists/i.test(m))
        return { outcome: "ERROR" };
    }
    const recorded = await recordRequest(sb, { ...input, email });
    if (recorded === "MINOR_UNDER_14") return { outcome: "MINOR_UNDER_14" };
    if (recorded === "BUSY") return { outcome: "BUSY" };
    // The login exists even if the queue write failed: the person can still confirm and enter the open area.
    return { outcome: "CHECK_EMAIL" };
  });

export const resendSignupEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) =>
    z
      .object({ email: z.string().trim().toLowerCase().email().max(120) })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const neutral =
      "Se l'indirizzo è registrato e non ancora confermato, ti arriva di nuovo la e-mail di conferma.";
    if (!allowResend(clientIp()))
      return {
        ok: false,
        message: "Hai già chiesto diverse e-mail: riprova tra dieci minuti.",
      };
    const sb = serverSupabase();
    if (!sb)
      return {
        ok: false,
        message: "L'accesso non è ancora configurato su questo server.",
      };
    const { error } = await sb.auth.resend({
      type: "signup",
      email: data.email,
      options: { emailRedirectTo: `${siteOrigin()}/accedi/conferma` },
    });
    if (
      error &&
      (error.status === 429 || /rate limit|too many/i.test(error.message))
    )
      return {
        ok: false,
        message: "Troppe richieste: riprova tra qualche minuto.",
      };
    return { ok: true, message: neutral };
  });

// ── Social sign-in ───────────────────────────────────────────────────────────────────────────────────

let providersCache: { at: number; list: SocialProvider[] } | null = null;

/** Providers really enabled in Supabase Auth (public settings endpoint), cached five minutes. */
export const getAuthProviders = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ providers: SocialProvider[] }> => {
    if (providersCache && Date.now() - providersCache.at < 5 * 60 * 1000)
      return { providers: providersCache.list };
    const env = supabaseEnv();
    if (!env) return { providers: [] };
    try {
      const res = await fetch(`${env.url}/auth/v1/settings`, {
        headers: { apikey: env.publishableKey },
        signal: AbortSignal.timeout(4000),
      });
      const list = res.ok ? enabledProviders(await res.json()) : [];
      providersCache = { at: Date.now(), list };
      return { providers: list };
    } catch {
      return { providers: providersCache?.list ?? [] };
    }
  },
);

const PROVIDER_IDS = SOCIAL_PROVIDERS.map((p) => p.id) as [
  SocialProvider,
  ...SocialProvider[],
];

export const startSocialSignIn = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      provider: SocialProvider;
      next?: string | undefined;
      remember: boolean;
    }) =>
      z
        .object({
          provider: z.enum(PROVIDER_IDS),
          next: z.string().max(200).optional(),
          remember: z.boolean(),
        })
        .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{ ok: boolean; url: string | null; message: string }> => {
      const sb = serverSupabase({ remember: data.remember });
      if (!sb)
        return {
          ok: false,
          url: null,
          message: "L'accesso non è ancora configurato su questo server.",
        };
      setRememberPreference(data.remember);
      const params = new URLSearchParams();
      if (data.next) params.set("next", safeNext(data.next));
      if (!data.remember) params.set("r", "0");
      const q = params.toString();
      // PKCE: the code verifier is stored in an httpOnly cookie on this device; /accedi/conferma exchanges the code.
      const { data: out, error } = await sb.auth.signInWithOAuth({
        provider: data.provider,
        options: {
          redirectTo: `${siteOrigin()}/accedi/conferma${q ? `?${q}` : ""}`,
          skipBrowserRedirect: true,
        },
      });
      if (error || !out.url)
        return {
          ok: false,
          url: null,
          message:
            "Questo accesso non è disponibile in questo momento: entra con e-mail e password.",
        };
      return { ok: true, url: out.url, message: "" };
    },
  );

// ── Profile completion (social accounts and old accounts without phone) ─────────────────────────────

const CompleteSchema = z.object({
  firstName: z.string().max(80),
  lastName: z.string().max(80),
  birthDate: z.string().max(10),
  phone: z.string().max(30),
  consent: z.boolean(),
  declaration: DeclarationInput,
});

export interface ProfileGap {
  signedIn: boolean;
  email: string | null;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  /** True when phone, birth date or consent are missing: the page asks for them once. */
  incomplete: boolean;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export const getProfileGap = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProfileGap> => {
    const sb = serverSupabase();
    const empty: ProfileGap = {
      signedIn: false,
      email: null,
      firstName: "",
      lastName: "",
      birthDate: "",
      phone: "",
      incomplete: false,
    };
    if (!sb) return empty;
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) return empty;
    const m = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const full = str(m["full_name"]) || str(m["name"]);
    const [given, ...rest] = full.split(" ");
    const firstName =
      str(m["first_name"]) || str(m["given_name"]) || given || "";
    const lastName =
      str(m["last_name"]) || str(m["family_name"]) || rest.join(" ");
    const phone = str(m["phone"]);
    const birthDate = str(m["birth_date"]);
    return {
      signedIn: true,
      email: data.user.email ?? null,
      firstName,
      lastName,
      birthDate,
      phone,
      incomplete: !phone || !birthDate || m["scd_profile_consent"] !== true,
    };
  },
);

export const completeProfile = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof CompleteSchema>) =>
    CompleteSchema.parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const sb = serverSupabase();
    if (!sb)
      return {
        ok: false,
        message: "L'accesso non è ancora configurato su questo server.",
      };
    const { data: me, error: meErr } = await sb.auth.getUser();
    if (meErr || !me.user?.email)
      return { ok: false, message: "Sessione scaduta: entra di nuovo." };
    const declaration = asDeclaration(data.declaration);
    // Same rules as the registration, without the password (social accounts have none).
    const errors = validateSignup(
      {
        ...data,
        email: me.user.email,
        password: "Placeholder1",
        confirm: "Placeholder1",
        declaration,
      },
      todayRome(),
    );
    const first = Object.values(errors)[0];
    if (first) return { ok: false, message: first };
    const meta = signupMetadata(data, declaration);
    delete meta["scd_password_set"];
    const { error } = await sb.auth.updateUser({
      data: { ...meta, scd_profile_consent: true },
    });
    if (error)
      return {
        ok: false,
        message: "Salvataggio non riuscito, riprova tra un minuto.",
      };
    const recorded = await recordRequest(sb, {
      ...data,
      email: me.user.email,
      declaration,
    });
    if (recorded === "MINOR_UNDER_14")
      return {
        ok: false,
        message:
          "Sotto i 14 anni l'accesso lo chiede un genitore o tutore, con i suoi dati.",
      };
    return {
      ok: true,
      message:
        "Fatto. Sei nell'area aperta; se la società riconosce i tuoi dati si apre subito anche la tua area.",
    };
  });

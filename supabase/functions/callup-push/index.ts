// callup-push (r67): Web Push for SCD call-ups.
//   POST {"action":"init"}                      -> ensures the VAPID pair exists in Vault, returns the public key
//   POST {"action":"callup","match_id":"<uuid>"} -> notifies the families of the not-yet-notified call-ups of a match
// The caller's JWT is verified by the platform (verify_jwt) and again here; the caller must be allowed to manage the
// match's team (scd_my_team_ids with the caller's own session). The private key never leaves Vault + this function.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUBJECT = "mailto:sportclubcolico@gmail.com";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Keys = { publicKey: string; privateKey: string; subject: string };

async function ensureKeys(admin: ReturnType<typeof createClient>): Promise<Keys> {
  const got = await admin.rpc("scd_push_vapid_get");
  if (got.error) throw new Error("vault read failed");
  if (got.data) return got.data as Keys;
  const k = webpush.generateVAPIDKeys();
  const init = await admin.rpc("scd_push_vapid_init", { p_public: k.publicKey, p_private: k.privateKey, p_subject: SUBJECT });
  if (init.error) throw new Error("vault init failed");
  const again = await admin.rpc("scd_push_vapid_get");
  if (again.error || !again.data) throw new Error("vault read failed");
  return again.data as Keys;
}

const DAY = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "short", day: "2-digit", month: "2-digit" });
const TIME = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });

type Target = {
  callup_id: string;
  first_name: string | null;
  title: string | null;
  starts_at: string;
  time_known: boolean;
  meeting_at: string | null;
  subscription_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function message(t: Target) {
  const start = new Date(t.starts_at);
  const parts = [t.title ?? "Partita", `${DAY.format(start)}${t.time_known ? ` ore ${TIME.format(start)}` : ""}`];
  if (t.meeting_at) parts.push(`ritrovo ${TIME.format(new Date(t.meeting_at))}`);
  return {
    title: `Convocazione per ${(t.first_name ?? "").trim() || "tuo figlio/a"}`,
    body: `${parts.join(" · ")}. Rispondi "Ci sarò" nell'app.`,
    url: "/famiglia",
    tag: `callup-${t.callup_id}`,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "missing token" });
  const user = createClient(URL_, ANON, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const who = await user.auth.getUser();
  if (who.error || !who.data.user) return json(401, { error: "invalid token" });

  let body: { action?: string; match_id?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid json" });
  }

  try {
    const keys = await ensureKeys(admin);
    if (body.action === "init") return json(200, { publicKey: keys.publicKey });
    if (body.action !== "callup" || !body.match_id || !UUID.test(body.match_id)) return json(400, { error: "invalid request" });

    const match = await admin.from("scd_matches").select("organization_id").eq("id", body.match_id).maybeSingle();
    if (match.error || !match.data) return json(404, { error: "match not found" });
    const org = (match.data as { organization_id: string }).organization_id;
    const [team, mine] = await Promise.all([
      admin.rpc("scd_match_team_id", { p_match_id: body.match_id }),
      user.rpc("scd_my_team_ids", { p_organization_id: org }),
    ]);
    const allowed = Array.isArray(mine.data) && mine.data.some((r: unknown) => (typeof r === "string" ? r : (r as Record<string, string>)?.scd_my_team_ids) === team.data);
    if (team.error || mine.error || !team.data || !allowed) return json(403, { error: "not allowed" });

    const targets = await admin.rpc("scd_push_callup_targets", { p_match_id: body.match_id });
    if (targets.error) return json(500, { error: "targets failed" });
    const list = (targets.data ?? []) as Target[];
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);

    const sentSubs = new Set<string>();
    const goneSubs = new Set<string>();
    const deliveredCallups = new Set<string>();
    let failed = 0;
    await Promise.all(
      list.map(async (t) => {
        try {
          await webpush.sendNotification(
            { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
            JSON.stringify(message(t)),
            { TTL: 6 * 3600, urgency: "high", topic: t.callup_id.replace(/-/g, "").slice(0, 32) },
          );
          sentSubs.add(t.subscription_id);
          deliveredCallups.add(t.callup_id);
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) goneSubs.add(t.subscription_id);
          else failed += 1;
        }
      }),
    );
    const mark = await admin.rpc("scd_push_mark_sent", {
      p_callup_ids: [...deliveredCallups],
      p_sent_subscription_ids: [...sentSubs],
      p_gone_subscription_ids: [...goneSubs],
    });
    if (mark.error) return json(500, { error: "mark failed" });
    return json(200, { devices: sentSubs.size, callups: deliveredCallups.size, gone: goneSubs.size, failed });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "error" });
  }
});

import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { SECURITY_HEADERS, assetLinksJson, cacheControlFor, configuredSiteUrl, demoRedirect, isProductionEnv, robotsTxt, sitemapXml } from "./lib/http-policy";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/** Security headers + cache policy on every response (launch audit 2026-10-12). */
function withPolicy(response: Response, pathname: string): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!headers.has(k)) headers.set(k, v);
  const cc = cacheControlFor(pathname);
  if (cc) headers.set("cache-control", cc);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function plain(body: string, type: string): Response {
  return new Response(body, { status: 200, headers: { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" } });
}

/**
 * Posta del club sync (r95), for the Render cron: POST with "Authorization: Bearer <SCD_COMM_SYNC_SECRET>".
 * Answers 404 when the secret is not configured, 401 on a wrong secret. The body carries counts only.
 */
async function commSync(request: Request): Promise<Response> {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  if ((process.env["SCD_COMM_SYNC_SECRET"] ?? "").trim().length < 32) return json(404, { ok: false });
  if (request.method !== "POST") return json(405, { ok: false });
  const { runCommSync, serviceSupabase, syncSecretMatches } = await import("./lib/comm/sync.server");
  if (!syncSecretMatches(request.headers.get("authorization"))) return json(401, { ok: false });
  const sb = serviceSupabase();
  if (!sb) return json(503, { ok: false, code: "NO_SERVICE_KEY" });
  try {
    const results = await runCommSync(sb);
    return json(200, { ok: true, results });
  } catch {
    return json(500, { ok: false, code: "SYNC_FAILED" });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    const production = isProductionEnv(process.env);
    if (url.pathname === "/healthz") {
      return withPolicy(plain(JSON.stringify({ ok: true, service: "scd-superapp", production, commit: process.env["RENDER_GIT_COMMIT"] ?? null }), "application/json"), url.pathname);
    }
    if (url.pathname === "/internal/comm-sync") return withPolicy(await commSync(request), url.pathname);
    const demo = demoRedirect(url.pathname, production);
    if (demo) return withPolicy(new Response(null, { status: 302, headers: { location: demo } }), url.pathname);
    if (url.pathname === "/robots.txt") return withPolicy(plain(robotsTxt(production, configuredSiteUrl(process.env)), "text/plain"), url.pathname);
    if (url.pathname === "/.well-known/assetlinks.json") {
      const links = assetLinksJson(process.env);
      if (links) return withPolicy(plain(links, "application/json"), url.pathname);
      return withPolicy(new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } }), url.pathname);
    }
    if (url.pathname === "/sitemap.xml") {
      const site = configuredSiteUrl(process.env);
      if (production && site) return withPolicy(plain(sitemapXml(site), "application/xml"), url.pathname);
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withPolicy(await normalizeCatastrophicSsrResponse(response), url.pathname);
    } catch (error) {
      console.error(error);
      return withPolicy(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        url.pathname,
      );
    }
  },
};

#!/usr/bin/env node
// SCD Super App · staging gateway.
// Puts HTTP Basic authentication in front of the built Nitro node-server so the
// staging deployment is never publicly browsable. Fails closed: without a strong
// SCD_STAGING_PASSWORD the process refuses to start.
//
// Env:
//   PORT                   public port (Render sets it)
//   SCD_STAGING_PASSWORD   required, >= 20 characters
//   SCD_STAGING_USER       optional, defaults to "scd-staging"
//   SCD_INTERNAL_PORT      optional, defaults to 3100 (loopback only)
import http from "node:http";
import { spawn } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const serverEntry = path.join(appRoot, ".output", "server", "index.mjs");

const PUBLIC_PORT = Number(process.env.PORT || 10000);
const INTERNAL_PORT = Number(process.env.SCD_INTERNAL_PORT || 3100);
const USER = String(process.env.SCD_STAGING_USER || "scd-staging");
const PASSWORD = String(process.env.SCD_STAGING_PASSWORD || "");
const COMMIT = process.env.RENDER_GIT_COMMIT || process.env.SCD_DEPLOY_COMMIT || null;

if (PASSWORD.length < 20) {
  console.error("[staging-gateway] SCD_STAGING_PASSWORD missing or shorter than 20 characters: refusing to start.");
  process.exit(1);
}

const expected = Buffer.from(`${USER}:${PASSWORD}`, "utf8");

function authorized(req) {
  const header = String(req.headers.authorization || "");
  if (!/^Basic [A-Za-z0-9+/=]+$/.test(header)) return false;
  let received;
  try {
    received = Buffer.from(header.slice(6), "base64");
  } catch {
    return false;
  }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

const child = spawn(process.execPath, [serverEntry], {
  cwd: appRoot,
  env: { ...process.env, PORT: String(INTERNAL_PORT), NITRO_PORT: String(INTERNAL_PORT), HOST: "127.0.0.1", NITRO_HOST: "127.0.0.1" },
  stdio: "inherit",
});
child.on("exit", (code, signal) => {
  console.error(`[staging-gateway] app server exited (code=${code}, signal=${signal}); stopping gateway.`);
  process.exit(code ?? 1);
});
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    child.kill(sig);
    process.exit(0);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify({ ok: true, service: "scd-superapp-staging", commit: COMMIT, protected: true }));
    return;
  }
  if (!authorized(req)) {
    res.writeHead(401, {
      "www-authenticate": 'Basic realm="SCD Super App - staging", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    });
    res.end("Accesso staging SCD richiesto");
    return;
  }
  const headers = { ...req.headers };
  delete headers.authorization;
  headers["x-forwarded-host"] = req.headers.host || "";
  headers["x-forwarded-proto"] = String(req.headers["x-forwarded-proto"] || "https");
  const upstream = http.request(
    { host: "127.0.0.1", port: INTERNAL_PORT, method: req.method, path: req.url, headers },
    (up) => {
      const outHeaders = { ...up.headers, "x-robots-tag": "noindex, nofollow" };
      res.writeHead(up.statusCode || 502, outHeaders);
      up.pipe(res);
    },
  );
  upstream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "retry-after": "5" });
    }
    res.end("Super App in avvio, riprova tra qualche secondo.");
  });
  req.pipe(upstream);
});

server.listen(PUBLIC_PORT, () => {
  console.log(`[staging-gateway] protected staging on :${PUBLIC_PORT} -> 127.0.0.1:${INTERNAL_PORT}`);
});

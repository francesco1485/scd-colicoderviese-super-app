// Accessibility audit of the Super App (L2, launch plan). Uso, dalla cartella apps/superapp:
//   npm run build && PORT=4173 node .output/server/index.mjs &
//   A11Y_BASE_URL=http://localhost:4173 A11Y_OUT=/tmp/a11y node scripts/a11y-audit.mjs
// Requires Chromium (CHROMIUM_PATH, default the preinstalled /opt/pw-browsers one; never `playwright install`).
//
// Public pages are opened directly. Private pages (famiglia, mister, certificati) are reached by client-side
// navigation while every TanStack server-function call is intercepted and answered with FIXTURES below:
// invented adult-sounding names, adult teams only (Juniores and Prima Squadra), no real person, nothing
// read from or written to any database. The fixtures only exist in this script.
//
// Checks: axe-core with the WCAG 2.0/2.1/2.2 A and AA rule sets, plus the club rule "touch targets of at
// least 44x44 px" (PRODUCT.md, WCAG 2.5.5 AAA) on every visible interactive element. Exit code 1 when any
// axe violation or undersized target is found; the JSON report is written to A11Y_OUT/a11y-report.json.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { toCrossJSON } from "seroval";

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const BASE = process.env.A11Y_BASE_URL ?? "http://localhost:4173";
const OUT = process.env.A11Y_OUT ?? "a11y-output";
const EXE = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const ONLY = process.env.A11Y_ONLY ? new Set(process.env.A11Y_ONLY.split(",")) : null;
const SHOTS = process.env.A11Y_SHOTS === "1";
mkdirSync(OUT, { recursive: true });

/** Server-function id -> exported name, read from the build's resolver manifest. */
function serverFnNames() {
  const dir = join(process.cwd(), ".output/server");
  const file = readdirSync(dir).find((f) => f.startsWith("__23tanstack-start-server-fn-resolver"));
  if (!file) throw new Error("Server-function manifest not found: run `npm run build` first");
  const src = readFileSync(join(dir, file), "utf8");
  const map = new Map();
  for (const m of src.matchAll(/"([0-9a-f]{64})":\s*\{\s*functionName:\s*"([A-Za-z0-9_]+?)_createServerFn_handler"/g)) map.set(m[1], m[2]);
  return map;
}

// ---- Fixtures (invented, adult-sounding names; no real people; no minors) -------------------------------
const ORG = { organizationId: "00000000-0000-4000-8000-000000000001", organization: "scd-prova", role: "SECRETARIAT" };
const session = (roles, badge) => ({ configured: true, user: { email: "prova@example.invalid" }, roles, landing: "/aree", badge, memberships: [ORG] });
const gatePage = { view: "page", preview: false };
const plusDays = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const NAMES = ["Marco Valsecchi", "Luca Ferrandi", "Davide Brambati", "Simone Corvetti", "Andrea Pellizzi", "Matteo Gerosa", "Paolo Rinaldelli", "Stefano Mauri", "Giorgio Spreafico", "Alberto Cantoni", "Fabio Redaelli", "Nicola Bonfanti", "Riccardo Tavola", "Enrico Molteni"];
const roster = NAMES.map((name, i) => ({
  teamId: "t-u19", teamCode: "u19", teamName: "Juniores U19 Elite", teamStatus: "ACTIVE", personId: `p${i}`, athleteId: `a${i}`,
  displayName: name, birthYear: 2007 + (i % 2), minor: false, registrationStatus: i % 5 === 4 ? "PENDING" : "VERIFIED",
  certificateExpiresAt: i % 6 === 5 ? null : plusDays(i % 4 === 3 ? 12 : 200),
}));
const callupsFor = (n) => roster.slice(0, n).map((r, i) => ({ callupId: `c${i}`, athleteId: r.athleteId, displayName: r.displayName, response: ["CONFIRMED", "PENDING", "DECLINED"][i % 3], meetingAt: `${plusDays(3)}T13:30:00.000Z`, meetingPlace: "Campo Comunale Colico", kitNote: "Divisa da trasferta" }));
const myCallups = [
  { callupId: "m1", personId: "p0", displayName: "Marco Valsecchi", relationship: "SELF", teamCode: "u19", title: "Juniores U19 Elite · campionato", startsAt: `${plusDays(3)}T14:30:00.000Z`, timeKnown: true, venue: "Campo Comunale Colico", meetingAt: `${plusDays(3)}T13:30:00.000Z`, meetingPlace: "Campo Comunale Colico", kitNote: "Divisa blu", response: "PENDING" },
  { callupId: "m2", personId: "p0", displayName: "Marco Valsecchi", relationship: "SELF", teamCode: "u19", title: "Juniores U19 Elite · campionato", startsAt: `${plusDays(10)}T14:30:00.000Z`, timeKnown: false, venue: "In trasferta", meetingAt: null, meetingPlace: null, kitNote: null, response: "CONFIRMED" },
];
const certRows = [...roster, ...NAMES.slice(0, 6).map((name, i) => ({ ...roster[i], teamCode: "prima", teamName: "Prima Squadra", athleteId: `b${i}`, displayName: `${name.split(" ")[1]} ${name.split(" ")[0]}`, birthYear: 1998 + i }))].map((r, i) => ({
  athleteId: r.athleteId, name: r.displayName, birthYear: r.birthYear, minor: false, teamCode: r.teamCode, teamName: r.teamName, registrationStatus: r.registrationStatus,
  expiresAt: i % 7 === 6 ? null : plusDays([-20, 9, 120, 300][i % 4]), status: i % 3 === 0 ? "VERIFIED" : "DECLARED", kind: i % 2 ? "AGONISTICO" : "NON_AGONISTICO", checkedAt: i % 3 === 0 ? new Date().toISOString() : null,
}));
const sheet = {
  state: "ok", matchId: "fx-match", teamCode: "u19", rules: { maxListed: 20, maxStarters: 11, captainRequired: true }, locked: false, status: "DRAFT", updatedAt: new Date().toISOString(),
  players: roster.slice(0, 13).map((r, i) => ({ athleteId: r.athleteId, shirt: i + 1, starter: i < 11 })),
  staff: [{ personId: "s1", role: "ALLENATORE", displayName: "Gianni Rusconi" }, { personId: "s2", role: "DIRIGENTE_ACCOMPAGNATORE", displayName: "Sergio Panzeri" }],
  captain: "a0", vice: "a1", note: "",
  calledUp: roster.slice(0, 14).map((r, i) => ({ athleteId: r.athleteId, displayName: r.displayName, birthYear: r.birthYear, response: i < 12 ? "CONFIRMED" : "PENDING", lastShirt: i + 1 })),
  candidates: [{ personId: "s1", displayName: "Gianni Rusconi", roleLabel: "Allenatore" }, { personId: "s2", displayName: "Sergio Panzeri", roleLabel: "Dirigente" }, { personId: "s3", displayName: "Walter Combi", roleLabel: "Massaggiatore" }],
};
const FIXTURES = {
  famiglia: {
    getSession: session(["famiglia"], "Famiglia"),
    getMyFamily: { state: "ok", members: [{ personId: "p0", displayName: "Marco Valsecchi", relationship: "SELF", birthYear: 2007, minor: false, teamCodes: ["u19"], registrationStatus: "VERIFIED", certificateExpiresAt: plusDays(90) }] },
    getMyCallups: myCallups,
    getPushConfig: { signedIn: true, publicKey: null, devices: 0 },
  },
  mister: {
    getSession: session(["mister"], "Mister"),
    getWorkAreaGate: gatePage,
    getMyRoster: { state: "ok", rows: roster },
    getEventCallups: callupsFor(12),
    getMatchSheet: sheet,
    getPushConfig: { signedIn: true, publicKey: null, devices: 0 },
  },
  certificati: {
    getSession: session(["segreteria"], "Segreteria"),
    getWorkAreaGate: gatePage,
    getCertificates: { gate: gatePage, connected: true, canWrite: true, today: plusDays(0), rows: certRows, error: null },
  },
};

const PAGES = [
  { slug: "guida", path: "/guida" },
  { slug: "accedi", path: "/accedi" },
  { slug: "registrati", path: "/registrati" },
  { slug: "privacy", path: "/privacy" },
  { slug: "famiglia", path: "/famiglia", fixtures: "famiglia", ready: "text=Presa visione" },
  { slug: "mister", path: "/gestionale/mister?squadra=u19", fixtures: "mister", ready: "text=Marco Valsecchi" },
  { slug: "certificati", path: "/segreteria/certificati", fixtures: "certificati", ready: "text=Da fare" },
].filter((p) => !ONLY || ONLY.has(p.slug));

const VIEWPORTS = [
  { name: "390x844", opts: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  { name: "1440x900", opts: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
];

/** Visible interactive elements smaller than 44x44 px (inline links inside running text are exempt, as in WCAG 2.5.5). */
function smallTargets() {
  const out = [];
  const sel = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], [tabindex]:not([tabindex="-1"])';
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.display === "none") continue;
    if (el.closest("[aria-hidden='true'], [inert]")) continue;
    // Inline link in a sentence: exempt.
    if (el.tagName === "A" && cs.display === "inline" && el.parentElement && (el.parentElement.textContent ?? "").trim().length > (el.textContent ?? "").trim().length + 20) continue;
    // A form control inside (or tied to) a label: clicking the label activates it, so the label is the target.
    let box = r;
    const label = el.closest("label") ?? (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null);
    const fits = (b) => b.width + 0.5 >= 44 && b.height + 0.5 >= 44;
    if (!fits(r) && label && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) box = label.getBoundingClientRect();
    if (fits(box)) continue;
    const name = (el.getAttribute("aria-label") ?? el.textContent ?? el.getAttribute("title") ?? el.getAttribute("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
    const path = [];
    for (let n = el; n && n !== document.body && path.length < 4; n = n.parentElement) path.unshift(n.tagName.toLowerCase() + (n.id ? `#${n.id}` : ""));
    out.push({ el: path.join(">"), name, w: Math.round(box.width), h: Math.round(box.height) });
  }
  return out;
}

const fnNames = serverFnNames();
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } : undefined;
const browser = await chromium.launch({ executablePath: EXE, ...(proxy ? { proxy } : {}) });
const report = [];
let problems = 0;

for (const vp of VIEWPORTS) {
  for (const pg of PAGES) {
    const ctx = await browser.newContext({ ...vp.opts, locale: "it-IT", timezoneId: "Europe/Rome" });
    const page = await ctx.newPage();
    const unknownFns = new Set();
    if (pg.fixtures) {
      const fx = FIXTURES[pg.fixtures];
      await page.route("**/_serverFn/**", async (route) => {
        const id = new URL(route.request().url()).pathname.split("/").pop();
        const name = fnNames.get(id) ?? id;
        if (!(name in fx)) {
          if (route.request().method() !== "GET") return route.abort(); // never let a write through
          unknownFns.add(name);
          return route.continue();
        }
        const body = JSON.stringify(toCrossJSON({ result: fx[name], error: undefined, context: {} }, { refs: new Map() }));
        return route.fulfill({ status: 200, headers: { "content-type": "application/json", "x-tss-serialized": "true", "cache-control": "no-store" }, body });
      });
      await page.goto(`${BASE}/guida`, { waitUntil: "networkidle" });
      await page.evaluate((to) => window.__TSR_ROUTER__.navigate({ href: to }), pg.path);
      await page.waitForSelector(pg.ready, { timeout: 20000 });
    } else {
      await page.goto(BASE + pg.path, { waitUntil: "networkidle" });
    }
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await page.addScriptTag({ content: AXE });
    const axe = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations", "incomplete"] });
      const slim = (v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 8).map((n) => ({ target: n.target.join(" "), summary: (n.failureSummary ?? "").split("\n").slice(0, 3).join(" ") })), count: v.nodes.length });
      return { violations: r.violations.map(slim), incomplete: r.incomplete.filter((v) => v.id === "color-contrast").map(slim) };
    });
    const small = await page.evaluate(smallTargets);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (SHOTS) await page.screenshot({ path: join(OUT, `${pg.slug}-${vp.name}.png`), fullPage: true });
    const row = { page: pg.path, viewport: vp.name, violations: axe.violations, contrastToReview: axe.incomplete, smallTargets: small, overflow, passthroughFns: [...unknownFns] };
    report.push(row);
    problems += axe.violations.length + small.length + (overflow > 0 ? 1 : 0);
    console.log(`${vp.name.padEnd(9)} ${pg.path.padEnd(32)} axe=${axe.violations.map((v) => `${v.id}(${v.count})`).join(",") || "0"} small=${small.length} overflow=${overflow}${unknownFns.size ? ` passthrough=${[...unknownFns].join(",")}` : ""}`);
    await ctx.close();
  }
}
await browser.close();
writeFileSync(join(OUT, "a11y-report.json"), JSON.stringify(report, null, 2));
console.log(problems ? `\n${problems} problem(s) — see ${join(OUT, "a11y-report.json")}` : "\nNo violations.");
process.exit(problems ? 1 : 0);

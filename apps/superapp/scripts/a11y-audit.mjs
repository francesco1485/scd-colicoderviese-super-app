// Accessibility audit of the Super App (L2, launch plan). Uso, dalla cartella apps/superapp:
//   npm run build && PORT=4173 node .output/server/index.mjs &
//   A11Y_BASE_URL=http://localhost:4173 A11Y_OUT=/tmp/a11y node scripts/a11y-audit.mjs
// Requires Chromium (CHROMIUM_PATH, default the preinstalled /opt/pw-browsers one; never `playwright install`).
//
// Public pages are opened directly. Private pages (famiglia, mister, certificati) are reached by client-side
// navigation while every TanStack server-function call is intercepted and answered with the FIXTURES of
// scripts/lib/private-fixtures.mjs:
// invented adult-sounding names, adult teams only (Juniores and Prima Squadra), no real person, nothing
// read from or written to any database.
//
// Checks: axe-core with the WCAG 2.0/2.1/2.2 A and AA rule sets, plus the club rule "touch targets of at
// least 44x44 px" (PRODUCT.md, WCAG 2.5.5 AAA) on every visible interactive element. Exit code 1 when any
// axe violation or undersized target is found; the JSON report is written to A11Y_OUT/a11y-report.json.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { FIXTURES, openWithFixtures, serverFnNames } from "./lib/private-fixtures.mjs";

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const BASE = process.env.A11Y_BASE_URL ?? "http://localhost:4173";
const OUT = process.env.A11Y_OUT ?? "a11y-output";
const EXE = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const ONLY = process.env.A11Y_ONLY ? new Set(process.env.A11Y_ONLY.split(",")) : null;
const SHOTS = process.env.A11Y_SHOTS === "1";
mkdirSync(OUT, { recursive: true });

const PAGES = [
  // B4 (15/10/2026): public pages that carry the commercial and family journeys.
  { slug: "home", path: "/" },
  { slug: "sponsor", path: "/sponsor" },
  { slug: "sostieni", path: "/sostieni" },
  { slug: "tornei", path: "/tornei" },
  { slug: "pulmini", path: "/pulmini" },
  // The LED player is a full-screen signage surface with no site header or navigation, so it is
  // exempt from the touch-target rule (nobody taps a stadium wall); axe WCAG rules still apply.
  { slug: "ledwall-player", path: "/ledwall/player", signage: true },
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
    // Reduced motion: section titles use a scroll-driven reveal (opacity 0.25 until scrolled into view), which
    // axe would measure as low contrast; with reduced motion they render in their final, readable state.
    const ctx = await browser.newContext({ ...vp.opts, locale: "it-IT", timezoneId: "Europe/Rome", reducedMotion: "reduce" });
    const page = await ctx.newPage();
    let unknownFns = new Set();
    if (pg.fixtures) {
      unknownFns = await openWithFixtures(page, { base: BASE, path: pg.path, fx: FIXTURES[pg.fixtures], fnNames, ready: pg.ready });
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
    const small = pg.signage ? [] : await page.evaluate(smallTargets);
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

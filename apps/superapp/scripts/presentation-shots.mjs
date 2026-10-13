// Presentation screenshots (L4, launch plan). Uso, dalla cartella apps/superapp:
//   npm run build && PORT=4173 node .output/server/index.mjs &
//   SHOTS_BASE_URL=http://localhost:4173 node scripts/presentation-shots.mjs
// Output: docs/presentation/<slug>-m.png (390x844 phone) and <slug>-d.png (1440x900 desktop), first screen
// of each flow (or the named section, scrolled into view). Requires the preinstalled Chromium
// (CHROMIUM_PATH, never `playwright install`).
//
// Private flows use the shared fixtures of scripts/lib/private-fixtures.mjs: invented adult-sounding names,
// adult teams only, no real person, no database reads or writes (non-GET server calls are aborted).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { FIXTURES, openWithFixtures, serverFnNames } from "./lib/private-fixtures.mjs";

const BASE = process.env.SHOTS_BASE_URL ?? "http://localhost:4173";
const OUT = process.env.SHOTS_OUT ?? join(process.cwd(), "docs/presentation");
const EXE = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const ONLY = process.env.SHOTS_ONLY ? new Set(process.env.SHOTS_ONLY.split(",")) : null;
mkdirSync(OUT, { recursive: true });

/** `section`: element scrolled to the top of the viewport before the shot (skip the page heading). */
export const FLOWS = [
  { slug: "home", path: "/" },
  { slug: "installa", path: "/installa" },
  { slug: "guida", path: "/guida" },
  { slug: "accedi", path: "/accedi", fixtures: "accedi", ready: "text=Ricordami" },
  { slug: "calendario", path: "/calendario" },
  { slug: "squadre", path: "/squadre" },
  { slug: "famiglia", path: "/famiglia", fixtures: "famiglia", ready: "text=Presa visione", section: "h2:has-text(\"Convocazioni\")" },
  { slug: "mister-convocazione", path: "/gestionale/mister?squadra=u19", fixtures: "mister", ready: "text=Marco Valsecchi", section: "#mis-gara-title" },
  { slug: "mister-distinta", path: "/gestionale/mister?squadra=u19", fixtures: "mister", ready: "text=Marco Valsecchi", section: "#mis-distinta-title" },
  { slug: "certificati", path: "/segreteria/certificati", fixtures: "certificati", ready: "text=Da fare" },
].filter((f) => !ONLY || ONLY.has(f.slug));

const VIEWPORTS = [
  { suffix: "m", opts: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  { suffix: "d", opts: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
];

const fnNames = serverFnNames();
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } : undefined;
const browser = await chromium.launch({ executablePath: EXE, ...(proxy ? { proxy } : {}) });
let failures = 0;

for (const vp of VIEWPORTS) {
  for (const f of FLOWS) {
    const ctx = await browser.newContext({ ...vp.opts, locale: "it-IT", timezoneId: "Europe/Rome", reducedMotion: "reduce" });
    // The cookie notice is answered once per device: record the "technical cookies only" answer (same shape as
    // CONSENT_KEY in src/lib/universe.ts) so the notice does not cover the flow.
    await ctx.addInitScript(() => {
      try { localStorage.setItem("scd-consent", JSON.stringify({ v: 1, stats: false, mkt: false, ts: new Date().toISOString() })); } catch {}
    });
    const page = await ctx.newPage();
    const file = join(OUT, `${f.slug}-${vp.suffix}.png`);
    try {
      if (f.fixtures) await openWithFixtures(page, { base: BASE, path: f.path, fx: FIXTURES[f.fixtures], fnNames, ready: f.ready });
      else await page.goto(BASE + f.path, { waitUntil: "networkidle" });
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      if (f.section) {
        const el = page.locator(f.section).first();
        await el.waitFor({ timeout: 15000 });
        // Leave room for the sticky top bar so the section title stays visible.
        await el.evaluate((n) => window.scrollTo(0, Math.max(0, n.getBoundingClientRect().top + window.scrollY - 88)));
      }
      await page.waitForTimeout(600);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await page.screenshot({ path: file });
      console.log(`${vp.suffix} ${f.slug.padEnd(20)} ok overflow=${overflow}`);
      if (overflow > 0) failures++;
    } catch (err) {
      failures++;
      console.log(`${vp.suffix} ${f.slug.padEnd(20)} FAILED ${String(err).split("\n")[0]}`);
    }
    await ctx.close();
  }
}
await browser.close();
process.exit(failures ? 1 : 0);

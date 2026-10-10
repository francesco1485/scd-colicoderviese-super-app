// QA browser della Super App (locale). Uso:
//   QA_BASE_URL=http://localhost:3000 QA_OUT=./qa-output node scripts/qa-browser.mjs
// Richiede Chromium: CHROMIUM_PATH (default /opt/pw-browsers/chromium-1194/chrome-linux/chrome).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.QA_OUT ?? "qa-output";
const EXE = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
mkdirSync(OUT, { recursive: true });

const PAGES = [
  { slug: "home", path: "/" },
  { slug: "calendario", path: "/calendario" },
  { slug: "calendario-stagione", path: "/calendario?vista=stagione" },
  { slug: "allenamenti", path: "/allenamenti" },
  { slug: "core", path: "/core" },
  { slug: "core-impianti", path: "/core/impianti-calendari" },
  { slug: "core-atleta", path: "/core/atleta" },
  { slug: "core-famiglia", path: "/core/famiglia" },
  { slug: "core-staff", path: "/core/staff" },
  { slug: "grow", path: "/grow" },
  { slug: "sponsor", path: "/sponsor" },
];
const VIEWPORTS = [
  { name: "mobile", opts: { viewport: { width: 393, height: 873 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  { name: "desktop", opts: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
];

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } : undefined;
const browser = await chromium.launch({ executablePath: EXE, ...(proxy ? { proxy } : {}) });
const report = [];
let failures = 0;
const fail = (msg) => { failures++; console.log(`  FAIL ${msg}`); };

for (const vp of VIEWPORTS) {
  // ignoreHTTPSErrors: solo per il proxy TLS della sandbox (Google Fonts); il sito locale è HTTP.
  const ctx = await browser.newContext({ ...vp.opts, locale: "it-IT", timezoneId: "Europe/Rome", ignoreHTTPSErrors: true });
  for (const pg of PAGES) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    const res = await page.goto(BASE + pg.path, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      crest: (() => { const i = document.querySelector('header img[alt^="Stemma ufficiale"]'); if (!i) return false; const r = i.getBoundingClientRect(); return r.width > 10 && r.height > 10 && i.complete && i.naturalWidth > 0; })(),
      sdc: (document.body.innerText.match(/S\.D\.C\./g) ?? []).length,
      scd: (document.body.innerText.match(/S\.C\.D\. ColicoDerviese/g) ?? []).length,
      demo: document.body.innerText.includes("DEMO · ANTEPRIMA"),
      reserved: document.body.innerText.includes("Accesso riservato: in arrivo con R20"),
      bottomNav: !!document.querySelector('nav[aria-label="Navigazione Super App"]') && getComputedStyle(document.querySelector('nav[aria-label="Navigazione Super App"]')).display !== "none",
      text: document.body.innerText,
      week: [...document.querySelectorAll("[data-day]")].map((d) => ({ day: d.getAttribute("data-day"), n: Number(d.getAttribute("data-count")), text: d.innerText.replace(/\s+/g, " ") })),
      today: document.querySelector('[data-testid="today-centre"]')?.innerText.replace(/\s+/g, " ") ?? null,
      next: document.querySelector('[data-testid="next-match"]')?.innerText.replace(/\s+/g, " ").slice(0, 300) ?? null,
      origin: document.querySelector("[data-calendar-origin]")?.getAttribute("data-calendar-origin") ?? null,
    }));
    const file = join(OUT, `${vp.name}-${pg.slug}.png`);
    await page.screenshot({ path: file, fullPage: true });
    await page.screenshot({ path: join(OUT, `${vp.name}-${pg.slug}-top.png`) });
    const row = { viewport: vp.name, path: pg.path, status: res?.status(), overflow: m.overflow, crest: m.crest, sdc: m.sdc, scd: m.scd, errors, origin: m.origin, demo: m.demo, reserved: m.reserved, bottomNav: m.bottomNav };
    console.log(`${vp.name} ${pg.path} status=${row.status} overflow=${m.overflow} crest=${m.crest} sdc=${m.sdc} errors=${errors.length} bottomNav=${m.bottomNav}${m.origin ? ` origin=${m.origin}` : ""}`);
    if (row.status !== 200) fail(`${pg.path} status ${row.status}`);
    if (m.overflow > 0) fail(`${vp.name} ${pg.path} horizontal overflow ${m.overflow}px`);
    if (!m.crest) fail(`${vp.name} ${pg.path} crest not visible`);
    if (m.sdc > 0) fail(`${vp.name} ${pg.path} contains S.D.C.`);
    if (errors.length) fail(`${vp.name} ${pg.path} console errors: ${errors.join(" | ").slice(0, 400)}`);
    if (vp.name === "mobile" && !m.bottomNav) fail(`mobile ${pg.path} bottom nav missing`);
    if (vp.name === "desktop" && m.bottomNav) fail(`desktop ${pg.path} bottom nav visible`);
    if (pg.path.startsWith("/core") || pg.path === "/grow") { if (!m.demo) fail(`${pg.path} missing DEMO · ANTEPRIMA`); }
    if (pg.path.startsWith("/core/") && pg.path !== "/core/impianti-calendari" && !m.reserved) fail(`${pg.path} missing R20 reserved note`);
    if (pg.slug === "home") {
      row.week = m.week; row.today = m.today; row.next = m.next;
      const wk = m.week.filter((d) => d.day >= "2026-10-05" && d.day <= "2026-10-11");
      const total = wk.reduce((n, d) => n + d.n, 0);
      const sat = m.week.find((d) => d.day === "2026-10-10");
      console.log(`  week 5–11 Oct: ${total} items; Sat 10/10: ${sat?.n} → ${sat?.text}`);
      console.log(`  today centre: ${m.today}`);
      console.log(`  next match: ${m.next}`);
      if (total !== 10) fail(`home week total ${total} != 10`);
      if (sat?.n !== 3) fail(`home Sat 10/10 items ${sat?.n} != 3`);
      for (const k of ["MEDA", "MISSAGLIA", "MANDELLO"]) if (!sat?.text.toUpperCase().includes(k)) fail(`home Sat missing ${k}`);
      if (!/MISSAGLIA/i.test(m.today ?? "") || !/MANDELLO/i.test(m.today ?? "")) fail("today centre missing home matches");
      if (/MEDA/i.test(m.today ?? "")) fail("today centre lists away match");
    }
    if (pg.slug === "calendario-stagione") {
      const mm = m.text.match(/Tutta la stagione [^\n]*?(\d+) gare/);
      row.seasonCount = mm ? Number(mm[1]) : null;
      console.log(`  season count: ${row.seasonCount}`);
      if (row.seasonCount !== 156) fail(`season count ${row.seasonCount} != 156`);
    }
    report.push(row);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
console.log(failures ? `QA FAILED: ${failures} problem(s)` : "QA PASSED");
process.exit(failures ? 1 : 0);

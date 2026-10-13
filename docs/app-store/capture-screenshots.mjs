// Store screenshots from the published web app (App Store 6.9" / 6.5", Google Play phone 1080x1920).
// Usage (from the repository root):
//   PLAYWRIGHT=/path/to/playwright/index.mjs node docs/app-store/capture-screenshots.mjs [baseUrl]
// Only public pages; consent/onboarding preset so banners do not cover the content. No login, no personal data.
import fs from "node:fs";
import path from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT || "playwright");
const BASE = process.argv[2] || "https://scd-superapp-staging.onrender.com";
const ROOT = process.cwd();
const PAGES = [
  ["1-home", "/"],
  ["2-calendario", "/calendario"],
  ["3-fantacalcio", "/fantacalcio"],
  ["4-top11", "/top11"],
  ["5-rassegna", "/rassegna-stampa"],
  ["6-guida", "/guida"],
];
const UA = {
  ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
};
const SETS = [
  { dir: "docs/app-store/screenshots/iphone-6.9", width: 440, height: 956, scale: 3, ua: "ios" }, // 1320x2868
  { dir: "docs/app-store/screenshots/iphone-6.5", width: 414, height: 896, scale: 3, ua: "ios" }, // 1242x2688
  { dir: "docs/play-store/screenshots/phone-1080x1920", width: 432, height: 768, scale: 2.5, ua: "android" }, // 1080x1920
];

const browser = await chromium.launch();
try {
  for (const set of SETS) {
    const outDir = path.join(ROOT, set.dir);
    fs.mkdirSync(outDir, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: set.width, height: set.height },
      deviceScaleFactor: set.scale,
      isMobile: true,
      hasTouch: true,
      userAgent: UA[set.ua],
      locale: "it-IT",
      timezoneId: "Europe/Rome",
      colorScheme: "light",
    });
    await context.addInitScript(() => {
      try {
        localStorage.setItem("scd-consent", JSON.stringify({ v: 1, stats: false, mkt: false, ts: "2026-10-13T00:00:00Z" }));
        localStorage.setItem("scd-onb", "1");
      } catch {
        /* storage blocked: banners may appear */
      }
    });
    const page = await context.newPage();
    for (const [name, route] of PAGES) {
      const response = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 120_000 });
      if (!response || response.status() !== 200) throw new Error(`${route} answered ${response?.status()}`);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outDir, `${name}.png`), animations: "disabled" });
      console.log(`${set.dir}/${name}.png`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

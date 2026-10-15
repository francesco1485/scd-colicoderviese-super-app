import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const src = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("sponsor LED spots in the UI (UD-119)", () => {
  const ui = src("./SponsorSpots.tsx");

  it("no vetrine (Francesco 15/10/2026): no rotating spot block anywhere in the app, no partner band on /sponsor", () => {
    expect(ui).not.toMatch(/export function SponsorSpotsHome|In onda ora sul LED wall|Torna alla diretta|mayAnimate/);
    const sponsor = src("../routes/sponsor.tsx");
    expect(sponsor).not.toMatch(/<PartnerBand|<LedwallFacsimile|<LedwallRotator|<SponsorSpotsHome/);
    expect(existsSync(fileURLToPath(new URL("./sponsor/PartnerBand.tsx", import.meta.url)))).toBe(false);
    expect(existsSync(fileURLToPath(new URL("./LedwallRotator.tsx", import.meta.url)))).toBe(false);
    expect(existsSync(fileURLToPath(new URL("./LedwallFacsimile.tsx", import.meta.url)))).toBe(false);
  });

  it("spot videos in the app play only after a press: no autoPlay outside SpotStage, which follows the press", () => {
    // SpotStage plays only when `play` is true; the gestionale list sets it from the user's press.
    expect(ui).toContain("<SpotStage spot={spot} play={open} mountVideo={open} controls />");
    expect(ui.match(/autoPlay=/g)).toHaveLength(1);
    expect(ui).toContain("autoPlay={play}");
    const regia = ui.slice(ui.indexOf("export function SpotRegia"), ui.indexOf("export function SpotLedList"));
    expect(regia).not.toMatch(/<video|autoPlay|animate-ping/);
    expect(src("../routes/spot.$slug.tsx")).toContain("<SpotStage spot={spot} play={false} mountVideo controls priority />");
  });

  it("gestionale spot list: inside the existing /crm sponsor tab (no parallel CRM), status badge, flow, note on the register", () => {
    const crm = src("../routes/crm.tsx");
    expect(crm.match(/<SpotLedList /g)).toHaveLength(1);
    expect(crm.indexOf("<SpotLedList")).toBeGreaterThan(crm.indexOf("<PartnerKitGrid />"));
    expect(crm).not.toMatch(/Vetrina/);
    expect(ui).toContain("SPOT_FLOW.map");
    expect(ui).toContain("<SpotStatusBadge status={spot.status} />");
    expect(ui).toContain("lo stato si aggiorna dal gestionale quando sarà attivo il registro spot (migrazione da approvare)".replace(/^l/, "L"));
    expect(ui).toContain("Nessun messaggio parte dall'app");
    expect(ui).toContain("Regia LED wall");
    expect(ui).toContain("Il pubblico non è stimato");
    expect(ui).not.toMatch(/mailto:|\/gestionale\/posta/);
  });

  it("LED player: bare page (no chrome), noindex, master spots only, never MODIFICHE_RICHIESTE, wake lock with fallback", () => {
    const player = src("../routes/ledwall.player.tsx");
    expect(player).toContain('createFileRoute("/ledwall/player")');
    expect(player).toContain("staticData: { bare: true }");
    expect(player).toContain('"noindex, nofollow"');
    expect(player).toContain("ledOnAir(");
    expect(player).toContain("useVideoFormat");
    expect(player).toContain("air.slot % 2");
    expect(player).not.toContain("setActive");
    expect(player).toContain(".master");
    expect(player).not.toContain(".preview");
    expect(player).toContain('wl.request("screen")');
    expect(player).toMatch(/if \(!wl\) return;/);
    const root = src("../routes/__root.tsx");
    expect(root).toMatch(/if \(bare\) \{\s*return \(\s*<QueryClientProvider client=\{queryClient\}>\s*<Outlet \/>\s*<\/QueryClientProvider>/);
  });
});

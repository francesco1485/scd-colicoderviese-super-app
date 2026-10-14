import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const src = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("sponsor LED spots in the UI (UD-119)", () => {
  const ui = src("./SponsorSpots.tsx");

  it("home block: right after the support strip, once, with the partner line, the partner link and the LED wall CTA", () => {
    const home = src("./home/PublicHome.tsx");
    const body = home.slice(home.indexOf("export function PublicHome"));
    expect(body.match(/<SponsorSpotsHome /g)).toHaveLength(1);
    const strip = body.indexOf("<SupportStrip");
    const spots = body.indexOf("<SponsorSpotsHome");
    expect(strip).toBeGreaterThan(-1);
    expect(spots).toBeGreaterThan(strip);
    expect(body.indexOf("<QuickActions")).toBeGreaterThan(spots);
    expect(ui).toContain("Sul LED wall");
    expect(ui).toContain("Partner della S.C.D. ColicoDerviese");
    expect(ui).toContain("Scopri il partner");
    expect(ui).toContain("Vuoi il tuo spot qui?");
    expect(ui).toMatch(/search=\{\{ pacchetto: "ledwall" \}\}/);
  });

  it("home videos: muted, inline, only the current one mounted, posters first, reduced motion respected, pause control", () => {
    expect(ui).toMatch(/muted\s/);
    expect(ui).toContain("playsInline");
    expect(ui).toContain("mayAnimate(window)");
    expect(ui).toContain("prefers-reduced-motion");
    expect(ui).toContain("const mountVideo = seen && (auto || manualPlay)");
    expect(ui).toContain('data-testid="spot-poster"');
    expect(ui).toContain("aspect-video");
    expect(ui).toContain('aria-label={userPaused ? "Riprendi gli spot" : "Metti in pausa gli spot"}');
    expect(ui).toContain("ledOnAir(");
    expect(ui).toContain("Torna alla diretta");
    expect(ui).toContain("useNow(1000, 0, visible && following)");
    expect(ui).toContain("freeze()");
  });

  it("gestionale vetrina: inside the existing /crm sponsor tab (no parallel CRM), status badge, flow, note on the register", () => {
    const crm = src("../routes/crm.tsx");
    expect(crm.match(/<SpotLedVetrina /g)).toHaveLength(1);
    expect(crm.indexOf("<SpotLedVetrina")).toBeGreaterThan(crm.indexOf("<PartnerKitGrid />"));
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

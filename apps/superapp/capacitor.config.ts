import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native store wrapper for the SCD Super App (UD-008, UD-071; Direzione 13/10/2026).
 *
 * - The wrapper opens the SAME web app served by Render: same accounts (SCD PULSE / Supabase),
 *   same pages, no second system. Change SCD_APP_ORIGIN only together with a new store version.
 * - iOS is the target of this wrapper (App Review 4.2 needs native value: push, camera, Wallet,
 *   offline shell). Android ships as a Trusted Web Activity (Bubblewrap), see PLAY_STORE_SUBMISSION.md;
 *   the android platform is kept only as a fallback.
 * - `webDir` is a generated offline shell (`npm run cap:shell`), never committed: it is shown by
 *   `server.errorPath` when the network or Render is unavailable.
 * - Native folders (ios/, android/) are NOT committed here: they are generated on the build machine
 *   (Mac or cloud build) with `npx cap add ios`. See APP_STORE_SUBMISSION.md.
 */
const SCD_APP_ORIGIN =
  process.env["SCD_APP_ORIGIN"]?.trim() ||
  "https://scd-superapp-staging.onrender.com";

const config: CapacitorConfig = {
  appId: "it.colicoderviese.app",
  appName: "S.C.D. ColicoDerviese",
  webDir: ".output/native-shell",
  backgroundColor: "#062a52",
  server: {
    url: SCD_APP_ORIGIN,
    cleartext: false,
    errorPath: "index.html",
    allowNavigation: [new URL(SCD_APP_ORIGIN).host],
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#062a52",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#062a52",
    allowMixedContent: false,
  },
};

export default config;

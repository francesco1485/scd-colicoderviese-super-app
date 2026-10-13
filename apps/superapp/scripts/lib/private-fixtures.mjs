// Shared by the launch scripts (L2 a11y audit, L4 presentation screenshots). Private pages are reached by
// client-side navigation while every TanStack server-function call is intercepted and answered with the
// FIXTURES below: invented adult-sounding names, adult teams only (Juniores and Prima Squadra), no real
// person, nothing read from or written to any database. Writes (non-GET calls) are always aborted.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { toCrossJSON } from "seroval";

/** Server-function id -> exported name, read from the build's resolver manifest. */
export function serverFnNames() {
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
export const FIXTURES = {
  // Sign-in screen as it looks once the club database is connected (signed out, nothing pre-filled).
  accedi: {
    getSession: { configured: true, user: null, roles: [], landing: "/aree", badge: null, hasPassword: false, memberships: [] },
  },
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

/**
 * Opens `path` on a page whose server functions are answered by `fx` (fixture set). Unknown GET calls pass
 * through to the local server; any other method is aborted so nothing can be written. Returns the names
 * of the functions that passed through.
 */
export async function openWithFixtures(page, { base, path, fx, fnNames, ready }) {
  const passthrough = new Set();
  await page.route("**/_serverFn/**", async (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    const name = fnNames.get(id) ?? id;
    if (!(name in fx)) {
      if (route.request().method() !== "GET") return route.abort(); // never let a write through
      passthrough.add(name);
      return route.continue();
    }
    const body = JSON.stringify(toCrossJSON({ result: fx[name], error: undefined, context: {} }, { refs: new Map() }));
    return route.fulfill({ status: 200, headers: { "content-type": "application/json", "x-tss-serialized": "true", "cache-control": "no-store" }, body });
  });
  await page.goto(`${base}/guida`, { waitUntil: "networkidle" });
  await page.evaluate((to) => window.__TSR_ROUTER__.navigate({ href: to }), path);
  if (ready) await page.waitForSelector(ready, { timeout: 20000 });
  return passthrough;
}

/**
 * UD-100 (Direzione 13/10/2026): training schedules are inside. The quadro data must never ship in the browser
 * bundle, where anyone could read it in the JS files: it lives in quadro-data.server.ts and reaches members through
 * getTrainingQuadro. This test greps the built client assets (.output/public) for distinctive quadro strings and, as
 * a control that the probe works, finds them in the server build. Run after `npm run build` (npm run test:bundle);
 * skipped when no build is present.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import raw from "@/data/quadro-snapshot-20261009.json";

const APP = resolve(__dirname, "../..");
const PUBLIC_DIR = join(APP, ".output/public");
const SERVER_DIR = join(APP, ".output/server");
const built = existsSync(PUBLIC_DIR) && existsSync(SERVER_DIR);

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.(m?js|json|html|txt|map)$/.test(name)) out.push(p);
  }
  return out;
}

/**
 * ASCII strings that only the quadro carries: its source hash, schema id, the long slot texts and its note.
 * esbuild escapes non-ASCII characters, so only ASCII runs are probed (fragments of longer texts included).
 */
function probes(): string[] {
  const q = raw as { schema: string; note: string; source: { sha256: string }; slots: { fields: { C1: string; C2: string } }[] };
  const texts = [...q.slots.flatMap((s) => [s.fields.C1, s.fields.C2]), ...q.note.split(/[.\n]/)]
    .flatMap((t) => t.split(/[^\x20-\x7e]+/))
    .map((t) => t.trim())
    .filter((t) => t.length >= 22);
  return [...new Set([q.source.sha256, q.schema, ...texts])];
}

describe.skipIf(!built)("client bundle keeps the training quadro out (UD-100)", () => {
  const list = probes();

  it("has distinctive probes", () => {
    expect(list.length).toBeGreaterThanOrEqual(4);
  });

  it("finds the probes in the server build (control)", () => {
    const server = files(SERVER_DIR).map((f) => readFileSync(f, "utf8")).join("\n");
    expect(list.some((p) => server.includes(p))).toBe(true);
  });

  it("finds no quadro string in .output/public", () => {
    const hits: string[] = [];
    for (const f of files(PUBLIC_DIR)) {
      const src = readFileSync(f, "utf8");
      for (const p of list) if (src.includes(p)) hits.push(`${f.slice(PUBLIC_DIR.length)}: ${p.slice(0, 48)}`);
    }
    expect(hits).toEqual([]);
  });
});

describe.skipIf(!built)("client bundle keeps time-limited initiatives out (Direzione 13/10/2026)", () => {
  // Distinctive ASCII strings of initiatives.server.ts: served only by the server functions, inside their window.
  const list = ["+393485200579", "Info e iscrizioni: mister Perico"];

  it("finds the probes in the server build (control)", () => {
    const server = files(SERVER_DIR).map((f) => readFileSync(f, "utf8")).join("\n");
    expect(list.every((p) => server.includes(p))).toBe(true);
  });

  it("finds no initiative string in .output/public", () => {
    const hits: string[] = [];
    for (const f of files(PUBLIC_DIR)) {
      const src = readFileSync(f, "utf8");
      for (const p of list) if (src.includes(p)) hits.push(`${f.slice(PUBLIC_DIR.length)}: ${p}`);
    }
    expect(hits).toEqual([]);
  });
});

describe.skipIf(!built)("client bundle keeps the riders' roster on the server (UD-108)", () => {
  // The roster RPC and the name-gating notes live only in pulmini-vans.functions.ts (server function body).
  const serverOnly = ["scd_transport_rider_roster", "scd_transport_board"];
  // Invented fixture names of the tests: they must never be bundled anywhere.
  const fixtures = ["Fintolini", "FINTOLINI", "Esempietti", "Campionetti"];

  it("finds the roster RPC in the server build (control)", () => {
    const server = files(SERVER_DIR).map((f) => readFileSync(f, "utf8")).join("\n");
    expect(server.includes("scd_transport_rider_roster")).toBe(true);
  });

  it("finds no roster RPC and no fixture name in .output/public", () => {
    const hits: string[] = [];
    for (const f of files(PUBLIC_DIR)) {
      const src = readFileSync(f, "utf8");
      for (const p of [...serverOnly, ...fixtures]) if (src.includes(p)) hits.push(`${f.slice(PUBLIC_DIR.length)}: ${p}`);
    }
    expect(hits).toEqual([]);
  });
});

describe.skipIf(!built)("client bundle keeps the vetrina catalogue on the server (UD-110)", () => {
  // Distinctive strings of vetrina-slots.server.ts: the browser only receives the slots picked for the day.
  const list = ["Prova la Scuola Calcio", "Entra tra i tifosi"];

  it("finds the probes in the server build (control)", () => {
    const server = files(SERVER_DIR).map((f) => readFileSync(f, "utf8")).join("\n");
    expect(list.every((p) => server.includes(p))).toBe(true);
  });

  it("finds no catalogue string in .output/public", () => {
    const hits: string[] = [];
    for (const f of files(PUBLIC_DIR)) {
      const src = readFileSync(f, "utf8");
      for (const p of list) if (src.includes(p)) hits.push(`${f.slice(PUBLIC_DIR.length)}: ${p}`);
    }
    expect(hits).toEqual([]);
  });
});

describe.skipIf(!built)("client bundle keeps the lotteria RPCs on the server (UD-115, r102)", () => {
  // Write RPC names live only inside server-function handlers (lottery.functions.ts).
  const list = ["scd_lottery_save_setup", "scd_lottery_record_draw", "scd_lottery_confirm_winners", "scd_lottery_public"];

  it("finds the RPC names in the server build (control)", () => {
    const server = files(SERVER_DIR).map((f) => readFileSync(f, "utf8")).join("\n");
    expect(list.every((p) => server.includes(p))).toBe(true);
  });

  it("finds no lotteria RPC name in .output/public", () => {
    const hits: string[] = [];
    for (const f of files(PUBLIC_DIR)) {
      const src = readFileSync(f, "utf8");
      for (const p of list) if (src.includes(p)) hits.push(`${f.slice(PUBLIC_DIR.length)}: ${p}`);
    }
    expect(hits).toEqual([]);
  });
});

describe.skipIf(!built)("client bundle keeps the showcase RPCs on the server (UD-168, r142)", () => {
  // The database function names and the private columns are only in the server functions; the browser receives the
  // already masked payload. The probes must not appear in .output/public.
  const list = ["scd_public_team_showcase", "scd_staff_set_team_roles", "scd_staff_team_roles"];

  it("finds the probes in the server build (control)", () => {
    const server = files(SERVER_DIR).map((f) => readFileSync(f, "utf8")).join("\n");
    expect(list.every((p) => server.includes(p))).toBe(true);
  });

  it("finds no showcase RPC name in .output/public", () => {
    const hits: string[] = [];
    for (const f of files(PUBLIC_DIR)) {
      const src = readFileSync(f, "utf8");
      for (const p of list) if (src.includes(p)) hits.push(`${f.slice(PUBLIC_DIR.length)}: ${p}`);
    }
    expect(hits).toEqual([]);
  });
});

describe.skipIf(!built)("client bundle keeps the staff directory and its numbers on the server (UD-167, r141)", () => {
  // The directory (names, roles, consented numbers) is read only inside server-function handlers
  // (staff-directory.functions.ts, assistant.functions.ts) with the caller's session; the office phone read too.
  const list = ["scd_staff_directory", "scd_set_my_phone_share", "scd_person_phone"];

  it("finds the RPC names in the server build (control)", () => {
    const server = files(SERVER_DIR).map((f) => readFileSync(f, "utf8")).join("\n");
    expect(list.every((p) => server.includes(p))).toBe(true);
  });

  it("finds no staff directory RPC in .output/public", () => {
    const hits: string[] = [];
    for (const f of files(PUBLIC_DIR)) {
      const src = readFileSync(f, "utf8");
      for (const p of list) if (src.includes(p)) hits.push(`${f.slice(PUBLIC_DIR.length)}: ${p}`);
    }
    expect(hits).toEqual([]);
  });
});

#!/usr/bin/env node
/**
 * Ingestion of official LND standings and results (UD-182, Francesco DG 17/10/2026 «ok classifiche LND").
 *
 * Reads gare.lnd.it for the 4 championships and 3 cups of LND_COMPETITIONS (src/lib/lnd-standings.ts) and builds the
 * snapshot src/data/classifiche-lnd-snapshot.json: standings rows exactly as LND publishes them, our played matches with
 * the official score, source URL and fetch time. Nothing is computed or filled in: if a page cannot be read, that part
 * stays missing with a note.
 *
 * Usage (from apps/superapp):
 *   NODE_USE_ENV_PROXY=1 node --experimental-strip-types scripts/ingest-lnd-standings.mjs            # print to stdout
 *   NODE_USE_ENV_PROXY=1 node --experimental-strip-types scripts/ingest-lnd-standings.mjs --write    # write snapshot
 *   node --experimental-strip-types scripts/ingest-lnd-standings.mjs --html-dir DIR                  # offline, saved pages
 *     DIR holds {CODE}_{GROUP}.html, md/{CODE}_{GROUP}_{N}_{leg}.html and api_{CODE}_{GROUP}.json
 *
 * Not scheduled. Planned schedule (LND_REFRESH_PLAN): every 6 hours, every hour from Friday 18:00 to Monday 12:00
 * (Europe/Rome). After migration r116 is applied the same output goes to scd_standings_snapshots and the official
 * fields of scd_matches with the service role key held by the job runner; this script never holds a key.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  LND_COMPETITIONS,
  LND_REFRESH_PLAN,
  LND_SNAPSHOT_SCHEMA,
  competitionUrl,
  ourPlayedMatches,
  parseLndPage,
  parseLndStandingsJson,
  standingsApiUrl,
} from "../src/lib/lnd-standings.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../src/data/classifiche-lnd-snapshot.json");
const args = process.argv.slice(2);
const write = args.includes("--write");
const htmlDirIdx = args.indexOf("--html-dir");
const htmlDir = htmlDirIdx >= 0 ? resolve(args[htmlDirIdx + 1] ?? ".") : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, offlineName) {
  if (htmlDir) {
    const p = join(htmlDir, offlineName);
    if (!existsSync(p)) throw new Error(`offline file missing: ${offlineName}`);
    return readFileSync(p, "utf8");
  }
  let last;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "SCD-ColicoDerviese-app/1.0 (classifiche ufficiali LND)", accept: "text/html,application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      last = e;
      await sleep(1500 * (i + 1));
    }
  }
  throw new Error(`${url}: ${last?.message ?? last}`);
}

/** Page with a retry when LND answers with its "momentaneamente non raggiungibile" page. */
async function page(url, offlineName) {
  let last;
  for (let i = 0; i < (htmlDir ? 1 : 4); i++) {
    try {
      return parseLndPage(await get(url, offlineName));
    } catch (e) {
      last = e;
      if (!htmlDir) await sleep(4000);
    }
  }
  throw last;
}

async function competition(ref) {
  const key = `${ref.championship}_${ref.group}`;
  const sourceUrl = competitionUrl(ref);
  const out = {
    id: ref.id,
    team: ref.team,
    kind: ref.kind,
    label: ref.label,
    group_label: ref.groupLabel,
    source_url: sourceUrl,
    fetched_at: new Date().toISOString(),
    standings: null,
    standings_note: ref.hasStandings ? null : "Coppa: la LND non pubblica una classifica del girone",
    results: [],
    results_note: null,
  };
  let main = null;
  try {
    main = await page(sourceUrl, `${key}.html`);
  } catch (e) {
    out.results_note = `Pagina LND non leggibile: ${e.message}`;
  }
  if (ref.hasStandings) {
    try {
      out.standings = parseLndStandingsJson(await get(standingsApiUrl(ref), `api_${key}.json`));
    } catch (e) {
      if (main?.standings.length) out.standings = main.standings;
      else out.standings_note = `Classifica non leggibile: ${e.message}`;
    }
    if (out.standings && out.standings.length === 0) {
      out.standings = null;
      out.standings_note = "La LND non ha ancora pubblicato la classifica";
    }
  }
  if (main) {
    const days = main.matchdays;
    const cur = main.currentMatchday;
    const upto = cur ? days.findIndex((d) => d.number === cur.number && d.leg === cur.leg) : days.length - 1;
    const seen = new Set();
    for (const d of days.slice(0, upto + 1)) {
      try {
        const md = await page(competitionUrl(ref, d), join("md", `${key}_${d.number}_${d.leg}.html`));
        for (const m of ourPlayedMatches(md.matches)) {
          if (seen.has(m.lndMatchId) || !m.date) continue;
          seen.add(m.lndMatchId);
          out.results.push({
            lnd_match_id: m.lndMatchId,
            matchday: d.number,
            leg: d.leg,
            date: m.date,
            time: m.time,
            home: m.home,
            away: m.away,
            home_goals: m.homeGoals,
            away_goals: m.awayGoals,
            lnd_label: m.label,
          });
        }
      } catch (e) {
        out.results_note = `Giornata ${d.number} (${d.leg}) non leggibile: ${e.message}`;
      }
      if (!htmlDir) await sleep(400);
    }
    out.results.sort((a, b) => b.date.localeCompare(a.date));
  }
  return out;
}

const competitions = [];
for (const ref of LND_COMPETITIONS) competitions.push(await competition(ref));

const snapshot = {
  schema: LND_SNAPSHOT_SCHEMA,
  season: "2026/27",
  source: "gare.lnd.it — LND, Comitato Regionale Lombardia",
  fetched_at: competitions.map((c) => c.fetched_at).sort().at(-1),
  refresh_plan: LND_REFRESH_PLAN,
  competitions,
};

const json = `${JSON.stringify(snapshot, null, 2)}\n`;
if (write) {
  writeFileSync(OUT, json);
  console.error(`written ${OUT}`);
} else {
  process.stdout.write(json);
}
for (const c of competitions) {
  console.error(`${c.id}: standings ${c.standings ? c.standings.length : "—"} rows, results ${c.results.length}${c.standings_note ? `, note: ${c.standings_note}` : ""}${c.results_note ? `, note: ${c.results_note}` : ""}`);
}

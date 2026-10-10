// @ts-expect-error bun runtime types not installed
import { describe, expect, test } from "bun:test";
import bundled from "@/data/calendario-snapshot-20261009.json";
import { validateMirror } from "./calendar-mirror";
import { createCachedSource, fetchMirror } from "./calendar-bridge.server";

const clone = () => JSON.parse(JSON.stringify(bundled));
const FUTURE = {
  id: "EVT-TEST-20270301-FIXTURE", date: "2027-03-01", time: "15:00", end: "", category: "Esordienti 11 anni (2015)",
  group: "2015", type: "AMICHEVOLE", home_away: "CASA", venue: "Campo di prova", opponent: "SQUADRA DI PROVA",
  round: "", source: "SCD", notice: [], match_status: "CLUB_EVENT", is_variation: false,
  verification: { time_confirmed: false, venue_confirmed: false, facility_review_required: false },
};

/** Server HTTP locale che simula la copia Drive. */
function fixture() {
  let body: string = JSON.stringify(bundled);
  let up = true;
  // @ts-expect-error Bun global
  const server = Bun.serve({ port: 0, fetch: () => (up ? new Response(body, { headers: { "content-type": "application/octet-stream" } }) : new Response("no", { status: 503 })) });
  return { url: `http://localhost:${server.port}/mirror.json`, set: (o: unknown) => { body = JSON.stringify(o); }, down: () => { up = false; }, stop: () => server.stop() };
}

describe("validazione copia pubblica", () => {
  test("la copia RC3 inclusa è accettata", () => expect(validateMirror(bundled)).toEqual({ ok: true }));
  test("rifiuta email/telefono in un campo", () => {
    const a = clone(); a.events[0].venue = "info mario.rossi@example.com"; expect(validateMirror(a).ok).toBe(false);
    const b = clone(); b.events[0].opponent = "chiama 333 1234567"; expect(validateMirror(b).ok).toBe(false);
  });
  test("rifiuta ID duplicato", () => { const a = clone(); a.events.push(a.events[0]); expect(validateMirror(a).ok).toBe(false); });
  test("rifiuta dati più vecchi della copia di sicurezza", () => { const a = clone(); a.source_modified_at = "2026-10-01T00:00:00Z"; expect(validateMirror(a).ok).toBe(false); });
  test("rifiuta campi sconosciuti, HTML e verification mancante", () => {
    const a = clone(); a.events[0].telefono_genitore = "x"; expect(validateMirror(a).ok).toBe(false);
    const b = clone(); b.events[0].venue = "<script>x</script>"; expect(validateMirror(b).ok).toBe(false);
    const c = clone(); delete c.events[0].verification; expect(validateMirror(c).ok).toBe(false);
  });
  test("rifiuta master diverso, schema diverso o evento ritirato", () => {
    const a = clone(); a.source_file_id = "altro"; expect(validateMirror(a).ok).toBe(false);
    const b = clone(); b.schema = "v2"; expect(validateMirror(b).ok).toBe(false);
    const c = clone(); c.events[0].match_status = "RITIRATA"; expect(validateMirror(c).ok).toBe(false);
  });
});

describe("ponte con cache 5 minuti", () => {
  test("aggiornamento della copia letto dopo la scadenza cache, senza rebuild", async () => {
    const f = fixture();
    let t = 0;
    const src = createCachedSource([f.url], undefined, () => t);
    const first = await src();
    expect(first.origin).toBe("mirror");
    expect(first.events.length).toBe(156);
    const upd = clone(); upd.source_modified_at = "2026-10-10T08:00:00.000Z"; upd.events.push(FUTURE); f.set(upd);
    t = 4 * 60_000; expect((await src()).events.length).toBe(156); // ancora in cache
    t = 5 * 60_000 + 1; const fresh = await src();
    expect(fresh.events.length).toBe(157);
    expect(fresh.sourceModifiedAt).toBe("2026-10-10T08:00:00.000Z");
    f.stop();
  });
  test("rete giù: copia di sicurezza RC3 visibile", async () => {
    const f = fixture(); f.down();
    const r = await fetchMirror([f.url]);
    expect(r.origin).toBe("fallback");
    expect(r.events.length).toBe(156);
    f.stop();
    const off = await fetchMirror(["http://127.0.0.1:1/none"]);
    expect(off.origin).toBe("fallback");
  });
  test("copia con PII rifiutata: resta la copia di sicurezza", async () => {
    const f = fixture(); const bad = clone(); bad.events[3].venue = "RSSMRA80A01H501U"; f.set(bad);
    const r = await fetchMirror([f.url]);
    expect(r.origin).toBe("fallback");
    expect(r.reason).toContain("rifiutata");
    f.stop();
  });
  test("pagina HTML (avviso Drive) non accettata", async () => {
    const fake = async () => new Response("<html>", { headers: { "content-type": "text/html" } });
    expect((await fetchMirror(["x"], fake)).origin).toBe("fallback");
  });
});

describe("ultima copia verificata (lastGood)", () => {
  const at = (iso: string, extra = false) => { const o = clone(); o.source_modified_at = iso; if (extra) o.events.push(FUTURE); return o; };
  test("v1 valida -> v2 valida -> rete giù: resta v2 come 'stale'", async () => {
    const f = fixture(); let t = 0;
    const src = createCachedSource([f.url], undefined, () => t);
    f.set(at("2026-10-10T08:00:00.000Z")); expect((await src()).origin).toBe("mirror");
    t = 6 * 60_000; f.set(at("2026-10-10T09:00:00.000Z", true)); const v2 = await src();
    expect(v2.origin).toBe("mirror"); expect(v2.events.length).toBe(157);
    t = 12 * 60_000; f.down(); const s = await src();
    expect(s.origin).toBe("stale");
    expect(s.sourceModifiedAt).toBe("2026-10-10T09:00:00.000Z");
    expect(s.events.length).toBe(157);
    f.stop();
  });
  test("avvio con rete giù: copia di sicurezza inclusa", async () => {
    const src = createCachedSource(["http://127.0.0.1:1/none"], undefined, () => 0);
    const r = await src(); expect(r.origin).toBe("fallback"); expect(r.events.length).toBe(156);
  });
  test("dopo una copia valida: PII, HTML o copia più vecchia non degradano", async () => {
    const f = fixture(); let t = 0;
    const src = createCachedSource([f.url], undefined, () => t);
    f.set(at("2026-10-10T09:00:00.000Z", true)); await src();
    const bad = at("2026-10-11T00:00:00.000Z"); bad.events[0].venue = "scrivi a x@y.it"; f.set(bad);
    t = 6 * 60_000; let r = await src(); expect(r.origin).toBe("stale"); expect(r.events.length).toBe(157);
    f.set(at("2026-10-10T08:30:00.000Z"));
    t = 12 * 60_000; r = await src(); expect(r.sourceModifiedAt).toBe("2026-10-10T09:00:00.000Z"); expect(r.events.length).toBe(157);
    f.stop();
  });
  test("Verifica forzata: al massimo una ogni 30 s, una sola lettura in corso", async () => {
    let calls = 0;
    const fake = async () => { calls++; return new Response(JSON.stringify(bundled), { headers: { "content-type": "application/json" } }); };
    let t = 0;
    const src = createCachedSource(["x"], fake, () => t);
    await Promise.all([src(), src(), src()]); expect(calls).toBe(1);
    t = 10_000; expect((await src({ force: true })).throttled).toBe(true); expect(calls).toBe(1);
    t = 31_000; await src({ force: true }); expect(calls).toBe(2);
  });
});

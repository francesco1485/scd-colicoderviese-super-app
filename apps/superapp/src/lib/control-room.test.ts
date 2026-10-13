import { describe, expect, it } from "vitest";

import {
  CONTROL_ROOM_ROWS,
  CONTROL_ROOM_TABS,
  MOBILE_TILE_ORDER,
  TILE_IDS,
  buildAlerts,
  buildTasks,
  facilityToday,
  nextHomeMatch,
  rowSpans,
  sourceChecks,
  statusTone,
  systemStatus,
  tileVisibility,
  todayAgenda,
  type ControlRoomSources,
  type SourceCheck,
} from "./control-room";
import type { Proposal } from "./proposals";
import type { PublicEvent, TrainingSlot } from "./public-snapshots";

const TODAY = "2026-10-13"; // Tuesday
const NOW = "2026-10-13T13:00:00.000Z";

function ev(over: Partial<PublicEvent>): PublicEvent {
  return {
    id: "EVT-1", date: "2026-10-17", time: "15:00", group: "u15", category: "U15", type: "CAMPIONATO", homeAway: "CASA",
    opponent: "AVVERSARIO", venue: "COLICO - CAMPO 1", round: "", source: "", status: "", isVariation: false, notice: [],
    timeConfirmed: true, venueConfirmed: true, facilityReview: false, ...over,
  };
}

function slot(day: string, timeLabel: string, c1: string, c2 = ""): TrainingSlot {
  const [h, m] = timeLabel.split("–")[0]!.split(":").map(Number) as [number, number];
  return { day, timeLabel, start: h * 60 + m, fields: { C1: c1, C2: c2 }, rooms: { SP1: "", SP2: "", SP3: "", SP4: "" } };
}

function prop(over: Partial<Proposal>): Proposal {
  return {
    id: "00000000-0000-0000-0000-000000000001", machine: "M1", area: "segreteria", kind: "RICHIESTA", title: "Voce", reason: null,
    reserved: false, sourceKind: "MAIL", sourceUrl: null, sourceAt: null, mailbox: null, targetRef: null, targetLabel: null,
    targetState: null, confidence: null, status: "NEW", mine: false, assigned: false, dueAt: null, snoozeUntil: null,
    decidedAt: null, decisionNote: null, createdAt: "2026-10-10T08:00:00Z", open: true, ...over,
  } as Proposal;
}

const OFF = { connected: false, error: null } as const;

function base(over: Partial<ControlRoomSources> = {}): ControlRoomSources {
  return {
    today: TODAY, nowHHMM: "15:00", nowIso: NOW,
    calendar: null, quadro: null,
    queue: { ...OFF, queue: null }, inbox: { ...OFF, inbox: null }, fees: { ...OFF, board: null },
    transport: { ...OFF, board: null }, due: { ...OFF, result: null },
    ...over,
  };
}

const label = (id: string) => id.toUpperCase();

describe("statusTone", () => {
  it("maps every status to one semantic tone", () => {
    expect(statusTone("proposal", "NEEDS_INFO")).toBe("warn");
    expect(statusTone("proposal", "ACCEPTED")).toBe("ok");
    expect(statusTone("proposal", "NEW")).toBe("info");
    expect(statusTone("run", "CONFERMATA")).toBe("ok");
    expect(statusTone("run", "PIANIFICATA")).toBe("warn");
    expect(statusTone("run", "ANNULLATA")).toBe("crit");
    expect(statusTone("check", "error")).toBe("crit");
    expect(statusTone("check", "off")).toBe("mute");
  });
  it("never paints an unknown status green", () => {
    expect(statusTone("proposal", "BOH" as never)).toBe("mute");
  });
});

describe("tileVisibility", () => {
  it("shows only the source panel when nothing is readable", () => {
    const v = tileVisibility(base());
    expect(TILE_IDS.filter((id) => v[id].visible)).toEqual(["fonti"]);
    expect(v.pulmini.reason).toMatch(/non leggibili/);
  });
  it("opens calendar tiles with the calendar and the match day only with a home match within 7 days", () => {
    const near = tileVisibility(base({ calendar: { events: [ev({})], groups: [], sourceModifiedAt: NOW, season: "2026/27" } }));
    expect(near.oggi.visible && near.settimana.visible && near.eventi.visible && near.matchday.visible).toBe(true);
    expect(near.impianti.visible).toBe(false);
    const far = tileVisibility(base({ calendar: { events: [ev({ date: "2026-10-30" })], groups: [], sourceModifiedAt: NOW, season: "2026/27" } }));
    expect(far.matchday.visible).toBe(false);
    const away = tileVisibility(base({ calendar: { events: [ev({ homeAway: "FUORI", venue: "LECCO" })], groups: [], sourceModifiedAt: NOW, season: "2026/27" } }));
    expect(away.matchday.visible).toBe(false);
  });
  it("needs a connected source with data, not just a connection", () => {
    const v = tileVisibility(base({ inbox: { connected: true, error: null, inbox: null }, queue: { connected: true, error: "x", queue: null } }));
    expect(v.posta.visible).toBe(false);
    expect(v.pratiche.visible).toBe(false);
  });
});

describe("rowSpans", () => {
  it("always fills the 12 columns with the visible tiles", () => {
    for (const row of CONTROL_ROOM_ROWS) {
      for (let mask = 1; mask < 1 << row.length; mask++) {
        const vis = new Set(row.filter((_, i) => mask & (1 << i)).map(([id]) => id));
        const spans = rowSpans(row, (id) => vis.has(id));
        expect(spans.reduce((n, [, s]) => n + s, 0)).toBe(12);
        expect(spans.map(([id]) => id)).toEqual(row.filter(([id]) => vis.has(id)).map(([id]) => id));
      }
    }
    expect(rowSpans(CONTROL_ROOM_ROWS[0]!, () => false)).toEqual([]);
  });
  it("puts Oggi, Alert and Task first on phones and lists every tile once", () => {
    expect(MOBILE_TILE_ORDER.slice(0, 3)).toEqual(["oggi", "alert", "task"]);
    expect([...MOBILE_TILE_ORDER].sort()).toEqual([...TILE_IDS].sort());
  });
});

describe("sourceChecks and systemStatus", () => {
  it("is 'attivo' only when every source answered and is fresh", () => {
    const ok: SourceCheck[] = [{ id: "coda", label: "a", state: "ok", at: null, detail: "" }];
    expect(systemStatus(ok).level).toBe("ok");
    expect(systemStatus(ok).label).toBe("Sistema operativo attivo");
    expect(systemStatus([...ok, { id: "posta", label: "b", state: "stale", at: null, detail: "" }]).level).toBe("partial");
    expect(systemStatus([{ id: "posta", label: "b", state: "off", at: null, detail: "" }]).level).toBe("down");
    expect(systemStatus([]).level).toBe("down");
  });
  it("judges freshness, missing access and errors", () => {
    const checks = sourceChecks(
      base({
        calendar: { events: [], groups: [], sourceModifiedAt: "2026-09-01T00:00:00Z", season: "2026/27" },
        queue: { connected: true, error: "Lettura non riuscita", queue: null },
        fees: { connected: true, error: null, board: null },
        inbox: {
          connected: true, error: null,
          inbox: { me: null, offices: [], threads: [], proposals: [], settings: { mailbox: "m", sendingEnabled: true, gmailConnected: false, connectedAt: null, dailyCap: 400, lastSyncAt: NOW, sentToday: 0, queued: 0, failedToday: 0 } },
        },
      }),
    );
    const by = Object.fromEntries(checks.map((c) => [c.id, c.state]));
    expect(by).toMatchObject({ calendario: "stale", quadro: "off", coda: "error", quote: "off", posta: "off", pulmini: "off" });
  });
});

describe("buildAlerts", () => {
  it("lists real problems, critical first, with counts and no names", () => {
    const alerts = buildAlerts(
      base({
        pendingAccess: 2,
        queue: { connected: true, error: null, queue: { canReadReserved: true, items: [prop({ dueAt: "2026-10-12T08:00:00Z" }), prop({ id: "2", status: "NEEDS_INFO" }), prop({ id: "3", open: false, status: "ACCEPTED", dueAt: "2026-10-01T00:00:00Z" })] } },
        calendar: { events: [ev({ id: "A", isVariation: true }), ev({ id: "B", timeConfirmed: false }), ev({ id: "C", date: "2026-11-30", isVariation: true })], groups: [], sourceModifiedAt: NOW, season: "2026/27" },
        quadro: { slots: [slot("LUNEDÌ", "17:00–18:30", "U15"), slot("LUNEDÌ", "18:00–19:30", "U16")], days: ["LUNEDÌ"], generatedUTC: NOW },
      }),
      label,
    );
    expect(alerts[0]).toMatchObject({ id: "queue-overdue", tone: "crit", title: "1 voce oltre la scadenza" });
    const ids = alerts.map((a) => a.id);
    expect(ids).toContain("access-pending");
    expect(ids).toContain("queue-info");
    expect(ids).toContain("var-A");
    expect(ids).toContain("conf-B");
    expect(ids).not.toContain("var-C");
    expect(ids.some((i) => i.startsWith("ov-"))).toBe(true);
    expect(alerts.find((a) => a.id === "conf-B")?.title).toBe("Orario da confermare: U15");
  });
  it("is empty when the sources report nothing wrong", () => {
    expect(buildAlerts(base({ calendar: { events: [ev({})], groups: [], sourceModifiedAt: NOW, season: "2026/27" } }), label)).toEqual([]);
  });
});

describe("buildTasks", () => {
  it("merges open proposals and near deadlines, nearest first, skipping snoozed and far items", () => {
    const tasks = buildTasks(
      base({
        queue: { connected: true, error: null, queue: { canReadReserved: true, items: [prop({ id: "a", title: "Senza data" }), prop({ id: "b", title: "Domani", dueAt: "2026-10-14T10:00:00Z" }), prop({ id: "c", title: "Rinviata", status: "SNOOZED", dueAt: "2026-10-13T10:00:00Z" })] } },
        due: { connected: true, error: null, result: { level: "INTERNO", counts: {}, items: [
          { id: "k1", kind: "DOCUMENTO", area: "segreteria", season: null, title: "Oggi", summary: null, entity: null, date: null, due: "2026-10-13", status: null, amount: null, source: "x", link: "https://example.org/x", tags: [] },
          { id: "k2", kind: "DOCUMENTO", area: "segreteria", season: null, title: "Lontana", summary: null, entity: null, date: null, due: "2027-03-01", status: null, amount: null, source: "x", link: null, tags: [] },
        ] as never } },
      }),
    );
    expect(tasks.map((t) => t.title)).toEqual(["Oggi", "Domani", "Senza data"]);
    expect(tasks[0]).toMatchObject({ days: 0, external: true });
    expect(tasks[1]).toMatchObject({ days: 1, href: "/gestionale/coda" });
  });
});

describe("agenda helpers", () => {
  const quadro = { slots: [slot("MARTEDÌ", "17:20–18:50", "Piccoli Amici", "U13"), slot("MARTEDÌ", "19:00–21:00", "Prima Squadra")], days: ["MARTEDÌ"], generatedUTC: NOW };
  it("puts today's trainings and matches in time order", () => {
    const rows = todayAgenda({ today: TODAY, quadro, calendar: { events: [ev({ id: "M", date: TODAY, time: "18:00" })], groups: [], sourceModifiedAt: NOW, season: "2026/27" } }, label);
    expect(rows.map((r) => `${r.time} ${r.kind}`)).toEqual(["17:20 allenamento", "17:20 allenamento", "18:00 gara", "19:00 allenamento"]);
  });
  it("splits today's sessions by field and returns empty fields on weekends", () => {
    const f = facilityToday(quadro.slots, TODAY);
    expect(f.map((x) => x.sessions.length)).toEqual([2, 1]);
    expect(facilityToday(quadro.slots, "2026-10-17").every((x) => x.sessions.length === 0)).toBe(true);
  });
  it("finds the next home match from now", () => {
    const events = [ev({ id: "past", date: TODAY, time: "10:00" }), ev({ id: "next", date: "2026-10-15" }), ev({ id: "later", date: "2026-10-18" })];
    expect(nextHomeMatch(events, TODAY, "15:00")?.id).toBe("next");
  });
});

describe("tabs", () => {
  it("map to internal routes and start from the dashboard", () => {
    expect(CONTROL_ROOM_TABS[0]).toMatchObject({ id: "dashboard", href: "/direzione" });
    expect(new Set(CONTROL_ROOM_TABS.map((t) => t.href)).size).toBe(CONTROL_ROOM_TABS.length);
  });
});

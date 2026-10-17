#!/usr/bin/env python3
"""Iride v5 «conferme gare»: apply the outcomes registered by Iride to the Master Calendario (xlsx), surgically.

Usage:
  python3 -I tools/sync/apply_iride_outcomes.py master.xlsx outcomes.json out.xlsx [--today YYYY-MM-DD]
  python3 -I tools/sync/apply_iride_outcomes.py --self-test

outcomes.json = the records of the Make data store «SCD · Iride · Esiti gare (registro)» as returned by the Make API /
data-store-records_list: [{"key": "...", "data": {"event_id", "azione", "data_gara", "ora_prima", "ora_nuova",
"sede_prima", "sede_nuova", "categoria", "chi_ruolo", "quando", ...}}].

Why surgical: the master is an .xlsx (Drive file 1eXS-kY5PCHFg4CXiAErNAKtIVEMIKgWs, sheet "MASTER EVENTI"); Make's Google
Sheets modules cannot write an Office file, and saving it with openpyxl would drop shapes and the cached values of the
formulas. This script rewrites only the touched <c> cells of the MASTER EVENTI rows inside the zip and copies every other
part byte for byte; workbook.xml gets fullCalcOnLoad so Excel / Google Sheets recompute the dependent views on open.

What an outcome changes (PROPOSED mapping, to be confirmed by Francesco / Segreteria):
- CONFERMA: TIME_STATUS = CONFIRMED, VENUE_STATUS = CONFIRMED, OPERATIONAL_STATUS OFFICIAL_TO_VERIFY / CLUB_TO_VERIFY -> READY
            (the public copy drops "Orario o sede da verificare" and "Attesa verifica"; BLOCKED_CONFLICT stays);
- CAMBIA:   TIME and/or VENUE = the new value, both statuses CONFIRMED, VARIATION = "Variazione SCD dd/mm";
- ANNULLA:  MATCH_STATUS = CANCELLED (already in _CONFIG_EVENTI; calendar_public_payload.py drops it from the app).
Always: NOTES += "Iride dd/mm: <azione> (Resp. attività di base) [IRIDE <hash>]", LAST_VERIFIED = today,
ROW_VERSION + 1, CHANGE_FLAG = IRIDE. Never touched: CONFLICT_STATUS (a field conflict stays open), other rows, other sheets.

Safety: an outcome is skipped (and reported) when the EVENT_ID is missing, the date differs, the master time is no longer
the time Iride showed (someone changed it since), the category is outside the attività di base, the action/time/venue
is not valid, or the [IRIDE <hash>] tag is already in NOTES (idempotent: run it as often as you like).
The hash is sha256(record key)[:10]: the key contains the WhatsApp message id, which encodes a phone number, so the key
itself is never written to the master. Exit 2 = nothing written.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

SHEET = "MASTER EVENTI"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      "rel": "http://schemas.openxmlformats.org/package/2006/relationships"}
SCOPE_RX = re.compile(r"PRIMI\s+CALCI|PICCOLI\s+AMICI|PULCINI|ESORDIENTI", re.I)
HOME_VENUES = {"COLICO - CAMPO 1", "COLICO - CAMPO 2"}
TIME_RX = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")
LABEL = {"CONFERMA": "confermata", "ANNULLA": "annullata", "CAMBIA": "cambiata"}


class Stop(Exception):
    pass


def col_letters(ref: str) -> str:
    return re.match(r"[A-Z]+", ref).group(0)


def col_index(letters: str) -> int:
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def sheet_path(z: zipfile.ZipFile) -> str:
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rid = None
    for s in wb.find("m:sheets", NS):
        if s.get("name") == SHEET:
            rid = s.get("{%s}id" % NS["r"])
    if not rid:
        raise Stop(f"foglio {SHEET!r} non trovato")
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    for r in rels:
        if r.get("Id") == rid:
            t = r.get("Target")
            return t.lstrip("/") if t.startswith("/") else "xl/" + t
    raise Stop("relazione del foglio non trovata")


def shared_strings(z: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in z.namelist():
        return []
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    return ["".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])) for si in root.findall("m:si", NS)]


def cell_value(c: ET.Element, sst: list[str]):
    t = c.get("t")
    if t == "inlineStr":
        return "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
    v = c.find("m:v", NS)
    if v is None:
        return None
    if t == "s":
        return sst[int(v.text)]
    if t in ("str", "b", "e"):
        return v.text
    try:
        return float(v.text)
    except (TypeError, ValueError):
        return v.text


def as_date(v) -> str:
    if isinstance(v, float):
        return (dt.date(1899, 12, 30) + dt.timedelta(days=int(v))).strftime("%d/%m")
    s = str(v or "").strip()
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m:
        return f"{int(m[1]):02d}/{int(m[2]):02d}"
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return f"{m[3]}/{m[2]}"
    return s


def as_time(v) -> str:
    if isinstance(v, float):
        mins = round((v % 1) * 24 * 60)
        return f"{mins // 60:02d}:{mins % 60:02d}"
    s = str(v or "").strip()
    m = re.match(r"^(\d{1,2})[:.](\d{2})", s)
    return f"{int(m[1]):02d}:{m[2]}" if m else s


def read_rows(xml: bytes, sst: list[str]):
    root = ET.fromstring(xml)
    data = root.find("m:sheetData", NS)
    rows = data.findall("m:row", NS)
    if not rows:
        raise Stop("foglio vuoto")
    head = {}
    for c in rows[0].findall("m:c", NS):
        v = cell_value(c, sst)
        if v not in (None, ""):
            head[str(v).strip()] = col_letters(c.get("r"))
    for need in ("EVENT_ID", "DATE", "TIME", "CATEGORY", "VENUE", "MATCH_STATUS", "TIME_STATUS", "VENUE_STATUS", "NOTES"):
        if need not in head:
            raise Stop(f"colonna {need} mancante nel master")
    by_id = {}
    for r in rows[1:]:
        vals = {col_letters(c.get("r")): (cell_value(c, sst), c.get("s")) for c in r.findall("m:c", NS)}
        rec = {h: vals.get(L, (None, None))[0] for h, L in head.items()}
        style = {h: vals.get(L, (None, None))[1] for h, L in head.items()}
        eid = str(rec.get("EVENT_ID") or "").strip()
        if eid:
            if eid in by_id:
                raise Stop(f"EVENT_ID duplicato nel master: {eid}")
            by_id[eid] = {"row": int(r.get("r")), "rec": rec, "style": style}
    return head, by_id


def new_cell(ref: str, style: str | None, value) -> str:
    s = f' s="{style}"' if style else ""
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f'<c r="{ref}"{s}><v>{repr(float(value)) if isinstance(value, float) else value}</v></c>'
    return f'<c r="{ref}"{s} t="inlineStr"><is><t xml:space="preserve">{esc(str(value))}</t></is></c>'


def set_cells(xml: str, row: int, cells: dict[str, str]) -> str:
    """cells: column letters -> full <c> xml. Replaces existing cells, inserts missing ones in column order."""
    rx_row = re.compile(r'(<row\b[^>]*\br="%d"[^>]*?)(/>|>(.*?)</row>)' % row, re.S)
    m = rx_row.search(xml)
    if not m:
        raise Stop(f"riga {row} non trovata nel foglio")
    inner = m.group(3) or ""
    parts = re.findall(r'<c\b[^>]*?(?:/>|>.*?</c>)', inner, re.S)
    if "".join(parts) != inner:
        raise Stop(f"riga {row}: struttura inattesa, nessuna modifica")
    current = {col_letters(re.search(r'\br="([A-Z]+\d+)"', p).group(1)): p for p in parts}
    current.update(cells)
    body = "".join(current[k] for k in sorted(current, key=col_index))
    open_tag = m.group(1)
    open_tag = re.sub(r'\s+spans="[^"]*"', "", open_tag)  # spans is optional; drop it rather than keep a wrong one
    return xml[: m.start()] + open_tag + ">" + body + "</row>" + xml[m.end():]


def plan(head, by_id, outcomes: list[dict], today: dt.date):
    applied, skipped, edits = [], [], {}
    for o in sorted(outcomes, key=lambda x: str(x.get("data", {}).get("quando", ""))):
        key, d = str(o.get("key", "")), o.get("data", {})
        tag = "[IRIDE " + hashlib.sha256(key.encode()).hexdigest()[:10] + "]"
        eid = str(d.get("event_id") or "").strip()
        az = str(d.get("azione") or "").upper()
        why = None
        hit = by_id.get(eid)
        if not hit:
            why = "EVENT_ID non trovato"
        else:
            rec = hit["rec"]
            notes = str(rec.get("NOTES") or "")
            pending_notes = edits.get(eid, {}).get("NOTES")
            if tag in notes or (pending_notes and tag in pending_notes):
                why = "già applicato"
            elif az not in LABEL:
                why = f"azione non valida: {az!r}"
            elif not SCOPE_RX.search(str(rec.get("CATEGORY") or "")):
                why = "categoria fuori dall'attività di base"
            elif d.get("data_gara") and as_date(rec.get("DATE")) != str(d["data_gara"]).strip():
                why = "data diversa nel master"
            elif d.get("ora_prima") and as_time(edits.get(eid, {}).get("_TIME", rec.get("TIME"))) != as_time(d["ora_prima"]):
                why = "orario cambiato nel master dopo la richiesta"
            elif az == "CAMBIA":
                ora, sede = str(d.get("ora_nuova") or "").strip(), str(d.get("sede_nuova") or "").strip().upper()
                if not ora and not sede:
                    why = "cambio senza orario né campo"
                elif ora and not TIME_RX.match(ora):
                    why = "orario non valido"
                elif sede and sede not in HOME_VENUES:
                    why = "campo non ammesso"
        if why:
            skipped.append({"key_hash": tag, "event_id": eid, "motivo": why})
            continue
        e = edits.setdefault(eid, {"_row": hit["row"]})
        rec = hit["rec"]
        if az == "ANNULLA":
            e["MATCH_STATUS"] = "CANCELLED"
        else:
            e["TIME_STATUS"] = "CONFIRMED"
            e["VENUE_STATUS"] = "CONFIRMED"
            if "OPERATIONAL_STATUS" in head and str(rec.get("OPERATIONAL_STATUS") or "") in ("OFFICIAL_TO_VERIFY", "CLUB_TO_VERIFY", ""):
                e["OPERATIONAL_STATUS"] = "READY"  # a field conflict (BLOCKED_CONFLICT) stays as it is
        if az == "CAMBIA":
            ora, sede = str(d.get("ora_nuova") or "").strip(), str(d.get("sede_nuova") or "").strip().upper()
            if ora:
                h, mi = TIME_RX.match(ora).groups()
                e["TIME"] = (int(h) * 60 + int(mi)) / 1440
                e["_TIME"] = ora
            if sede:
                e["VENUE"] = sede
            if "VARIATION" in head:
                e["VARIATION"] = "Variazione SCD " + today.strftime("%d/%m")
        note = f"Iride {today.strftime('%d/%m')}: {LABEL[az]}" + (" (" + ", ".join(
            x for x in (str(d.get("ora_nuova") or ""), str(d.get("sede_nuova") or "")) if x) + ")" if az == "CAMBIA" else "") \
            + " dal Resp. attività di base " + tag
        base_notes = e.get("NOTES", str(rec.get("NOTES") or ""))
        e["NOTES"] = (base_notes + " | " if base_notes else "") + note
        if "LAST_VERIFIED" in head:
            e["LAST_VERIFIED"] = today.strftime("%d/%m/%Y")
        if "ROW_VERSION" in head:
            try:
                rv = int(float(e.get("ROW_VERSION", rec.get("ROW_VERSION") or 0)))
            except (TypeError, ValueError):
                rv = 0
            e["ROW_VERSION"] = rv + 1
        if "CHANGE_FLAG" in head:
            e["CHANGE_FLAG"] = "IRIDE"
        applied.append({"key_hash": tag, "event_id": eid, "azione": az})
    return applied, skipped, edits


def apply(master: str, outcomes: list[dict], out: str, today: dt.date) -> dict:
    with zipfile.ZipFile(master) as z:
        path = sheet_path(z)
        sst = shared_strings(z)
        xml_b = z.read(path)
        head, by_id = read_rows(xml_b, sst)
        applied, skipped, edits = plan(head, by_id, outcomes, today)
        xml = xml_b.decode("utf-8")
        for eid, e in edits.items():
            row, style = e["_row"], by_id[eid]["style"]
            cells = {head[h]: new_cell(f"{head[h]}{row}", style.get(h), v) for h, v in e.items() if not h.startswith("_")}
            xml = set_cells(xml, row, cells)
        ET.fromstring(xml.encode("utf-8"))  # still well-formed, or Stop before writing
        wb = z.read("xl/workbook.xml").decode("utf-8")
        if edits:
            if "<calcPr" in wb:
                wb = re.sub(r"<calcPr\b([^>]*?)(/?)>", lambda m: "<calcPr" + re.sub(r'\s+fullCalcOnLoad="[^"]*"', "", m.group(1))
                            + ' fullCalcOnLoad="1"' + m.group(2) + ">", wb, count=1)
            else:
                wb = wb.replace("</workbook>", '<calcPr fullCalcOnLoad="1"/></workbook>')
        with zipfile.ZipFile(out, "w") as w:
            for info in z.infolist():
                data = z.read(info.filename)
                if info.filename == path:
                    data = xml.encode("utf-8")
                elif info.filename == "xl/workbook.xml":
                    data = wb.encode("utf-8")
                w.writestr(info, data, compress_type=info.compress_type)
    return {"applied": applied, "skipped": skipped, "sheet": SHEET}


def self_test() -> None:
    import os
    import tempfile
    import openpyxl
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import calendar_public_payload as cpp

    head = ["MATCH_ID", "EVENT_ID", "DATE", "TIME", "CATEGORY", "TYPE", "HOME_AWAY", "VENUE", "OPPONENT_EVENT", "ROUND",
            "SOURCE_ID", "SOURCE_TYPE", "SOURCE_STATUS", "MATCH_STATUS", "TIME_STATUS", "VENUE_STATUS", "VARIATION_WATCH",
            "CONFLICT_STATUS", "CONFLICT_GROUP_ID", "OPERATIONAL_STATUS", "SYNC_STATUS", "VARIATION", "NOTES", "SOURCE_ROW",
            "LAST_VERIFIED", "UPDATE_POLICY", "ROW_VERSION", "CHANGE_FLAG", "MANUAL_LOCK", "GOOGLE_EVENT_ID", "PARENT_EVENT_ID", "END_TIME"]

    def row(eid, d, t, cat, ha, venue, status="OFFICIAL_CALENDAR", conflict="NONE"):
        r = {h: None for h in head}
        r.update({"MATCH_ID": "M" + eid[3:], "EVENT_ID": eid, "DATE": d, "TIME": t, "CATEGORY": cat, "TYPE": "CAMPIONATO",
                  "HOME_AWAY": ha, "VENUE": venue, "OPPONENT_EVENT": "AVV", "ROUND": "2A", "SOURCE_TYPE": "FIGC_LND",
                  "MATCH_STATUS": status, "TIME_STATUS": "DEFAULT_TO_VERIFY", "VENUE_STATUS": "DEFAULT_TO_VERIFY",
                  "CONFLICT_STATUS": conflict, "OPERATIONAL_STATUS": "OFFICIAL_TO_VERIFY", "NOTES": "nota originale", "ROW_VERSION": 1})
        return [r[h] for h in head]

    tmp = tempfile.mkdtemp()
    src, out = os.path.join(tmp, "m.xlsx"), os.path.join(tmp, "o.xlsx")
    wb = openpyxl.Workbook()
    wb.active.title = "CALENDARIO SETTIMANALE"
    wb.active["A1"] = "vista"
    wb.active["B2"] = "='MASTER EVENTI'!D2"
    ws = wb.create_sheet(SHEET)
    ws.append(head)
    ws.append(row("EVT-PC78-2A-A-FUORI", dt.datetime(2026, 10, 17), dt.time(10, 30), "Primi Calci 7-8 anni", "FUORI", "Vercurago"))
    ws.append(row("EVT-ES12-2A-B-CASA", dt.datetime(2026, 10, 17), dt.time(15, 0), "Esordienti 12 anni (2014)", "CASA", "COLICO - CAMPO 2",
                  conflict="HARD_CONFLICT"))
    ws.append(row("EVT-PULMIX-2A-C-FUORI", dt.datetime(2026, 10, 17), dt.time(15, 15), "Pulcini Misti 7v7", "FUORI", "Rogeno"))
    ws.append(row("EVT-MAN-20261018-001", dt.datetime(2026, 10, 18), dt.time(15, 0), "Pulcini Misti 7v7", "CASA", "COLICO - CAMPO 1",
                  status="CLUB_EVENT"))
    ws.append(row("EVT-U16E-6A-D-CASA", dt.datetime(2026, 10, 17), dt.time(18, 0), "U16 Élite", "CASA", "COLICO - CAMPO 1"))
    ws.append(row("EVT-PC78-3A-E-CASA", dt.datetime(2026, 10, 24), dt.time(16, 0), "Primi Calci 7-8 anni", "CASA", "COLICO - CAMPO 2"))
    wb.save(src)

    def o(key, eid, az, data, ora_prima, **kw):
        return {"key": key, "data": {"event_id": eid, "azione": az, "data_gara": data, "ora_prima": ora_prima,
                                     "quando": "2026-10-17T08:00:00.000Z", **kw}}

    outs = [
        o("wamid.A-1", "EVT-PC78-2A-A-FUORI", "CONFERMA", "17/10", "10:30"),
        o("wamid.A-3", "EVT-ES12-2A-B-CASA", "ANNULLA", "17/10", "15:00"),
        o("wamid.A-4", "EVT-PULMIX-2A-C-FUORI", "CAMBIA", "17/10", "15:15", ora_nuova="16:00"),
        o("wamid.A-5", "EVT-MAN-20261018-001", "CAMBIA", "18/10", "15:00", sede_nuova="COLICO - CAMPO 2"),
        o("wamid.A-6", "EVT-U16E-6A-D-CASA", "CONFERMA", "17/10", "18:00"),          # out of scope
        o("wamid.A-7", "EVT-PC78-3A-E-CASA", "CONFERMA", "24/10", "15:00"),          # master time changed since the request
        o("wamid.A-8", "EVT-NON-ESISTE", "CONFERMA", "17/10", "10:00"),
        o("wamid.A-9", "EVT-MAN-20261018-001", "CAMBIA", "18/10", "15:00", sede_nuova="DERVIO"),  # venue not allowed
    ]
    rep = apply(src, outs, out, dt.date(2026, 10, 17))
    assert [a["event_id"] for a in rep["applied"]] == ["EVT-PC78-2A-A-FUORI", "EVT-ES12-2A-B-CASA", "EVT-PULMIX-2A-C-FUORI",
                                                       "EVT-MAN-20261018-001"], rep
    why = {s["event_id"] + ":" + s["motivo"] for s in rep["skipped"]}
    assert why == {"EVT-U16E-6A-D-CASA:categoria fuori dall'attività di base",
                   "EVT-PC78-3A-E-CASA:orario cambiato nel master dopo la richiesta",
                   "EVT-NON-ESISTE:EVENT_ID non trovato",
                   "EVT-MAN-20261018-001:campo non ammesso"}, why
    # untouched parts byte for byte
    with zipfile.ZipFile(src) as a, zipfile.ZipFile(out) as b:
        assert a.namelist() == b.namelist()
        p = sheet_path(a)
        for n in a.namelist():
            if n not in (p, "xl/workbook.xml"):
                assert a.read(n) == b.read(n), n
        assert b'fullCalcOnLoad="1"' in b.read("xl/workbook.xml")
    rows = cpp.read_master(out)
    by = {r["EVENT_ID"]: r for r in rows}
    ev = {r["EVENT_ID"]: cpp.event_of(r, quiet=True) for r in rows}
    assert ev["EVT-PC78-2A-A-FUORI"]["verification"]["time_confirmed"] is True and ev["EVT-PC78-2A-A-FUORI"]["notice"] == []
    assert ev["EVT-ES12-2A-B-CASA"] is None and by["EVT-ES12-2A-B-CASA"]["MATCH_STATUS"] == "CANCELLED"
    assert ev["EVT-PULMIX-2A-C-FUORI"]["time"] == "16:00" and ev["EVT-PULMIX-2A-C-FUORI"]["is_variation"] is True
    assert ev["EVT-MAN-20261018-001"]["venue"] == "COLICO - CAMPO 2" and ev["EVT-MAN-20261018-001"]["notice"] == []
    assert ev["EVT-U16E-6A-D-CASA"]["notice"] == ["Orario o sede da verificare", "Attesa verifica"]  # untouched
    assert by["EVT-PC78-2A-A-FUORI"]["ROW_VERSION"] == 2 and by["EVT-PC78-2A-A-FUORI"]["CHANGE_FLAG"] == "IRIDE"
    assert "nota originale | Iride 17/10: confermata dal Resp. attività di base [IRIDE " in by["EVT-PC78-2A-A-FUORI"]["NOTES"]
    assert "wamid" not in json.dumps({k: str(v) for k, v in by["EVT-PC78-2A-A-FUORI"].items()})
    # idempotent: a second run on the output applies nothing new
    out2 = os.path.join(tmp, "o2.xlsx")
    rep2 = apply(out, outs, out2, dt.date(2026, 10, 17))
    assert rep2["applied"] == [] and sum(1 for s in rep2["skipped"] if s["motivo"] == "già applicato") == 4, rep2
    # openpyxl (full mode) still opens the file and the formula of the other sheet is kept
    wb2 = openpyxl.load_workbook(out)
    assert wb2["CALENDARIO SETTIMANALE"]["B2"].value == "='MASTER EVENTI'!D2"
    print("self-test ok")


def main(argv: list[str]) -> int:
    if argv[1:2] == ["--self-test"]:
        self_test()
        return 0
    if len(argv) < 4:
        print(__doc__, file=sys.stderr)
        return 2
    today = dt.date.today()
    if "--today" in argv:
        today = dt.date.fromisoformat(argv[argv.index("--today") + 1])
    try:
        outcomes = json.load(open(argv[2], encoding="utf-8"))
        rep = apply(argv[1], outcomes, argv[3], today)
    except Stop as exc:
        print(f"STOP: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(rep, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

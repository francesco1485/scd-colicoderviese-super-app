#!/usr/bin/env python3
"""SCD_ORDINE_KIT (xlsx) -> JSON payload for public.scd_kit_sync_copy (r83, Magazzino).

Usage: python3 -I tools/sync/kit_order_payload.py ordine_kit.xlsx [source_modified_iso] > payload.json
       python3 -I tools/sync/kit_order_payload.py --self-test

Source: "SCD_ORDINE_KIT_SEMPLICE_TAGLIA_UNICA_2026-27.xlsx" in the club Drive (1snVt5hOc11K6UHjo1B72gAKPvIZLW3Dm).
One tab per group (Prima Squadra ... Staff generale). Each tab has a header row whose first cell is "NOME E COGNOME";
below it column A holds the person and column C the single size to order ("colonna blu"). A row "STAFF DI CATEGORIA"
(or "STAFF GENERALE ...") switches the following rows to staff. The tab "RIEPILOGO ORDINE" carries the sheet's own
totals per group, used here as a cross-check.

Privacy: most rows are minors. The payload carries ONLY counts per group and size: no names, no declared sizes,
no row numbers.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata

SIZES = ["3XS", "2XS", "XS", "S", "M", "L", "XL", "2XL"]
COMPONENTS = {"tshirt": 2, "shorts": 1, "socks": 1, "bag": 1}
SKIP = re.compile(r"^(_|00_|RIEPILOGO)", re.IGNORECASE)


def text(v) -> str:
    return re.sub(r"\s+", " ", str(v)).strip() if v is not None else ""


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def norm_size(v) -> str | None:
    s = text(v).upper().replace(" ", "")
    return s if s in SIZES else None


def parse_group(title: str, rows: list[tuple], position: int) -> dict | None:
    header = next((i for i, r in enumerate(rows) if r and text(r[0]).upper() == "NOME E COGNOME"), None)
    if header is None:
        return None
    staff_tab = title.strip().lower().startswith("staff")
    in_staff = staff_tab
    sizes = {k: 0 for k in SIZES}
    athletes = staff = undefined = 0
    for r in rows[header + 1:]:
        name = text(r[0] if len(r) > 0 else None)
        if not name:
            continue
        if name.upper().startswith("STAFF"):
            in_staff = True
            continue
        size = norm_size(r[2] if len(r) > 2 else None)
        if in_staff:
            staff += 1
        else:
            athletes += 1
        if size:
            sizes[size] += 1
        else:
            undefined += 1
    return {
        "key": slug(title),
        "label": title.strip()[:60],
        "position": position,
        "athletes": athletes,
        "staff": staff,
        "sizes": {k: v for k, v in sizes.items() if v},
        "undefined": undefined,
    }


def sheet_totals(rows: list[tuple]) -> dict[str, tuple[int, int, int]]:
    """RIEPILOGO ORDINE, block "CONTROLLO PER GRUPPO": group -> (people, defined, undefined)."""
    out: dict[str, tuple[int, int, int]] = {}
    for r in rows:
        if len(r) < 10:
            continue
        g, n, d, u = text(r[6]), r[7], r[8], r[9]
        if g and all(isinstance(x, (int, float)) for x in (n, d, u)) and g.upper() != "GRUPPO":
            out[slug(g)] = (int(n), int(d), int(u))
    return out


def build(workbook_rows: dict[str, list[tuple]], source_modified: str | None) -> dict:
    groups = []
    title = "Ordine kit pre campionato 2026/27"
    totals: dict[str, tuple[int, int, int]] = {}
    for pos, (name, rows) in enumerate(workbook_rows.items()):
        if name.upper().startswith("RIEPILOGO"):
            totals = sheet_totals(rows)
            head = text(rows[0][0]) if rows and rows[0] else ""
            m = re.search(r"ORDINE KIT.*", head, re.IGNORECASE)
            if m:
                title = m[0].strip().capitalize()
            continue
        if SKIP.match(name):
            continue
        g = parse_group(name, rows, pos)
        if g:
            groups.append(g)
    mismatches = []
    for g in groups:
        t = totals.get(g["key"])
        if t is None:
            continue
        people = g["athletes"] + g["staff"]
        defined = people - g["undefined"]
        if (people, defined, g["undefined"]) != t:
            mismatches.append({"group": g["label"], "sheet": list(t), "parsed": [people, defined, g["undefined"]]})
    return {
        "orderKey": "PRE_CAMPIONATO_2026_27",
        "season": "2026/27",
        "title": title[:120],
        "components": COMPONENTS,
        "sourceModifiedAt": source_modified,
        "groups": groups,
        "check": {"sheetTotalsFound": len(totals), "mismatches": mismatches},
    }


def read_xlsx(path: str) -> dict[str, list[tuple]]:
    import openpyxl

    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    return {ws.title: [tuple(r) for r in ws.iter_rows(values_only=True)] for ws in wb.worksheets}


def self_test() -> None:
    blank = (None,) * 9
    tab = [
        ("S.D.C. COLICODERVIESE – Under 15",) + (None,) * 8,
        blank,
        ("NOME E COGNOME", "TAGLIA DICHIARATA", "TAGLIA UNICA DA ORDINARE", None, "RIEPILOGO", None, None, None, None),
        ("Persona Uno", "S-M", "m", None, "TAGLIA", None, None, None, None),
        ("Persona Due", "XS-2XS", "", None, "3XS", 0, 0, 0, 0),
        ("Persona Tre", "L", "XXL", None, "2XS", 0, 0, 0, 0),
        (None, None, None, None, "XS", 0, 0, 0, 0),
        ("STAFF DI CATEGORIA",) + (None,) * 8,
        ("Persona Quattro", "XL", "XL", None, None, None, None, None, None),
    ]
    staff = [
        ("NOME E COGNOME", None, None),
        ("STAFF GENERALE / TRASVERSALE", None, None),
        ("Persona Cinque", "M", "M"),
    ]
    summary = [
        ("S.D.C. COLICODERVIESE – ORDINE KIT PRE CAMPIONATO 2026/27",) + (None,) * 9,
        (None, None, None, None, None, None, "GRUPPO", "NOMINATIVI", "TAGLIE DEFINITE", "DA DEFINIRE"),
        ("M", 1, 2, 1, 1, None, "Under 15", 4, 2, 2),
        ("L", 0, 0, 0, 0, None, "Staff generale", 1, 1, 0),
    ]
    p = build({"00_RICERCA": [("x",)], "RIEPILOGO ORDINE": summary, "Under 15": tab, "Staff generale": staff, "_CONTROLLO": []}, "2026-10-05T18:06:44Z")
    u15, st = p["groups"]
    assert u15["key"] == "under-15" and u15["athletes"] == 3 and u15["staff"] == 1, u15
    assert u15["sizes"] == {"M": 1, "XL": 1} and u15["undefined"] == 2, u15
    assert st["staff"] == 1 and st["athletes"] == 0 and st["sizes"] == {"M": 1}, st
    assert p["check"] == {"sheetTotalsFound": 2, "mismatches": []}, p["check"]
    assert p["title"].lower().startswith("ordine kit pre campionato"), p["title"]
    dump = json.dumps(p)
    assert "Persona" not in dump and "S-M" not in dump, "names or declared sizes leaked"
    print("self-test ok")


def main(argv: list[str]) -> int:
    if len(argv) >= 2 and argv[1] == "--self-test":
        self_test()
        return 0
    if len(argv) < 2:
        print(__doc__, file=sys.stderr)
        return 2
    payload = build(read_xlsx(argv[1]), argv[2] if len(argv) > 2 else None)
    json.dump(payload, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

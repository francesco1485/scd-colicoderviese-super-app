#!/usr/bin/env python3
"""Master Pulmini (xlsx export) -> JSON payload for public.scd_transport_sync (r74).

Usage: python3 -I tools/sync/pulmini_master_payload.py master.xlsx [source_modified_iso] > payload.json

Source: Google Sheet "05_PULMINI - Master Flotta e Trasporti SCD 2026-27", exported as xlsx.
Privacy: service users (tab 02) leave WITHOUT names — only the sheet codes (USR-, AT-), team group,
line, stops and weekday flags. Drivers leave as "First L." plus phone (adult volunteers; the database
returns phones only to Direzione, Segreteria and the transport manager).
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys

import openpyxl

DAY_KEYS = ["LUN_A", "LUN_R", "MAR_A", "MAR_R", "MER_A", "MER_R", "GIO_A", "GIO_R", "VEN_A", "VEN_R"]


def table(wb, name: str) -> list[dict]:
    ws = wb[name]
    rows = list(ws.iter_rows(values_only=True))
    hi = next(i for i, r in enumerate(rows[:12]) if sum(isinstance(c, str) and c.strip() != "" for c in r) >= 3)
    head = [str(c).strip() if c is not None else "" for c in rows[hi]]
    out = []
    for r in rows[hi + 1:]:
        if not any(c not in (None, "") for c in r):
            continue
        out.append({h: r[i] if i < len(r) else None for i, h in enumerate(head) if h})
    return out


def text(v, limit: int = 200) -> str | None:
    if v is None:
        return None
    s = re.sub(r"\s+", " ", str(v)).strip()
    return s[:limit] or None


def date(v) -> str | None:
    if isinstance(v, dt.datetime):
        return v.date().isoformat()
    if isinstance(v, dt.date):
        return v.isoformat()
    s = text(v, 20)
    if not s:
        return None
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", s)
    if m:
        try:
            return dt.date(int(m[3]), int(m[2]), int(m[1])).isoformat()
        except ValueError:
            return None
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    return s[:10] if m else None


def integer(v, lo: int = 0, hi: int = 10_000_000) -> int | None:
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)) and lo <= int(v) <= hi:
        return int(v)
    s = text(v, 20)
    if s and re.fullmatch(r"\d+", s) and lo <= int(s) <= hi:
        return int(s)
    return None


def hhmm(v) -> str | None:
    if isinstance(v, dt.time):
        return v.strftime("%H:%M")
    if isinstance(v, dt.datetime):
        return v.strftime("%H:%M")
    s = text(v, 10)
    if not s:
        return None
    m = re.match(r"^(\d{1,2})[:.](\d{2})", s)
    return f"{int(m[1]):02d}:{m[2]}" if m and int(m[1]) < 24 else None


def short_name(first, last) -> str | None:
    f = text(first, 40)
    l = text(last, 40)
    if not f and not l:
        return None
    if f and l:
        return f"{f.title()} {l[0].upper()}."
    return (f or l).title()


def build(path: str, source_modified: str | None) -> dict:
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    vehicles = [
        {
            "id": text(r.get("MEZZO_ID"), 40),
            "label": text(r.get("MEZZO_ID"), 40),
            "plate": text(r.get("TARGA"), 15),
            "model": text(r.get("MARCA_MODELLO"), 80),
            "ownership": text(r.get("PROPRIETA_GESTIONE"), 80),
            "seatsHomologated": integer(r.get("POSTI_OMOLOGATI"), 1, 60),
            "seatsPassengers": integer(r.get("POSTI_PASSEGGERI"), 1, 60),
            "fuel": text(r.get("CARBURANTE"), 30),
            "km": integer(r.get("KM_ATTUALI")),
            "status": text(r.get("STATO"), 40),
            "baseAvailability": text(r.get("DISPONIBILITA_BASE"), 120),
            "insuranceDue": date(r.get("ASSICURAZIONE_SCAD")),
            "inspectionDue": date(r.get("REVISIONE_SCAD")),
            "roadTaxDue": date(r.get("BOLLO_SCAD")),
            "serviceDue": date(r.get("TAGLIANDO_DATA")),
            "notes": text(r.get("NOTE"), 300),
        }
        for r in table(wb, "04 FLOTTA MEZZI")
        if text(r.get("MEZZO_ID"))
    ]
    drivers = [
        {
            "id": text(r.get("AUTISTA_ID"), 40),
            "displayName": short_name(r.get("NOME"), r.get("COGNOME")) or text(r.get("AUTISTA_ID"), 40),
            "kind": text(r.get("TIPO"), 30),
            "status": text(r.get("STATO"), 40),
            "licenceCategory": text(r.get("PATENTE_CAT"), 10),
            "licenceDue": date(r.get("PATENTE_SCAD")),
            "extraAvailability": text(r.get("DISPONIBILE_EXTRA"), 60),
            "phone": text(r.get("TELEFONO"), 30),
        }
        for r in table(wb, "05 AUTISTI")
        if text(r.get("AUTISTA_ID"))
    ]
    rules = [
        {
            "id": text(r.get("REGOLA_ID"), 40),
            "driverId": text(r.get("AUTISTA_ID"), 40),
            "days": text(r.get("GIORNO"), 40),
            "from": hhmm(r.get("DALLE")),
            "to": hhmm(r.get("ALLE")),
            "status": text(r.get("STATO"), 40),
            "kind": text(r.get("TIPO"), 30),
            "reason": text(r.get("MOTIVO_VINCOLO"), 160),
            "validFrom": date(r.get("VALIDO_DAL")),
            "validTo": date(r.get("VALIDO_AL")),
        }
        for r in table(wb, "06 DISPONIBILITA")
        if text(r.get("REGOLA_ID")) and text(r.get("AUTISTA_ID"))
    ]
    stops = [
        {
            "id": text(r.get("FERMATA_ID"), 60),
            "lineId": text(r.get("LINEA_ID"), 40),
            "line": text(r.get("LINEA"), 80),
            "position": integer(r.get("ORDINE"), 0, 10_000),
            "town": text(r.get("COMUNE"), 80),
            "place": text(r.get("FERMATA"), 160),
            "status": text(r.get("STATO"), 40),
            "eta": hhmm(r.get("ORARIO_STIMATO")),
            "active": (text(r.get("ATTIVA"), 5) or "SI").upper() != "NO",
        }
        for r in table(wb, "11 TRATTE FERMATE")
        if text(r.get("FERMATA_ID"))
    ]
    riders = [
        {
            "id": text(r.get("UTENTE_SERVIZIO_ID"), 40),
            "personId": text(r.get("PERSONA_ID"), 40),
            "teamGroup": text(r.get("ANNATA_GRUPPO"), 60),
            "serviceStatus": text(r.get("STATO_SERVIZIO"), 40),
            "baseType": text(r.get("TIPO_BASE"), 60),
            "line": text(r.get("LINEA_BASE"), 60),
            "stopOut": text(r.get("FERMATA_ANDATA"), 160),
            "stopBack": text(r.get("FERMATA_RITORNO"), 160),
            "stopStatus": text(r.get("STATO_FERMATA"), 40),
            "days": {k: text(r.get(k), 30) for k in DAY_KEYS},
            "weekendExtra": text(r.get("WEEKEND_EXTRA"), 40),
        }
        for r in table(wb, "02 UTENTI SERVIZIO")
        if text(r.get("UTENTE_SERVIZIO_ID"))
    ]
    return {
        "source": "05_PULMINI - Master Flotta e Trasporti SCD 2026-27",
        "sourceModifiedAt": source_modified,
        "vehicles": vehicles,
        "drivers": drivers,
        "rules": rules,
        "stops": stops,
        "riders": riders,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: pulmini_master_payload.py master.xlsx [source_modified_iso]")
    print(json.dumps(build(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None), ensure_ascii=False))

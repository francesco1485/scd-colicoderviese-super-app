#!/usr/bin/env python3
"""Gestionale 2026-27 (xlsx export) -> JSON payload for public.scd_fee_sync (r78, process 3 of the A-Z map).

Usage: python3 -I tools/sync/fees_master_payload.py gestionale.xlsx [source_modified_iso] > payload.json

Source (UD-082): Google Sheet "SCD_MASTER_GESTIONALE_2026-27", tabs 32_QUOTE_OPERATIVE (amounts and status),
17_CONTROLLO_QUOTE (instalment plan, fund, family rule) and 01_ANAGRAFICA_UNICA (only to compute fingerprints).
Privacy: the payload carries NO names, e-mails, phone numbers, fiscal codes, ISEE values or fund percentages.
Each position keeps the sheet code (ATLETA_ID), amounts, status and two sha256 fingerprints that the database
compares with its own people to link the position (scd_fee_name_hash is the one that matches: the database keeps no
fiscal codes; scd_fee_cf_hash stays for a future verified key).
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import sys

import openpyxl


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


def money(v) -> float | None:
    if isinstance(v, bool) or v is None:
        return None
    if isinstance(v, (int, float)):
        return round(float(v), 2)
    s = text(v, 30)
    if not s:
        return None
    s = s.replace("€", "").replace(".", "").replace(",", ".").strip() if "," in s else s.replace("€", "").strip()
    try:
        return round(float(s), 2)
    except ValueError:
        return None


def iso_date(v) -> str | None:
    if isinstance(v, dt.datetime):
        return v.date().isoformat()
    if isinstance(v, dt.date):
        return v.isoformat()
    s = text(v, 20)
    if not s:
        return None
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m:
        try:
            return dt.date(int(m[3]), int(m[2]), int(m[1])).isoformat()
        except ValueError:
            return None
    return s[:10] if re.match(r"^\d{4}-\d{2}-\d{2}", s) else None


def sha(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def cf_hash(cf) -> str | None:
    s = text(cf, 40)
    return sha(re.sub(r"\s", "", s).upper()) if s else None


def name_hash(last, first, birth) -> str | None:
    b = iso_date(birth)
    la, fi = text(last, 80), text(first, 80)
    if not (b and la and fi):
        return None
    norm = lambda x: re.sub(r"\s+", " ", x.strip()).lower()
    return sha(f"{norm(la)}|{norm(fi)}|{b}")


def status_group(final: str | None, override: str | None, residual: float | None, overdue: float | None, fee: float | None) -> str:
    st = (final or "").upper()
    ov = (override or "").upper()
    if "ESCLUSO" in st or "ESCLUSO" in ov:
        return "ESCLUSO"
    if (overdue or 0) > 0 or "MOROSO" in st:
        return "IN_RITARDO"
    if st == "SALDATO" or (fee and fee > 0 and residual is not None and residual <= 0):
        return "SALDATO"
    if st.startswith("REGOLARE") or "MONITORARE SCADENZE" in st:
        return "REGOLARE"
    if "DA COMUNICARE" in st:
        return "DA_COMUNICARE"
    return "DA_VERIFICARE"


FAMILY_RULES = (
    ("2°/3°", "2°/3° figlio pagante: -10% base e ulteriore -15%"),
    ("2° FIGLIO", "2°/3° figlio pagante: -10% base e ulteriore -15%"),
    ("FONDO", "Fondo Solidale: non cumulabile con lo sconto fratelli"),
    ("1°", "1° figlio pagante: -10% base"),
    ("SCONTO BASE", "1° figlio pagante: -10% base"),
    ("DUPLICATO", "Possibile duplicato: non conteggiare"),
    ("DA DEFINIRE", "Da definire 1°/2°/3° figlio"),
)


def family_rule(v) -> str | None:
    """Free text of the sheet mapped to the club's standard rules (it can contain names: never copied as is)."""
    s = (text(v, 200) or "").upper()
    if not s:
        return None
    for key, label in FAMILY_RULES:
        if key in s:
            return label
    return "Regola particolare: vedi Gestionale"


def redactor(names: set[str]):
    pats = [re.compile(r"\b" + re.escape(n) + r"\b", re.IGNORECASE) for n in sorted(names, key=len, reverse=True)]

    def redact(v: str | None) -> str | None:
        if not v:
            return v
        for p in pats:
            v = p.sub("…", v)
        return v

    return redact


def plan_of(rates: list[float | None]) -> tuple[str | None, list[float]]:
    vals = [r for r in rates if r is not None and r > 0]
    kind = {1: "UNICA", 2: "2 RATE", 3: "3 RATE"}.get(len(vals))
    return kind, vals


def build(path: str, source_modified: str | None) -> dict:
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    ops = table(wb, "32_QUOTE_OPERATIVE")
    ctrl = {text(r.get("ATLETA_ID"), 40): r for r in table(wb, "17_CONTROLLO_QUOTE") if text(r.get("ATLETA_ID"))}
    ana = {text(r.get("ATLETA_ID"), 40): r for r in table(wb, "01_ANAGRAFICA_UNICA") if text(r.get("ATLETA_ID"))}
    names: set[str] = set()
    for a_row in ana.values():
        for k in ("Cognome", "Nome"):
            for w in re.split(r"[\s']+", text(a_row.get(k), 80) or ""):
                if len(w) >= 3:
                    names.add(w)
    redact = redactor(names)
    positions = []
    for r in ops:
        rid = text(r.get("ATLETA_ID"), 40)
        if not rid:
            continue
        c = ctrl.get(rid, {})
        a = ana.get(rid, {})
        fee = money(r.get("QUOTA FINALE"))
        paid = money(r.get("PAGATO EFFETTIVO"))
        residual = money(r.get("RESIDUO"))
        overdue = money(r.get("SCADUTO OGGI"))
        final = redact(text(r.get("STATO FINALE"), 120))
        override = redact(text(r.get("STATO OVERRIDE"), 160))
        plan, instalments = plan_of([money(c.get("RATA 1 PIANO")), money(c.get("RATA 2 PIANO")), money(c.get("RATA 3 PIANO"))])
        fund_txt = (text(c.get("FONDO"), 80) or "").upper()
        mail = (text(r.get("MAIL QUOTA INVIATA"), 5) or "").upper()
        category = text(r.get("CATEGORIA"), 80)
        annata = r.get("ANNATA")
        try:
            birth_year = int(str(annata).strip()[:4]) if annata not in (None, "") else None
        except ValueError:
            birth_year = None
        positions.append({
            "id": rid,
            "cfHash": cf_hash(a.get("Codice fiscale")),
            "nameHash": name_hash(a.get("Cognome"), a.get("Nome"), a.get("Data nascita")),
            "birthYear": birth_year,
            "category": None if (category or "").upper() == "DA VERIFICARE" else category,
            "feeTotal": fee,
            "paid": paid,
            "residual": residual,
            "overdue": overdue,
            "status": final,
            "override": override,
            "statusGroup": status_group(final, override, residual, overdue, fee),
            "noticeSent": True if mail == "SI" else False if mail == "NO" else None,
            "noticeDate": redact(text(r.get("DATA MAIL"), 20)),
            "plan": plan,
            "instalments": instalments,
            "fund": fund_txt.startswith("ACCOLTO"),
            "familyRule": family_rule(c.get("REGOLA FAMIGLIA")),
            "action": redact(text(r.get("AZIONE"), 200)),
        })
    return {
        "source": "SCD_MASTER_GESTIONALE_2026-27 · 32_QUOTE_OPERATIVE",
        "season": "2026/27",
        "sourceModifiedAt": source_modified,
        "positions": positions,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: fees_master_payload.py gestionale.xlsx [source_modified_iso]")
    print(json.dumps(build(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None), ensure_ascii=False))

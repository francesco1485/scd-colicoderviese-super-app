#!/usr/bin/env python3
"""SumUp business account statement (CSV export) -> JSON payload for public.scd_ledger_ingest (r82, telaio T3).

Usage: python3 -I tools/sync/ledger_sumup_payload.py statement.csv [account_id] > payload.json
       python3 -I tools/sync/ledger_sumup_payload.py --self-test

Input: "Resoconto_transazioni_<ID>_<date>.csv" exported from SumUp (columns: Data transazione, Codice transazione,
Tipo transazione, Riferimento, Causale pagamento, Stato, Importo di fatturazione in uscita/entrata, ..., Commissione,
Saldo disponibile). The account is the club's SumUp business account where families pay fees and minibus.

Privacy: IBANs are never written to the payload. Family names never become stored fields: they travel only in
`hint` (payer + causale, IBAN removed), which the database uses to link the movement to a fee position and then
discards. Counterparty labels are kept only for companies, merchants and services, never for private persons.
"""
from __future__ import annotations

import csv
import datetime as dt
import json
import re
import sys

IBAN = re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b")
COMPANY = re.compile(r"\b(S\.?R\.?L\.?S?|S\.?P\.?A\.?|S\.?N\.?C\.?|S\.?A\.?S\.?|INC\.?|LTD|GMBH|D\.I\.|CO\.)\b|ASSICURAZIONI|AGENTE", re.IGNORECASE)
MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
MERCHANTS = {
    "SOFTWARE_SERVIZI": ("LOVABLE", "GITHUB", "REPLIT", "PIXELLOT", "VERCEL", "RENDER", "CANVA", "GOOGLE"),
    "FEDERAZIONE": ("PORTALESERVIZI", "FIGC", "LND"),
    "CLUB_HOUSE_ACQUISTI": ("IPERAL", "EUROSPIN", "D+", "BIG SHOP", "QUINTINO", "IPER ", "D057", "CONAD", "ESSELUNGA", "LIDL", "AVA "),
    "ACQUISTI_MATERIALE": ("AMAZON", "DILUXLIGHT", "DECATHLON"),
}


def text(v, limit: int = 300) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()[:limit]


def money(v) -> float:
    s = text(v, 30).replace(",", "")
    try:
        return round(float(s), 2)
    except ValueError:
        return 0.0


def when(v: str) -> str | None:
    """'12/10/26, 11:15' -> ISO timestamp in Europe/Rome offset (+02:00 summer, +01:00 winter by the EU rule)."""
    m = re.match(r"^(\d{2})/(\d{2})/(\d{2}),\s*(\d{2}):(\d{2})", text(v, 30))
    if not m:
        return None
    d = dt.datetime(2000 + int(m[3]), int(m[2]), int(m[1]), int(m[4]), int(m[5]))
    def last_sunday(y: int, mo: int) -> dt.date:
        x = dt.date(y, mo, 31)
        return x - dt.timedelta(days=(x.weekday() + 1) % 7)
    summer = last_sunday(d.year, 3) <= d.date() < last_sunday(d.year, 10)
    return d.strftime("%Y-%m-%dT%H:%M:00") + ("+02:00" if summer else "+01:00")


def strip_iban(s: str) -> str:
    return re.sub(r"\s+", " ", IBAN.sub("", s)).strip()


def month_ref(causale: str) -> list[str]:
    c = causale.lower()
    return [m for m in MONTHS if re.search(r"\b" + m + r"\b", c)]


def kind_of(tipo: str) -> str:
    t = tipo.lower()
    if "bonifico" in t and "entrata" in t:
        return "BONIFICO_IN"
    if "bonifico" in t and "uscita" in t:
        return "BONIFICO_OUT"
    if "sumup" in t:
        return "SUMUP_ACCREDITO"
    if "pos" in t:
        return "POS"
    if "online" in t:
        return "ONLINE"
    if "prelievo" in t or "atm" in t:
        return "PRELIEVO"
    return "ALTRO"


def category_of(kind: str, ref: str, causale: str, amount: float) -> str:
    c = causale.upper()
    r = ref.upper()
    if kind == "BONIFICO_IN":
        if re.search(r"PUL+MIN[OI]|TRASPORTO|SERV\.? ?PUL", c):
            if re.search(r"ACCETT|ADESIONE|ADES\b|CONFERMA", c) and abs(amount) in (15.0, 30.0):
                return "ADESIONE_PULMINO"
            return "PULMINO"
        if "FONDO" in c:
            return "FONDO_SOLIDALE"
        if re.search(r"QUOTA|RATA|ISCRIZIONE|SALDO|CUOTA|STAGIONE\s*20\d\d", c):
            return "QUOTA"
        return "ENTRATA_DA_CLASSIFICARE"
    if kind == "SUMUP_ACCREDITO":
        return "INCASSI_SUMUP"
    if kind == "PRELIEVO":
        return "PRELIEVO_CONTANTI"
    if kind == "BONIFICO_OUT":
        if "REFUND" in c or "RIMBORSO" in c or r.startswith("SUMUP"):
            return "RIMBORSO"
        if COMPANY.search(r) or "FATTUR" in c or "ORDINE" in c:
            return "FORNITORE"
        if re.search(r"STIPENDIO|ACCONTO|SPESE|MENSE|BIGLIETTO|LINK", c):
            return "STAFF_E_SPESE"
        return "USCITA_DA_CLASSIFICARE"
    for cat, keys in MERCHANTS.items():
        if any(k in r for k in keys):
            return cat
    return "USCITA_DA_CLASSIFICARE"


def counterparty_of(kind: str, ref: str, category: str) -> str | None:
    """Only organisations, merchants and services are named; private persons never."""
    r = strip_iban(ref)
    if kind in ("POS", "ONLINE", "PRELIEVO"):
        return re.split(r"\s{2,}", str(ref or "").strip())[0][:80].strip() or None
    if kind == "SUMUP_ACCREDITO":
        return "SumUp"
    if kind == "BONIFICO_OUT" and (COMPANY.search(r) or category == "FORNITORE"):
        return text(r, 80)
    if kind == "BONIFICO_OUT" and r.upper().startswith("SUMUP"):
        return "SumUp"
    return None


def parse(path: str, account: str) -> dict:
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    items = []
    # SumUp exports newest first: the reversed file order is the booking order (same-minute rows keep it).
    for seq, row in enumerate(reversed(rows), start=1):
        code = text(row.get("Codice transazione"), 40)
        at = when(row.get("Data transazione", ""))
        if not code or not at:
            continue
        kind = kind_of(text(row.get("Tipo transazione")))
        out_amt = money(row.get("Importo di fatturazione in uscita"))
        in_amt = money(row.get("Importo di fatturazione in entrata"))
        amount = round(in_amt - out_amt, 2)
        raw_ref = str(row.get("Riferimento") or "")
        ref = text(raw_ref)
        causale = text(row.get("Causale pagamento"))
        category = category_of(kind, ref, causale, amount)
        family = kind == "BONIFICO_IN" and category in ("QUOTA", "FONDO_SOLIDALE", "PULMINO", "ADESIONE_PULMINO", "ENTRATA_DA_CLASSIFICARE")
        items.append({
            "code": code,
            "seq": seq,
            "bookedAt": at,
            "kind": kind,
            "amount": amount,
            "fee": money(row.get("Commissione")),
            "balanceAfter": money(row.get("Saldo disponibile")),
            "status": text(row.get("Stato"), 40),
            "category": category,
            "months": month_ref(causale),
            "counterparty": counterparty_of(kind, raw_ref, category),
            "family": family,
            # Only for linking inside the database; never stored.
            "hint": strip_iban(f"{ref} {causale}") if family else None,
        })
    return {"account": account, "source": "SumUp CSV export", "items": items}


def self_test() -> None:
    import os
    import tempfile

    head = ("Data transazione,Codice transazione,Tipo transazione,Riferimento,Causale pagamento,Stato,Importo di fatturazione in uscita,"
            "Importo di fatturazione in entrata,Valuta della carta,Importo transazione in uscita,Importo transazione in entrata,"
            "Valuta della transazione,Tasso di cambio,Commissione,Saldo disponibile\n")
    body = (
        '"12/10/26, 11:15",AAA1,Bonifico bancario in entrata,Mario Rossi IT60X0542811101000000123456,Servizio pulmino ottobre Luca Rossi 2015,Approvato,0.00,20.00,EUR,0.00,20.00,EUR,1.00,0.00,120.00\n'
        '"24/09/26, 07:11",AAA2,Bonifico bancario in entrata,Mario Rossi IT60X0542811101000000123456,Accettazione servizio pullmino 2026 27 Luca Rossi 2015,Approvato,0.00,15.00,EUR,0.00,15.00,EUR,1.00,0.00,100.00\n'
        '"14/09/26, 07:19",AAA3,Bonifico bancario in entrata,Mario Rossi IT60X0542811101000000123456,LUCA ROSSI 2015 QUOTA RATA 1 DI 3 2026/27,Approvato,0.00,85.00,EUR,0.00,85.00,EUR,1.00,0.00,85.00\n'
        '"09/10/26, 09:48",AAA4,Bonifico bancario in uscita,iGrest S.r.l. LT043250008279615902,Ordine #1,Approvato,10.00,0.00,EUR,10.00,0.00,EUR,1.00,0.00,110.00\n'
        '"09/09/26, 11:54",AAA5,Prelievo allo sportello ATM,ATM BPER - DISTACCATO MODENA          IT,,Approvato,50.00,0.00,EUR,50.00,0.00,EUR,1.00,1.00,34.00\n'
        '"08/10/26, 07:00",AAA6,Pagamento da SumUp,SUMUP PID1,,Pagamento in entrata,0.00,78.00,EUR,0.00,78.00,EUR,1.00,0.00,200.00\n'
        '"30/07/26, 11:59",AAA7,Bonifico bancario in uscita,Paolo Bianchi IT60X0542811101000000123456,acquisto biglietto aereo,Approvato,5.00,0.00,EUR,5.00,0.00,EUR,1.00,0.00,1.00\n'
        '"10/10/26, 10:09",AAA8,Pagamento online,LOVABLE               DOVER           US,,Approvato,12.00,0.00,EUR,12.00,0.00,EUR,1.00,0.00,98.00\n'
    )
    fd, path = tempfile.mkstemp(suffix=".csv")
    os.close(fd)
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(head + body)
        out = parse(path, "SUMUP_TEST")
    finally:
        os.unlink(path)
    by = {i["code"]: i for i in out["items"]}
    assert by["AAA1"]["category"] == "PULMINO" and by["AAA1"]["months"] == ["ottobre"]
    assert by["AAA2"]["category"] == "ADESIONE_PULMINO"
    assert by["AAA3"]["category"] == "QUOTA" and by["AAA3"]["family"] is True
    assert by["AAA4"]["category"] == "FORNITORE" and by["AAA4"]["counterparty"] == "iGrest S.r.l." and by["AAA4"]["amount"] == -10.0
    assert by["AAA5"]["category"] == "PRELIEVO_CONTANTI" and by["AAA5"]["fee"] == 1.0
    assert by["AAA6"]["category"] == "INCASSI_SUMUP" and by["AAA6"]["hint"] is None
    assert by["AAA7"]["category"] == "STAFF_E_SPESE" and by["AAA7"]["counterparty"] is None
    assert by["AAA8"]["category"] == "SOFTWARE_SERVIZI" and by["AAA8"]["counterparty"] == "LOVABLE"
    assert by["AAA1"]["bookedAt"] == "2026-10-12T11:15:00+02:00"
    blob = json.dumps(out)
    assert "IT77H" not in blob and "LT0432" not in blob and "IT80P" not in blob and "Paolo" not in blob
    assert [i["code"] for i in out["items"]][0] == "AAA8" and out["items"][0]["seq"] == 1
    print("self-test ok")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--self-test":
        self_test()
        sys.exit(0)
    if len(sys.argv) < 2:
        sys.exit("usage: ledger_sumup_payload.py statement.csv [account_id] | --self-test")
    print(json.dumps(parse(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "SUMUP_MYYM50MA"), ensure_ascii=False))

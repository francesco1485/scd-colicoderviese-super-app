#!/usr/bin/env python3
"""Control Tower (xlsx) -> SQL upsert of compensation agreements (r75).

Usage: python3 -I tools/sync/compensation_control_tower.py SCD_CONTROL_TOWER_MASTER_2026_27.xlsx > upsert.sql

Source: tab 08_RAPPORTI_ECONOMICI (one row per economic relationship) and 09_PAGAMENTI_OTTOBRE
(payment status of the September competence, due by 15 October). IBANs are NEVER copied: only
their status. The sheet stays the master for the initial data; afterwards the Direction edits in the app.
Rows already edited in the app keep the Direction's changes: the upsert only refreshes the legacy
reference fields and fills fields that are still empty.
"""
from __future__ import annotations

import datetime as dt
import re
import sys

import openpyxl

CONTRACT = {"LAVORO SPORTIVO": "LAVORO_SPORTIVO", "VOLONTARIATO SPORTIVO": "VOLONTARIATO_SPORTIVO"}


def rows(wb, name: str) -> list[dict]:
    data = list(wb[name].iter_rows(values_only=True))
    hi = next(i for i, r in enumerate(data[:10]) if r and r[0] == "ID_PERSONA")
    head = [str(c).strip() if c else "" for c in data[hi]]
    return [{h: r[i] for i, h in enumerate(head) if h} for r in data[hi + 1:] if r and r[0]]


def q(v) -> str:
    if v is None or (isinstance(v, str) and not v.strip()):
        return "null"
    return "'" + re.sub(r"\s+", " ", str(v)).strip().replace("'", "''") + "'"


def money(v) -> str:
    return f"{float(v):.2f}" if isinstance(v, (int, float)) and not isinstance(v, bool) else "null"


def day(v) -> str:
    if isinstance(v, (dt.date, dt.datetime)):
        return f"'{v.date().isoformat() if isinstance(v, dt.datetime) else v.isoformat()}'"
    return "null"


def main(path: str) -> None:
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    rel = rows(wb, "08_RAPPORTI_ECONOMICI")
    pay = {r["ID_PERSONA"]: r for r in rows(wb, "09_PAGAMENTI_OTTOBRE")}
    values = []
    for r in rel:
        stato = str(r.get("STATO_RAPPORTO") or "").upper()
        iban = str(r.get("STATO_IBAN") or "").upper()
        p = pay.get(r["ID_PERSONA"], {})
        blocked = "BLOCCATO" in stato or "BLOCCATO" in str(p.get("STATO_PAGAMENTO") or "").upper()
        values.append(
            "(" + ", ".join([
                q(r["ID_PERSONA"]), q(r["ID_PERSONA"]), q(r.get("NOMINATIVO")), q(r.get("AREA")), q(r.get("RUOLO")),
                q(CONTRACT.get(str(r.get("RAPPORTO_CORRENTE") or "").upper(), "DA_VERIFICARE")),
                money(r.get("FISSO_DOCUMENTATO_MESE")) if money(r.get("FISSO_DOCUMENTATO_MESE")) != "null" else "0",
                money(r.get("IMPORTO_LEGACY_MESE")),
                q("DA_VERIFICARE" if "PRESENTE" in iban else "MANCANTE"),
                q("BLOCCATO" if blocked else "DA_VERIFICARE"),
                day(r.get("DATA_FINE")),
                money(r.get("ACCONTI_APERTI")) if money(r.get("ACCONTI_APERTI")) != "null" else "0",
                money(r.get("RECUPERI_DA_INCASSARE")) if money(r.get("RECUPERI_DA_INCASSARE")) != "null" else "0",
                q(r.get("CRITICITA")),
            ]) + ")"
        )
    print("with src(person_code, source_record_id, display_name, area, role_label, contract_type, monthly_fixed, legacy_monthly,")
    print("  iban_status, contract_status, end_date, open_advances, open_recoveries, notes) as (values")
    print(",\n".join(values))
    print(")")
    print("insert into public.scd_comp_agreements as a (organization_id, person_code, source_id, source_record_id, display_name, area, role_label,")
    print("  contract_type, monthly_fixed, legacy_monthly, iban_status, contract_status, end_date, open_advances, open_recoveries, notes)")
    print("select (select id from public.scd_organizations limit 1), person_code, 'CONTROL_TOWER_2026_27', source_record_id, display_name, area, role_label,")
    print("  contract_type, monthly_fixed, legacy_monthly, iban_status, contract_status, end_date::date, open_advances, open_recoveries, notes from src")
    print("on conflict (organization_id, source_id, source_record_id) where source_record_id is not null do update set")
    print("  legacy_monthly = excluded.legacy_monthly, open_advances = excluded.open_advances, open_recoveries = excluded.open_recoveries,")
    print("  area = coalesce(a.area, excluded.area), role_label = coalesce(a.role_label, excluded.role_label),")
    print("  end_date = coalesce(a.end_date, excluded.end_date), updated_at = now()")
    print("returning a.source_record_id;")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: compensation_control_tower.py control_tower.xlsx")
    main(sys.argv[1])

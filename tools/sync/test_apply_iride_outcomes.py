"""Unit tests of the Iride outcomes overlay used by the hourly public-calendar task.

Run: python3 -I -B -m unittest discover -s tools/sync -p "test_*.py"
"""
from __future__ import annotations

import datetime as dt
import json
import os
import subprocess
import sys
import tempfile
import unittest
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import apply_iride_outcomes as aio  # noqa: E402
import calendar_public_payload as cpp  # noqa: E402

SCRIPT = os.path.join(HERE, "apply_iride_outcomes.py")
CONVERTER = os.path.join(HERE, "calendar_public_payload.py")
def dump(obj, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f)


def read(path):
    with open(path, "rb") as f:
        return f.read()


FAKE_KEY = "wamid.HBgMMzkzMDAwMDAwMDAwFQIAEhgTEST-1"  # synthetic: no real number inside


def rows():
    r = aio.master_row
    return [
        r("EVT-PC78-2A-A-FUORI", dt.datetime(2026, 10, 17), dt.time(10, 30), "Primi Calci 7-8 anni", "FUORI", "Vercurago"),
        r("EVT-ES14-2A-B-CASA", dt.datetime(2026, 10, 17), dt.time(15, 0), "Esordienti 12 anni (2014)", "CASA", "COLICO - CAMPO 2",
          conflict="HARD_CONFLICT"),
        r("EVT-PUL-2A-C-CASA", dt.datetime(2026, 10, 18), dt.time(15, 0), "Pulcini Misti 7v7", "CASA", "COLICO - CAMPO 1",
          status="CLUB_EVENT"),
        r("EVT-U15-2A-D-CASA", dt.datetime(2026, 10, 18), dt.time(17, 0), "U15 Giovanissimi", "CASA", "COLICO - CAMPO 1"),
        r("EVT-PRIMA-2A-E-CASA", dt.datetime(2026, 10, 18), dt.time(15, 30), "Prima Squadra", "CASA", "COLICO - CAMPO 1"),
    ]


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.src = os.path.join(self.tmp, "master.xlsx")
        self.out = os.path.join(self.tmp, "out.xlsx")
        aio.make_master(self.src, rows(), aio.HEAD)

    def run_apply(self, outs, today=dt.date(2026, 10, 17)):
        return aio.apply(self.src, outs, self.out, today)

    def events(self, path=None):
        rs = cpp.read_master(path or self.out)
        return {r["EVENT_ID"]: cpp.event_of(r, quiet=True) for r in rs}, {r["EVENT_ID"]: r for r in rs}


class Mapping(Base):
    def test_conferma_confirms_time_and_venue_keeps_match_status(self):
        rep = self.run_apply([aio.outcome(FAKE_KEY, "EVT-PC78-2A-A-FUORI", "CONFERMA", "17/10", "10:30")])
        self.assertEqual(len(rep["applied"]), 1)
        ev, raw = self.events()
        e = ev["EVT-PC78-2A-A-FUORI"]
        self.assertEqual(e["notice"], [])
        self.assertTrue(e["verification"]["time_confirmed"] and e["verification"]["venue_confirmed"])
        self.assertEqual(raw["EVT-PC78-2A-A-FUORI"]["MATCH_STATUS"], "OFFICIAL_CALENDAR")
        self.assertEqual(raw["EVT-PC78-2A-A-FUORI"]["OPERATIONAL_STATUS"], "READY")

    def test_annulla_cancels_and_drops_from_public_copy(self):
        self.run_apply([aio.outcome(FAKE_KEY, "EVT-ES14-2A-B-CASA", "ANNULLA", "17/10", "15:00")])
        ev, raw = self.events()
        self.assertIsNone(ev["EVT-ES14-2A-B-CASA"])
        self.assertEqual(raw["EVT-ES14-2A-B-CASA"]["MATCH_STATUS"], "CANCELLED")
        self.assertEqual(raw["EVT-ES14-2A-B-CASA"]["CONFLICT_STATUS"], "HARD_CONFLICT")  # never touched

    def test_sposta_new_date_time_pitch_is_rescheduled(self):
        self.run_apply([aio.outcome(FAKE_KEY, "EVT-PUL-2A-C-CASA", "SPOSTA", "18/10", "15:00",
                                    data_nuova="25/10/2026", ora_nuova="10:00", sede_nuova="colico - campo 2")])
        ev, raw = self.events()
        e = ev["EVT-PUL-2A-C-CASA"]
        self.assertEqual((e["date"], e["time"], e["venue"], e["match_status"]), ("2026-10-25", "10:00", "COLICO - CAMPO 2", "RESCHEDULED"))
        self.assertTrue(e["is_variation"])
        self.assertEqual(e["notice"], [])
        self.assertIn("spostata (25/10/2026, 10:00, COLICO - CAMPO 2)", raw["EVT-PUL-2A-C-CASA"]["NOTES"])

    def test_cambia_is_read_as_sposta(self):
        rep = self.run_apply([aio.outcome(FAKE_KEY, "EVT-PC78-2A-A-FUORI", "cambia", "17/10", "10:30", ora_nuova="11:00")])
        self.assertEqual(rep["applied"][0]["azione"], "SPOSTA")


class Refusals(Base):
    def reason(self, o):
        rep = self.run_apply([o])
        self.assertEqual(rep["applied"], [])
        return rep["skipped"][0]["motivo"]

    def test_scope_up_to_2014_only(self):
        self.assertEqual(self.reason(aio.outcome(FAKE_KEY, "EVT-U15-2A-D-CASA", "CONFERMA", "18/10", "17:00")),
                         "categoria fuori dall'attività di base")
        self.assertEqual(self.reason(aio.outcome(FAKE_KEY, "EVT-PRIMA-2A-E-CASA", "ANNULLA", "18/10", "15:30")),
                         "categoria fuori dall'attività di base")

    def test_pitch_only_colico_and_only_home(self):
        self.assertEqual(self.reason(aio.outcome(FAKE_KEY, "EVT-PUL-2A-C-CASA", "SPOSTA", "18/10", "15:00", sede_nuova="DERVIO")),
                         "campo non ammesso")
        self.assertEqual(self.reason(aio.outcome(FAKE_KEY, "EVT-PC78-2A-A-FUORI", "SPOSTA", "17/10", "10:30",
                                                 sede_nuova="COLICO - CAMPO 1")), "cambio campo su una gara in trasferta")

    def test_bad_values(self):
        self.assertEqual(self.reason(aio.outcome(FAKE_KEY, "EVT-PUL-2A-C-CASA", "SPOSTA", "18/10", "15:00", ora_nuova="9:30")),
                         "orario non valido")
        self.assertEqual(self.reason(aio.outcome(FAKE_KEY, "EVT-PUL-2A-C-CASA", "SPOSTA", "18/10", "15:00", data_nuova="31/07/2027")),
                         "data nuova non valida")
        self.assertEqual(self.reason(aio.outcome(FAKE_KEY, "EVT-PUL-2A-C-CASA", "SPOSTA", "18/10", "15:00", data_nuova="30/02/2027")),
                         "data nuova non valida")
        self.assertEqual(self.reason(aio.outcome(FAKE_KEY, "EVT-PUL-2A-C-CASA", "SPOSTA", "18/10", "15:00")),
                         "spostamento senza data, orario né campo")
        self.assertEqual(self.reason(aio.outcome(FAKE_KEY, "EVT-PUL-2A-C-CASA", "RINVIA", "18/10", "15:00")), "azione non valida: 'RINVIA'")
        self.assertEqual(self.reason(aio.outcome(FAKE_KEY, "EVT-NOPE", "CONFERMA", "18/10", "15:00")), "EVENT_ID non trovato")

    def test_master_wins_when_changed_after_the_request(self):
        self.assertEqual(self.reason(aio.outcome(FAKE_KEY, "EVT-PUL-2A-C-CASA", "CONFERMA", "18/10", "14:00")),
                         "orario cambiato nel master dopo la richiesta")
        self.assertEqual(self.reason(aio.outcome(FAKE_KEY, "EVT-PUL-2A-C-CASA", "CONFERMA", "19/10", "15:00")),
                         "data cambiata nel master dopo la richiesta")


class Overlay(Base):
    OUTS = [aio.outcome(FAKE_KEY, "EVT-PC78-2A-A-FUORI", "CONFERMA", "17/10", "10:30"),
            aio.outcome(FAKE_KEY + "2", "EVT-PUL-2A-C-CASA", "SPOSTA", "18/10", "15:00", ora_nuova="16:00")]

    def test_same_result_every_hour(self):
        self.run_apply(self.OUTS, today=dt.date(2026, 10, 17))
        first = read(self.out)
        self.run_apply(self.OUTS, today=dt.date(2026, 10, 20))  # notes use the registration day, not today
        self.assertEqual(first, read(self.out))

    def test_idempotent_on_its_own_output(self):
        self.run_apply(self.OUTS)
        rep = aio.apply(self.out, self.OUTS, os.path.join(self.tmp, "again.xlsx"), dt.date(2026, 10, 17))
        self.assertEqual(rep["applied"], [])
        self.assertEqual({s["motivo"] for s in rep["skipped"]}, {"già applicato"})

    def test_no_outcomes_leaves_rows_untouched(self):
        rep = self.run_apply([])
        self.assertEqual((rep["applied"], rep["skipped"]), ([], []))
        with zipfile.ZipFile(self.src) as a, zipfile.ZipFile(self.out) as b:
            for n in a.namelist():
                self.assertEqual(a.read(n), b.read(n), n)

    def test_other_parts_byte_identical_and_no_key_leak(self):
        self.run_apply(self.OUTS)
        with zipfile.ZipFile(self.src) as a, zipfile.ZipFile(self.out) as b:
            p = aio.sheet_path(a)
            for n in a.namelist():
                if n not in (p, "xl/workbook.xml"):
                    self.assertEqual(a.read(n), b.read(n), n)
            self.assertNotIn(b"wamid", b.read(p))
            self.assertNotIn(b"HBgM", b.read(p))

    def test_fingerprint_order_independent_and_sensitive(self):
        f = aio.fingerprint(self.OUTS)
        self.assertEqual(f, aio.fingerprint(list(reversed(self.OUTS))))
        changed = json.loads(json.dumps(self.OUTS))
        changed[1]["data"]["ora_nuova"] = "16:30"
        self.assertNotEqual(f, aio.fingerprint(changed))
        self.assertNotIn("wamid", f)

    def test_full_page_warns(self):
        many = [aio.outcome(f"k{i}", "EVT-NOPE", "CONFERMA", "17/10", "10:00") for i in range(aio.MAX_RECORDS)]
        self.assertTrue(self.run_apply(many)["avvisi"])

    def test_text_dates_in_master_stay_text(self):
        src = os.path.join(self.tmp, "text.xlsx")
        r = aio.master_row("EVT-PA-1A-F-CASA", "25/10/2026", "10:00", "Piccoli Amici", "CASA", "COLICO - CAMPO 1")
        aio.make_master(src, [r], aio.HEAD)
        aio.apply(src, [aio.outcome(FAKE_KEY, "EVT-PA-1A-F-CASA", "SPOSTA", "25/10", "10:00", data_nuova="01/11/2026",
                                    ora_nuova="09:30")], self.out, dt.date(2026, 10, 17))
        ev, raw = self.events()
        self.assertEqual(raw["EVT-PA-1A-F-CASA"]["DATE"], "01/11/2026")
        self.assertEqual(raw["EVT-PA-1A-F-CASA"]["TIME"], "09:30")
        self.assertEqual((ev["EVT-PA-1A-F-CASA"]["date"], ev["EVT-PA-1A-F-CASA"]["time"]), ("2026-11-01", "09:30"))


class Cli(Base):
    def cli(self, *args):
        return subprocess.run([sys.executable, "-I", "-B", SCRIPT, *args], capture_output=True, text=True)

    def test_pipeline_apply_then_converter(self):
        oj = os.path.join(self.tmp, "outcomes.json")
        dump(Overlay.OUTS, oj)
        r = self.cli(self.src, oj, self.out)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertNotIn("wamid", r.stdout + r.stderr)
        self.assertEqual(len(json.loads(r.stdout)["applied"]), 2)
        c = subprocess.run([sys.executable, "-I", "-B", CONVERTER, self.out, "2026-10-17T08:00:00Z"], capture_output=True, text=True)
        self.assertEqual(c.returncode, 0, c.stderr)
        pub = {e["id"]: e for e in json.loads(c.stdout)["events"]}
        self.assertEqual(pub["EVT-PUL-2A-C-CASA"]["time"], "16:00")
        self.assertEqual(pub["EVT-PC78-2A-A-FUORI"]["notice"], [])
        self.assertNotIn("NOTES", json.dumps(pub))
        self.assertNotIn("Iride", c.stdout)  # notes never reach the public copy

    def test_fingerprint_cli(self):
        oj = os.path.join(self.tmp, "outcomes.json")
        dump(Overlay.OUTS, oj)
        r = self.cli("--fingerprint", oj)
        self.assertEqual((r.returncode, r.stdout.strip()), (0, aio.fingerprint(Overlay.OUTS)))

    def test_bad_outcomes_file_is_a_blocker(self):
        oj = os.path.join(self.tmp, "bad.json")
        dump({"oops": 1}, oj)
        r = self.cli(self.src, oj, self.out)
        self.assertEqual(r.returncode, 2)
        self.assertIn("BLOCKER", r.stderr)
        self.assertFalse(os.path.exists(self.out))

    def test_empty_list_is_valid(self):
        oj = os.path.join(self.tmp, "empty.json")
        dump([], oj)
        self.assertEqual(self.cli(self.src, oj, self.out).returncode, 0)


if __name__ == "__main__":
    unittest.main()

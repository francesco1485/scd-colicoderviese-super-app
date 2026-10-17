/**
 * Dervio: the eight zones of the club navigator (board Rotazione-Dervio) and
 * the matches the CURRENT scenario would play there, with the notice to the
 * team (14 days before). The Comune di Dervio is already informed with the season
 * programme (DG 2026-10-16). Nothing here is a decision: it is the simulation's output.
 */
import { AlertTriangle, MapPin } from "lucide-react";

import {
  DERVIO_START_DATE,
  EXCLUSION_LABEL,
  candidatesFromHomeMatches,
  dervioChecklist,
  upcomingDervioWeeks,
  type DervioWeek,
} from "@/lib/dervio-rotation";
import {
  COMUNE_DERVIO_NOTE,
  GROUP_SHORT,
  RAIN_MOVE_NOTICE_TO,
  ddmm,
  hhmm,
  type DervioMatch,
} from "@/lib/rotation";
import {
  BASE_MATCHES,
  presetLabel,
  teamColor,
  type ImpiantiModel,
} from "./model";
import { Card, Chip, SimulationNote, Src, btnPrimary } from "./ui";

interface Zone {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  ink: string;
  name: string;
  note?: string;
  big?: boolean;
}

const ZONES: Zone[] = [
  {
    id: "C1",
    x: 150,
    y: 150,
    w: 440,
    h: 220,
    fill: "#2f8a4f",
    ink: "#ffffff",
    name: "Campo a 11 · erba naturale",
    // Verbale LND 97,80 × 50, master «16 - SEDI E IMPIANTI» 96 × 48: until reconciled, no number here.
    note: "misure da confermare",
    big: true,
  },
  {
    id: "AT1",
    x: 60,
    y: 20,
    w: 300,
    h: 42,
    fill: "#d98b70",
    ink: "#062a52",
    name: "Atletica",
  },
  {
    id: "AT2",
    x: 380,
    y: 20,
    w: 300,
    h: 42,
    fill: "#d98b70",
    ink: "#062a52",
    name: "Atletica",
  },
  {
    id: "TR",
    x: 200,
    y: 470,
    w: 340,
    h: 72,
    fill: "#ffffff",
    ink: "#062a52",
    name: "Tribuna coperta",
    note: "190 posti, dato 2024",
  },
  {
    id: "C2",
    x: 720,
    y: 70,
    w: 230,
    h: 150,
    fill: "#3d9a5c",
    ink: "#ffffff",
    name: "Allenamento",
  },
  {
    id: "BV1",
    x: 720,
    y: 240,
    w: 110,
    h: 100,
    fill: "#f3d79a",
    ink: "#062a52",
    name: "Beach",
  },
  {
    id: "BV2",
    x: 840,
    y: 240,
    w: 110,
    h: 100,
    fill: "#f3d79a",
    ink: "#062a52",
    name: "Beach",
  },
  {
    id: "SP1",
    x: 720,
    y: 360,
    w: 230,
    h: 110,
    fill: "#ffffff",
    ink: "#062a52",
    name: "Spogliatoi",
    note: "4 squadre + arbitri",
  },
];

function DervioMap() {
  return (
    <svg
      viewBox="0 0 980 560"
      width="100%"
      role="img"
      aria-label="Schema del centro sportivo di Dervio con otto zone: AT1 e AT2 atletica, C1 campo a 11 in erba naturale, misure da confermare, TR tribuna coperta 190 posti, C2 allenamento, BV1 e BV2 beach, SP1 spogliatoi"
      className="block h-auto"
    >
      <rect width="980" height="560" rx="18" fill="#e9f2fb" />
      <rect x="60" y="70" width="620" height="380" rx="190" fill="#c8735a" />
      <rect x="96" y="104" width="548" height="312" rx="156" fill="#d98b70" />
      {ZONES.map((z) => {
        const cx = z.x + z.w / 2;
        const short = z.h < 60;
        return (
          <g key={z.id}>
            <rect
              x={z.x}
              y={z.y}
              width={z.w}
              height={z.h}
              rx="8"
              fill={z.fill}
              stroke="#ffffff"
              strokeWidth="3"
            />
            {short ? (
              <text x={cx} y={z.y + 28} textAnchor="middle" fill={z.ink}>
                <tspan
                  fontFamily="Big Shoulders Display"
                  fontWeight="900"
                  fontSize="24"
                >
                  {z.id}
                </tspan>
                <tspan
                  fontFamily="Barlow"
                  fontWeight="600"
                  fontSize="16"
                  dx="10"
                >
                  {z.name}
                </tspan>
              </text>
            ) : (
              <>
                <text
                  x={cx}
                  y={z.y + z.h / 2 - (z.note ? 12 : 2)}
                  textAnchor="middle"
                  fontFamily="Big Shoulders Display"
                  fontWeight="900"
                  fontSize={z.big ? 30 : 26}
                  fill={z.ink}
                >
                  {z.id}
                </text>
                <text
                  x={cx}
                  y={z.y + z.h / 2 + (z.note ? 12 : 22)}
                  textAnchor="middle"
                  fontFamily="Barlow"
                  fontWeight="600"
                  fontSize={z.big ? 18 : 16}
                  fill={z.ink}
                >
                  {z.name}
                </text>
                {z.note && (
                  <text
                    x={cx}
                    y={z.y + z.h / 2 + 33}
                    textAnchor="middle"
                    fontFamily="Barlow"
                    fontSize={z.big ? 16 : 14}
                    fill={z.ink}
                  >
                    {z.note}
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function noticeChip(d: DervioMatch) {
  if (d.late)
    return (
      <Chip tone="warn">
        Avviso alla squadra entro il {ddmm(d.noticeBy)}: già in ritardo
      </Chip>
    );
  if (d.daysToNotice <= 10)
    return (
      <Chip tone="warn">Avviso alla squadra entro il {ddmm(d.noticeBy)}</Chip>
    );
  return (
    <Chip tone="info">Avviso alla squadra entro il {ddmm(d.noticeBy)}</Chip>
  );
}

/** The season rule (DG 16/10/2026) over the real home matches: one youth home match per week at Dervio. */
function SeasonPlan({ today }: { today: string }) {
  const weeks: DervioWeek[] = upcomingDervioWeeks(
    candidatesFromHomeMatches(BASE_MATCHES),
    today,
    6,
  );
  return (
    <Card
      id="h-dervio-plan"
      title="Piano Dervio: 1 gara giovanile a settimana"
      subtitle={`Regola della Direzione (16/10): dal ${ddmm(DERVIO_START_DATE)}, dalla squadra più giovane in su, a turno. Proposta calcolata dal Master Calendario: nessuna gara è spostata davvero.`}
    >
      {weeks.length === 0 ? (
        <p className="m-0 px-4 pb-4 text-[14px] text-[var(--in-sub)] sm:px-[18px]">
          Nessuna settimana da pianificare: nel calendario non ci sono gare in
          casa dal {ddmm(DERVIO_START_DATE)} in poi.
        </p>
      ) : (
        <ol className="m-0 list-none p-0" aria-label="Prossime settimane">
          {weeks.map((w) => {
            const pick = w.pick;
            const notice = pick
              ? dervioChecklist({
                  matchDate: pick.match.date,
                  today,
                  group: pick.group,
                }).find((i) => i.id === "team-notice")
              : undefined;
            return (
              <li
                key={w.weekStart}
                className="flex items-start gap-3.5 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]"
              >
                <div className="w-[86px] flex-none text-[13px] text-[var(--in-sub)]">
                  Settimana
                  <b className="block font-title text-[17px] font-black text-[var(--in-ink)]">
                    {ddmm(w.weekStart)}–{ddmm(w.weekEnd)}
                  </b>
                </div>
                {pick ? (
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1.5 text-[15px] font-bold">
                      <i
                        className="inline-block size-3 rounded-sm"
                        style={{ background: teamColor(pick.group) }}
                      />
                      {pick.label}
                    </span>
                    <div className="text-[13px] text-[var(--in-sub)]">
                      {ddmm(pick.match.date)} ore{" "}
                      {pick.match.time ?? "da confermare"} · ora in calendario a
                      Colico
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {notice && (
                        <Chip
                          tone={notice.status === "overdue" ? "warn" : "info"}
                        >
                          Avviso alla squadra entro il{" "}
                          {ddmm(notice.dueDate ?? pick.match.date)}
                          {notice.status === "overdue"
                            ? ": già in ritardo"
                            : ""}
                        </Chip>
                      )}
                      {pick.winterGrass && (
                        <Chip tone="warn">
                          Erba in inverno: decide il meteo
                        </Chip>
                      )}
                      {pick.group === "u16" && (
                        <Chip tone="warn">Anticipare orario U16 (sabato)</Chip>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1 text-[14px] text-[var(--in-sub)]">
                    {w.skipReason === "all-excluded"
                      ? `Nessuna gara idonea: ${[...new Set(w.excluded.map((x) => EXCLUSION_LABEL[x.reason]))].join("; ")}`
                      : "Nessuna gara giovanile in casa questa settimana: Dervio libero"}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <Src>
        Squadra che ha giocato l&apos;ultima gara a Dervio prima del{" "}
        {ddmm(DERVIO_START_DATE)}: non nota, il turno parte dai Piccoli Amici.
        Prima Squadra sempre a Colico. Nessun avviso è stato inviato.
      </Src>
    </Card>
  );
}

export function DervioTab({
  model,
  onTryAuto,
}: {
  model: ImpiantiModel;
  onTryAuto: () => void;
}) {
  const list = model.analysis.dervio
    .filter((d) => d.match.kind === "match")
    .sort(
      (a, b) =>
        a.match.date.localeCompare(b.match.date) ||
        a.match.start - b.match.start,
    );
  const ipotesi = model.analysis.dervio.filter((d) => d.match.kind !== "match");
  return (
    <div className="grid gap-[18px] @[1080px]:grid-cols-[minmax(0,1fr)_440px]">
      <Card
        id="h-dervio-map"
        title="Mappa del centro · Dervio"
        subtitle="Centro sportivo Azzurri d'Italia. Le otto zone del navigatore del club."
      >
        <div className="px-4 pb-2.5 sm:px-[18px]">
          <DervioMap />
        </div>
        <ul
          className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-1 px-4 pb-3 text-[14px] sm:grid-cols-2 sm:px-[18px]"
          aria-label="Zone del centro"
        >
          {ZONES.map((z) => (
            <li key={z.id}>
              <b>{z.id}</b> · {z.name}
              {z.note ? `, ${z.note}` : ""}
            </li>
          ))}
        </ul>
        <Src>
          <MapPin
            className="mt-0.5 size-[15px] flex-none"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          Schema non in scala e non orientato, dal navigatore Dervio V01 e dal
          rapporto tecnico 2025. Non è un rilievo né un'omologazione.
        </Src>
      </Card>

      <div className="grid content-start gap-[18px]">
        <SeasonPlan today={model.today} />
        <Card
          id="h-dervio-list"
          title="Gare proposte a Dervio"
          subtitle={`Scenario: ${presetLabel(model.preset)}. Restano a Colico finché la Direzione non approva e la LND non autorizza la variazione.`}
        >
          {list.length === 0 ? (
            <div className="mx-4 mb-4 rounded-[14px] border-[1.5px] border-dashed border-[#b9d5ef] bg-[#f8fbfe] p-4 sm:mx-[18px]">
              <b className="block text-[16px]">
                Nessuna gara a Dervio in questo scenario
              </b>
              <p className="mb-3 mt-1 text-[14px] leading-snug text-[var(--in-sub)]">
                Con il calendario attuale tutte le gare in casa sono a Colico.
                Prova a spostare solo le gare che creano un conflitto.
              </p>
              <button type="button" className={btnPrimary} onClick={onTryAuto}>
                Prova «Solo i conflitti a Dervio»
              </button>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {list.map((d) => (
                <li
                  key={d.match.id}
                  className="flex items-start gap-3.5 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]"
                >
                  <div className="w-[58px] flex-none">
                    <b className="font-title text-[22px] font-black">
                      {ddmm(d.match.date)}
                    </b>
                    <div className="text-[12.5px] text-[var(--in-sub)]">
                      {hhmm(d.match.start)}
                    </div>
                  </div>
                  <span
                    className="mt-1 inline-flex h-[26px] min-w-[38px] flex-none -skew-x-[8deg] items-center justify-center rounded-[7px] px-1.5 font-title text-[14px] font-black text-white"
                    style={{ background: teamColor(d.match.group) }}
                    title={d.match.label}
                  >
                    <span className="skew-x-[8deg]">
                      {GROUP_SHORT[d.match.group] ?? d.match.short}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="text-[15px]">{d.match.opponent || "—"}</b>
                    <div className="text-[13px] text-[var(--in-sub)]">
                      {d.match.label} · in calendario a Colico, campo 1
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {noticeChip(d)}
                      {d.needsLights && (
                        <Chip tone="warn">Luci da verificare</Chip>
                      )}
                      {d.winterGrass && (
                        <Chip tone="warn">Erba in inverno</Chip>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {ipotesi.length > 0 && (
            <p className="m-0 border-t border-[var(--in-line)] px-4 py-2.5 text-[14px] text-[var(--in-sub)] sm:px-[18px]">
              Più {ipotesi.length}{" "}
              {ipotesi.length === 1 ? "ipotesi" : "ipotesi"} a Dervio nella
              simulazione (non salvate nel gestionale).
            </p>
          )}
          <Src>
            {COMUNE_DERVIO_NOTE} Se piove e la gara torna a Colico: avviso solo
            a {RAIN_MOVE_NOTICE_TO} (la FIGC avvisa l&apos;arbitro). Nessun
            avviso è stato inviato.
          </Src>
        </Card>
        <section
          className="flex items-start gap-3 rounded-2xl border border-[var(--in-line)] bg-white px-[18px] py-4 shadow-[var(--in-card-shadow)]"
          aria-label="Erba naturale"
        >
          <AlertTriangle
            className="size-[22px] flex-none text-[var(--in-warn)]"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <p className="m-0 text-[14px] leading-snug text-[var(--in-sub)]">
            <b className="text-[var(--in-ink)]">Erba naturale.</b> Dervio si usa
            anche in inverno; se piove la gara torna a Colico (meteo controllato
            3 giorni prima, decisione il giorno prima). La capienza per formato
            va verificata sulle misure reali (verbale LND 97,80 × 50, master 96
            × 48). Luci disponibili per le gare serali.
          </p>
        </section>
        <SimulationNote>
          Le date di avviso sono calcolate sullo scenario scelto.
        </SimulationNote>
      </div>
    </div>
  );
}

/**
 * Control Room of the Direzione ("Excelsior" interiors, Direzione 13/10/2026 15:31).
 * Structure from the reference board "CONTROL ROOM OPERATIVA" (REFERENCE_BOARD, never its sample data):
 * a navy instrument band with date, time and the real health of the sources, tabs to the existing
 * work areas, then tiles filled only by sources the app already reads. Rules live in
 * src/lib/control-room.ts; this file only draws them.
 *
 * Desktop (xl): rows of tiles whose widths always add up to the full row, whatever is hidden.
 * Phone and tablet: the same tiles as one prioritised stack (Oggi, Alert, Task first).
 */
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BusFront,
  CalendarDays,
  CalendarRange,
  CircleDashed,
  ClipboardList,
  Gauge,
  Mail,
  MapPinned,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import crest from "@/assets/brand/logo-scd.png.asset.json";
import { groupShort, matchTitle, trainingRowsFor } from "@/lib/board-data";
import {
  CHECK_LABEL,
  CONTROL_ROOM_ROWS,
  CONTROL_ROOM_TABS,
  MOBILE_TILE_ORDER,
  RUN_LABEL,
  addDaysIso,
  buildAlerts,
  buildTasks,
  facilityToday,
  latestProposals,
  nextEvents,
  nextHomeMatch,
  proposalCounts,
  rowSpans,
  sourceChecks,
  statusTone,
  systemStatus,
  tileVisibility,
  todayAgenda,
  upcomingRuns,
  type ControlRoomSources,
  type TileId,
  type Tone,
} from "@/lib/control-room";
import { dueText, dueTone } from "@/lib/knowledge";
import { KIND_LABEL, STATUS_LABEL } from "@/lib/proposals";
import { freshnessLabel, type PublicGroup } from "@/lib/public-snapshots";
import { Chip } from "./interior-ui";

/* ------------------------------------------------------------------ formatting */

const TZ = "Europe/Rome";

function longDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const s = new Intl.DateTimeFormat("it-IT", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dayShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const wd = new Intl.DateTimeFormat("it-IT", { timeZone: TZ, weekday: "short" }).format(d).replace(".", "");
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** "14:02" today, "12/10" otherwise. */
function whenShort(isoTime: string, today: string): string {
  const d = new Date(isoTime);
  if (Number.isNaN(d.getTime())) return "";
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  if (day === today) return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

const TONE_TEXT: Readonly<Record<Tone, string>> = { ok: "ok", warn: "attenzione", crit: "urgente", info: "info", mute: "neutro" };

function Dot({ tone, live = false }: { tone: Tone; live?: boolean }) {
  return <span aria-hidden="true" className={`ex-dot ex-dot--${tone} ${live ? "ex-dot--live" : ""}`} />;
}

/* ------------------------------------------------------------------ tile frame */

const ACCENT: Readonly<Record<TileId, string>> = {
  oggi: "var(--ex-navy)",
  alert: "#c2362b",
  task: "var(--ex-gold)",
  fonti: "var(--ex-navy)",
  settimana: "var(--ex-navy)",
  eventi: "#1b6fc4",
  impianti: "#1f8a4c",
  pulmini: "#1b6fc4",
  posta: "#1b6fc4",
  matchday: "var(--ex-gold)",
  pratiche: "var(--ex-navy)",
};

function Tile({
  id,
  icon: Icon,
  title,
  sub,
  count,
  countTone = "info",
  more,
  children,
  style,
}: {
  id: TileId;
  icon: LucideIcon;
  title: string;
  sub?: ReactNode;
  count?: number | null;
  countTone?: Tone;
  more?: { to: string; label: string };
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section
      aria-labelledby={`cr-${id}-t`}
      data-tile={id}
      style={{ ...style, ["--accent" as string]: ACCENT[id] }}
      className="ex-panel relative flex min-w-0 flex-col overflow-hidden max-xl:[order:var(--m-order)] before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-[var(--accent)]"
    >
      <header className="px-4 pb-3 pt-3.5 sm:px-5">
        <div className="flex min-h-11 items-center gap-2.5">
          <Icon className="size-[18px] flex-none text-[var(--ex-ink)]" strokeWidth={1.75} aria-hidden="true" />
          <h2 id={`cr-${id}-t`} className="ex-title m-0 min-w-0 flex-1 text-[17px] text-[var(--ex-ink)]">{title}</h2>
          {count != null && count > 0 && (
            <span className={`ex-num inline-flex h-6 min-w-6 flex-none items-center justify-center rounded-full px-1.5 text-[12.5px] font-semibold ${countTone === "crit" ? "bg-[#c2362b] text-white" : countTone === "warn" ? "bg-[var(--ex-gold)] text-[var(--ex-ink)]" : "bg-[var(--ex-navy)] text-white"}`}>
              {count}
            </span>
          )}
          {more && (
            <Link to={more.to as never} className="scd-focus -mr-1 inline-flex min-h-11 flex-none items-center gap-1 whitespace-nowrap rounded-md px-1 text-[13px] font-medium text-[var(--in-info)] underline-offset-4 hover:underline">
              {more.label}
              <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden="true" />
            </Link>
          )}
        </div>
        {sub && <p className="-mt-1 pl-[28px] text-[13px] leading-snug text-[var(--ex-sub)]">{sub}</p>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col border-t border-[var(--ex-hair)]">{children}</div>
    </section>
  );
}

function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="m-4 rounded-lg border border-dashed border-[var(--ex-hair-strong)] px-4 py-3.5 sm:mx-5">
      <b className="block text-[14.5px] font-semibold leading-snug text-[var(--ex-ink)]">{title}</b>
      {children && <p className="mt-1 text-[13px] leading-snug text-[var(--ex-sub)]">{children}</p>}
    </div>
  );
}

function Rows({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="m-0 list-none divide-y divide-[var(--ex-hair)] p-0">
      {children}
    </ul>
  );
}

function Foot({ children }: { children: ReactNode }) {
  return <p className="mt-auto border-t border-[var(--ex-hair)] px-4 py-2.5 text-[12px] leading-snug text-[var(--ex-sub)] sm:px-5">{children}</p>;
}

/* ------------------------------------------------------------------ main */

export function ControlRoom({ sources, path = "/direzione", tools }: { sources: ControlRoomSources; path?: string; tools?: ReactNode }) {
  const s = sources;
  const groupsById = useMemo(() => new Map<string, PublicGroup>((s.calendar?.groups ?? []).map((g) => [g.id, g])), [s.calendar]);
  const label = (id: string) => groupShort(groupsById.get(id), id);
  const vis = useMemo(() => tileVisibility(s), [s]);
  const checks = useMemo(() => sourceChecks(s), [s]);
  const status = systemStatus(checks);
  const alerts = useMemo(() => buildAlerts(s, label), [s]); // eslint-disable-line react-hooks/exhaustive-deps
  const tasks = useMemo(() => buildTasks(s), [s]);

  const tiles: Record<TileId, (style: CSSProperties) => ReactNode> = {
    oggi: (st) => <OggiTile key="oggi" s={s} label={label} style={st} />,
    alert: (st) => <AlertTile key="alert" alerts={alerts} style={st} />,
    task: (st) => <TaskTile key="task" tasks={tasks} style={st} />,
    fonti: (st) => <SourcesTile key="fonti" checks={checks} today={s.today} style={st} />,
    settimana: (st) => <WeekTile key="settimana" s={s} label={label} style={st} />,
    eventi: (st) => <EventsTile key="eventi" s={s} label={label} style={st} />,
    impianti: (st) => <FacilityTile key="impianti" s={s} style={st} />,
    pulmini: (st) => <VanTile key="pulmini" s={s} style={st} />,
    posta: (st) => <MailTile key="posta" s={s} style={st} />,
    matchday: (st) => <MatchDayTile key="matchday" s={s} label={label} style={st} />,
    pratiche: (st) => <PraticheTile key="pratiche" s={s} style={st} />,
  };

  const order = (id: TileId) => MOBILE_TILE_ORDER.indexOf(id);

  return (
    <div className="flex flex-col gap-4 lg:gap-5" data-testid="control-room">
      <Band status={status} />
      <Tabs active={path} />
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-12 xl:gap-5">
        {CONTROL_ROOM_ROWS.flatMap((row) =>
          rowSpans(row, (id) => vis[id].visible).map(([id, span]) =>
            tiles[id]({ gridColumn: `span ${span} / span ${span}`, ["--m-order" as string]: order(id) }),
          ),
        )}
      </div>
      {tools}
    </div>
  );
}

/* ------------------------------------------------------------------ band and tabs */

function Band({ status }: { status: ReturnType<typeof systemStatus> }) {
  const now = useRomeClock();
  const tone: Tone = status.level === "ok" ? "ok" : status.level === "partial" ? "warn" : "mute";
  return (
    <section aria-label="Stato della società adesso" className="ex-band ex-dark flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <img src={crest.url} alt="Stemma S.C.D. ColicoDerviese" width={46} height={60} className="h-[52px] w-auto flex-none object-contain sm:h-[60px]" />
        <div className="min-w-0">
          <p className="ex-eyebrow !text-[var(--ex-on-navy-soft)]">S.C.D. ColicoDerviese</p>
          <p className="ex-title mt-1.5 text-[24px] text-[var(--ex-on-navy)] sm:text-[30px]">Control Room operativa</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:flex-nowrap">
        <div className="leading-none">
          <p className="text-[13px] text-[var(--ex-on-navy-soft)]" suppressHydrationWarning>{longDay(now.date)}</p>
          <p className="ex-num mt-1.5 font-title text-[34px] font-bold tracking-[0.02em] text-[var(--ex-on-navy)]" suppressHydrationWarning>
            <span className="sr-only">Ora del club </span>{now.time}
          </p>
        </div>
        <div role="status" className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2.5" data-testid="system-status" data-level={status.level}>
          <Dot tone={tone} live={status.level === "ok"} />
          <span className="leading-tight">
            <b className="block text-[13.5px] font-semibold text-[var(--ex-on-navy)]">{status.label}</b>
            <small className="block text-[12px] text-[var(--ex-on-navy-soft)]">{status.detail}</small>
          </span>
        </div>
      </div>
    </section>
  );
}

function Tabs({ active }: { active: string }) {
  return (
    <nav aria-label="Sezioni della Control Room" className="ex-panel scd-scroll-x overflow-x-auto max-md:[mask-image:linear-gradient(90deg,#000_82%,transparent)]">
      <ul className="m-0 flex min-w-max list-none items-stretch p-0 px-1">
        {CONTROL_ROOM_TABS.map((t) => (
          <li key={t.id}>
            <Link
              to={t.href as never}
              aria-current={t.href === active ? "page" : undefined}
              className="ex-tab scd-focus flex h-12 items-center whitespace-nowrap px-4 text-[13px] font-semibold uppercase tracking-[0.08em]"
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Club date and time; refreshed every 30 s so the clock never lags more than half a minute. */
function useRomeClock(): { date: string; time: string } {
  const read = () => {
    const d = new Date();
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    const time = new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
    return { date, time };
  };
  const [now, setNow] = useState(read);
  useEffect(() => {
    const t = window.setInterval(() => setNow(read()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/* ------------------------------------------------------------------ tiles */

type TileProps = { s: ControlRoomSources; style: CSSProperties };

function OggiTile({ s, label, style }: TileProps & { label: (id: string) => string }) {
  const rows = todayAgenda(s, label);
  return (
    <Tile id="oggi" icon={CalendarDays} title="Oggi" sub={longDay(s.today)} count={rows.length} more={{ to: "/gestionale", label: "Settimana" }} style={style}>
      {rows.length === 0 ? (
        <Empty title="Nessuna attività in programma oggi">Il quadro allenamenti copre da lunedì a venerdì; le gare arrivano dal calendario ufficiale.</Empty>
      ) : (
        <Rows label="Attività di oggi">
          {rows.slice(0, 7).map((r) => (
            <li key={r.id} className="grid grid-cols-[8px_88px_minmax(0,1fr)] items-center gap-x-3 px-4 py-2.5 sm:px-5">
              <Dot tone={r.kind === "gara" ? "warn" : "ok"} />
              <span className="ex-num text-[13.5px] text-[var(--ex-sub)]">{r.time || "—"}{r.end ? `–${r.end}` : ""}</span>
              <span className="min-w-0 text-[14px] leading-snug">
                <b className="font-semibold">{r.label}</b>
                <small className="block truncate text-[12.5px] text-[var(--ex-sub)]">{r.kind === "gara" ? "Gara" : "Allenamento"} · {r.place}</small>
              </span>
            </li>
          ))}
        </Rows>
      )}
      {rows.length > 7 && <Foot>Altre {rows.length - 7} attività nella settimana.</Foot>}
    </Tile>
  );
}

function AlertTile({ alerts, style }: { alerts: ReturnType<typeof buildAlerts>; style: CSSProperties }) {
  const crit = alerts.some((a) => a.tone === "crit");
  return (
    <Tile id="alert" icon={AlertTriangle} title="Alert" sub="Solo problemi veri, dalle fonti collegate" count={alerts.length} countTone={crit ? "crit" : "warn"} style={style}>
      {alerts.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-4 text-[14px] sm:px-5">
          <Dot tone="ok" />
          <span>Nessun avviso dalle fonti collegate.</span>
        </div>
      ) : (
        <Rows label="Avvisi">
          {alerts.slice(0, 5).map((a) => (
            <li key={a.id}>
              <Link to={a.href as never} className="scd-focus grid grid-cols-[8px_minmax(0,1fr)_16px] items-center gap-x-3 px-4 py-2.5 hover:bg-[rgb(11_27_51/0.025)] sm:px-5">
                <Dot tone={a.tone} />
                <span className="min-w-0 text-[14px] leading-snug">
                  <b className="font-semibold">{a.title}</b>
                  <small className="block truncate text-[12.5px] text-[var(--ex-sub)]">{a.detail}</small>
                  <span className="sr-only"> ({TONE_TEXT[a.tone]})</span>
                </span>
                <ArrowRight className="size-4 text-[var(--ex-sub)]" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </Rows>
      )}
      {alerts.length > 5 && <Foot>Altri {alerts.length - 5} avvisi nelle rispettive aree.</Foot>}
    </Tile>
  );
}

function TaskTile({ tasks, style }: { tasks: ReturnType<typeof buildTasks>; style: CSSProperties }) {
  return (
    <Tile id="task" icon={ClipboardList} title="Task in scadenza" sub="Coda di lavoro e scadenze del Cervellone" count={tasks.length} countTone="warn" more={{ to: "/gestionale/coda", label: "Coda" }} style={style}>
      {tasks.length === 0 ? (
        <Empty title="Niente in scadenza">Le voci arrivano dalla coda di lavoro e dalle date catalogate nel Cervellone.</Empty>
      ) : (
        <Rows label="Task">
          {tasks.map((t) => {
            const body = (
              <>
                <CircleDashed className="mt-0.5 size-4 text-[var(--ex-sub)]" strokeWidth={1.75} aria-hidden="true" />
                <span className="min-w-0 text-[14px] leading-snug">
                  <b className="line-clamp-2 font-semibold">{t.title}</b>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {t.days !== null && <Chip tone={dueTone(t.days)} className="!min-h-[22px] !px-2 !text-[11.5px]">{dueText(t.days)}</Chip>}
                    <small className="text-[12.5px] text-[var(--ex-sub)]">{t.meta}</small>
                  </span>
                </span>
              </>
            );
            const cls = "scd-focus grid grid-cols-[16px_minmax(0,1fr)] items-start gap-x-3 px-4 py-2.5 hover:bg-[rgb(11_27_51/0.025)] sm:px-5";
            return (
              <li key={t.id}>
                {t.external ? (
                  <a href={t.href} target="_blank" rel="noopener noreferrer" className={cls}>{body}<span className="sr-only"> (si apre in una nuova scheda)</span></a>
                ) : (
                  <Link to={t.href as never} className={cls}>{body}</Link>
                )}
              </li>
            );
          })}
        </Rows>
      )}
    </Tile>
  );
}

function SourcesTile({ checks, today, style }: { checks: ReturnType<typeof sourceChecks>; today: string; style: CSSProperties }) {
  return (
    <Tile id="fonti" icon={Gauge} title="Stato delle fonti" sub="Da dove arrivano i numeri di questa pagina" style={style}>
      <Rows label="Fonti">
        {checks.map((c) => (
          <li key={c.id} className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2 sm:px-5" title={c.detail}>
            <Dot tone={statusTone("check", c.state)} />
            <span className="min-w-0 truncate text-[13.5px] font-medium">{c.label}</span>
            <span className="ex-num text-right text-[12px] text-[var(--ex-sub)]">
              {c.at && c.state !== "off" ? whenShort(c.at, today) : CHECK_LABEL[c.state]}
              {c.at && c.state === "stale" && <span className="block text-[11.5px] text-[#8a5300]">{CHECK_LABEL.stale}</span>}
            </span>
          </li>
        ))}
      </Rows>
      <Foot>Nessuna percentuale di «prontezza»: si mostra solo ciò che si può verificare.</Foot>
    </Tile>
  );
}

function WeekTile({ s, label, style }: TileProps & { label: (id: string) => string }) {
  const [y, m, d] = s.today.split("-").map(Number) as [number, number, number];
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const monday = addDaysIso(s.today, -dow);
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(monday, i));
  const cols = days.map((iso) => ({
    iso,
    trainings: s.quadro ? [...new Set(trainingRowsFor(iso, s.quadro.slots).flatMap((r) => r.teams.split(" + ")))] : [],
    matches: (s.calendar?.events ?? []).filter((e) => e.date === iso).sort((a, b) => (a.time || "99").localeCompare(b.time || "99")),
  }));
  const range = `${dayShort(days[0]!)} – ${dayShort(days[6]!)}`;
  const freshness = [s.quadro?.generatedUTC ? `quadro del ${freshnessLabel(s.quadro.generatedUTC)}` : null, s.calendar ? `calendario del ${freshnessLabel(s.calendar.sourceModifiedAt)}` : null].filter(Boolean).join(" · ");
  return (
    <Tile id="settimana" icon={CalendarRange} title="Settimana in corso" sub={range} more={{ to: "/gestionale", label: "Gestionale" }} style={style}>
      {/* Desktop: seven columns. */}
      <ol className="m-0 hidden list-none grid-cols-7 p-0 md:grid">
        {cols.map((c) => {
          const isToday = c.iso === s.today;
          return (
            <li key={c.iso} className={`min-w-0 border-r border-[var(--ex-hair)] last:border-r-0 ${isToday ? "bg-[rgb(10_29_56/0.04)]" : ""}`}>
              <h3 className={`m-0 border-b px-3 py-2 text-[12.5px] font-semibold uppercase tracking-[0.06em] ${isToday ? "border-[var(--ex-gold)] text-[var(--ex-ink)]" : "border-[var(--ex-hair)] text-[var(--ex-sub)]"}`}>
                {dayShort(c.iso)}{isToday && <span className="sr-only"> (oggi)</span>}
              </h3>
              <div className="flex flex-col gap-2 px-3 py-2.5">
                {c.matches.length > 0 && (
                  <div>
                    <p className="ex-eyebrow !text-[10.5px] !text-[var(--ex-gold-ink)]">Partite</p>
                    <ul className="m-0 mt-1 list-none space-y-1 p-0">
                      {c.matches.map((e) => (
                        <li key={e.id} className="text-[12.5px] leading-tight">
                          <b className="font-semibold">{label(e.group) || e.category}</b>
                          <span className="block text-[11.5px] text-[var(--ex-sub)]">{e.time || "ora da definire"} · {e.homeAway === "CASA" ? "casa" : "trasferta"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {c.trainings.length > 0 && (
                  <div>
                    <p className="ex-eyebrow !text-[10.5px]">Allenamenti</p>
                    <ul className="m-0 mt-1 list-none space-y-0.5 p-0">
                      {c.trainings.slice(0, 6).map((t) => (
                        <li key={t} className="flex items-center gap-1.5 text-[12.5px] leading-tight"><Dot tone="ok" />{t}</li>
                      ))}
                      {c.trainings.length > 6 && <li className="text-[11.5px] text-[var(--ex-sub)]">+{c.trainings.length - 6}</li>}
                    </ul>
                  </div>
                )}
                {c.matches.length === 0 && c.trainings.length === 0 && <p className="m-0 text-[12.5px] text-[var(--ex-sub)]">—</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {/* Phone: a list of the days that have something, today first. */}
      <ul className="m-0 list-none divide-y divide-[var(--ex-hair)] p-0 md:hidden">
        {cols.filter((c) => c.iso >= s.today && (c.matches.length || c.trainings.length)).map((c) => (
          <li key={c.iso} className="px-4 py-2.5">
            <b className="text-[13px] font-semibold uppercase tracking-[0.06em]">{c.iso === s.today ? "Oggi" : dayShort(c.iso)}</b>
            {c.matches.length > 0 && <p className="m-0 mt-0.5 text-[13.5px]"><span className="text-[var(--ex-gold-ink)]">Partite:</span> {c.matches.map((e) => `${label(e.group) || e.category}${e.time ? ` ${e.time}` : ""}`).join(", ")}</p>}
            {c.trainings.length > 0 && <p className="m-0 mt-0.5 text-[13.5px] text-[var(--ex-sub)]">Allenamenti: {c.trainings.join(", ")}</p>}
          </li>
        ))}
      </ul>
      {freshness && <Foot>Copie in uso: {freshness}. Festività e variazioni dell'ultimo minuto: vale l'avviso del mister.</Foot>}
    </Tile>
  );
}

function EventsTile({ s, label, style }: TileProps & { label: (id: string) => string }) {
  const list = s.calendar ? nextEvents(s.calendar.events, s.today, s.nowHHMM, 5) : [];
  return (
    <Tile id="eventi" icon={Trophy} title="Prossimi eventi" sub="Dal calendario ufficiale" more={{ to: "/calendario", label: "Tutti" }} style={style}>
      {list.length === 0 ? (
        <Empty title="Nessuna gara in arrivo">Il calendario non ha altre gare in questa stagione.</Empty>
      ) : (
        <Rows label="Prossime gare">
          {list.map((e) => (
            <li key={e.id} className="grid grid-cols-[8px_68px_minmax(0,1fr)] items-start gap-x-3 px-4 py-2.5 sm:px-5">
              <span className="pt-1.5"><Dot tone={e.homeAway === "CASA" ? "ok" : "info"} /></span>
              <span className="ex-num text-[12.5px] leading-tight text-[var(--ex-sub)]">{dayShort(e.date)}<span className="block">{e.time || "—"}</span></span>
              <span className="min-w-0 text-[13.5px] leading-snug">
                <b className="font-semibold">{matchTitle(e, "ColicoDerviese")}</b>
                <small className="block truncate text-[12px] text-[var(--ex-sub)]">{label(e.group) || e.category} · {e.homeAway === "CASA" ? "casa" : "trasferta"}{e.venue ? ` · ${e.venue}` : ""}</small>
              </span>
            </li>
          ))}
        </Rows>
      )}
    </Tile>
  );
}

function FacilityTile({ s, style }: TileProps) {
  const fields = s.quadro ? facilityToday(s.quadro.slots, s.today) : [];
  const any = fields.some((f) => f.sessions.length > 0);
  return (
    <Tile id="impianti" icon={MapPinned} title="Impianti e spogliatoi" sub="Campi di Colico oggi, dal quadro" more={{ to: "/gestionale/impianti", label: "Dettaglio" }} style={style}>
      {!any ? (
        <Empty title="Nessun turno in quadro oggi">Il quadro allenamenti copre da lunedì a venerdì. Per le gare del fine settimana vale il calendario.</Empty>
      ) : (
        <div className="grid grid-cols-2 divide-x divide-[var(--ex-hair)]">
          {fields.map((f) => (
            <div key={f.field} className="min-w-0 px-4 py-3 sm:px-5">
              <h3 className="ex-title m-0 text-[14px]">{f.label}</h3>
              <p className="ex-eyebrow mt-1 !text-[10.5px]">{f.sessions.length} {f.sessions.length === 1 ? "turno" : "turni"}</p>
              <ul className="m-0 mt-2 list-none space-y-1.5 p-0">
                {f.sessions.map((x) => (
                  <li key={`${x.time}-${x.teams}`} className="text-[13px] leading-tight">
                    <span className="ex-num text-[var(--ex-sub)]">{x.time}</span> <b className="font-semibold">{x.teams}</b>
                  </li>
                ))}
                {f.sessions.length === 0 && <li className="text-[13px] text-[var(--ex-sub)]">Libero</li>}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Tile>
  );
}

function VanTile({ s, style }: TileProps) {
  const board = s.transport?.board ?? null;
  const runs = board ? upcomingRuns(board.runs, s.today).slice(0, 4) : [];
  const vehicle = (id: string | null) => board?.vehicles.find((v) => v.id === id) ?? null;
  return (
    <Tile id="pulmini" icon={BusFront} title="Pulmini" sub="Viaggi dei prossimi 7 giorni" more={{ to: "/pulmini", label: "Dettaglio" }} style={style}>
      {runs.length === 0 ? (
        <Empty title="Nessun viaggio in programma">I viaggi si pianificano nell'area Pulmini.</Empty>
      ) : (
        <Rows label="Viaggi">
          {runs.map((r) => {
            const v = vehicle(r.vehicleId);
            const seats = v?.seatsPassengers ?? null;
            return (
              <li key={r.id} className="px-4 py-2.5 sm:px-5">
                <div className="flex items-center justify-between gap-2">
                  <b className="truncate text-[13.5px] font-semibold">{v?.label ?? "Pulmino da assegnare"}</b>
                  <Chip tone={statusTone("run", r.status)} className="!min-h-[22px] !text-[12px]">{RUN_LABEL[r.status]}</Chip>
                </div>
                <p className="m-0 mt-0.5 text-[12.5px] leading-snug text-[var(--ex-sub)]">
                  <span className="ex-num">{dayShort(r.date)} · {r.departure}</span> · {r.title}
                  {r.passengers != null && <> · <span className="ex-num">{r.passengers}{seats != null ? `/${seats}` : ""}</span> passeggeri</>}
                  {!r.driverId && <> · autista da assegnare</>}
                </p>
              </li>
            );
          })}
        </Rows>
      )}
    </Tile>
  );
}

function MailTile({ s, style }: TileProps) {
  const inbox = s.inbox?.inbox ?? null;
  const threads = (inbox?.threads ?? []).slice().sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)).slice(0, 5);
  const unread = (inbox?.threads ?? []).filter((t) => t.unread).length;
  return (
    <Tile id="posta" icon={Mail} title="Mail recenti" sub={inbox?.settings.mailbox ?? "Posta del club"} count={unread} more={{ to: "/gestionale/posta", label: "Posta" }} style={style}>
      {threads.length === 0 ? (
        <Empty title="Nessuna conversazione">Le mail entrano qui dopo la sincronizzazione della casella del club.</Empty>
      ) : (
        <Rows label="Conversazioni recenti">
          {threads.map((t) => (
            <li key={t.id}>
              <Link to="/gestionale/posta" className="scd-focus grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5 hover:bg-[rgb(11_27_51/0.025)] sm:px-5">
                <Dot tone={t.unread ? "info" : "mute"} />
                <span className="min-w-0 text-[13.5px] leading-snug">
                  <b className={`block truncate ${t.unread ? "font-semibold" : "font-medium"}`}>{t.counterpartLabel ?? t.last?.from ?? "Contatto"}</b>
                  <small className="block truncate text-[12.5px] text-[var(--ex-sub)]">{t.confidentiality === "RISERVATO" ? "Conversazione riservata" : t.subject}</small>
                  {t.unread && <span className="sr-only"> (da leggere)</span>}
                </span>
                <span className="ex-num text-[12px] text-[var(--ex-sub)]">{whenShort(t.lastMessageAt, s.today)}</span>
              </Link>
            </li>
          ))}
        </Rows>
      )}
    </Tile>
  );
}

function MatchDayTile({ s, label, style }: TileProps & { label: (id: string) => string }) {
  const e = s.calendar ? nextHomeMatch(s.calendar.events, s.today, s.nowHHMM) : null;
  if (!e) return null;
  const team = label(e.group) || e.category;
  return (
    <Tile id="matchday" icon={Trophy} title={`Match Day · ${dayShort(e.date)}`} sub="Prossima gara in casa" more={{ to: "/gestionale/mister", label: "Convocazioni" }} style={style}>
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <img src={crest.url} alt="" width={44} height={58} className="h-[58px] w-auto flex-none object-contain" />
          <div className="min-w-0">
            <p className="ex-eyebrow">{team} · {e.category || "Gara"}</p>
            <p className="ex-title mt-1.5 text-[22px] leading-tight sm:text-[26px]">{matchTitle(e, "ColicoDerviese")}</p>
            <p className="mt-1 text-[13.5px] text-[var(--ex-sub)]"><span className="ex-num">{e.time || "ora da definire"}</span> · {e.venue || "campo da definire"}</p>
          </div>
        </div>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0 sm:flex-col sm:items-end">
          <li><Chip tone={e.timeConfirmed ? "ok" : "warn"}>{e.timeConfirmed ? "Orario confermato" : "Orario da confermare"}</Chip></li>
          <li><Chip tone={e.venueConfirmed ? "ok" : "warn"}>{e.venueConfirmed ? "Campo confermato" : "Campo da confermare"}</Chip></li>
        </ul>
      </div>
      <div className="mt-auto flex flex-wrap gap-2 border-t border-[var(--ex-hair)] px-4 py-3 sm:px-5">
        <Link to="/gestionale/distinta/$eventId/spettatori" params={{ eventId: e.id }} className="scd-focus inline-flex h-11 items-center gap-1.5 rounded-lg border border-[var(--ex-hair-strong)] bg-white px-3 text-[13.5px] font-semibold text-[var(--ex-ink)] hover:border-[var(--ex-ink)]">
          Distinta spettatori <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden="true" />
        </Link>
        <Link to="/tesoreria/biglietteria" className="scd-focus inline-flex h-11 items-center gap-1.5 rounded-lg border border-[var(--ex-hair-strong)] bg-white px-3 text-[13.5px] font-semibold text-[var(--ex-ink)] hover:border-[var(--ex-ink)]">
          Biglietteria <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
    </Tile>
  );
}

function PraticheTile({ s, style }: TileProps) {
  const items = s.queue?.queue?.items ?? [];
  const counts = proposalCounts(items);
  const latest = latestProposals(items, 4);
  return (
    <Tile id="pratiche" icon={ClipboardList} title="Stato pratiche" sub="Proposte delle macchine e decisioni" more={{ to: "/gestionale/coda", label: "Tutte" }} style={style}>
      {counts.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 px-4 pt-3 sm:px-5">
          {counts.map((c) => (
            <li key={c.status}><Chip tone={statusTone("proposal", c.status)} className="!text-[12px]"><span className="ex-num">{c.count}</span> {STATUS_LABEL[c.status].toLowerCase()}</Chip></li>
          ))}
        </ul>
      )}
      {latest.length === 0 ? (
        <Empty title="Coda vuota">Le macchine propongono dalla posta e dai file; qui compare l'ultima decisione.</Empty>
      ) : (
        <Rows label="Ultime pratiche">
          {latest.map((p) => (
            <li key={p.id} className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5 sm:px-5">
              <Dot tone={statusTone("proposal", p.status)} />
              <span className="min-w-0 text-[13.5px] leading-snug">
                <b className="block truncate font-semibold">{p.title}</b>
                <small className="block truncate text-[12px] text-[var(--ex-sub)]">{KIND_LABEL[p.kind]}</small>
              </span>
              <span className="text-[12px] font-medium text-[var(--ex-sub)]">{STATUS_LABEL[p.status]}</span>
            </li>
          ))}
        </Rows>
      )}
    </Tile>
  );
}


import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  Bus,
  CalendarDays,
  FileText,
  Cake,
  Inbox,
  PenSquare,
  Shirt,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DeleteAccountCard } from "@/components/scd/DeleteAccountCard";
import { JoinClubScreen } from "@/components/scd/JoinClub";
import { GuideTourAuto } from "@/components/guide/GuideTour";
import { RequestsToConfirmCard } from "@/components/scd/RequestsToConfirmCard";
import { MyNumberCard } from "@/components/scd/StaffDirectory";
import { FollowButton } from "@/components/universe/Feed";
import { ClubCrestOfficial } from "@/components/SiteChrome";
import { getSession, type SessionView } from "@/lib/auth.functions";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { CLUB_EVENTS } from "@/lib/club-events";
import { calendarToWeekItems, romeParts, type WeekItem } from "@/lib/home-week";
import {
  channelsFrom,
  STATUS_LABEL,
  timeAgo,
  type ChannelInfo,
  type Post,
} from "@/lib/social";
import {
  getBirthdays,
  type Birthday,
  getMyPosts,
  getPublicSocial,
  setFollow,
  type PublicSocial,
} from "@/lib/social.functions";
import type { PublicEvent, PublicGroup } from "@/lib/public-snapshots";
import { getDocLamp } from "@/lib/my-documents.functions";
import type { Lamp } from "@/lib/my-documents";
import { itemState, orderTeams } from "@/lib/universe";

/**
 * La mia SCD (UD-089, foglio 4): l'area privata di ogni iscritto. Riquadri colorati verso le proprie cose, i prossimi
 * impegni delle squadre seguite, chi seguo, i miei post. Coupon e giochi compaiono qui quando saranno reali (UD-090):
 * niente premi finti. Chi non è entrato vede come iscriversi.
 */
export const Route = createFileRoute("/la-mia-scd")({
  loader: async () => {
    const [session, social, calendar, myPosts, birthdays, docLamp] = await Promise.all([
      getSession(),
      getPublicSocial(),
      getPublicCalendarSnapshot(),
      getMyPosts(),
      getBirthdays(),
      getDocLamp(),
    ]);
    const serverNow = Date.now();
    const today =
      romeParts(new Date(serverNow).toISOString())?.date ??
      new Date(serverNow).toISOString().slice(0, 10);
    return {
      session,
      social,
      groups: calendar.groups,
      events: calendar.events,
      myPosts,
      birthdays,
      docLamp,
      serverNow,
      today,
    };
  },
  head: () => ({
    meta: [
      { title: "La mia SCD — S.C.D. ColicoDerviese" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyPage,
});

const MAIN_TEAMS = [
  "prima",
  "u19",
  "u16",
  "u15",
  "2014",
  "2015",
  "pulcini",
  "primicalci",
  "piccoli",
];

function MyPage() {
  const {
    session,
    social,
    groups,
    events,
    myPosts,
    birthdays,
    docLamp,
    serverNow,
    today,
  } = Route.useLoaderData();
  // Visitors: a real sign-up page (what you get, Registrati / Entra), never an almost empty box (Francesco 16/10/2026).
  if (!session.user) {
    return (
      <JoinClubScreen
        screen="la-mia-scd"
        kicker="La mia SCD"
        title="Il tuo club, la tua area"
        intro="Un solo account per tutti: ti iscrivi, segui le tue squadre e trovi i tuoi impegni. Per le famiglie si aggiungono le cose dei figli; i ruoli dello staff li abilita la Direzione."
        next="/la-mia-scd"
      />
    );
  }
  return (
    <Inside
      session={session}
      social={social}
      groups={groups}
      events={events}
      myPosts={myPosts}
      birthdays={birthdays}
      docLamp={docLamp}
      serverNow={serverNow}
      today={today}
    />
  );
}

function Inside({
  session,
  social,
  groups,
  events,
  myPosts,
  birthdays,
  docLamp,
  serverNow,
  today,
}: {
  session: SessionView;
  social: PublicSocial;
  groups: PublicGroup[];
  events: PublicEvent[];
  myPosts: Post[];
  birthdays: Birthday[];
  docLamp: Lamp | null;
  serverNow: number;
  today: string;
}) {
  const [follows, setFollows] = useState(social.follows);
  const [nowMs, setNowMs] = useState(serverNow);
  const doFollow = useServerFn(setFollow);
  useEffect(() => setNowMs(Date.now()), []);
  const teams = useMemo(
    () =>
      orderTeams(
        groups.filter((g) => g.count > 0 || MAIN_TEAMS.includes(g.id)),
      ),
    [groups],
  );
  const channels = useMemo(
    () =>
      channelsFrom(
        teams,
        CLUB_EVENTS.map((e) => ({ id: e.id, title: e.title, href: e.href })),
      ),
    [teams],
  );
  const followedTeams = follows
    .filter((f) => f.startsWith("team:"))
    .map((f) => f.slice(5));
  const upcoming = useMemo(() => {
    const items = calendarToWeekItems(events, groups).filter(
      (i) =>
        followedTeams.includes(i.group) &&
        i.date >= today &&
        itemState(i, nowMs) !== "done",
    );
    return items
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 5);
  }, [events, groups, followedTeams, today, nowMs]);
  const toggle = async (key: string) => {
    const on = !follows.includes(key);
    setFollows((f) => (on ? [...f, key] : f.filter((x) => x !== key)));
    const r = await doFollow({ data: { channel: key, on } });
    if (!r.ok)
      setFollows((f) => (on ? f.filter((x) => x !== key) : [...f, key]));
  };
  const initial = (session.user?.email ?? "?").slice(0, 1).toUpperCase();
  const isBase = session.badge === "Senza ruolo";

  const tiles: {
    to: string;
    label: string;
    icon: typeof Bell;
    bg: string;
    fg?: string;
    dot?: boolean;
    alert?: string;
  }[] = [
    {
      to: "/calendario",
      label: "Calendario",
      icon: CalendarDays,
      bg: "#1e90e0",
    },
    { to: "/comunicazioni", label: "Avvisi", icon: Bell, bg: "#e0482f" },
    {
      to: "/famiglia",
      label: "Richieste",
      icon: Inbox,
      bg: "#ffd600",
      fg: "#0b1e3a",
    },
    { to: "/pulmini", label: "Pulmini", icon: Bus, bg: "#2ba36b" },
    {
      to: "/documenti",
      label: "Documenti",
      icon: FileText,
      bg: "#7654b8",
      // «Lampadina» (r142): expired or expiring documents and open requests of the family.
      dot: (docLamp?.total ?? 0) > 0,
      ...(docLamp && docLamp.total > 0 ? { alert: `${docLamp.total} documenti da sistemare` } : {}),
    },
    {
      to: "/crea",
      label: "I miei post",
      icon: PenSquare,
      bg: "#0b2a5b",
      dot: myPosts.some((p) => p.status === "PENDING"),
    },
  ];

  return (
    <main
      data-screen="la-mia-scd"
      className="min-h-dvh bg-[#f2f6fb] pb-28 text-[#0b1e3a]"
    >
      <div className="relative overflow-hidden bg-[#06306f] text-white">
        <img
          src="/media/scd/lario-header.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover object-[center_55%] opacity-70"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgb(7_29_66/0.5),#0b2a5b_85%)]"
        />
        <div className="relative mx-auto max-w-[720px] px-4 pb-6 pt-3.5">
          <div className="flex items-center gap-2.5">
            <ClubCrestOfficial size={40} />
            <span className="whitespace-nowrap font-uv text-[22px] leading-none">
              COLICO<span className="text-[var(--uv-gold)]">DERVIESE</span>
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3.5">
            <span
              aria-hidden="true"
              className="grid size-[58px] place-items-center rounded-full bg-[var(--uv-gold)] font-uv text-[24px] text-[#0b1e3a]"
            >
              {initial}
            </span>
            <span className="grid gap-1">
              <span className="font-uv text-[28px] leading-none">CIAO</span>
              <span className="inline-flex w-fit items-center rounded-full bg-white/14 px-2.5 py-1 text-[13px] font-semibold">
                {isBase
                  ? "Accesso base · calendario e attività"
                  : `${session.badge} · abilitato dalla Direzione`}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-2 grid max-w-[720px] gap-4 px-3 pt-4">
        <div className="grid grid-cols-3 gap-2.5">
          {tiles.map((t) => (
            <Link
              key={t.label}
              to={t.to}
              className="scd-focus relative grid justify-items-center gap-2 rounded-[18px] bg-white px-2 pb-3 pt-3.5 text-center shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
            >
              <span
                className="grid size-[46px] place-items-center rounded-[14px]"
                style={{ background: t.bg, color: t.fg ?? "#fff" }}
              >
                <t.icon className="size-6" aria-hidden="true" />
              </span>
              <b className="text-[14px] leading-tight">{t.label}</b>
              {t.alert && <span className="sr-only">{t.alert}</span>}
              {t.dot && (
                <span
                  aria-hidden="true"
                  className="absolute right-3 top-2.5 size-2.5 rounded-full bg-[#e0482f]"
                />
              )}
            </Link>
          ))}
        </div>

        <RequestsToConfirmCard />
        <MyNumberCard />

        <section className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
          <h2 className="mb-2.5 mt-0 text-[13px] font-bold tracking-[0.04em] text-[#1e7fd8]">
            I MIEI PROSSIMI IMPEGNI
          </h2>
          {upcoming.length ? (
            <ul className="m-0 list-none p-0">
              {upcoming.map((m) => (
                <Impegno
                  key={m.id}
                  m={m}
                  teamShort={
                    teams.find((t) => t.id === m.group)?.short ?? m.groupLabel
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[15px] text-[#3e5272]">
              {followedTeams.length
                ? "Nessuna gara in programma per le squadre che segui."
                : "Segui una squadra: le sue gare compaiono qui."}
            </p>
          )}
        </section>

        <section className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
          <h2 className="mb-2.5 mt-0 text-[13px] font-bold tracking-[0.04em] text-[#1e7fd8]">
            SEGUO
          </h2>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {channels
              .filter((c) => follows.includes(c.key))
              .map((c) => (
                <ChannelChip
                  key={c.key}
                  c={c}
                  on
                  onToggle={() => toggle(c.key)}
                />
              ))}
            {channels
              .filter((c) => !follows.includes(c.key))
              .slice(0, 4)
              .map((c) => (
                <ChannelChip
                  key={c.key}
                  c={c}
                  on={false}
                  onToggle={() => toggle(c.key)}
                />
              ))}
          </ul>
          <Link
            to="/squadre"
            className="scd-focus mt-2.5 inline-flex h-9 items-center text-[14px] font-bold text-[#1e7fd8]"
          >
            Tutte le squadre
          </Link>
        </section>

        {myPosts.length > 0 && (
          <section className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
            <h2 className="mb-2.5 mt-0 text-[13px] font-bold tracking-[0.04em] text-[#1e7fd8]">
              I MIEI POST
            </h2>
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {myPosts.slice(0, 6).map((p) => (
                <MyPost key={p.id} p={p} channels={channels} nowMs={nowMs} />
              ))}
            </ul>
          </section>
        )}

        {birthdays.length > 0 && (
          <section
            aria-label="Auguri di oggi"
            className="rounded-[20px] bg-[linear-gradient(135deg,#ffd600,#ffb800)] p-4 text-[#0b1e3a] shadow-[0_2px_10px_rgb(11_42_91/0.12)]"
          >
            <h2 className="m-0 flex items-center gap-2 font-uv text-[24px] leading-none">
              <Cake className="size-6" aria-hidden="true" /> BUON COMPLEANNO!
            </h2>
            <p className="mb-2 mt-1 text-[14px] font-semibold">
              Oggi la famiglia ColicoDerviese fa gli auguri a:
            </p>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {birthdays.map((b) => (
                <li
                  key={b.id}
                  className="rounded-full bg-white/80 px-3 py-1.5 text-[14.5px] font-bold"
                >
                  {b.name}
                  {b.staff
                    ? " · staff"
                    : b.team
                      ? ` · ${b.team === "prima" ? "Prima" : b.team.toUpperCase()}`
                      : ""}
                </li>
              ))}
            </ul>
          </section>
        )}
        <Link
          to="/la-mia-scd/campione"
          className="scd-focus flex items-center gap-3 rounded-[20px] bg-[linear-gradient(135deg,#0b2a5b,#1556c4)] p-4 text-white shadow-[0_2px_10px_rgb(11_42_91/0.12)]"
          data-testid="campione-entry"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#ffd600] text-[#0b2a5b]">
            <Sparkles className="size-6" aria-hidden="true" />
          </span>
          <span className="grid gap-0.5">
            <b className="text-[15px]">Crea il tuo campione · Le mie card</b>
            <span className="text-[13px] text-[#dbe6f5]">
              Il tuo avatar realistico, la card Tifoso, Tesserato o Famiglia e i crediti.
            </span>
          </span>
        </Link>
        <Link
          to="/fantacalcio"
          className="scd-focus flex items-center gap-3 rounded-[20px] bg-[#0b2a5b] p-4 text-white shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#2f8f4e] text-white">
            <Shirt className="size-6" aria-hidden="true" />
          </span>
          <span className="grid gap-0.5">
            <b className="text-[15px]">Fantacalcio SCD</b>
            <span className="text-[13px] text-[#c8d8ee]">
              Scegli i tuoi 11 e fai punti con le partite vere. Gratis.
            </span>
          </span>
        </Link>
        <Link
          to="/top11"
          className="scd-focus flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[var(--uv-gold)] text-[#0b1e3a]">
            <Trophy className="size-6" aria-hidden="true" />
          </span>
          <span className="grid gap-0.5">
            <b className="text-[15px]">Top 11 della settimana</b>
            <span className="text-[13px] text-[#5a6b85]">
              Dai i tuoi 3 voti ai giocatori di tutte le squadre agonistiche.
            </span>
          </span>
        </Link>
        <DeleteAccountCard email={session.user?.email ?? ""} />
      </div>
      <GuideTourAuto role="calciatori" />
    </main>
  );
}

function Impegno({ m, teamShort }: { m: WeekItem; teamShort: string }) {
  const wd = new Intl.DateTimeFormat("it-IT", {
    timeZone: "UTC",
    weekday: "short",
  })
    .format(new Date(`${m.date}T12:00:00Z`))
    .replace(".", "")
    .toUpperCase();
  return (
    <li className="flex items-center gap-3 border-t border-[#eef3f9] py-2.5 first:border-t-0">
      <span className="w-[50px] shrink-0 text-center">
        <span className="block text-[12px] font-bold text-[#1e7fd8]">{wd}</span>
        <span className="block font-uv text-[26px] leading-none">
          {Number(m.date.slice(8, 10))}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[15px]">
          {teamShort} · {m.title}
        </b>
        <span className="block truncate text-[13px] text-[#5a6b85]">
          {m.time || "orario da confermare"}
          {m.venue ? ` · ${m.venue}` : ""}
        </span>
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${m.homeAway === "CASA" ? "bg-[#e3eefb] text-[#0b2a5b]" : "bg-[#fff6bf] text-[#6b5400]"}`}
      >
        {m.homeAway === "CASA" ? "Casa" : "Fuori"}
      </span>
    </li>
  );
}

function ChannelChip({
  c,
  on,
  onToggle,
}: {
  c: ChannelInfo;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-center gap-1">
      <Link
        to={c.href}
        className={`scd-focus inline-flex h-9 items-center gap-1.5 rounded-l-full pl-3 pr-2 text-[14px] font-semibold ${on ? "bg-[#f2f6fb]" : "bg-white ring-1 ring-[#dce5f0]"}`}
      >
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full"
          style={{ background: c.color }}
        />
        {c.short}
      </Link>
      <span className="[&>button]:h-9 [&>button]:rounded-l-none [&>button]:px-2.5 [&>button]:text-[13px]">
        <FollowButton on={on} onToggle={onToggle} />
      </span>
    </li>
  );
}

function MyPost({
  p,
  channels,
  nowMs,
}: {
  p: Post;
  channels: readonly ChannelInfo[];
  nowMs: number;
}) {
  const ch = channels.find((c) => c.key === p.channel);
  const tone =
    p.status === "APPROVED"
      ? "bg-[#e3f7ea] text-[#145a32]"
      : p.status === "PENDING"
        ? "bg-[#fff6bf] text-[#6b5400]"
        : "bg-[#fde8e4] text-[#8a2a1c]";
  return (
    <li className="grid gap-1 rounded-[14px] border border-[#eef3f9] p-3">
      <span className="flex items-center gap-2 text-[13px] text-[#5a6b85]">
        <b className="text-[#0b1e3a]">{ch?.label ?? p.channel}</b>·{" "}
        {timeAgo(p.createdAt, nowMs)}
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[12px] font-bold ${tone}`}
        >
          {STATUS_LABEL[p.status]}
        </span>
      </span>
      <span className="line-clamp-2 text-[14px]">
        {p.title ? `${p.title} — ` : ""}
        {p.body}
      </span>
      {p.status === "REJECTED" && p.decisionNote && (
        <span className="text-[13px] text-[#8a2a1c]">
          Motivo: {p.decisionNote}
        </span>
      )}
    </li>
  );
}

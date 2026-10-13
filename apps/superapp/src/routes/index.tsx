import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Newspaper, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BUILD_STAMP } from "@/lib/build-stamp";
import { openAccessMenu } from "@/components/scd/AccessMenu";
import { Affiliations, SkyCameo } from "@/components/universe/Community";
import {
  BoardHero,
  MondoColico,
  NextMatchCard,
  QuickTiles,
  RoleDoors,
  SideTiles,
  SponsorCards,
  UpcomingGames,
} from "@/components/universe/BoardHome";
import {
  CardActions,
  CardHead,
  EmptyFeed,
  EventPost,
  FeedCard,
  FeedTabs,
  FollowButton,
  MatchBlock,
  PostCard,
  ReportSheet,
  SponsorPost,
  WeekPost,
} from "@/components/universe/Feed";
import type { ReportReason } from "@/lib/moderation";
import { TeamPicker } from "@/components/universe/TeamBar";
import { addDays } from "@/lib/board-data";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { getPublicFeed, getPublicSchedule } from "@/lib/club.functions";
import { CLUB_EVENTS } from "@/lib/club-events";
import {
  calendarToWeekItems,
  mergeWeekItems,
  r20ItemToWeekItem,
  r20MatchToWeekItem,
  romeParts,
  type WeekItem,
} from "@/lib/home-week";
import { freshnessLabel } from "@/lib/public-snapshots";
import {
  channelOf,
  channelsFrom,
  composeFeed,
  eventChannel,
  orderFeed,
  teamChannel,
  type ChannelInfo,
  type FeedMode,
  type Post,
} from "@/lib/social";
import {
  getPublicSocial,
  reportPost,
  setFollow,
  toggleForza,
} from "@/lib/social.functions";
import { SPONSORS } from "@/lib/sponsors";
import { sponsorOfTheDay } from "@/lib/stories";
import { itemState, orderTeams, type Team } from "@/lib/universe";

/**
 * Home = feed (UD-089): le notizie di tutti come su Instagram, "Per te" mette prima chi segui, "Tutti" mostra tutto,
 * "Dirette" solo le dirette ufficiali. Grafica della tavola madre (UD-088): testata Lario, storie, schede bianche.
 * Solo dati reali: post approvati, calendario ufficiale, sponsor 2026/27, eventi già pubblicati.
 */
export const Route = createFileRoute("/")({
  loader: async () => {
    const [feed, schedule, calendar, social] = await Promise.all([
      getPublicFeed(),
      getPublicSchedule(),
      getPublicCalendarSnapshot(),
      getPublicSocial(),
    ]);
    const serverNow = Date.now();
    const now = romeParts(new Date(serverNow).toISOString());
    return {
      feed,
      schedule,
      calendar,
      social,
      serverNow,
      today: now?.date ?? new Date(serverNow).toISOString().slice(0, 10),
    };
  },
  head: () => ({
    meta: [
      { title: "S.C.D. ColicoDerviese — Sport, persone, territorio" },
      {
        name: "description",
        content:
          "Le notizie, le gare della settimana, le dirette e gli eventi della S.C.D. ColicoDerviese. Segui la tua squadra: dalla Prima Squadra ai Piccoli Amici.",
      },
      {
        property: "og:title",
        content: "S.C.D. ColicoDerviese — Sport, persone, territorio",
      },
      {
        property: "og:description",
        content:
          "Notizie, gare, dirette ed eventi della S.C.D. ColicoDerviese, Colico e Dervio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
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

function readList(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writeValue(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage bloccato: vale per questa visita */
  }
}

function Home() {
  const { feed, schedule, calendar, social, serverNow, today } =
    Route.useLoaderData();
  const [nowMs, setNowMs] = useState(serverNow);
  const [mode, setMode] = useState<FeedMode>("perte");
  const [localFollow, setLocalFollow] = useState<string[]>([]);
  const [follows, setFollows] = useState<string[]>(social.follows);
  const [posts, setPosts] = useState<Post[]>(social.posts);
  const [picker, setPicker] = useState(false);
  const [sky, setSky] = useState<{ title: string; text: string } | null>(null);
  const closeSky = useCallback(() => setSky(null), []);
  const doFollow = useServerFn(setFollow);
  const doForza = useServerFn(toggleForza);
  const doReport = useServerFn(reportPost);
  const [reporting, setReporting] = useState<Post | null>(null);
  const [going, setGoing] = useState<string[]>([]);

  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    setLocalFollow(readList("scd-follow"));
    setGoing(readList("scd-going"));
    try {
      const m = localStorage.getItem("scd-feed-mode");
      if (m === "perte" || m === "tutti" || m === "dirette") setMode(m);
    } catch {
      /* default */
    }
    return () => clearInterval(t);
  }, []);

  const merged = useMemo(() => {
    const items = [...feed.items, ...schedule.items].filter(
      (it, i, a) => a.findIndex((o) => o.id === it.id) === i,
    );
    const r20Matches = [
      ...schedule.matches,
      ...(feed.nextMatch ? [feed.nextMatch] : []),
    ];
    const r20 = [
      ...r20Matches.map(r20MatchToWeekItem),
      ...items.map(r20ItemToWeekItem),
    ].filter((i): i is WeekItem => !!i);
    return mergeWeekItems(
      calendarToWeekItems(calendar.events, calendar.groups),
      r20,
    );
  }, [calendar, schedule, feed]);

  // Followed team ids: the account's follows when signed in, this phone's choice otherwise.
  const followedTeams = useMemo(
    () =>
      social.signedIn
        ? follows.filter((f) => f.startsWith("team:")).map((f) => f.slice(5))
        : localFollow,
    [social.signedIn, follows, localFollow],
  );
  const effectiveFollows = useMemo(
    () => (social.signedIn ? follows : localFollow.map(teamChannel)),
    [social.signedIn, follows, localFollow],
  );

  const teams = useMemo(
    () =>
      orderTeams(
        calendar.groups.filter((g) => g.count > 0 || MAIN_TEAMS.includes(g.id)),
        followedTeams,
      ),
    [calendar.groups, followedTeams],
  );
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const teamOf = useCallback(
    (i: WeekItem): Team | undefined => teamById.get(i.group),
    [teamById],
  );
  const channels = useMemo(
    () =>
      channelsFrom(
        teams,
        CLUB_EVENTS.map((e) => ({ id: e.id, title: e.title, href: e.href })),
      ),
    [teams],
  );
  const channel = useCallback(
    (key: string): ChannelInfo =>
      channelOf(channels, key) ?? {
        key,
        label: key,
        short: key,
        code: "?",
        color: "#5a6b85",
        kind: "team",
        href: "/squadre",
      },
    [channels],
  );

  const lastDay = addDays(today, 6);
  const weekGames = useMemo(
    () =>
      merged
        .filter(
          (i) =>
            i.kind === "Gara" &&
            i.date >= today &&
            i.date <= lastDay &&
            itemState(i, nowMs) !== "done",
        )
        .sort((a, b) =>
          (a.date + (a.time || "99:99")).localeCompare(
            b.date + (b.time || "99:99"),
          ),
        ),
    [merged, today, lastDay, nowMs],
  );
  const homeGames = weekGames.filter((g) => g.homeAway === "CASA").length;
  // One card per team playing this week (followed teams first), at most 3.
  const teamMatches = useMemo(() => {
    const seen = new Set<string>();
    const list: { item: WeekItem; team: Team }[] = [];
    const ordered = [...weekGames].sort(
      (a, b) =>
        Number(followedTeams.includes(b.group)) -
        Number(followedTeams.includes(a.group)),
    );
    for (const g of ordered) {
      const t = teamById.get(g.group);
      if (!t || seen.has(t.id)) continue;
      seen.add(t.id);
      list.push({ item: g, team: t });
      if (list.length === 3) break;
    }
    return list;
  }, [weekGames, teamById, followedTeams]);

  // "Prossima gara" della tavola: la prima gara non finita (prima quelle delle squadre seguite), poi le altre.
  const nextMatch = useMemo(() => {
    const upcoming = merged
      .filter(
        (i) =>
          i.kind === "Gara" &&
          i.date >= today &&
          itemState(i, nowMs) !== "done",
      )
      .sort((a, b) =>
        (a.date + (a.time || "99:99")).localeCompare(
          b.date + (b.time || "99:99"),
        ),
      );
    const mine = upcoming.find((i) => followedTeams.includes(i.group));
    return mine ?? upcoming[0] ?? null;
  }, [merged, today, nowMs, followedTeams]);
  const sameDay = useMemo(
    () =>
      nextMatch
        ? weekGames.filter(
            (g) => g.date === nextMatch.date && g.id !== nextMatch.id,
          )
        : [],
    [weekGames, nextMatch],
  );
  const toggleGoing = (id: string) => {
    const list = going.includes(id)
      ? going.filter((x) => x !== id)
      : [...going, id];
    setGoing(list);
    writeValue("scd-going", list);
  };
  const sponsor = useMemo(() => sponsorOfTheDay(SPONSORS, today), [today]);
  const dailySponsors = useMemo(() => {
    const list = SPONSORS.filter((x) => x.nameVerified && x.name);
    const at = sponsor ? list.indexOf(sponsor) : 0;
    return Array.from(
      { length: Math.min(6, list.length) },
      (_, k) => list[(at + k) % list.length]!,
    );
  }, [sponsor]);
  const nextEvent = CLUB_EVENTS.find((e) => e.date >= today) ?? null;

  const ordered = useMemo(
    () => orderFeed(posts, mode, effectiveFollows),
    [posts, mode, effectiveFollows],
  );
  const nodes = useMemo(
    () =>
      composeFeed(ordered, teamMatches, !!sponsor, nextEvent, mode).filter(
        (n) => n.k !== "week" && n.k !== "match" && n.k !== "top11",
      ),
    [ordered, teamMatches, sponsor, nextEvent, mode],
  );

  const changeMode = (m: FeedMode) => {
    setMode(m);
    writeValue("scd-feed-mode", m);
  };

  const isFollowed = (key: string) => effectiveFollows.includes(key);
  const toggleFollow = async (key: string) => {
    const on = !isFollowed(key);
    if (!social.signedIn) {
      if (!key.startsWith("team:")) {
        setSky({
          title: "Iscriviti",
          text: "Con un account segui società, squadre ed eventi su ogni telefono.",
        });
        return;
      }
      const id = key.slice(5);
      const list = on
        ? [...localFollow, id]
        : localFollow.filter((x) => x !== id);
      setLocalFollow(list);
      writeValue("scd-follow", list);
      return;
    }
    setFollows((f) => (on ? [...f, key] : f.filter((x) => x !== key)));
    const r = await doFollow({ data: { channel: key, on } });
    if (!r.ok) {
      setFollows((f) => (on ? f.filter((x) => x !== key) : [...f, key]));
      setSky({ title: "Non salvato", text: r.message });
    }
  };
  const forza = async (post: Post) => {
    if (!social.signedIn) {
      setSky({
        title: "Forza SCD!",
        text: "Iscriviti per fare il tifo e seguire le tue squadre.",
      });
      return;
    }
    const r = await doForza({ data: { id: post.id } });
    if (r.ok)
      setPosts((ps) =>
        ps.map((p) =>
          p.id === post.id
            ? { ...p, mine: r.on === true, forza: r.forza ?? p.forza }
            : p,
        ),
      );
    else setSky({ title: "Non salvato", text: r.message });
  };
  const report = async (reason: ReportReason) => {
    const p = reporting;
    setReporting(null);
    if (!p) return;
    const r = await doReport({ data: { id: p.id, reason } });
    setSky({ title: r.ok ? "Grazie" : "Non inviata", text: r.message });
  };
  const share = async (text: string, path = "/") => {
    try {
      const url = `${location.origin}${path}`;
      if (navigator.share)
        await navigator.share({ title: "S.C.D. ColicoDerviese", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setSky({ title: "Copiato", text: "Incolla il messaggio dove vuoi." });
      }
    } catch {
      /* condivisione annullata */
    }
  };

  // Primo accesso senza account: dopo la scelta sui cookie si chiede quale squadra seguire (resta su questo telefono).
  useEffect(() => {
    if (social.signedIn) return;
    let onb: unknown = null;
    try {
      onb = localStorage.getItem("scd-onb");
    } catch {
      onb = "1";
    }
    if (onb) return;
    const open = () => setTimeout(() => setPicker(true), 500);
    let consented = false;
    try {
      consented = !!localStorage.getItem("scd-consent");
    } catch {
      consented = true;
    }
    if (consented) {
      const t = open();
      return () => clearTimeout(t);
    }
    window.addEventListener("scd:consent", open, { once: true });
    return () => window.removeEventListener("scd:consent", open);
  }, [social.signedIn]);
  const closePicker = useCallback(() => {
    setPicker(false);
    writeValue("scd-onb", 1);
  }, []);
  const donePicker = () => {
    writeValue("scd-follow", localFollow);
    writeValue("scd-onb", 1);
    setPicker(false);
    if (localFollow.length) {
      changeMode("perte");
      setSky({
        title: "Fatto!",
        text: 'In "Per te" vedi prima le tue squadre.',
      });
    }
  };
  const nextLabel = (teamId: string) => {
    const g = merged.find(
      (i) =>
        i.group === teamId &&
        i.kind === "Gara" &&
        itemState(i, nowMs) !== "done" &&
        i.date >= today,
    );
    return g
      ? `${new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${g.date}T12:00:00Z`))} ${g.time}`
      : null;
  };

  const sourceNote =
    calendar.origin === "mirror"
      ? `Calendario SCD aggiornato ${freshnessLabel(calendar.sourceModifiedAt)}`
      : calendar.origin === "stale"
        ? `Ultima copia verificata del ${freshnessLabel(calendar.sourceModifiedAt)}`
        : `Copia di sicurezza del ${freshnessLabel(calendar.sourceModifiedAt)}`;
  const clubChannel = channel("club");

  return (
    <main data-screen="home" className="min-h-dvh bg-[#eef3f9] pb-10">
      <BoardHero
        games={weekGames.length}
        home={homeGames}
        onEnter={openAccessMenu}
        signedIn={social.signedIn}
      />

      <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-4 px-3 pt-3.5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-6 lg:px-6 lg:pt-6">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3.5">
          <div className="lg:hidden">
            <QuickTiles
              games={weekGames.length}
              events={CLUB_EVENTS.filter((e) => e.date >= today).length}
            />
          </div>
          <NextMatchCard
            item={nextMatch}
            team={nextMatch ? teamOf(nextMatch) : undefined}
            nowMs={nowMs}
            going={nextMatch ? going.includes(nextMatch.id) : false}
            onGoing={() => nextMatch && toggleGoing(nextMatch.id)}
            onShare={() =>
              nextMatch &&
              share(
                `${nextMatch.title}, ${nextMatch.date.split("-").reverse().join("/")} ${nextMatch.time}. Forza ColicoDerviese!`,
                "/calendario",
              )
            }
            others={sameDay}
          />
          <div className="lg:hidden">
            <SideTiles
              event={
                nextEvent
                  ? {
                      title: nextEvent.title,
                      when: nextEvent.when,
                      href: nextEvent.href,
                    }
                  : null
              }
            />
          </div>
          <div className="lg:hidden">
            <RoleDoors />
          </div>
          <UpcomingGames
            items={weekGames.filter((g) => g.id !== nextMatch?.id).slice(0, 5)}
            teamOf={teamOf}
          />
          <div className="lg:hidden">
            <SponsorCards sponsors={dailySponsors} />
          </div>
          <div className="lg:hidden">
            <MondoColico />
          </div>

          <section aria-labelledby="dal-club" className="grid gap-3">
            <div className="flex items-end justify-between gap-2 px-1 pt-2">
              <h2
                id="dal-club"
                className="m-0 font-uv text-[28px] uppercase leading-none text-[#0b2a5b]"
              >
                Dal club
              </h2>
              {social.canPost && (
                <Link
                  to="/crea"
                  className="scd-focus inline-flex h-10 items-center rounded-[12px] bg-[var(--uv-gold)] px-4 text-[14px] font-bold text-[#0b1e3a]"
                >
                  Crea post
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/fantacalcio"
                className="scd-focus flex min-h-[86px] flex-col justify-center rounded-[18px] bg-[linear-gradient(135deg,#2f8f4e,#1f6e3a)] px-3.5 py-3 text-white shadow-[0_6px_20px_-10px_rgb(6_42_99/0.35)]"
              >
                <b className="font-uv text-[22px] uppercase leading-none">
                  Fantacalcio SCD
                </b>
                <span className="mt-1 text-[12.5px] font-semibold text-white/90">
                  Scegli i tuoi 11, gratis
                </span>
              </Link>
              <Link
                to="/top11"
                className="scd-focus flex min-h-[86px] flex-col justify-center rounded-[18px] bg-[#0b2a5b] px-3.5 py-3 text-white shadow-[0_6px_20px_-10px_rgb(6_42_99/0.35)]"
              >
                <b className="font-uv text-[22px] uppercase leading-none">
                  Top <span className="text-[var(--uv-gold)]">11</span>
                </b>
                <span className="mt-1 text-[12.5px] font-semibold text-white/90">
                  Vota i migliori della settimana
                </span>
              </Link>
            </div>
            <div className="overflow-hidden rounded-[16px] bg-[#0b2a5b]">
              <FeedTabs mode={mode} onChange={changeMode} />
            </div>
          </section>
          <div
            className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3.5"
            data-testid="feed"
          >
            {nodes.map((n, idx) => {
              switch (n.k) {
                case "post": {
                  const ch = channel(n.post.channel);
                  return (
                    <PostCard
                      key={n.post.id}
                      post={n.post}
                      channel={ch}
                      nowMs={nowMs}
                      onForza={() => forza(n.post)}
                      onReport={
                        social.signedIn ? () => setReporting(n.post) : undefined
                      }
                      onShare={() =>
                        share(
                          `${ch.label}: ${n.post.title ?? n.post.body.slice(0, 80)}`,
                          ch.href,
                        )
                      }
                    />
                  );
                }
                case "sponsor":
                  return sponsor ? (
                    <SponsorPost key="sponsor" sponsor={sponsor} />
                  ) : null;
                case "event": {
                  const ch = channel(eventChannel(n.event.id));
                  return (
                    <EventPost
                      key={`e-${n.event.id}`}
                      channel={ch}
                      when={n.event.when}
                      image={n.event.image}
                      text={n.event.text}
                      follow={
                        <FollowButton
                          on={isFollowed(ch.key)}
                          onToggle={() => toggleFollow(ch.key)}
                        />
                      }
                    />
                  );
                }
                case "press":
                  return (
                    <Link
                      key="press"
                      to="/rassegna"
                      className="scd-focus flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-[#e3eefb] text-[#0b2a5b]">
                        <Newspaper className="size-6" aria-hidden="true" />
                      </span>
                      <span className="grid gap-0.5">
                        <b className="font-uv text-[22px] leading-none text-[#0b1e3a]">
                          DICONO DI NOI
                        </b>
                        <span className="text-[13px] text-[#5a6b85]">
                          I titoli delle testate su società, Colico e Dervio.
                        </span>
                      </span>
                    </Link>
                  );
                case "empty":
                  return (
                    <EmptyFeed
                      key={`empty-${idx}`}
                      mode={mode}
                      signedIn={social.signedIn}
                    />
                  );
                default:
                  return null;
              }
            })}
            <p className="m-0 px-1 text-[12.5px] text-[#5a6b85]">
              {sourceNote}. Orari e campi segnati "da confermare" non sono
              ancora confermati dal club.
            </p>
          </div>
        </div>
        <div className="hidden min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid">
          <QuickTiles
            games={weekGames.length}
            events={CLUB_EVENTS.filter((e) => e.date >= today).length}
          />
          <RoleDoors />
          <FeedCard>
            <div className="px-4 pb-3 pt-3.5">
              <h2 className="m-0 text-[13px] font-bold tracking-[0.04em] text-[#1e7fd8]">
                SEGUI ANCHE
              </h2>
              <ul className="m-0 mt-2.5 grid list-none gap-2.5 p-0">
                {channels
                  .filter((c) => c.kind !== "club" && !isFollowed(c.key))
                  .slice(0, 5)
                  .map((c) => (
                    <li key={c.key} className="flex items-center gap-2.5">
                      <Link
                        to={c.href}
                        className="scd-focus flex min-w-0 flex-1 items-center gap-2.5 rounded-md"
                      >
                        <span
                          aria-hidden="true"
                          className="grid size-[34px] shrink-0 place-items-center rounded-full font-uv text-[13px]"
                          style={{
                            background: c.color,
                            color: c.kind === "event" ? "#0b1e3a" : "#fff",
                          }}
                        >
                          {c.code}
                        </span>
                        <span className="truncate text-[15px] font-semibold text-[#0b1e3a]">
                          {c.label}
                        </span>
                      </Link>
                      <FollowButton
                        on={false}
                        onToggle={() => toggleFollow(c.key)}
                      />
                    </li>
                  ))}
              </ul>
            </div>
          </FeedCard>
          <SideTiles
            event={
              nextEvent
                ? {
                    title: nextEvent.title,
                    when: nextEvent.when,
                    href: nextEvent.href,
                  }
                : null
            }
          />
          <SponsorCards sponsors={dailySponsors} />
          <MondoColico />
          <Affiliations tone="light" />
        </div>
      </div>
      <p className="mt-6 text-center text-[11.5px] text-[#7a8aa3]">
        Versione di prova del {BUILD_STAMP}
      </p>

      {picker && (
        <TeamPicker
          teams={teams}
          follow={localFollow}
          nextLabel={nextLabel}
          onToggle={(id) =>
            setLocalFollow((f) =>
              f.includes(id) ? f.filter((x) => x !== id) : [...f, id],
            )
          }
          onDone={donePicker}
          onClose={closePicker}
        />
      )}
      {reporting && (
        <ReportSheet onPick={report} onClose={() => setReporting(null)} />
      )}
      <SkyCameo message={sky} onClose={closeSky} />
    </main>
  );
}

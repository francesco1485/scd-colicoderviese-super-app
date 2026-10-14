/**
 * Home of a signed-in member (UD-095 + UD-100, Direzione 13/10/2026). Teams are inside: once signed in, the home
 * keeps the club board — the games of the week of every team, why join, the club in numbers, the teams, the games
 * and the "Dal club" feed (UD-089: "Per te" puts followed channels first, "Tutti" shows everything, "Dirette" only
 * official live posts). Signed-out visitors get PublicHome instead. Real data only.
 */
import { Link } from "@tanstack/react-router";
import { Vetrina } from "@/components/home/PublicHome";
import type { VetrinaSlot, VetrinaWorld } from "@/lib/vetrina";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Newspaper } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BUILD_STAMP } from "@/lib/build-stamp";
import { openAccessMenu } from "@/components/scd/AccessMenu";
import { Affiliations, SkyCameo } from "@/components/universe/Community";
import {
  ClubFacts,
  ClubGames,
  HomeHero,
  SectionTitle,
  SponsorRow,
  TeamsGrid,
  WeekGames,
  WhyJoin,
} from "@/components/home/HomeSections";
import {
  EmptyFeed,
  EventPost,
  FeedTabs,
  FollowButton,
  PostCard,
  ReportSheet,
  SponsorPost,
} from "@/components/universe/Feed";
import type { ReportReason } from "@/lib/moderation";
import { TeamPicker } from "@/components/universe/TeamBar";
import { addDays } from "@/lib/board-data";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import type { getPublicFeed, getPublicSchedule } from "@/lib/club.functions";
import { CLUB_EVENTS, clubEventsOn } from "@/lib/club-events";
import { CLUB_PROFILE, hallTeams } from "@/lib/club-profile";
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
  reportPost,
  setFollow,
  toggleForza,
  type getPublicSocial,
} from "@/lib/social.functions";
import { SPONSORS } from "@/lib/sponsors";
import { sponsorOfTheDay } from "@/lib/stories";
import { itemState, orderTeams, type Team } from "@/lib/universe";

export interface MemberHomeData {
  feed: Awaited<ReturnType<typeof getPublicFeed>>;
  schedule: Awaited<ReturnType<typeof getPublicSchedule>>;
  calendar: Awaited<ReturnType<typeof getPublicCalendarSnapshot>>;
  social: Awaited<ReturnType<typeof getPublicSocial>>;
  serverNow: number;
  today: string;
  /** Vetrina of the day for the "soci" world (UD-110 palinsesto), from getVetrina({ members: true }). */
  vetrina?: Readonly<Record<VetrinaWorld, readonly VetrinaSlot[]>>;
}

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

export function MemberHome({
  feed,
  schedule,
  calendar,
  social,
  serverNow,
  today,
  vetrina,
}: MemberHomeData) {
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

  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    setLocalFollow(readList("scd-follow"));
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
  // The one highlighted row of the week: the game in play, else the first to start (followed teams first).
  const nextMatch = useMemo(() => {
    const live = weekGames.find((g) => itemState(g, nowMs) === "live");
    if (live) return live;
    return (
      weekGames.find((g) => followedTeams.includes(g.group)) ??
      weekGames[0] ??
      null
    );
  }, [weekGames, nowMs, followedTeams]);
  const hall = useMemo(() => hallTeams(calendar.groups), [calendar.groups]);
  const seasonGames = calendar.events.length;
  const verifiedSponsors = useMemo(
    () => SPONSORS.filter((x) => x.nameVerified && x.name),
    [],
  );
  const sponsor = useMemo(() => sponsorOfTheDay(SPONSORS, today), [today]);
  const dailySponsors = useMemo(() => {
    const list = verifiedSponsors;
    const at = sponsor ? Math.max(0, list.indexOf(sponsor)) : 0;
    return Array.from(
      { length: Math.min(6, list.length) },
      (_, k) => list[(at + k) % list.length]!,
    );
  }, [sponsor, verifiedSponsors]);
  const nextEvent = clubEventsOn(today).find((e) => e.date >= today) ?? null;

  const ordered = useMemo(
    () => orderFeed(posts, mode, effectiveFollows),
    [posts, mode, effectiveFollows],
  );
  // Week, matches and Top 11 have their own sections above the feed: only posts, sponsor, event and press stay.
  const nodes = useMemo(
    () =>
      composeFeed(ordered, [], !!sponsor, nextEvent, mode).filter(
        (n) => n.k !== "week" && n.k !== "match" && n.k !== "top11",
      ),
    [ordered, sponsor, nextEvent, mode],
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
      <HomeHero signedIn={social.signedIn} onArea={openAccessMenu} />

      <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-6 px-4 pt-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-x-8 lg:px-6 lg:pt-8">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
          <WeekGames
            items={weekGames}
            teamOf={teamOf}
            highlightId={nextMatch?.id ?? null}
            nowMs={nowMs}
          />
          {vetrina && <Vetrina worlds={vetrina} fixedWorld="soci" embedded />}
          <div className="lg:hidden">
            <WhyJoin />
          </div>
          <div className="lg:hidden">
            <ClubFacts
              teams={hall.length}
              towns={CLUB_PROFILE.towns}
              games={seasonGames}
              sponsors={verifiedSponsors.length}
              season={calendar.season}
              matricola={CLUB_PROFILE.figcMatricola}
              affiliation={CLUB_PROFILE.monza.label}
            />
          </div>
          <TeamsGrid teams={hall} />
          <ClubGames />
          <div className="lg:hidden">
            <SponsorRow
              sponsors={dailySponsors}
              total={verifiedSponsors.length}
            />
          </div>

          <section aria-labelledby="dal-club" className="grid gap-3">
            <SectionTitle id="dal-club">Dal club</SectionTitle>
            <div className="flex items-center justify-between gap-3 px-1">
              <FeedTabs mode={mode} onChange={changeMode} tone="light" />
              {social.canPost && (
                <Link
                  to="/crea"
                  className="scd-focus inline-flex h-10 shrink-0 items-center rounded-[12px] bg-[#0b2a5b] px-4 text-[14px] font-bold text-white"
                >
                  Crea post
                </Link>
              )}
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
                      to="/rassegna-stampa"
                      className="scd-focus flex items-center gap-3 rounded-[18px] bg-white p-4 shadow-[0_2px_12px_rgb(11_42_91/0.08)] hover:bg-[#f4f7fb]"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#e3eefb] text-[#0b2a5b]">
                        <Newspaper className="size-5" aria-hidden="true" />
                      </span>
                      <span className="grid min-w-0 gap-0.5">
                        <b className="text-[16px] leading-tight text-[#0b1e3a]">
                          Dicono di noi
                        </b>
                        <span className="text-[13.5px] text-[#5a6b85]">
                          I titoli delle testate su società, Colico e Dervio.
                        </span>
                      </span>
                      <ChevronRight
                        className="ml-auto size-5 shrink-0 text-[#9fb0c8]"
                        aria-hidden="true"
                      />
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
        <div className="hidden min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid">
          <WhyJoin />
          <ClubFacts
            teams={hall.length}
            towns={CLUB_PROFILE.towns}
            games={seasonGames}
            sponsors={verifiedSponsors.length}
            season={calendar.season}
            matricola={CLUB_PROFILE.figcMatricola}
            affiliation={CLUB_PROFILE.monza.label}
          />
          <SponsorRow
            sponsors={dailySponsors}
            total={verifiedSponsors.length}
          />
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
      <SkyCameo message={sky} onClose={closeSky} persona="genny" />
    </main>
  );
}

/**
 * Home of a signed-in member (UD-116, Direzione 14/10/2026 10:59, after UD-095/UD-100): what matters first.
 * Urgent notices → the one club communication → "Oggi e questa settimana" limited to the person's teams (staff) and
 * children's teams (families), with trainings from the weekly quadro and changes highlighted → six quick actions for
 * this kind of person → weekend results (real source only) → tip of the day → teams, club games (no vetrina, UD-152)
 * and the "Dal club" feed (UD-089) → partners once. Signed-out visitors get PublicHome instead. Real data only.
 */
import { Link } from "@tanstack/react-router";
import type { VetrinaSlot, VetrinaWorld } from "@/lib/vetrina";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Newspaper } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BUILD_STAMP } from "@/lib/build-stamp";
import { openAccessMenu } from "@/components/scd/AccessMenu";
import { SkyCameo } from "@/components/universe/Community";
import {
  ClubGames,
  SectionTitle,
  SponsorRow,
  TeamsGrid,
} from "@/components/home/HomeSections";
import {
  ClubNoticeCard,
  DailyTipCard,
  MyWeek,
  QuickActions,
  SupportStrip,
  UrgentNotices,
  WeekendResults,
  WRAP,
} from "@/components/home/HomePractical";
import { supportActions } from "@/lib/home-support";
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
import { CroviWelcome } from "@/components/home/CroviWelcome";
import { nextHome } from "@/components/home/HomeLobby";
import type { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import type { getPublicFeed, getPublicSchedule } from "@/lib/club.functions";
import { CLUB_EVENTS, clubEventsOn } from "@/lib/club-events";
import { hallTeams } from "@/lib/club-profile";
import type { ClubNotice } from "@/lib/club-notice";
import { quickActions } from "@/lib/home-actions";
import { weekendResults } from "@/lib/home-results";
import type { HomeScope } from "@/lib/home-scope.functions";
import { tagChildren, urgentNotices, weekMatches } from "@/lib/home-today";
import { dailyTip } from "@/lib/home-tips";
import {
  calendarToWeekItems,
  mergeWeekItems,
  r20ItemToWeekItem,
  r20MatchToWeekItem,
  type WeekItem,
} from "@/lib/home-week";
import { freshnessLabel, SNAPSHOT_BANNER } from "@/lib/public-snapshots";
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
  /** Vetrina of the day: loaded for the LED wall day only, never rendered here (UD-152, 15/10 13:54). */
  vetrina?: Readonly<Record<VetrinaWorld, readonly VetrinaSlot[]>>;
  /** Personal scope of "Oggi e questa settimana" (getMyHomeScope). */
  scope: HomeScope;
  /** The one club communication of the day (getClubNotice), or null. */
  notice: ClubNotice | null;
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
  scope,
  notice,
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

  const hall = useMemo(() => hallTeams(calendar.groups), [calendar.groups]);
  // "Oggi e questa settimana": games of the person's groups (live calendar) + trainings of those groups (quadro).
  const myWeek = useMemo(() => {
    const only = new Set(scope.groups);
    const games = scope.groups.length
      ? weekMatches(calendar.events, calendar.groups, scope.today, only)
      : [];
    return tagChildren([...games, ...scope.trainings], scope.children);
  }, [calendar, scope]);
  const alerts = useMemo(
    () => urgentNotices(feed.items, nowMs, true),
    [feed.items, nowMs],
  );
  const results = useMemo(() => weekendResults(feed, today), [feed, today]);
  const tip = useMemo(() => dailyTip(today), [today]);
  const actions = useMemo(
    () =>
      quickActions(scope.audience, {
        childGroups: scope.children.flatMap((c) => c.groups),
      }),
    [scope],
  );
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
  // UD-186: the Crovi card lives inside (tesserati, convocati, famiglie); a match is named only from the public
  // calendar (next home game with a confirmed time). Later: who is at the pitch right now.
  const croviMatch = useMemo(() => {
    const n = nextHome(calendar.events, nowMs);
    return n && n.e.timeConfirmed ? { date: n.e.date, time: n.e.time, opponent: n.e.opponent } : null;
  }, [calendar.events, nowMs]);

  return (
    <main
      data-screen="home"
      data-variant="member"
      className="min-h-dvh bg-[#eef3f9] pb-10"
    >
      <header className="bg-[#0b2a5b] text-white" data-testid="home-hero">
        <div
          className={`${WRAP} flex items-center justify-between gap-3 py-3 lg:py-4`}
        >
          <div className="grid min-w-0 gap-0.5">
            <span className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-[#ffd600]">
              {scope.preview
                ? `Anteprima staging · vista ${scope.preview}`
                : social.signedIn
                  ? "La tua home"
                  : "Home"}
            </span>
            <h1 className="m-0 truncate font-uv text-[24px] leading-none lg:text-[30px]">
              S.C.D. ColicoDerviese
            </h1>
          </div>
          {social.signedIn && (
            <button
              type="button"
              onClick={openAccessMenu}
              className="scd-focus inline-flex h-11 shrink-0 items-center rounded-[12px] bg-[#ffd600] px-4 text-[15px] font-bold text-[#0b1e3a] lg:h-12 lg:px-6"
              data-testid="home-area"
            >
              Le mie aree
            </button>
          )}
        </div>
      </header>
      {scope.preview && (
        <p
          className={`${WRAP} m-0 pt-3 text-[13px] text-[#5a6b85]`}
          data-testid="home-preview-note"
        >
          Anteprima senza accesso: nessun dato personale.{" "}
          {scope.preview === "staff"
            ? "Mostra tutte le squadre come un ruolo d'ufficio."
            : "Nessun ragazzo collegato: si vedono gli stati vuoti."}
        </p>
      )}
      <UrgentNotices items={alerts} />
      <CroviWelcome nowMs={nowMs} match={croviMatch} />
      <ClubNoticeCard notice={notice} />
      <MyWeek
        entries={myWeek}
        today={scope.today}
        hasScope={scope.groups.length > 0}
        failed={scope.state === "error"}
        note={
          <>
            {sourceNote}. Allenamenti: {SNAPSHOT_BANNER}.
          </>
        }
      />
      <QuickActions audience={scope.audience} actions={actions} />
      <SupportStrip actions={supportActions({ lotteryPublic: false })} />
      <WeekendResults rows={results} />
      <DailyTipCard
        tip={tip}
        signedIn={social.signedIn || scope.preview !== null}
      />

      <div
        className={`${WRAP} grid grid-cols-[minmax(0,1fr)] gap-6 pt-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-x-8 lg:pt-12`}
      >
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
          <section aria-labelledby="dal-club" className="grid gap-3">
            <SectionTitle id="dal-club">Dal club</SectionTitle>
            <div className="flex items-center justify-between gap-3 px-1">
              <FeedTabs mode={mode} onChange={changeMode} tone="light" />
              {social.canPost && (
                <Link
                  to="/crea"
                  className="scd-focus inline-flex h-11 shrink-0 items-center rounded-[12px] bg-[#0b2a5b] px-4 text-[14px] font-bold text-white"
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
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
          <TeamsGrid teams={hall} />
          <ClubGames />
          <SponsorRow
            sponsors={dailySponsors}
            total={verifiedSponsors.length}
          />
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
      <SkyCameo message={sky} onClose={closeSky} persona="vera" />
    </main>
  );
}

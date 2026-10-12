import { createFileRoute } from "@tanstack/react-router";
import { BUILD_STAMP } from "@/lib/build-stamp";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Affiliations, SkyCameo } from "@/components/universe/Community";
import { type FixtureFilter } from "@/components/universe/HomeBlocks";
import { TeamPicker } from "@/components/universe/TeamBar";
import { StoriesRow } from "@/components/universe/Stories";
import { SPONSORS } from "@/lib/sponsors";
import { buildStories, sponsorOfTheDay, type ClubEvent } from "@/lib/stories";
import {
  LarioHeader,
  MondoColico,
  NextMatchCard,
  QuickTiles,
  SideTiles,
  SponsorCards,
  UpcomingGames,
  WeekHero,
} from "@/components/universe/BoardHome";
import { openAccessMenu } from "@/components/scd/AccessMenu";
import type { Club } from "@/lib/club.types";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { getPublicFeed, getPublicSchedule } from "@/lib/club.functions";
import { addDays } from "@/lib/board-data";
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
  inSelection,
  itemState,
  orderTeams,
  type Selection,
  type Team,
} from "@/lib/universe";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [feed, schedule, calendar] = await Promise.all([
      getPublicFeed(),
      getPublicSchedule(),
      getPublicCalendarSnapshot(),
    ]);
    const serverNow = Date.now();
    const now = romeParts(new Date(serverNow).toISOString());
    return {
      feed,
      schedule,
      calendar,
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
          "Le gare di tutte le squadre della S.C.D. ColicoDerviese in ordine di orario, la prossima partita, allenamenti, eventi e canali ufficiali. Senza accesso obbligatorio.",
      },
      {
        property: "og:title",
        content: "S.C.D. ColicoDerviese — Sport, persone, territorio",
      },
      {
        property: "og:description",
        content:
          "Prossima gara, calendario di tutte le annate ed eventi della S.C.D. ColicoDerviese, Colico e Dervio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

/** Club events already published in the app (real pages), offered in the club story. */
const CLUB_EVENTS: readonly ClubEvent[] = [
  {
    id: "christmas-lario-cup-2026",
    title: "Christmas Lario Cup",
    when: "8 dicembre",
    date: "2026-12-08",
    text: "1ª edizione a Colico e Dervio: iscrizioni aperte, squadre di prestigio, villaggio di Natale.",
    href: "/eventi/christmas-lario-cup",
    image: "/media/eventi/christmas-lario-cup-2026-maschile.webp",
  },
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
  const { feed, schedule, calendar, serverNow, today } = Route.useLoaderData();
  const [nowMs, setNowMs] = useState(serverNow);
  const [follow, setFollow] = useState<string[]>([]);
  const [selection, setSelection] = useState<Selection>("all");
  const [going, setGoing] = useState<string[]>([]);
  const [filter, setFilter] = useState<FixtureFilter>("all");
  const [day, setDay] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [sky, setSky] = useState<{ title: string; text: string } | null>(null);
  const closeSky = useCallback(() => setSky(null), []);

  // Orologio e preferenze locali solo dopo il montaggio (nessuna differenza tra server e browser).
  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    const f = readList("scd-follow");
    setFollow(f);
    setGoing(readList("scd-rsvp"));
    try {
      const s = JSON.parse(localStorage.getItem("scd-sel") ?? '"all"');
      if (typeof s === "string")
        setSelection(s === "mine" && !f.length ? "all" : s);
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

  // Opponents' crests: only from the club database (R20), never drawn or guessed.
  const clubByName = useMemo(() => {
    const m = new Map<string, Club>();
    for (const x of [
      ...schedule.matches,
      ...(feed.nextMatch ? [feed.nextMatch] : []),
    ])
      if (x.avversario) m.set(x.avversario.nome.toLowerCase(), x.avversario);
    return m;
  }, [schedule, feed]);
  const clubOf = useCallback(
    (name: string) => clubByName.get(name.toLowerCase()),
    [clubByName],
  );

  const teams = useMemo(
    () =>
      orderTeams(
        calendar.groups.filter(
          (g) =>
            g.count > 0 ||
            [
              "prima",
              "u19",
              "u16",
              "u15",
              "2014",
              "2015",
              "pulcini",
              "primicalci",
              "piccoli",
            ].includes(g.id),
        ),
        follow,
      ),
    [calendar.groups, follow],
  );
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const teamOf = useCallback(
    (i: WeekItem): Team | undefined => teamById.get(i.group),
    [teamById],
  );

  const minute = Math.floor(nowMs / 60_000);
  const stories = useMemo(
    () =>
      buildStories({
        items: merged,
        teams,
        today,
        nowMs: minute * 60_000,
        sponsors: SPONSORS,
        events: CLUB_EVENTS,
      }),
    [merged, teams, today, minute],
  );

  const tomorrow = addDays(today, 1);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(today, i)),
    [today],
  );
  const windowItems = useMemo(
    () => merged.filter((i) => i.date >= today && i.date <= days[6]!),
    [merged, today, days],
  );
  const selected = useMemo(
    () => windowItems.filter((i) => inSelection(i, selection, follow)),
    [windowItems, selection, follow],
  );
  const games = useMemo(
    () =>
      merged.filter(
        (i) => i.kind === "Gara" && inSelection(i, selection, follow),
      ),
    [merged, selection, follow],
  );
  const auto =
    games.find((i) => itemState(i, nowMs) === "live") ??
    games.find(
      (i) =>
        ["next", "unknown"].includes(itemState(i, nowMs)) && i.date >= today,
    ) ??
    null;
  // Same-day matches (in contemporanea): all of them belong to the ticket; a tap picks the one in front.
  const [pickId, setPickId] = useState<string | null>(null);
  const sameDay = useMemo(
    () => (auto ? games.filter((g) => g.date === auto.date) : []),
    [games, auto],
  );
  const next = sameDay.find((g) => g.id === pickId) ?? auto;
  const others = next ? sameDay.filter((g) => g.id !== next.id) : [];
  const live = useMemo(
    () =>
      new Set(
        windowItems
          .filter((i) => itemState(i, nowMs) === "live")
          .map((i) => i.group),
      ),
    [windowItems, nowMs],
  );
  const weekGames = useMemo(
    () =>
      windowItems
        .filter((i) => i.kind === "Gara" && itemState(i, nowMs) !== "done")
        .sort((a, b) =>
          (a.date + (a.time || "99:99")).localeCompare(
            b.date + (b.time || "99:99"),
          ),
        ),
    [windowItems, nowMs],
  );
  const upcoming = windowItems.filter(
    (i) =>
      i.kind === "Gara" && itemState(i, nowMs) === "next" && i.date <= tomorrow,
  ).length;

  const select = (s: Selection) => {
    setSelection(s);
    writeValue("scd-sel", s);
    setDay(null);
  };
  const toggleFollow = (id: string) =>
    setFollow((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
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
  const closePicker = useCallback(() => {
    setPicker(false);
    writeValue("scd-onb", 1);
  }, []);
  const donePicker = () => {
    writeValue("scd-follow", follow);
    writeValue("scd-onb", 1);
    setPicker(false);
    if (follow.length) {
      select("mine");
      setSky({
        title: "Fatto!",
        text: "La home ora si apre sulle tue squadre.",
      });
    }
  };

  // Primo accesso: dopo la scelta sui cookie si chiede quale squadra segui (senza account).
  useEffect(() => {
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
  }, []);

  const toggleGoing = () => {
    if (!next) return;
    const on = !going.includes(next.id);
    const list = on ? [...going, next.id] : going.filter((x) => x !== next.id);
    setGoing(list);
    writeValue("scd-rsvp", list);
    if (on)
      setSky({
        title: "Grande!",
        text: `Ti aspettiamo alle ${next.time || "ore da definire"}. Salvato su questo telefono.`,
      });
  };
  const share = async () => {
    if (!next) return;
    const text = `${next.groupLabel.replace(/\s·\s/g, " ")}: ${next.title}, ${next.date.split("-").reverse().join("/")} ${next.time}. Forza ColicoDerviese!`;
    try {
      if (navigator.share)
        await navigator.share({
          title: "S.C.D. ColicoDerviese",
          text,
          url: location.origin,
        });
      else {
        await navigator.clipboard.writeText(`${text} ${location.origin}`);
        setSky({ title: "Copiato", text: "Incolla il messaggio dove vuoi." });
      }
    } catch {
      /* condivisione annullata */
    }
  };

  const sourceNote =
    calendar.origin === "mirror"
      ? `Calendario SCD aggiornato ${freshnessLabel(calendar.sourceModifiedAt)}`
      : calendar.origin === "stale"
        ? `Ultima copia verificata del ${freshnessLabel(calendar.sourceModifiedAt)}`
        : `Copia di sicurezza del ${freshnessLabel(calendar.sourceModifiedAt)}`;
  const emptyTeam =
    selection !== "all" && selection !== "mine"
      ? teamById.get(selection)
      : undefined;

  const homeGames = weekGames.filter((g) => g.homeAway === "CASA").length;
  const dailySponsors = useMemo(() => {
    const list = SPONSORS.filter((x) => x.nameVerified && x.name);
    const first = sponsorOfTheDay(SPONSORS, today);
    const at = first ? list.indexOf(first) : 0;
    return Array.from(
      { length: Math.min(6, list.length) },
      (_, k) => list[(at + k) % list.length]!,
    );
  }, [today]);
  const nextEvent = CLUB_EVENTS.find((e) => e.date >= today) ?? null;

  return (
    <main data-screen="home" className="min-h-dvh bg-[#eef3f9] pb-10">
      {/* Tavola madre approvata (VR-009, UD-088): testata Lario, schede bianche, dati reali. */}
      <LarioHeader onEnter={openAccessMenu}>
        <StoriesRow stories={stories} nowMs={nowMs} />
      </LarioHeader>

      <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-4 px-4 pt-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-6 lg:px-6 lg:pt-6">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          <WeekHero games={weekGames.length} home={homeGames} />
          <QuickTiles
            games={weekGames.length}
            events={CLUB_EVENTS.filter((e) => e.date >= today).length}
          />
          <NextMatchCard
            item={next}
            team={next ? teamOf(next) : undefined}
            nowMs={nowMs}
            going={!!next && going.includes(next.id)}
            onGoing={toggleGoing}
            onShare={share}
            others={others}
          />
          <UpcomingGames
            items={weekGames.filter((g) => g.id !== next?.id).slice(0, 6)}
            teamOf={teamOf}
          />
          <p className="m-0 px-1 text-[12.5px] text-[#5a6b85]">
            {sourceNote}. Orari e campi segnati "da confermare" non sono ancora
            confermati dal club.
          </p>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
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
          follow={follow}
          nextLabel={nextLabel}
          onToggle={toggleFollow}
          onDone={donePicker}
          onClose={closePicker}
        />
      )}
      <SkyCameo message={sky} onClose={closeSky} />
    </main>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AgeGuide,
  Affiliations,
  InviteCard,
  JoinCard,
  SkyCameo,
  SocialHub,
} from "@/components/universe/Community";
import {
  Fixtures,
  HeroBand,
  NextTicket,
  SectionTitle,
  Shortcuts,
  type FixtureFilter,
} from "@/components/universe/HomeBlocks";
import { TeamBar, TeamPicker } from "@/components/universe/TeamBar";
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
  homeMode,
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
  const next =
    games.find((i) => itemState(i, nowMs) === "live") ??
    games.find(
      (i) =>
        ["next", "unknown"].includes(itemState(i, nowMs)) && i.date >= today,
    ) ??
    null;
  const live = useMemo(
    () =>
      new Set(
        windowItems
          .filter((i) => itemState(i, nowMs) === "live")
          .map((i) => i.group),
      ),
    [windowItems, nowMs],
  );
  const mode = homeMode(windowItems, nowMs);
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

  return (
    <main data-screen="home" className="uv-page min-h-dvh pb-10">
      <TeamBar
        teams={teams}
        follow={follow}
        selection={selection}
        live={live}
        onSelect={select}
        onOpenPicker={() => setPicker(true)}
      />
      <HeroBand mode={mode} upcoming={upcoming}>
        <NextTicket
          item={next}
          team={next ? teamOf(next) : undefined}
          nowMs={nowMs}
          going={!!next && going.includes(next.id)}
          onGoing={toggleGoing}
          onShare={share}
          emptyTeam={emptyTeam}
        />
      </HeroBand>

      <div className="mx-auto max-w-[1200px] px-4 lg:px-6">
        <div className="lg:grid lg:grid-cols-[7fr_5fr] lg:items-start lg:gap-6">
          <div>
            <SectionTitle
              id="gare-t"
              more={
                <Link
                  to="/calendario"
                  className="py-[10px] text-[15px] font-extrabold text-[var(--uv-gold)]"
                >
                  Calendario completo
                </Link>
              }
            >
              Gare
            </SectionTitle>
            <Fixtures
              items={selected}
              days={days}
              today={today}
              tomorrow={tomorrow}
              nowMs={nowMs}
              filter={filter}
              day={day}
              teamOf={teamOf}
              onFilter={setFilter}
              onDay={setDay}
            />
            <p className="px-[6px] pt-[6px] text-[12px] text-[#a9bfe3]">
              {sourceNote}. Orari e campi segnati "da conf." non sono ancora
              confermati dal club.
            </p>
            <Shortcuts />
            <SectionTitle id="eta-t">Per ogni età</SectionTitle>
            <AgeGuide />
          </div>
          <div>
            <SectionTitle id="tua-t">La tua SCD</SectionTitle>
            <div className="grid gap-[14px]">
              <JoinCard />
              <InviteCard />
              <Link
                to="/eventi/christmas-lario-cup"
                className="relative flex min-h-[200px] items-end overflow-hidden rounded-[18px] bg-[var(--uv-night)] text-white shadow-[0_14px_28px_rgb(0_10_40/0.28)]"
                data-testid="home-clc"
              >
                <img
                  src="/media/eventi/christmas-lario-cup-2026-maschile.webp"
                  alt=""
                  className="absolute inset-0 size-full object-cover object-top opacity-70"
                  loading="lazy"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgb(2_31_79/0.95)]"
                />
                <span className="uv-notch absolute left-[14px] top-[14px] rounded-l-[6px] bg-[var(--scd-red)] py-2 pl-3 pr-[14px] font-uv text-[15px] uppercase tracking-[0.06em]">
                  8 dicembre
                </span>
                <span className="relative grid gap-[6px] p-4">
                  <b className="font-uv text-[30px] uppercase leading-[0.92]">
                    Christmas Lario Cup
                  </b>
                  <span className="text-[15px] text-[#dbe7ff]">
                    1ª edizione a Colico e Dervio: iscrizioni aperte, squadre di
                    prestigio, villaggio di Natale.
                  </span>
                </span>
              </Link>
              <div id="seguici">
                <SocialHub />
              </div>
            </div>
          </div>
        </div>
        <Affiliations />
        <p className="font-uv-script mt-8 text-center text-[38px] leading-none text-[var(--uv-gold)] [text-shadow:0_4px_0_rgb(0_0_0/0.3)]">
          <span className="inline-block -rotate-[4deg]">
            Colico Derviese Sempre!
          </span>
        </p>
      </div>

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

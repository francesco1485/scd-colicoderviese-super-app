import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bus,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Facebook,
  Instagram,
  List,
  Megaphone,
  Newspaper,
  PenLine,
  Share2,
  ShieldCheck,
  UsersRound,
  Youtube,
  type LucideIcon,
} from "lucide-react";

import {
  BellAction,
  HeroHeader,
  type SegItem,
  Segmented,
  SectionHead,
  Sheet,
} from "@/components/scd/board";
import { CalendarGridIcon } from "@/components/scd/icons";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { getPublicFeed } from "@/lib/club.functions";
import {
  dateParts,
  groupShort,
  matchTitle,
  recentlyUpdated,
  upcomingMatches,
} from "@/lib/board-data";
import { romeParts } from "@/lib/home-week";
import { freshnessLabel } from "@/lib/public-snapshots";
import { getTrainingQuadro } from "@/lib/quadro.functions";

/*
 * Public page: annata crests stay internal (Direzione, 13/10/2026); team rows use the master's team colour.
 * Teams are inside (UD-100): the "Squadre" tab and the training board row exist only for signed-in members (the
 * server marks the calendar audience); anonymous visitors see club news, the games calendar and the social hub.
 */

const TABS = ["club", "squadre", "social"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/comunicazioni")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab | undefined } =>
    TABS.includes(s["tab"] as Tab) && s["tab"] !== "club"
      ? { tab: s["tab"] as Tab }
      : {},
  loader: async () => {
    const [feed, calendar] = await Promise.all([
      getPublicFeed(),
      getPublicCalendarSnapshot(),
    ]);
    const now = romeParts(new Date().toISOString());
    const member = calendar.audience === "member";
    // Training quadro only for members, from the server (UD-100).
    const quadroSlots = member ? (await getTrainingQuadro()).quadro.slots.length : 0;
    return {
      feed,
      calendar,
      member,
      quadroSlots,
      fresh: recentlyUpdated(calendar.sourceModifiedAt, new Date()),
      today: now?.date ?? new Date().toISOString().slice(0, 10),
      clock: now?.time ?? "00:00",
    };
  },
  head: () => ({
    meta: [
      { title: "Comunicazioni — S.C.D. ColicoDerviese" },
      {
        name: "description",
        content:
          "Notizie, avvisi e aggiornamenti della S.C.D. ColicoDerviese: calendario gare, eventi e social del club.",
      },
      {
        property: "og:title",
        content: "Comunicazioni — S.C.D. ColicoDerviese",
      },
      {
        property: "og:description",
        content: "Tutte le notizie, gli aggiornamenti e i contenuti del club.",
      },
    ],
  }),
  component: Comunicazioni,
});

type Row = {
  id: string;
  icon: LucideIcon | "calendar";
  title: string;
  sub: string;
  to?: string;
  search?: Record<string, string>;
  href?: string;
};

function Comunicazioni() {
  const { feed, calendar, member, quadroSlots, fresh, today, clock } = Route.useLoaderData();
  const { tab: asked = "club" } = Route.useSearch();
  // Anonymous visitors asking ?tab=squadre land on the club tab: teams are inside (UD-100).
  const tab: Tab = asked === "squadre" && !member ? "club" : asked;
  const alerts = feed.items.filter((i) => i.kind === "alert");
  const alert = alerts[0];
  const news = feed.items.filter(
    (i) => i.kind === "news" || i.kind === "event" || i.kind === "community",
  );

  // Avvisi reali derivati dalle fonti già collegate (nessun testo dimostrativo).
  const rows = (
    [
      ...news
        .slice(0, 2)
        .map((n): Row => ({
          id: n.id,
          icon: Newspaper,
          title: n.title,
          sub: n.source || "S.C.D. ColicoDerviese",
          ...(n.link ? { href: n.link } : {}),
        })),
      {
        id: "cal",
        icon: "calendar",
        title: fresh
          ? "Nuovo calendario partite disponibile"
          : "Calendario partite 2026/27",
        sub: `Aggiornato il ${freshnessLabel(calendar.sourceModifiedAt)} · ${calendar.events.length} gare`,
        to: "/calendario",
      },
      ...(member
        ? [
            {
              id: "quadro",
              icon: ClipboardList,
              title: "Quadro allenamenti lun–ven",
              sub: `Fotografia del 09/10/2026 · ${quadroSlots} fasce orarie`,
              to: "/allenamenti",
            } satisfies Row,
          ]
        : []),
      {
        id: "pulmini",
        icon: Bus,
        title: "Organizzazione pulmini",
        sub: "Nessuna corsa confermata al momento",
        to: "/core/impianti-calendari",
        search: { sezione: "dervio" },
      },
      {
        id: "safe",
        icon: ShieldCheck,
        title: "Safeguarding e tutela dei minori",
        sub: "Segnalazioni riservate, canale dedicato",
        to: "/safeguarding",
      },
    ] satisfies Row[] as Row[]
  ).slice(0, 4);
  const upcoming = upcomingMatches(calendar.events, today, clock);
  const teams = !member ? [] : calendar.groups
    .filter((g) => g.count > 0 && g.id !== "other")
    .map((g) => ({ g, next: upcoming.find((e) => e.group === g.id) }));

  return (
    <main data-screen="comunicazioni">
      <HeroHeader
        title="Comunicazioni"
        subtitle={
          <>
            Tutte le notizie, gli aggiornamenti
            <br />e i contenuti del club.
          </>
        }
        action={<BellAction dot={alerts.length > 0 || fresh} />}
        plain
        titleGap={30}
        bottomGap={20}
        testId="comms-hero"
      >
        <Segmented
          tone="header"
          label="Sezioni comunicazioni"
          className="pb-[18px] [&>*]:h-[44px]"
          items={[
            {
              label: "Club",
              icon: Newspaper,
              active: tab === "club",
              target: { to: "/comunicazioni", search: {} },
            },
            ...(member
              ? [
                  {
                    label: "Squadre",
                    icon: UsersRound,
                    active: tab === "squadre",
                    target: { to: "/comunicazioni", search: { tab: "squadre" } },
                  } satisfies SegItem,
                ]
              : []),
            {
              label: "Social",
              icon: Share2,
              active: tab === "social",
              target: { to: "/comunicazioni", search: { tab: "social" } },
            },
          ]}
        />
      </HeroHeader>
      <Sheet overlap={14}>
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          <div>
            {tab === "club" && (
              <>
                <section
                  className="relative rounded-[14px] bg-[#fdeda1] px-[12px] pb-[12px] pt-[30px] shadow-[var(--scd-card-shadow)]"
                  aria-labelledby="avviso"
                  data-testid="important-card"
                >
                  <span className="absolute right-[10px] top-[8px] rounded-[6px] bg-[#e2b318] px-[8px] py-[3px] text-[12px] font-extrabold uppercase tracking-[0.03em] text-[#2a1d05]">
                    Importante
                  </span>
                  <div className="flex items-start gap-[12px]">
                    <span className="flex size-[54px] shrink-0 items-center justify-center rounded-full bg-[var(--scd-yellow)] shadow-[inset_0_0_0_2px_rgb(0_0_0/0.06)]">
                      <Megaphone
                        className="size-[28px] text-[#141a2a]"
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0">
                      <h2
                        id="avviso"
                        className="text-[18px] font-bold leading-tight text-[var(--scd-ink)]"
                      >
                        {alert ? alert.title : "Nessun avviso urgente in corso"}
                      </h2>
                      <p className="mt-[4px] text-[14.5px] leading-[1.25] text-[#2b3445]">
                        {alert
                          ? (alert.body ??
                            "Dettagli dal club in aggiornamento.")
                          : "Sospensioni e variazioni urgenti compaiono qui appena pubblicate."}
                      </p>
                      <p className="mt-[8px] flex items-center gap-[6px] text-[13px] font-medium text-[#2b3445]">
                        <CalendarClock
                          className="size-[16px]"
                          aria-hidden="true"
                        />
                        Controllato oggi alle {clock}
                      </p>
                    </div>
                  </div>
                </section>
                <div
                  className="scd-card mt-[10px] px-[10px]"
                  data-testid="comms-list"
                >
                  {rows.map((r) => (
                    <CommsRow key={r.id} row={r} />
                  ))}
                </div>
              </>
            )}
            {tab === "squadre" && member && (
              <div className="scd-card px-[10px]" data-testid="comms-teams">
                {teams.map(({ g, next }) => {
                  const d = next ? dateParts(next.date) : null;
                  return (
                    <Link
                      key={g.id}
                      to="/calendario"
                      search={{ annata: g.years[0] ?? g.id, vista: "prossime" }}
                      className="flex items-center gap-[12px] border-b border-[var(--scd-line)] py-[12px] last:border-0"
                    >
                      <span
                        className="w-[5px] shrink-0 self-stretch rounded-full"
                        style={{ background: g.color }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-bold leading-tight text-[var(--scd-ink)]">
                          {g.label}
                        </span>
                        <span className="mt-[2px] block text-[13.5px] text-[var(--scd-sub)]">
                          {next && d
                            ? `Prossima: ${matchTitle(next, `ColicoDerviese ${groupShort(g)}`)} · ${d.weekday} ${d.day} ${d.month}${next.time ? ` ${next.time}` : ""}`
                            : "Nessuna gara in programma"}
                        </span>
                      </span>
                      <ChevronRight
                        className="size-5 shrink-0 text-[var(--scd-ink)]"
                        strokeWidth={2.4}
                        aria-hidden="true"
                      />
                    </Link>
                  );
                })}
              </div>
            )}
            {tab === "social" && (
              <p className="scd-card px-[14px] py-[12px] text-[14px] leading-snug text-[var(--scd-sub)]">
                I post della società sono nel feed{" "}
                <Link
                  to="/"
                  className="font-bold text-[var(--scd-blue)] underline"
                >
                  Dal club
                </Link>
                ; le foto e i video anche sui profili ufficiali qui sotto.
              </p>
            )}
          </div>

          <div>
            <SectionHead
              title="Social Hub"
              more={{ label: "Dal club", target: { to: "/" } }}
            />
            <div
              className="scd-card grid grid-cols-2 gap-[10px] px-[10px] py-[14px]"
              data-testid="social-hub"
            >
              <Social
                icon={Instagram}
                label="Instagram"
                handle="@s.c.d.colicoderviese"
                href="https://www.instagram.com/s.c.d.colicoderviese/"
                bg="bg-[radial-gradient(circle_at_30%_110%,#fdf497_0%,#fd5949_45%,#d6249f_60%,#285aeb_90%)]"
              />
              <Social
                icon={Facebook}
                label="Facebook"
                handle="ColicoDerviese"
                href="https://www.facebook.com/ColicoDerviese"
                bg="bg-[#1877f2]"
              />
            </div>
            <div className="mt-[14px] grid grid-cols-2 gap-[10px]">
              <Link
                to="/crea"
                className="flex h-[54px] items-center justify-center gap-[10px] rounded-[10px] bg-[var(--scd-yellow)] text-[17px] font-bold text-[var(--scd-ink)] shadow-[var(--scd-card-shadow)]"
              >
                <PenLine
                  className="size-[22px]"
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
                Crea post
              </Link>
              <Link
                to="/rassegna-stampa"
                className="flex h-[54px] items-center justify-center gap-[10px] rounded-[10px] bg-[#dde0e6] text-[17px] font-bold text-[var(--scd-ink)] shadow-[var(--scd-card-shadow)]"
              >
                <List
                  className="size-[22px]"
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
                Rassegna media
              </Link>
            </div>
            <p className="px-[6px] pt-[6px] text-[11.5px] text-[var(--scd-sub)]">
              "Crea post" è per gli iscritti: le regole di tutela del club
              controllano ogni post prima che esca.
            </p>
          </div>
        </div>
      </Sheet>
    </main>
  );
}

function CommsRow({ row }: { row: Row }) {
  const Icon = row.icon;
  const body = (
    <>
      <span className="flex w-[36px] shrink-0 justify-center text-[#141a2a]">
        {Icon === "calendar" ? (
          <CalendarGridIcon size={30} />
        ) : (
          <Icon className="size-[28px]" strokeWidth={2.1} aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15.5px] font-bold leading-[1.2] text-[var(--scd-ink)]">
          {row.title}
        </span>
        <span className="mt-[3px] block text-[13.5px] leading-[1.2] text-[var(--scd-sub)]">
          {row.sub}
        </span>
      </span>
      {(row.href || row.to) && (
        <ChevronRight
          className="size-[22px] shrink-0 text-[var(--scd-ink)]"
          strokeWidth={2.4}
          aria-hidden="true"
        />
      )}
    </>
  );
  const cls =
    "flex items-center gap-[12px] border-b border-[var(--scd-line)] py-[13px] last:border-0";
  if (row.href)
    return (
      <a
        href={row.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
      >
        {body}
      </a>
    );
  if (!row.to) return <div className={cls}>{body}</div>;
  return (
    <Link to={row.to} search={row.search as never} className={cls}>
      {body}
    </Link>
  );
}

function Social({
  icon: Icon,
  label,
  handle,
  href,
  bg,
}: {
  icon: LucideIcon;
  label: string;
  handle: string;
  href: string;
  bg: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 items-center gap-[10px] rounded-[12px] p-[4px]"
    >
      <span
        className={`flex size-[48px] shrink-0 items-center justify-center rounded-[11px] ${bg}`}
      >
        <Icon
          className="size-[28px] text-white"
          strokeWidth={2}
          aria-hidden="true"
        />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[16px] font-extrabold text-[var(--scd-ink)]">
          {label}
        </span>
        <span className="block truncate text-[12px] text-[var(--scd-sub)]">
          {handle}
        </span>
        <span className="block text-[12px] font-bold text-[var(--scd-blue)]">
          Seguici
        </span>
      </span>
    </a>
  );
}

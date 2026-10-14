/**
 * Sections of the signed-in member home (UD-095, UD-100; UD-116 removed the hero, the all-teams week list, "Perché
 * iscriversi" and "La società in numeri" in favour of the practical blocks of HomePractical.tsx). One card system (white, radius 18, soft shadow), Big Shoulders only for section titles, Fira Sans
 * body, navy/blue/white with yellow only on the primary button and one highlight. Real data only: calendar
 * snapshot, sponsor list 2026/27, club profile. No crest, number or name is invented.
 */
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { venueCase } from "@/lib/board-data";
import type { HallTeam } from "@/lib/club-profile";
import { sponsorLabel, type Sponsor } from "@/lib/sponsors";

import { publicTeamCrest } from "@/lib/team-crest";

/* ------------------------------------------------------------ scaffolding */

export function Card({
  children,
  className = "",
  ...rest
}: { children: ReactNode; className?: string } & Record<string, unknown>) {
  return (
    <section
      className={`rounded-[18px] bg-white shadow-[0_2px_12px_rgb(11_42_91/0.08)] ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

/** Section title: Big Shoulders, sentence case, one per section. */
export function SectionTitle({
  id,
  children,
  more,
  moreLabel = "Vedi tutto",
}: {
  id: string;
  children: ReactNode;
  more?: string;
  moreLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-1 pb-2.5">
      <h2
        id={id}
        className="m-0 font-uv text-[24px] leading-none text-[#0b2a5b] lg:text-[26px]"
      >
        {children}
      </h2>
      {more && (
        <Link
          to={more}
          className="scd-focus inline-flex min-h-9 items-center gap-0.5 whitespace-nowrap rounded-md text-[14px] font-semibold text-[#1556c4]"
        >
          {moreLabel}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- venues */

/** Short venue: "Colico · Campo 1" or the town of an away ground. */
export function venueShort(v: string): string {
  const t = venueCase(v.trim());
  const m = t.match(/^([^-–,]+?)\s*[-–]\s*(.+)$/);
  if (!m) return t;
  const place = m[1]!.trim();
  const rest = m[2]!.replace(/,.*$/, "").trim();
  return /^colico$/i.test(place) ? `${place} · ${rest}` : place;
}

/* ---------------------------------------------------------------- teams */

/**
 * Our teams as clean text tiles. The club crest appears once in the card header: annata crests are internal only
 * (Direzione, 13/10/2026) and nine copies of the same club crest would only repeat themselves.
 */
export function TeamsGrid({ teams }: { teams: readonly HallTeam[] }) {
  return (
    <section aria-labelledby="squadre-t" data-testid="teams-grid">
      <SectionTitle id="squadre-t" more="/squadre" moreLabel="Tutte">
        Le nostre squadre
      </SectionTitle>
      <Card className="p-2">
        <p className="m-0 flex items-center gap-2.5 px-2 pb-2.5 pt-1.5">
          <img
            src={publicTeamCrest()}
            alt="Stemma ufficiale S.C.D. ColicoDerviese"
            width={26}
            height={34}
            loading="lazy"
            className="h-[34px] w-auto object-contain"
          />
          <span className="grid leading-tight">
            <b className="text-[15px] text-[#0b1e3a]">ColicoDerviese</b>
            <span className="text-[12.5px] text-[#5a6b85]">
              {teams.length} squadre tra Colico e Dervio
            </span>
          </span>
        </p>
        <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0 sm:grid-cols-3 lg:grid-cols-5">
          {teams.map((t) => {
            const title = t.label.split("·")[0]!.trim();
            const sub = t.label.includes("·")
              ? t.label.split("·").slice(1).join("·").trim()
              : t.years.join("/");
            return (
              <li key={t.id}>
                <Link
                  to="/squadre/$team"
                  params={{ team: t.id }}
                  aria-label={`ColicoDerviese · ${t.label.replace(/\s·\s/g, " ")}`}
                  className="scd-focus flex h-full min-h-[64px] items-stretch gap-2.5 rounded-[12px] bg-[#f4f7fb] px-2.5 py-2 hover:bg-[#e9f0f8]"
                >
                  <span
                    aria-hidden="true"
                    className="w-[4px] shrink-0 rounded-full"
                    style={{ background: t.color }}
                  />
                  <span className="grid min-w-0 content-center gap-0.5">
                    <b className="text-[14px] leading-tight text-[#0b1e3a]">
                      {title}
                    </b>
                    {sub && (
                      <span className="text-[12px] leading-tight text-[#5a6b85]">
                        {sub}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}

/* ---------------------------------------------------------------- games */

export function ClubGames() {
  const games = [
    {
      to: "/fantacalcio",
      title: "Fantacalcio SCD",
      text: "Scegli i tuoi 11 tra i giocatori del club e sfida gli altri tifosi. Gratis.",
    },
    {
      to: "/top11",
      title: "Top 11",
      text: "Ogni settimana vota i migliori in campo di tutte le squadre.",
    },
  ] as const;
  return (
    <section aria-labelledby="giochi-t" data-testid="club-games">
      <SectionTitle id="giochi-t">Giochi del club</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {games.map((g) => (
          <Link
            key={g.to}
            to={g.to}
            className="scd-focus grid content-start gap-1 rounded-[18px] bg-white px-4 py-3.5 shadow-[0_2px_12px_rgb(11_42_91/0.08)] hover:bg-[#f4f7fb]"
          >
            <b className="text-[16px] leading-tight text-[#0b2a5b]">
              {g.title}
            </b>
            <span className="text-[13.5px] leading-snug text-[#3e5272]">
              {g.text}
            </span>
            <span className="mt-1 inline-flex items-center gap-0.5 text-[14px] font-semibold text-[#1556c4]">
              Gioca
              <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- sponsors */

export function SponsorRow({
  sponsors,
  total,
}: {
  sponsors: readonly Sponsor[];
  total: number;
}) {
  return (
    <section aria-labelledby="sponsor-t" data-testid="sponsor-row">
      <SectionTitle
        id="sponsor-t"
        more="/sponsor"
        moreLabel={`Tutti (${total})`}
      >
        Sponsor e partner
      </SectionTitle>
      <Card className="p-3">
        <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
          {sponsors.map((s) => (
            <li key={s.slug}>
              <span className="grid h-[64px] place-items-center rounded-[12px] border border-[#e6edf6] bg-white p-2">
                <img
                  src={s.src}
                  alt={sponsorLabel(s)}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  Newspaper,
  PenSquare,
  Shirt,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";

/**
 * Tifosi (ex "Community"): the old wall, polls and quiz placeholders are gone. Every entry here opens a feature that
 * works today: the moderated club feed and post composer (r86/r87), Top 11 (r90), Fantacalcio (r92), the press
 * review (r91) and team pages to follow. No contests with money, no fake content.
 */
export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Tifosi — S.C.D. ColicoDerviese" },
      {
        name: "description",
        content:
          "La parte dei tifosi della S.C.D. ColicoDerviese: segui le squadre, pubblica, vota la Top 11 e gioca al Fantacalcio SCD.",
      },
      { property: "og:title", content: "Tifosi — S.C.D. ColicoDerviese" },
    ],
  }),
  component: Tifosi,
});

interface Door {
  to: string;
  title: string;
  text: string;
  icon: ReactNode;
  bg: string;
  fg: string;
}

const DOORS: readonly Door[] = [
  {
    to: "/fantacalcio",
    title: "Fantacalcio SCD",
    text: "Scegli 11 giocatori di Prima, Juniores, U16 e U15. Punti dalle partite vere.",
    icon: <Shirt className="size-7" aria-hidden="true" />,
    bg: "linear-gradient(135deg,#2f8f4e,#1f6e3a)",
    fg: "#ffffff",
  },
  {
    to: "/top11",
    title: "Top 11 della settimana",
    text: "Votano i tesserati: tre voti a testa ai giocatori delle squadre agonistiche. Esce il lunedì.",
    icon: <Trophy className="size-7" aria-hidden="true" />,
    bg: "#0b2a5b",
    fg: "#ffffff",
  },
  {
    to: "/squadre",
    title: "Segui le squadre",
    text: "Dalla Prima Squadra ai Piccoli Amici: notizie, gare e foto della tua squadra.",
    icon: <Users className="size-7" aria-hidden="true" />,
    bg: "#ffd600",
    fg: "#0b2a5b",
  },
  {
    to: "/crea",
    title: "Pubblica un post",
    text: "Foto e messaggi dalla partita. Le regole di tutela li controllano in automatico.",
    icon: <PenSquare className="size-7" aria-hidden="true" />,
    bg: "#1556c4",
    fg: "#ffffff",
  },
  {
    to: "/rassegna-stampa",
    title: "Dicono di noi",
    text: "I titoli delle testate che parlano della società, di Colico e di Dervio.",
    icon: <Newspaper className="size-7" aria-hidden="true" />,
    bg: "#ffffff",
    fg: "#0b2a5b",
  },
  {
    to: "/",
    title: "Dal club",
    text: "Il feed della società: notizie, risultati e foto, in ordine di tempo.",
    icon: <Bell className="size-7" aria-hidden="true" />,
    bg: "#ffffff",
    fg: "#0b2a5b",
  },
];

function Tifosi() {
  return (
    <main
      data-screen="tifosi"
      className="min-h-dvh bg-[#eef3f9] pb-28 text-[#0b1e3a]"
    >
      <header className="relative isolate overflow-hidden bg-[#062a66] text-white">
        <img
          src="/media/scd/hero-colico.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 size-full object-cover object-[center_45%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(4_26_70/0.85),rgb(6_42_102/0.92))]"
        />
        <div
          aria-hidden="true"
          className="absolute -left-10 -top-6 -z-10 h-36 w-36 rotate-[-35deg] bg-[repeating-linear-gradient(90deg,var(--uv-gold)_0_10px,transparent_10px_22px)] opacity-80"
        />
        <div className="relative mx-auto flex max-w-[960px] items-center gap-4 px-4 pb-7 pt-6">
          <ClubCrestOfficial size={72} />
          <div>
            <h1 className="m-0 font-uv text-[44px] uppercase leading-none lg:text-[60px]">
              Tifosi <span className="text-[var(--uv-gold)]">SCD</span>
            </h1>
            <p className="m-0 mt-2 max-w-[44ch] text-[15px] text-white/90 lg:text-[18px]">
              Il posto di chi tifa ColicoDerviese: segui, pubblica, vota e
              gioca. Tutto gratis.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[960px] gap-3 px-3 pt-4 sm:grid-cols-2">
        {DOORS.map((d) => (
          <Link
            key={d.to}
            to={d.to}
            className="scd-focus flex min-h-[112px] items-start gap-3 rounded-[20px] p-4 shadow-[0_6px_20px_-10px_rgb(6_42_99/0.35)]"
            style={{ background: d.bg, color: d.fg }}
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-black/10">
              {d.icon}
            </span>
            <span className="grid gap-1">
              <b className="font-uv text-[24px] uppercase leading-none">
                {d.title}
              </b>
              <span className="text-[14px] leading-snug opacity-90">
                {d.text}
              </span>
            </span>
          </Link>
        ))}
      </div>

      <p className="mx-auto mt-4 flex max-w-[960px] items-start gap-2 px-4 text-[13px] leading-[1.45] text-[#22385c]">
        <ShieldCheck
          className="size-[18px] shrink-0 text-[#1e7fd8]"
          aria-hidden="true"
        />
        Niente scommesse e niente premi in denaro. I ragazzi minorenni compaiono
        solo con nome e iniziale; i contenuti passano dalle regole automatiche
        di tutela del club.
      </p>
    </main>
  );
}

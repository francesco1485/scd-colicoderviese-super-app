import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  LogIn,
  Newspaper,
  PenSquare,
  Shirt,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { TONES, type Tone } from "@/components/home/tones";
import { METAL_CARD, METAL_LABEL, METAL_WRAP, MetalHeading, MetalPageHeader } from "@/components/scd/MetalPageHeader";
import { PUBLIC_PAGES, pageHead } from "@/lib/share";

/**
 * Comunità (Tifosi SCD) in the SCD METAL "via di mezzo" style of the home (16/10/2026): compact navy band, then the
 * doors grouped by what you do — Gioca (sole), Segui (azzurro), Partecipa (navy) — as rows, not a wall of coloured
 * cards; desktop has the community rules and the next steps in the right column. Every entry opens a feature that
 * works today: the moderated club feed and post composer (r86/r87), Top 11 (r90, UD-094/UD-137), Fantacalcio (r92), the
 * press review (r91) and team pages to follow. No contests with money, no fake content, no photo of the pitch.
 */
export const Route = createFileRoute("/community")({
  head: () => pageHead(PUBLIC_PAGES.community),
  component: Tifosi,
});

interface Door {
  to: string;
  title: string;
  text: string;
  /** Short rule lines shown under the text (who can play, how minors appear). */
  rules?: readonly string[];
  icon: ReactNode;
}

interface DoorGroup {
  id: "gioca" | "segui" | "partecipa";
  title: string;
  sub: string;
  tone: Tone;
  doors: readonly Door[];
}

const DOOR_GROUPS: readonly DoorGroup[] = [
  {
    id: "gioca",
    title: "Gioca",
    sub: "Solo punti e onore: niente scommesse, niente premi in denaro",
    tone: "sole",
    doors: [
      {
        to: "/fantacalcio",
        title: "Fantacalcio SCD",
        text: "Scegli 11 giocatori di Prima, Juniores, U16 e U15. Punti dalle partite vere.",
        rules: ["Gratis, per tutte le età", "Sotto i 14 anni con l'account della famiglia", "Attività di base esclusa"],
        icon: <Shirt className="size-5" aria-hidden="true" />,
      },
      {
        to: "/top11",
        title: "Top 11 della settimana",
        text: "Tre voti a testa ai giocatori delle squadre agonistiche. Esce il lunedì.",
        rules: ["Solo squadre agonistiche", "Giocatori con nome e iniziale", "Per votare serve un account del club"],
        icon: <Trophy className="size-5" aria-hidden="true" />,
      },
    ],
  },
  {
    id: "segui",
    title: "Segui",
    sub: "Squadre, notizie e quello che si dice del club",
    tone: "azzurro",
    doors: [
      {
        to: "/squadre",
        title: "Segui le squadre",
        text: "Dalla Prima Squadra ai Piccoli Amici: notizie, gare e foto della tua squadra.",
        icon: <Users className="size-5" aria-hidden="true" />,
      },
      {
        to: "/",
        title: "Dal club",
        text: "Il feed della società: notizie, risultati e foto, in ordine di tempo.",
        icon: <Bell className="size-5" aria-hidden="true" />,
      },
      {
        to: "/rassegna-stampa",
        title: "Dicono di noi",
        text: "I titoli delle testate che parlano della società, di Colico e di Dervio.",
        icon: <Newspaper className="size-5" aria-hidden="true" />,
      },
    ],
  },
  {
    id: "partecipa",
    title: "Partecipa",
    sub: "Racconta la partita insieme agli altri tifosi",
    tone: "navy",
    doors: [
      {
        to: "/crea",
        title: "Pubblica un post",
        text: "Foto e messaggi dalla partita. Le regole di tutela li controllano in automatico.",
        icon: <PenSquare className="size-5" aria-hidden="true" />,
      },
    ],
  },
];

/** Left bar, icon tile and kicker ink per tone, on the white page (contrast >= 4.5:1). */
const TONE_ROW: Readonly<Record<Tone, { bar: string; tile: string; ink: string }>> = {
  sole: { bar: "bg-[#ffd23f]", tile: TONES.sole.band, ink: "text-[#7a5800]" },
  azzurro: { bar: "bg-[#1266b8]", tile: TONES.azzurro.band, ink: "text-[#0457af]" },
  navy: { bar: "bg-[#13254d]", tile: "scd-band text-[#ffd23f]", ink: "text-[#13254d]" },
};

function Tifosi() {
  return (
    <main data-screen="tifosi" className="pb-28 text-[#0b1e3a] lg:pb-12">
      <MetalPageHeader kicker="Tifosi ColicoDerviese" title="Comunità" testId="community-header">
        Il posto di chi tifa ColicoDerviese: segui, pubblica, vota e gioca. Tutto gratis.
      </MetalPageHeader>
      <div className={`${METAL_WRAP} grid grid-cols-[minmax(0,1fr)] gap-5 pt-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:pt-6`}>
        <div className="grid min-w-0 content-start gap-6 lg:gap-8">
          {DOOR_GROUPS.map((g) => (
            <section key={g.id} id={g.id} aria-labelledby={`community-${g.id}-t`} className="scroll-mt-20" data-testid={`community-${g.id}`}>
              <MetalHeading id={`community-${g.id}-t`} sub={g.sub}>
                {g.title}
              </MetalHeading>
              <ul className={`${METAL_CARD} m-0 list-none px-3 pb-1 pt-2 lg:px-4`}>
                {g.doors.map((d) => (
                  <DoorRow key={d.to} door={d} tone={g.tone} />
                ))}
              </ul>
            </section>
          ))}
        </div>
        <CommunitySide />
      </div>
    </main>
  );
}

function DoorRow({ door, tone }: { door: Door; tone: Tone }) {
  const t = TONE_ROW[tone];
  return (
    <li className="border-t border-[#edf1f7] first:border-t-0">
      <Link to={door.to} className="scd-focus group flex items-stretch gap-3 rounded-md py-3" data-testid={`community-door-${door.to === "/" ? "feed" : door.to.slice(1)}`}>
        <span aria-hidden="true" className={`w-[4px] shrink-0 self-stretch rounded-full ${t.bar}`} />
        <span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-[10px] ${t.tile}`}>
          {door.icon}
        </span>
        <span className="grid min-w-0 flex-1 content-start gap-0.5">
          <b className="font-display text-[18px] font-bold leading-tight text-[#14264d]">{door.title}</b>
          <span className="text-[14px] leading-snug text-[#52627f]">{door.text}</span>
          {door.rules && (
            <span className="mt-1 flex flex-wrap gap-1.5">
              {door.rules.map((r) => (
                <span key={r} className={`rounded-[4px] bg-[#f3f5f9] px-2 py-0.5 font-display text-[12px] font-semibold ${t.ink}`}>
                  {r}
                </span>
              ))}
            </span>
          )}
        </span>
        <ChevronRight className="size-5 shrink-0 self-center text-[#7a8aa8] group-hover:text-[#0457af]" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** Right column (desktop) / end of page (phone): the community rules and the account needed to vote. */
function CommunitySide() {
  return (
    <aside className="grid content-start gap-4" aria-label="Regole e account" data-testid="community-side">
      <div className={`${METAL_CARD} grid gap-2 p-4`} data-testid="community-account">
        <span className={`${METAL_LABEL} text-[#0457af]`}>Per votare la Top 11</span>
        <p className="m-0 font-display text-[18px] font-bold leading-tight text-[#14264d]">Serve un account del club</p>
        <p className="m-0 text-[13px] leading-snug text-[#52627f]">
          È gratis. Per il Fantacalcio, sotto i 14 anni si gioca con l'account della famiglia.
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Link to="/registrati" className="scd-gold scd-focus inline-flex min-h-11 items-center rounded-[10px] px-4 font-display text-[15px] font-semibold" data-testid="community-join">
            Registrati gratis
          </Link>
          <Link to="/accedi" className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-[#c3cee0] bg-white px-4 font-display text-[15px] font-semibold text-[#13254d] hover:bg-[#eef2f8]">
            <LogIn className="size-4" aria-hidden="true" />
            Entra
          </Link>
        </div>
      </div>
      <div className={`${METAL_CARD} grid gap-2 p-4`} data-testid="community-rules">
        <span className={`${METAL_LABEL} flex items-center gap-1.5 text-[#52627f]`}>
          <ShieldCheck className="size-4 text-[#1266b8]" aria-hidden="true" />
          Le regole della comunità
        </span>
        <ul className="m-0 grid list-disc gap-1 pl-5 text-[13px] leading-[1.45] text-[#22385c]">
          <li>Niente scommesse e niente premi in denaro.</li>
          <li>I ragazzi minorenni compaiono solo con nome e iniziale.</li>
          <li>Per l'attività di base non ci sono classifiche individuali.</li>
          <li>Post e foto passano dalle regole automatiche di tutela del club.</li>
        </ul>
      </div>
      <Link to="/eventi" className={`${METAL_CARD} scd-focus group flex min-h-11 items-center gap-3 p-4 hover:border-[#0457af]`} data-testid="community-eventi">
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className={`${METAL_LABEL} text-[#0457af]`}>Vieni al campo</span>
          <span className="font-display text-[16px] font-bold leading-tight text-[#14264d]">Eventi e tornei del club</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-[#7a8aa8] group-hover:text-[#0457af]" aria-hidden="true" />
      </Link>
    </aside>
  );
}

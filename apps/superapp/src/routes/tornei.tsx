import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BedDouble,
  CalendarCheck,
  CalendarDays,
  Camera,
  Castle,
  Church,
  ClipboardList,
  ExternalLink,
  Handshake,
  MapPin,
  Mountain,
  Sailboat,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { METAL_CARD, METAL_LABEL, METAL_WRAP, MetalHeading } from "@/components/scd/MetalPageHeader";
import { CastAskButton } from "@/components/scd/CastPresence";
import { EneaGuide } from "@/components/scd/EneaGuide";
import { PosterZoom } from "@/components/scd/PosterZoom";
import { ShareButton } from "@/components/scd/ShareButton";
import { ClubCrestOfficial } from "@/components/SiteChrome";
import { confirmedCount } from "@/lib/events";
import { INTAKE_TOURNAMENT_IDS } from "@/lib/intake-kinds";
import { intakeLink } from "@/lib/intake-links";
import { getActiveInitiatives } from "@/lib/initiatives.functions";
import { romeDay } from "@/lib/public-window";
import { pageHead, SHARE_PAGES } from "@/lib/share";
import {
  LAKE_FACTS,
  countdownView,
  sameDayEditions,
  serviceFacts,
  tournamentBoard,
  type LakeFact,
} from "@/lib/tournament-hub";
import {
  TOURNAMENT_STATUS_LABEL,
  type TournamentEdition,
  type TournamentServiceId,
} from "@/lib/tournaments";

/**
 * Tornei hub (UD-110; Francesco 17/10/2026 08:22 «migliorala… renderla attrattiva»). Engine: PERSONE + SOLDI.
 * Measured by: presses on «Iscrivi la squadra» and «Condividi» per tournament, partner proposals with pacchetto=tornei.
 *
 * - hero: the next published tournament with a live countdown (server time first, so SSR and hydration match), the
 *   one primary action «Iscrivi la squadra» (the tournament's existing registration section) and share;
 * - Enea, master guide (UD-149): one reason + one action, rotating, dismissible, reduced motion respected;
 * - one card per published tournament: annate chips in a row, the six service icons (unknown = «da confermare»),
 *   confirmed guest teams («la tua squadra c'è?»), the official poster once as a thumbnail that enlarges;
 *   «Iscrivi la squadra» opens the organiser's public site in a new tab when registrations live there
 *   (Memorial José Nasazzi 2027, `registerUrl`), otherwise the tournament's internal registration section;
 * - «Modulo d'iscrizione SCD» (Francesco 17/10/2026 00:08 «modulo … esterno pronto nella zona iscrizioni nella piattaforma
 *   tornei»): the single public Tally form (UD-163) prefilled with tipo=torneo and the tournament id, next to the
 *   registration action of every tournament the form knows; hidden while the form is not configured;
 * - tournaments without a published programme: one compact «In arrivo» row each, never an empty trophy card;
 * - «Vivi il Lago»: verified facts about Colico, Forte Montecchio Nord, Dervio and the lake (lib/tournament-hub.ts).
 * No minors' names, no faces, no results: guest teams are club names from the official posters.
 */
export const Route = createFileRoute("/tornei")({
  // Server Rome day (never the visitor's clock) decides which tournaments are still to come; serverNow seeds the
  // countdown so the first client render equals the server one.
  loader: async () => {
    const { today } = await getActiveInitiatives().catch(() => ({
      today: romeDay(Date.now()),
    }));
    return { today, serverNow: Date.now() };
  },
  head: () => pageHead(SHARE_PAGES.tornei),
  component: TorneiPage,
});

const SERVICE_ICON: Readonly<Record<TournamentServiceId, LucideIcon>> = {
  partite: CalendarCheck,
  ristorazione: UtensilsCrossed,
  "foto-video": Camera,
  organizzazione: ClipboardList,
  ospitalita: BedDouble,
  territorio: Mountain,
};

const LAKE_ICON: Readonly<Record<LakeFact["id"], LucideIcon>> = {
  colico: Church,
  montecchio: Castle,
  dervio: MapPin,
  lago: Sailboat,
};

const pad = (n: number) => String(n).padStart(2, "0");
const GOLD_CTA =
  "scd-gold scd-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] px-5 font-display text-[16px] font-bold";

function useNow(serverNow: number) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

function RegisterLink({ t, className = GOLD_CTA }: { t: TournamentEdition; className?: string }) {
  if (t.registerUrl?.startsWith("https://"))
    return (
      <a
        href={t.registerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        data-testid={`tornei-iscrivi-${t.id}`}
      >
        Iscrivi la squadra
        <ExternalLink className="size-5" aria-hidden="true" />
        <span className="sr-only">(sito dell'organizzatore Sport Pro Experience, si apre in una nuova scheda)</span>
      </a>
    );
  if (!t.link) return null;
  return (
    <Link
      to={t.link.to as never}
      {...(t.link.hash ? { hash: t.link.hash } : {})}
      className={className}
      data-testid={`tornei-iscrivi-${t.id}`}
    >
      Iscrivi la squadra
      <ArrowRight className="size-5" aria-hidden="true" />
    </Link>
  );
}

/** Link to the club's public registration form for one tournament (null when the form or the id is not known). */
function IntakeFormLink({ t, light = false, place = "card" }: { t: TournamentEdition; light?: boolean; place?: "hero" | "card" | "coming" }) {
  if (!(INTAKE_TOURNAMENT_IDS as readonly string[]).includes(t.id)) return null;
  const link = intakeLink("ISCRIZIONE_TORNEO", { torneo: t.id });
  if (!link.href) return null;
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[12px] px-4 font-display text-[15px] font-semibold ${
        light ? "text-[#0457af] shadow-[inset_0_0_0_2px_#0457af]" : "text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.6)]"
      }`}
      data-testid={`tornei-modulo-${place}-${t.id}`}
    >
      <ClipboardList className="size-4" aria-hidden="true" />
      Modulo d'iscrizione SCD
      <span className="sr-only">(si apre in una nuova scheda)</span>
    </a>
  );
}

function Countdown({ startAt, serverNow }: { startAt: string | undefined; serverNow: number }) {
  const now = useNow(serverNow);
  const v = countdownView(now, startAt);
  if (!v) return null;
  if (!v.parts)
    return (
      <p className="m-0 font-display text-[22px] font-bold text-[#ffd84a]" data-testid="tornei-countdown">
        Si gioca adesso
      </p>
    );
  const units: Array<[number, string]> = [
    [v.parts.d, "giorni"],
    [v.parts.h, "ore"],
    [v.parts.m, "min"],
    [v.parts.s, "sec"],
  ];
  return (
    <div data-testid="tornei-countdown">
      <p className="sr-only">{v.words} al via</p>
      <div className="grid max-w-[340px] grid-cols-4 gap-1.5" aria-hidden="true">
        {units.map(([n, u]) => (
          <span key={u} className="grid justify-items-center rounded-[10px] bg-white/10 py-2 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]">
            <b className="font-display text-[28px] font-bold leading-none tabular-nums text-white lg:text-[34px]">{u === "giorni" ? n : pad(n)}</b>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#cfdcf5]">{u}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Hero({ hero, editions, serverNow }: { hero: TournamentEdition | null; editions: TournamentEdition[]; serverNow: number }) {
  const confirmed = hero?.id.startsWith("christmas-lario-cup") ? confirmedCount() : 0;
  return (
    <header className="scd-band relative overflow-hidden text-white lg:-mr-12 2xl:mr-0" data-hero="tornei" data-testid="tornei-hero">
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(55%_120%_at_92%_0%,rgb(255_216_74/0.18),transparent_70%),radial-gradient(45%_100%_at_0%_100%,rgb(127_208_255/0.18),transparent_70%)]" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,#8ea2c6,#ffffff_22%,#b8c5dd_50%,#ffffff_78%,#8ea2c6)]" />
      <div className={`${METAL_WRAP} relative grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10 lg:py-8`}>
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <ClubCrestOfficial size={46} className="shrink-0 drop-shadow-[0_8px_16px_rgb(0_0_0/0.45)] lg:hidden" />
            <ClubCrestOfficial size={64} className="hidden shrink-0 drop-shadow-[0_8px_16px_rgb(0_0_0/0.45)] lg:block" />
            <div className="grid gap-0.5">
              <span className={`${METAL_LABEL} text-[#ffd84a]`}>Tornei della S.C.D. ColicoDerviese</span>
              <h1 className="m-0 font-display text-[28px] font-bold uppercase leading-[1] lg:text-[40px]">
                {hero ? "Il prossimo torneo" : "I nostri tornei"}
              </h1>
            </div>
          </div>
          {hero ? (
            <>
              <div className="grid gap-1">
                <span className="w-fit rounded-full bg-[#ffd84a] px-2.5 py-1 text-[11.5px] font-extrabold uppercase leading-none tracking-[0.06em] text-[#13254d]">
                  {TOURNAMENT_STATUS_LABEL[hero.status]}
                </span>
                <p className="m-0 font-display text-[32px] font-bold uppercase leading-[0.95] text-white lg:text-[52px]" data-testid="tornei-hero-name">
                  {hero.name}
                </p>
                <p className="m-0 text-[15px] font-semibold text-[#e6eefb] lg:text-[17px]">
                  {hero.when}
                  {editions.length > 1 && (
                    <span className="block font-normal text-[#cfdcf5]">
                      {editions.map((e) => `${e.section} a ${(e.place ?? "").split(" · ")[0]!.replace(" (LC)", "")}`).join(" · ")}
                    </span>
                  )}
                </p>
              </div>
              <Countdown startAt={hero.startAt} serverNow={serverNow} />
              {confirmed > 0 && (
                <p className="m-0 text-[14.5px] leading-snug text-[#e6eefb]" data-testid="tornei-hero-confirmed">
                  <b className="font-display text-[20px] text-[#ffd84a]">{confirmed}</b> squadre già confermate sulle locandine ufficiali.{" "}
                  <span className="font-semibold text-white">La tua squadra c'è?</span>
                </p>
              )}
            </>
          ) : (
            <p className="m-0 max-w-[52ch] text-[15px] leading-snug text-[#dbe5f7]">
              Le date dei prossimi tornei compaiono qui appena la società le pubblica.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {hero && <RegisterLink t={hero} />}
          {hero && <IntakeFormLink t={hero} place="hero" />}
          {/* The hub is shared from the hero; each card shares its own tournament page. */}
          <ShareButton page={SHARE_PAGES.tornei} />
        </div>
      </div>
      {hero && intakeLink("ISCRIZIONE_TORNEO").available && (
        <p className="m-0 mt-3 max-w-[60ch] text-[13.5px] leading-snug text-[#dbe5f7]" data-testid="tornei-modulo-nota">
          Il «Modulo d'iscrizione SCD» è la richiesta alla nostra società (iscrizione, ospitalità, informazioni): ti ricontattiamo noi.
          Dove c'è un organizzatore esterno, l'iscrizione è confermata quando lui la registra.
        </p>
      )}
    </header>
  );
}

function Services({ t }: { t: TournamentEdition }) {
  return (
    <ul className="m-0 grid list-none grid-cols-3 gap-1.5 p-0 sm:grid-cols-6 xl:grid-cols-3" aria-label="Servizi del torneo" data-testid="tornei-services">
      {serviceFacts(t).map((s) => {
        const Icon = SERVICE_ICON[s.id];
        return (
          <li
            key={s.id}
            className={`grid content-start justify-items-center gap-1 rounded-[10px] px-1 py-2 text-center ${s.confirmed ? "bg-[#eef4fc]" : "border border-dashed border-[#c3cee0] bg-white"}`}
            data-confirmed={s.confirmed ? "true" : "false"}
            title={s.text}
          >
            <span aria-hidden="true" className={`grid size-9 place-items-center rounded-full ${s.confirmed ? "bg-[#13254d] text-[#ffd84a]" : "bg-[#eef2f8] text-[#52627f]"}`}>
              <Icon className="size-[18px]" strokeWidth={2} />
            </span>
            <span className="text-[12px] font-bold leading-tight text-[#14264d]">{s.label}</span>
            <span className={`text-[11px] leading-tight ${s.confirmed ? "text-[#3d4f70]" : "font-semibold text-[#5a6b85]"}`}>{s.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function TournamentCard({ t }: { t: TournamentEdition }) {
  const sharePage = t.shareKey ? SHARE_PAGES[t.shareKey] : SHARE_PAGES.tornei;
  return (
    <article id={t.id} aria-labelledby={`${t.id}-t`} className={`${METAL_CARD} grid scroll-mt-24 gap-3 p-4 lg:p-5`} data-testid="tournament" data-status={t.status}>
      <div className="flex gap-3">
        {t.poster && <PosterZoom src={t.poster.src} alt={t.poster.alt} caption={`${t.name} · ${t.section}`} className="h-[124px] w-[92px] shrink-0 lg:h-[150px] lg:w-[112px]" />}
        <div className="grid min-w-0 content-start gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-[#13254d] px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] text-white">{t.section}</span>
            <span className="rounded-full bg-[#ffd84a] px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] text-[#13254d]">{TOURNAMENT_STATUS_LABEL[t.status]}</span>
          </div>
          <h3 id={`${t.id}-t`} className="m-0 font-display text-[22px] font-bold uppercase leading-[1] text-[#14264d] lg:text-[26px]">
            {t.name}
          </h3>
          <p className="m-0 flex items-start gap-1.5 text-[13.5px] leading-snug text-[#24385a]">
            <CalendarDays className="mt-[2px] size-4 shrink-0 text-[#0457af]" aria-hidden="true" />
            {t.when}
          </p>
          {t.place && (
            <p className="m-0 flex items-start gap-1.5 text-[13.5px] leading-snug text-[#24385a]">
              <MapPin className="mt-[2px] size-4 shrink-0 text-[#0457af]" aria-hidden="true" />
              {t.place}
            </p>
          )}
        </div>
      </div>

      <p className="m-0 text-[14px] leading-snug text-[#24385a]">{t.text}</p>

      {t.annate && t.annate.length > 0 && (
        <div>
          <p className={`${METAL_LABEL} m-0 pb-1.5 text-[#52627f]`}>Categorie</p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0" data-testid="tornei-annate">
            {t.annate.map((a) => (
              <li key={a.big} className="flex shrink-0 items-center gap-2 rounded-[10px] bg-[#13254d] py-1.5 pl-2 pr-3 text-white">
                <b className="font-display text-[22px] font-bold leading-none text-[#ffd84a]">{a.big}</b>
                <span className="max-w-[170px] text-[12px] leading-tight text-[#e6eefb]">{a.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Services t={t} />

      {t.confirmedTeams.length > 0 && (
        <div>
          <p className={`${METAL_LABEL} m-0 pb-1.5 text-[#52627f]`}>
            Squadre confermate · <span className="text-[#0457af]">la tua squadra c'è?</span>
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" data-testid="tornei-teams">
            {t.confirmedTeams.map((n) => (
              <li key={n} className="rounded-full border border-[#d6deeb] bg-white px-2.5 py-1 text-[13px] font-semibold text-[#14264d]">
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-[#edf1f7] pt-3">
        <RegisterLink t={t} />
        <IntakeFormLink t={t} light />
        <ShareButton page={sharePage} tone="light" />
      </div>
      <p className="m-0 text-[11.5px] text-[#5b6b85]">Fonte: {t.source}</p>
    </article>
  );
}

function ComingList({ list }: { list: TournamentEdition[] }) {
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="tornei-arrivo-t" className="scroll-mt-24" data-testid="tornei-in-arrivo">
      <MetalHeading id="tornei-arrivo-t" sub="Tornei del club con programma non ancora pubblicato">
        In arrivo
      </MetalHeading>
      <ul className={`${METAL_CARD} m-0 list-none px-4 pb-1 pt-2 lg:px-5`}>
        {list.map((t) => (
          <li key={t.id} id={t.id} className="flex scroll-mt-24 flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#edf1f7] py-3 first:border-t-0" data-testid="tournament-coming">
            <span aria-hidden="true" className="w-[4px] self-stretch rounded-full bg-[#ffd23f]" />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <b className="font-display text-[17px] font-bold leading-tight text-[#14264d]">{t.name}</b>
              <span className="text-[13px] leading-snug text-[#52627f]">
                {t.section} · {t.when ?? "date da confermare"}
              </span>
            </span>
            <span className="rounded-full bg-[#eef2f8] px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] text-[#13254d]">
              {TOURNAMENT_STATUS_LABEL[t.status]}
            </span>
            <IntakeFormLink t={t} light place="coming" />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link to="/contatti" className="scd-focus inline-flex min-h-11 items-center gap-1 rounded-md font-display text-[15px] font-semibold text-[#0457af]">
          La tua società vuole esserci? Scrivici
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <CastAskButton area="mentore-tornei" tone="quiet" />
      </div>
    </section>
  );
}

/** Mountains, lake and the yellow shore line (decoration only, same drawing language as the access screens). */
function LakeArt() {
  return (
    <svg viewBox="0 0 390 120" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[120px] w-full opacity-90">
      <path d="M0 70 L50 34 L95 58 L150 14 L205 54 L260 26 L320 60 L390 36 L390 120 L0 120Z" fill="#0f5aa8" opacity=".55" />
      <path d="M0 92 C 120 82, 260 88, 390 80 L390 120 L0 120Z" fill="#0b4f9e" />
      <path d="M0 104 C 130 96, 270 100, 390 92 L390 97 C 270 105, 130 103, 0 110Z" fill="#ffd84a" />
    </svg>
  );
}

function LakeBand() {
  return (
    <section aria-labelledby="vivi-lago-t" className="scd-band-azzurro relative isolate overflow-hidden rounded-[14px] px-4 pb-[120px] pt-5 text-white lg:px-6 lg:pb-[110px]" data-testid="tornei-lago">
      <LakeArt />
      <span className={`${METAL_LABEL} text-[#ffe27a]`}>Per chi viene da fuori</span>
      <h2 id="vivi-lago-t" className="m-0 mt-0.5 font-display text-[26px] font-bold uppercase leading-none lg:text-[32px]">
        Vivi il Lago
      </h2>
      <p className="m-0 mt-1 max-w-[60ch] text-[14.5px] leading-snug text-[#eaf3fd]">
        Tra una partita e l'altra, a pochi minuti dai campi di Colico e Dervio.
      </p>
      <ul className="m-0 mt-4 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {LAKE_FACTS.map((f) => {
          const Icon = LAKE_ICON[f.id];
          return (
            <li key={f.id} className="flex gap-3 rounded-[12px] bg-white/10 p-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]">
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#0b4f9e]">
                <Icon className="size-5" strokeWidth={2} />
              </span>
              <span className="grid gap-0.5">
                <b className="font-display text-[17px] font-bold leading-tight">{f.title}</b>
                <span className="text-[13.5px] leading-snug text-[#eaf3fd]">{f.text}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="relative m-0 mt-3 text-[11.5px] text-[#dcebfb]">Fonti: {LAKE_FACTS.map((f) => f.source).join(" · ")}.</p>
    </section>
  );
}

function PartnerBand() {
  return (
    <section aria-labelledby="tornei-partner-t" className="scd-band-sole relative overflow-hidden rounded-[14px] p-5 lg:flex lg:items-center lg:justify-between lg:gap-6" data-testid="tornei-partner">
      <Handshake className="absolute -right-3 -top-3 size-28 text-[#13254d]/10" aria-hidden="true" />
      <div className="relative">
        <span className={`${METAL_LABEL} text-[#034a96]`}>Aziende del territorio</span>
        <h2 id="tornei-partner-t" className="m-0 mt-0.5 font-display text-[24px] font-bold uppercase leading-none">
          Il tuo marchio sui tornei
        </h2>
        <p className="m-0 mt-1.5 max-w-[56ch] text-[14.5px] leading-snug text-[#1c2c50]">
          Title partner, naming di un campo, premio fair play e uno spazio nel villaggio: la società prepara una proposta su misura.
        </p>
      </div>
      <Link
        to="/sponsor"
        search={{ pacchetto: "tornei" }}
        hash="proposta"
        className="scd-navy-btn scd-focus relative mt-3 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-display text-[15px] font-semibold lg:mt-0"
      >
        Richiedi una proposta
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function TorneiPage() {
  const { today, serverNow } = Route.useLoaderData();
  const { hero, published, coming } = tournamentBoard(today);
  const editions = sameDayEditions(hero, published);
  return (
    <main data-screen="tornei" className="pb-10 text-[#14264d]">
      <Hero hero={hero} editions={editions} serverNow={serverNow} />
      <div className={`${METAL_WRAP} grid gap-6 pt-4 lg:gap-8 lg:pt-6`}>
        <EneaGuide ctx="tornei" day={today} />
        {published.length > 0 && (
          <section aria-labelledby="calendario-tornei-t" data-testid="tornei-calendario">
            <MetalHeading id="calendario-tornei-t" sub="Date, categorie, servizi e squadre confermate">
              In calendario
            </MetalHeading>
            <div className="grid gap-4 xl:grid-cols-2">
              {published.map((t) => (
                <TournamentCard key={t.id} t={t} />
              ))}
            </div>
          </section>
        )}
        <ComingList list={coming} />
        <LakeBand />
        <PartnerBand />
      </div>
    </main>
  );
}

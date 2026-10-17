import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, HeartHandshake, Lightbulb, MonitorPlay } from "lucide-react";
import { useEffect, useState } from "react";

import { CastPresence } from "@/components/scd/CastPresence";
import { EneaGuide } from "@/components/scd/EneaGuide";
import { METAL_CARD, METAL_LABEL, METAL_WRAP, MetalHeading } from "@/components/scd/MetalPageHeader";
import { ShareButton } from "@/components/scd/ShareButton";
import { PartnerForm } from "@/components/PartnerForm";
import { PartnerPackages } from "@/components/PartnerPackages";
import { SponsorIdeas } from "@/components/SponsorIdeas";
import { SponsorWall } from "@/components/SponsorWall";
import { SponsorLedwallLive } from "@/components/SponsorLedwallLive";
import { SponsorProcess } from "@/components/SponsorProcess";
import { ClubCrestOfficial } from "@/components/SiteChrome";
import { romeDay } from "@/lib/public-window";
import { pageHead, SHARE_PAGES } from "@/lib/share";
import { parseChoiceParam } from "@/lib/sponsor-ideas";
import { reachFacts, reachValue } from "@/lib/sponsor-reach";

/**
 * /sponsor — «Diventa partner» (Francesco 17/10/2026 08:22: «la piattaforma sponsor… fa pietà… migliorala»; IDEE
 * I-261017-12; UD-149 Enea master guide). Engine: SOLDI. Measured by: proposals sent from #proposta per month and
 * the package chosen (?pacchetto=, submitPartnerLead register).
 *
 * Order: hero with the one action «Diventa partner» → Enea (one reason + one action) → why it pays (documented numbers
 * or «da confermare», lib/sponsor-reach.ts) → the partners already with us (lib/sponsors.ts, official logos in colour)
 * (tap a logo: its card, lib/sponsor-profiles.ts) → the LED wall live → the four packages as «idee di
 * sponsorizzazione» (lib/sponsor-packages.ts) with the three steps → «Idee da sponsorizzare» (lib/sponsor-ideas.ts)
 * → Sostieni → FAQ → the proposal form. Never a price, an amount, a discount or an audience number that is not
 * documented (Francesco 17/10/2026 09:42: «prezzi non esposti perché li fa al momento il Presidente»): where a price
 * would be, «Proposta su misura: la definisce il Presidente con te».
 */
export const Route = createFileRoute("/sponsor")({
  // ?pacchetto=<id>: a package or an idea preselected in the proposal form (only known ids: sponsor-packages.ts,
  // sponsor-ideas.ts).
  validateSearch: (s: Record<string, unknown>): { pacchetto?: string | undefined } => {
    const pacchetto = parseChoiceParam(s["pacchetto"]);
    return pacchetto ? { pacchetto } : {};
  },
  // Rome day of the server for Enea and the Volto sponsor presence: rendered on the server, reused on hydration.
  loader: () => ({ day: romeDay(Date.now()) }),
  head: () => pageHead(SHARE_PAGES.sponsor),
  component: Sponsor,
});

function SponsorHero() {
  return (
    <header className="scd-band relative overflow-hidden text-white lg:-mr-12 2xl:mr-0" data-hero="sponsor" data-testid="sponsor-hero">
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(55%_120%_at_92%_0%,rgb(255_216_74/0.2),transparent_70%),radial-gradient(50%_100%_at_0%_100%,rgb(127_208_255/0.18),transparent_70%)]" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,#8ea2c6,#ffffff_22%,#b8c5dd_50%,#ffffff_78%,#8ea2c6)]" />
      <div className={`${METAL_WRAP} relative grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10 lg:py-9`}>
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <ClubCrestOfficial size={46} className="shrink-0 drop-shadow-[0_8px_16px_rgb(0_0_0/0.45)] lg:hidden" />
            <ClubCrestOfficial size={64} className="hidden shrink-0 drop-shadow-[0_8px_16px_rgb(0_0_0/0.45)] lg:block" />
            <span className={`${METAL_LABEL} text-[#ffd84a]`}>Partner della S.C.D. ColicoDerviese · stagione 2026/27</span>
          </div>
          <h1 className="m-0 max-w-[18ch] font-display text-[34px] font-bold uppercase leading-[0.95] lg:text-[56px]">
            Il tuo marchio, dove <span className="text-[#ffd84a]">il Lario</span> si ritrova
          </h1>
          <p className="m-0 max-w-[58ch] text-[15px] leading-snug text-[#dbe5f7] lg:text-[17px]">
            A bordo campo a Colico, sulle maglie, ai tornei e nell'app del club: la tua azienda davanti a famiglie, ragazzi e tifosi di Colico e Dervio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <a href="#proposta" className="scd-gold scd-focus inline-flex min-h-12 items-center gap-2 rounded-[12px] px-5 font-display text-[16px] font-bold" data-testid="sponsor-hero-cta">
            Diventa partner
            <ArrowRight className="size-5" aria-hidden="true" />
          </a>
          <a href="#idee" className="scd-focus inline-flex min-h-12 items-center gap-2 rounded-[12px] bg-white/10 px-4 font-display text-[15px] font-semibold text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.45)] hover:bg-white/20">
            <Lightbulb className="size-5" aria-hidden="true" />
            Le idee
          </a>
          <a href="#ledwall" className="scd-focus inline-flex min-h-12 items-center gap-2 rounded-[12px] bg-white/10 px-4 font-display text-[15px] font-semibold text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.45)] hover:bg-white/20">
            <MonitorPlay className="size-5" aria-hidden="true" />
            Il LED wall
          </a>
          <ShareButton page={SHARE_PAGES.sponsor} />
        </div>
      </div>
    </header>
  );
}

function WhyItPays() {
  const facts = reachFacts();
  return (
    <section aria-labelledby="perche-t" data-testid="sponsor-reach">
      <MetalHeading id="perche-t" sub="Solo numeri documentati: quello che non abbiamo ancora misurato resta «da confermare»">
        Perché conviene
      </MetalHeading>
      <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 lg:grid-cols-4 lg:gap-3">
        {facts.map((f) => (
          <li key={f.id} className={`${METAL_CARD} grid content-start gap-1 p-3.5 lg:p-4`} data-reach={f.id} data-known={f.value ? "true" : "false"}>
            <b className={`font-display font-bold leading-none ${f.value ? `${f.value.length > 6 ? "text-[24px] lg:text-[32px]" : "text-[30px] lg:text-[38px]"} text-[#13254d]` : "text-[20px] uppercase text-[#0457af] lg:text-[24px]"}`}>{reachValue(f)}</b>
            <span className="text-[13.5px] leading-snug text-[#24385a]">{f.label}</span>
            <span className="text-[11.5px] leading-snug text-[#5b6b85]">Fonte: {f.source}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Sponsor() {
  const { day } = Route.useLoaderData();
  const { pacchetto } = Route.useSearch();
  const navigate = useNavigate({ from: "/sponsor" });
  const [pick, setPick] = useState<string | undefined>(pacchetto);
  // A link with ?pacchetto= while the page is open (Enea, the tornei page) preselects the package too.
  useEffect(() => {
    if (pacchetto) setPick(pacchetto);
  }, [pacchetto]);
  /** «Parliamone» on a package or idea: preselect in the form, keep it in the URL (shareable), scroll to the form. */
  const choose = (id: string) => {
    setPick(id);
    void navigate({ search: { pacchetto: id }, replace: true, resetScroll: false });
    const target = document.getElementById("proposta");
    if (!target) return;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true });
  };
  return (
    <main data-screen="sponsor" className="pb-10 text-[#14264d]">
      <SponsorHero />

      <div className={`${METAL_WRAP} grid gap-6 pt-4 lg:gap-8 lg:pt-6`}>
        <EneaGuide ctx="sponsor" day={day} />
        <WhyItPays />
        <SponsorWall />
      </div>

      {/* Francesco 16/10/2026 20:56 «mancano i ledwall per sponsor a rotazione sulla web app sponsor» (supersedes the
          15/10 "no rotating LED preview" for this page): the club LED wall, clock-synced with the physical board. */}
      <SponsorLedwallLive />

      <div className={`${METAL_WRAP} mt-10 grid gap-8 lg:mt-14 lg:gap-12`}>
        <PartnerPackages onChoose={choose} />

        <SponsorIdeas onChoose={choose} />

        <section className="scd-band-azzurro flex flex-col gap-3 rounded-[14px] p-5 text-white sm:flex-row sm:items-center" aria-labelledby="sostieni-title" data-testid="sponsor-sostieni">
          <HeartHandshake className="size-8 flex-none text-[#ffe27a]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className={`${METAL_LABEL} m-0 text-[#ffe27a]`}>Sostieni il club</p>
            <h2 id="sostieni-title" className="m-0 mt-0.5 font-display text-[21px] font-bold leading-tight">Adotta un oggetto o sostieni il Fondo Solidale</h2>
            <p className="m-0 mt-1 text-[14px] leading-snug text-[#eaf3fd]">Attrezzature, area giochi, tribuna, palestra e infermeria: la tua azienda può adottare qualcosa di cui il club ha bisogno, o dedicare una sponsorizzazione al Fondo Solidale.</p>
          </div>
          <Link to="/sostieni" className="scd-gold scd-focus inline-flex min-h-11 items-center justify-center rounded-[10px] px-4 font-display text-[15px] font-bold">Vedi cosa serve</Link>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
          <SponsorProcess steps={false} className="min-w-0" />
          {/* UD-121: the Volto sponsor face lives here (listino, "chiedi un pacchetto", "Chiedi a Vera"). */}
          <section id="volto-sponsor" aria-label="Il Volto sponsor" className="min-w-0 scroll-mt-20" data-testid="sponsor-volto">
            <CastPresence id="volto-sponsor" day={day} />
          </section>
        </div>

        <section id="proposta" tabIndex={-1} aria-labelledby="proposta-title" className="mx-auto w-full max-w-4xl scroll-mt-20 focus:outline-none">
          <p className={`${METAL_LABEL} m-0 text-[#0457af]`}>Diventa partner</p>
          <h2 id="proposta-title" className="m-0 mt-0.5 mb-4 font-display text-[26px] font-bold leading-tight text-[#14264d] lg:text-[32px]">Parliamo del tuo progetto</h2>
          <PartnerForm key={pick} tipo="sponsor" preselect={pick} />
          <p className="mt-4 text-sm text-[#52627f]">
            Sei un fornitore? <Link to="/fornitori" className="scd-focus inline-flex min-h-11 items-center font-semibold text-[#0457af] underline">Proponi prodotti o servizi alla SCD</Link>
          </p>
        </section>
      </div>
    </main>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, CreditCard, MapPin, Navigation, Ticket } from "lucide-react";

import { CastPresence } from "@/components/scd/CastPresence";
import { FacilityMap } from "@/components/scd/FacilityMap";
import { TicketRules } from "@/components/scd/TicketRules";
import { siteById, spaceById } from "@/lib/facilities";
import { siteMapsUrl } from "@/lib/maps-link";
import { romeDay } from "@/lib/public-window";
import { PUBLIC_PAGES, pageHead } from "@/lib/share";

/** Schematic plan of Colico sent by the Direzione on 13/10/2026 (FACILITY_PLAN in config/scd-assets.v1.json). */
const PIANTA_COLICO = "/media/scd/pianta-colico-2026.webp";

export const Route = createFileRoute("/impianti")({
  // Live line of "La biglietteria" (UD-114): next ticketed home match from the official calendar copy, nothing invented.
  loader: async () => {
    const today = romeDay(Date.now());
    const [{ loadCalendar }, { nextHomeMatchText }] = await Promise.all([import("@/lib/public-snapshots"), import("@/lib/cast-live")]);
    const cal = loadCalendar();
    return { today, nextHome: nextHomeMatchText(cal.groups, cal.events, today) };
  },
  head: () => pageHead(PUBLIC_PAGES.impianti),
  component: ImpiantiPage,
});

function ImpiantiPage() {
  const { today, nextHome } = Route.useLoaderData();
  const colico = siteById("SED-COL")!;
  const ticket = spaceById("SPA-COL-BIG")!;
  return (
    <main className="scd-interior min-h-screen bg-[var(--in-ground)] pb-24 lg:pb-12">
      <section className="relative isolate overflow-hidden bg-[var(--scd-navy)] text-white">
        <div aria-hidden="true" data-motif="forte" className="scd-kit-stripes absolute inset-0 -z-10" />
        <div className="mx-auto max-w-[1280px] px-4 pb-7 pt-3 sm:px-6 sm:pt-5 lg:pb-12 lg:pt-10">
          <p className="m-0 text-[14px] font-semibold text-[var(--out-text-soft)] lg:text-[15px]">Come arrivare e dove andare</p>
          <h1 className="m-0 mt-0.5 font-title text-[clamp(34px,9.4vw,42px)] font-black leading-[0.95] sm:text-[46px] lg:mt-1 lg:text-[56px]">
            I nostri <span className="scd-brush">campi</span>
          </h1>
          <p className="m-0 mt-2 line-clamp-2 max-w-[60ch] text-[15px] leading-snug text-[#e6f3fc] lg:mt-3 lg:line-clamp-none lg:text-[16px]">
            {colico.name}, {colico.address}, {colico.municipality}, e l'impianto comunale di Dervio. Tocca uno spazio per vedere se è aperto, da dove si entra e chi
            può entrare.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 lg:mt-5 lg:gap-3 max-lg:[&>*]:h-11 max-lg:[&>*]:min-h-11">
            <Link to="/calendario" className="scd-action inline-flex h-12 items-center gap-2 rounded-[12px] px-5 text-[16px] font-bold">
              <CalendarDays className="size-5" strokeWidth={2} aria-hidden="true" />
              Gare in casa
            </Link>
            <Link to="/card" className="inline-flex h-12 items-center gap-2 rounded-[12px] border border-white/40 px-4 text-[15px] font-semibold hover:bg-white/10">
              <CreditCard className="size-5" strokeWidth={1.8} aria-hidden="true" />
              Le card 2026/27
            </Link>
            <span className="inline-flex min-h-12 items-center gap-2 rounded-[12px] border border-white/40 px-4 text-[15px] font-semibold">
              <Ticket className="size-5" strokeWidth={1.8} aria-hidden="true" />
              Biglietteria a Colico · {ticket.hours ? "orari nella mappa" : "orari in aggiornamento"}
            </span>
          </div>
        </div>
      </section>
      <div className="mx-auto -mt-5 max-w-[1280px] px-4 sm:px-6">
        <Directions />
        <div className="mt-5">
          <FacilityMap mode="public" />
        </div>
        <figure className="scd-card m-0 mt-5 overflow-hidden p-0" data-testid="pianta-colico">
          <figcaption className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-4 sm:px-5">
            <span className="font-uv text-[24px] uppercase leading-none text-[#0b2a5b]">Pianta del Centro Sportivo Colico</span>
            <span className="text-[13px] text-[var(--in-sub)]">Ingressi: pubblico, atleti, visitatori · schema non in scala</span>
          </figcaption>
          <a href={PIANTA_COLICO} target="_blank" rel="noreferrer" className="scd-focus mt-3 block bg-[#f4f1e6]" aria-label="Apri la pianta di Colico a schermo intero">
            <img src={PIANTA_COLICO} width={1122} height={1402} alt="Pianta del Centro Sportivo Colico: Campo 1 e Campo 2, spogliatoi 1-4 e arbitri, segreteria, magazzino attrezzi e lavanderia con infermeria, club house, biglietteria, tribuna, palestrina e servizi; ingressi pubblico, atleti e visitatori su via Lido." loading="lazy" decoding="async" className="mx-auto h-auto w-full max-w-[640px]" />
          </a>
        </figure>
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
          <TicketRules />
          <CastPresence
            id="biglietteria"
            day={today}
            live={nextHome ? { label: "Prossima in casa con biglietteria", text: nextHome, link: { label: "Calendario", to: "/calendario" } } : null}
          />
        </div>
        <p className="m-0 mt-4 text-[13px] leading-snug text-[var(--in-sub)]">
          Fonte: dati degli impianti della società. Posizioni schematiche, non in scala. Quello che non è ancora confermato è scritto
          "in aggiornamento" o "indicativo".
        </p>
      </div>
    </main>
  );
}

/**
 * "Come arrivare" (live audit 14/10/2026: a grandparent found the address but no way to navigate). Addresses from the
 * facilities master (config/scd-facilities.v1.json); a site without a confirmed address shows no link.
 */
function Directions() {
  const sites = [siteById("SED-COL"), siteById("SED-DER")].filter((s): s is NonNullable<typeof s> => Boolean(s));
  return (
    <section aria-labelledby="arrivare-t" className="scd-card grid gap-3 p-4 sm:p-5" data-testid="impianti-arrivare">
      <h2 id="arrivare-t" className="m-0 flex items-center gap-2 text-[19px] font-bold text-[#0b2a5b]">
        <Navigation className="size-5 text-[#1556c4]" aria-hidden="true" />
        Come arrivare
      </h2>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {sites.map((s) => {
          const url = siteMapsUrl(s);
          return (
            <li key={s.id} className="grid gap-2 rounded-xl bg-[#e9f2fb] p-3.5">
              <span className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-5 flex-none text-[#1556c4]" aria-hidden="true" />
                <span className="grid gap-0.5">
                  <b className="text-[16px] leading-tight text-[#0b1e3a]">{s.name}</b>
                  <span className="text-[15px] text-[#4a5d7a]">{s.address ? `${s.address}, ${s.municipality}` : `${s.municipality} · indirizzo in aggiornamento`}</span>
                </span>
              </span>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="scd-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-[#ffd600] px-4 text-[16px] font-bold text-[#0b1e3a]"
                >
                  <Navigation className="size-5" aria-hidden="true" />
                  Portami qui con Maps
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

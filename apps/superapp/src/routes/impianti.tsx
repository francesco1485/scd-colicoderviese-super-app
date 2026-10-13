import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, CreditCard, Ticket } from "lucide-react";

import { FacilityMap } from "@/components/scd/FacilityMap";
import { TicketRules } from "@/components/scd/TicketRules";
import { FACILITIES, siteById, spaceById } from "@/lib/facilities";

/** Schematic plan of Colico sent by the Direzione on 13/10/2026 (FACILITY_PLAN in config/scd-assets.v1.json). */
const PIANTA_COLICO = "/media/scd/pianta-colico-2026.webp";

export const Route = createFileRoute("/impianti")({
  head: () => ({
    meta: [
      { title: "I nostri campi — Impianti S.C.D. ColicoDerviese" },
      {
        name: "description",
        content: "Mappa dei centri sportivi di Colico e Dervio: campi, spogliatoi, servizi, orari, ingresso per il pubblico e biglietteria.",
      },
      { property: "og:title", content: "I nostri campi — S.C.D. ColicoDerviese" },
      { property: "og:description", content: "Dove si gioca, da dove si entra, quando è aperto." },
    ],
  }),
  component: ImpiantiPage,
});

function ImpiantiPage() {
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
              Biglietteria a Colico · {ticket.hours ? "orari nella mappa" : "orari da inserire"}
            </span>
          </div>
        </div>
      </section>
      <div className="mx-auto -mt-5 max-w-[1280px] px-4 sm:px-6">
        <FacilityMap mode="public" />
        <figure className="scd-card m-0 mt-5 overflow-hidden p-0" data-testid="pianta-colico">
          <figcaption className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-4 sm:px-5">
            <span className="font-uv text-[24px] uppercase leading-none text-[#0b2a5b]">Pianta del Centro Sportivo Colico</span>
            <span className="text-[13px] text-[var(--in-sub)]">Ingressi: pubblico, atleti, visitatori · schema non in scala</span>
          </figcaption>
          <a href={PIANTA_COLICO} target="_blank" rel="noreferrer" className="scd-focus mt-3 block bg-[#f4f1e6]" aria-label="Apri la pianta di Colico a schermo intero">
            <img src={PIANTA_COLICO} width={1122} height={1402} alt="Pianta del Centro Sportivo Colico: Campo 1 e Campo 2, spogliatoi 1-4 e arbitri, segreteria, magazzino attrezzi e lavanderia con infermeria, club house, biglietteria, tribuna, palestrina e servizi; ingressi pubblico, atleti e visitatori su via Lido." loading="lazy" decoding="async" className="mx-auto h-auto w-full max-w-[640px]" />
          </a>
        </figure>
        <div className="mt-5">
          <TicketRules />
        </div>
        <p className="m-0 mt-4 text-[13px] leading-snug text-[var(--in-sub)]">
          Fonte: master impianti della società ({FACILITIES.sources.master.label}). Posizioni schematiche, non in scala. Quello che non è ancora confermato è scritto
          "da inserire" o "da verificare".
        </p>
      </div>
    </main>
  );
}

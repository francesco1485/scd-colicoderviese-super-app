import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Ticket } from "lucide-react";

import { FacilityMap } from "@/components/scd/FacilityMap";
import { FACILITIES, siteById, spaceById } from "@/lib/facilities";

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
      <section className="bg-[linear-gradient(180deg,#062a52_0%,#0860a8_100%)] text-white">
        <div className="mx-auto max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 lg:pb-12 lg:pt-10">
          <p className="m-0 text-[15px] font-semibold text-[var(--out-text-soft)]">Come arrivare e dove andare</p>
          <h1 className="m-0 mt-1 font-title text-[44px] font-black leading-[0.95] sm:text-[56px]">I nostri campi</h1>
          <p className="m-0 mt-3 max-w-[60ch] text-[16px] leading-snug text-[#e6f3fc]">
            {colico.name}, {colico.address}, {colico.municipality}, e l'impianto comunale di Dervio. Tocca uno spazio per vedere se è aperto, da dove si entra e chi
            può entrare.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/calendario" className="scd-action inline-flex h-12 items-center gap-2 rounded-[12px] px-5 text-[16px] font-bold">
              <CalendarDays className="size-5" strokeWidth={2} aria-hidden="true" />
              Gare in casa
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
        <p className="m-0 mt-4 text-[13px] leading-snug text-[var(--in-sub)]">
          Fonte: master impianti della società ({FACILITIES.sources.master.label}). Posizioni schematiche, non in scala. Quello che non è ancora confermato è scritto
          "da inserire" o "da verificare".
        </p>
      </div>
    </main>
  );
}

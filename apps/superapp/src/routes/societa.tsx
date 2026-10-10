import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, MapPin } from "lucide-react";

import { ClubCrest, PageHero, SyncPlaceholder } from "@/components/ui-kit";
import { getClubDirectory } from "@/lib/club.functions";

export const Route = createFileRoute("/societa")({
  loader: () => getClubDirectory(),
  head: () => ({
    meta: [
      { title: "Società avversarie — Directory club | SCD ColicoDerviese" },
      { name: "description", content: "Le società incontrate dalla S.C.D. ColicoDerviese: stemma, città, sito, social e mappa del campo." },
      { property: "og:title", content: "Società avversarie — SCD ColicoDerviese" },
      { property: "og:description", content: "Directory dei club con stemmi verificati." },
    ],
  }),
  component: Societa,
});

function Societa() {
  const { clubs } = Route.useLoaderData();
  return (
    <main>
      <PageHero eyebrow="Club directory" title="Società avversarie">
        Dal DB CLUBS del gestionale. Gli stemmi non verificati sono segnalati: non generiamo loghi inventati.
      </PageHero>
      <section className="mx-auto -mt-8 max-w-6xl px-4">
        {clubs.length === 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            <SyncPlaceholder label="Directory società" />
            <SyncPlaceholder label="Stemmi verificati" />
            <SyncPlaceholder label="Campi e mappe" />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {clubs.map((c) => (
              <article key={c.id} className="flex gap-4 p-4 card-premium">
                <ClubCrest club={c} name={c.nome} size={48} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold leading-tight">{c.nome}</h2>
                  {c.citta && <p className="text-xs text-muted-foreground">{c.citta}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-primary">
                    {c.sito && <a href={c.sito} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">Sito <ExternalLink className="size-3" /></a>}
                    {c.social && <a href={c.social} target="_blank" rel="noopener noreferrer">Social</a>}
                    {c.maps && <a href={c.maps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1"><MapPin className="size-3" />Mappa</a>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

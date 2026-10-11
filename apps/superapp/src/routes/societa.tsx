import { CLUB_DOCUMENTS } from "@/lib/club-documents";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, FileText, MapPin } from "lucide-react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { HallDoors, HallHero } from "@/components/scd/hall";
import { ClubCrest, SyncPlaceholder } from "@/components/ui-kit";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { getClubDirectory } from "@/lib/club.functions";
import { CLUB_PROFILE, hallTeams, pitchFacts } from "@/lib/club-profile";

export const Route = createFileRoute("/societa")({
  loader: async () => {
    const [directory, calendar] = await Promise.all([getClubDirectory(), getPublicCalendarSnapshot()]);
    return { clubs: directory.clubs, groups: calendar.groups };
  },
  head: () => ({
    meta: [
      { title: "Chi siamo — S.C.D. ColicoDerviese" },
      {
        name: "description",
        content: "La S.C.D. ColicoDerviese: il club di calcio di Colico e Dervio sull'Alto Lago di Como, matricola FIGC 26020, società affiliata AC Monza. Squadre, campi e contatti della stagione 2026/27.",
      },
      { property: "og:title", content: "Chi siamo — S.C.D. ColicoDerviese" },
      { property: "og:description", content: "Due paesi, un club: Colico e Dervio, stagione 2026/27." },
    ],
  }),
  component: Societa,
});

function Societa() {
  const { clubs, groups } = Route.useLoaderData();
  const teams = hallTeams(groups);
  const pitches = pitchFacts();
  const c = CLUB_PROFILE;
  return (
    <main data-screen="societa" className="scd-pub min-h-screen bg-[var(--out-night)] pb-24 font-text text-white lg:pb-12">
      <HallHero
        kicker="Chi siamo"
        title={
          <>
            Colico e Dervio,
            <br />
            <span className="text-[var(--out-sky)]">un solo club</span>
          </>
        }
        actions={
          <>
            <Link to="/squadre" className="scd-action inline-flex h-12 items-center gap-2 rounded-[12px] px-5 text-[16px] font-bold">
              Le squadre <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            <Link to="/calendario" className="scd-focus inline-flex h-12 items-center rounded-[12px] border border-white/40 px-5 text-[16px] font-semibold text-white hover:bg-white/10">
              Calendario
            </Link>
          </>
        }
      >
        <p className="m-0">
          La {c.name} è la società di calcio di {c.towns.join(" e ")}, sull'{c.area}. Nella stagione {c.season} porta in campo {teams.length} squadre, dalla Prima
          Squadra ai bambini dei Piccoli Amici.
        </p>
      </HallHero>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <section aria-labelledby="carta-t" className="relative z-10 -mt-6 grid gap-3 lg:grid-cols-[5fr_7fr]">
          <div className="rounded-[18px] bg-white p-5 text-[var(--scd-ink)] shadow-[0_14px_28px_rgb(0_10_40/0.3)]">
            <div className="flex items-center gap-3">
              <ClubCrestOfficial size={64} />
              <h2 id="carta-t" className="m-0 font-title text-[28px] font-black uppercase leading-[0.95]">
                Carta d'identità
              </h2>
            </div>
            <dl className="m-0 mt-4 grid gap-2.5 text-[15px]">
              <Fact k="Nome">{c.name}</Fact>
              <Fact k="Paesi">{c.towns.join(" e ")} (LC)</Fact>
              <Fact k="Matricola FIGC">{c.figcMatricola}</Fact>
              <Fact k="Stagione">{c.season}</Fact>
              <Fact k="Affiliazione">
                <a href={c.monza.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--scd-blue)] underline">
                  {c.monza.label} <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </Fact>
              <Fact k="Sede">{c.contacts.address}</Fact>
            </dl>
          </div>

          <div className="rounded-[18px] bg-white p-5 text-[var(--scd-ink)] shadow-[0_14px_28px_rgb(0_10_40/0.3)]">
            <h2 className="m-0 font-title text-[28px] font-black uppercase leading-[0.95]">Dove giochiamo</h2>
            <ul className="m-0 mt-3 grid list-none gap-2 p-0 sm:grid-cols-3">
              {pitches.map((p) => (
                <li key={p.id} className="rounded-[12px] bg-[var(--scd-page)] p-3">
                  <span className="block text-[13px] font-bold uppercase tracking-[0.04em] text-[var(--scd-blue)]">{p.site}</span>
                  <span className="block font-title text-[22px] font-extrabold uppercase leading-none">{p.name}</span>
                  <span className="mt-1 block text-[14px] text-[var(--scd-sub)]">
                    {p.surface} · {p.size}
                  </span>
                </li>
              ))}
            </ul>
            <p className="m-0 mt-3 text-[14px] leading-snug text-[var(--scd-sub)]">
              Centro sportivo di Colico in Via Lido SNC, gestito dalla società; a Dervio giochiamo sul campo comunale. Misure dal master impianti della società.
            </p>
            <Link to="/impianti" className="mt-3 inline-flex h-11 items-center gap-2 rounded-[10px] border-2 border-[var(--scd-blue)] px-4 text-[15px] font-bold text-[var(--scd-blue)]">
              <MapPin className="size-[18px]" aria-hidden="true" /> Mappa dei campi
            </Link>
          </div>
        </section>

        <section aria-labelledby="squadre-t" className="mt-10">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 id="squadre-t" className="m-0 font-title text-[30px] font-black uppercase leading-none">
              Le squadre {c.season}
            </h2>
            <Link to="/squadre" className="py-2 text-[15px] font-bold text-[var(--out-yellow)]">
              Tutte le squadre
            </Link>
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {teams.map((t) => (
              <li key={t.id}>
                <Link
                  to="/squadre"
                  hash={`squadra-${t.id}`}
                  className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/[0.07] px-4 text-[15px] font-semibold hover:border-[var(--out-yellow)]"
                >
                  <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: t.color }} />
                  {t.label.replace(/\s·\s/g, " ")}
                  {t.championship && <span className="text-[13px] font-medium text-[var(--out-text-soft)]">· {t.championship.name.replace(" Lombardia", "")}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="documenti-t" className="mt-12" data-testid="club-documents">
          <h2 id="documenti-t" className="m-0 font-title text-[26px] font-black uppercase leading-none">
            Regolamenti e documenti
          </h2>
          <p className="m-0 mt-1 text-[14px] text-[var(--out-text-soft)]">I documenti allegati al modulo di registrazione 2026/27, in sola lettura. Le scelte e i consensi si esprimono solo nel modulo online.</p>
          <ul className="m-0 mt-4 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {CLUB_DOCUMENTS.map((d) => (
              <li key={d.id}>
                <a href={d.file} target="_blank" rel="noopener noreferrer" className="flex min-h-[72px] items-start gap-3 rounded-[14px] border border-[var(--out-line,#d3e0ee)] bg-white px-3 py-2.5 text-[var(--scd-ink,#062a52)]">
                  <FileText className="mt-0.5 size-5 shrink-0 text-[var(--scd-blue,#0457af)]" strokeWidth={1.8} aria-hidden="true" />
                  <span className="min-w-0">
                    <b className="block text-[14.5px] leading-tight">{d.title}</b>
                    <span className="block text-[12.5px] text-[var(--out-text-soft,#46617f)]">{d.audience} · PDF, {d.pages} pagine</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <HallDoors exclude="/societa" className="mt-10" />

        <section aria-labelledby="avversarie-t" className="mt-12">
          <h2 id="avversarie-t" className="m-0 font-title text-[26px] font-black uppercase leading-none">
            Le società che incontriamo
          </h2>
          <p className="m-0 mt-1 text-[14px] text-[var(--out-text-soft)]">Dal DB CLUBS del gestionale. Gli stemmi non verificati sono segnalati: non generiamo loghi inventati.</p>
          <div className="mt-3 grid gap-3 text-[var(--scd-ink)] md:grid-cols-3">
            {clubs.length === 0 ? (
              <>
                <SyncPlaceholder label="Directory società" className="bg-white" />
                <SyncPlaceholder label="Stemmi verificati" className="bg-white" />
                <SyncPlaceholder label="Campi e mappe" className="bg-white" />
              </>
            ) : (
              clubs.map((club) => (
                <article key={club.id} className="flex gap-4 rounded-[14px] bg-white p-4">
                  <ClubCrest club={club} name={club.nome} size={48} />
                  <div className="min-w-0 flex-1">
                    <h3 className="m-0 text-lg font-bold leading-tight">{club.nome}</h3>
                    {club.citta && <p className="m-0 text-xs text-[var(--scd-sub)]">{club.citta}</p>}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-[var(--scd-blue)]">
                      {club.sito && (
                        <a href={club.sito} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                          Sito <ExternalLink className="size-3" />
                        </a>
                      )}
                      {club.social && (
                        <a href={club.social} target="_blank" rel="noopener noreferrer">
                          Social
                        </a>
                      )}
                      {club.maps && (
                        <a href={club.maps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                          <MapPin className="size-3" />
                          Mappa
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Fact({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9.5rem)_1fr] gap-3 border-b border-[var(--scd-line)] pb-2 last:border-0">
      <dt className="text-[var(--scd-sub)]">{k}</dt>
      <dd className="m-0 min-w-0 break-words font-semibold">{children}</dd>
    </div>
  );
}

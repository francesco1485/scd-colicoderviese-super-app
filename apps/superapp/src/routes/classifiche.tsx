import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Trophy } from "lucide-react";

import { PUBLIC_WRAP, PublicPageHeader } from "@/components/home/PublicPageHeader";
import { OfficialBadge, ResultsList, SourceLine, StandingsTable, standingSummary } from "@/components/scd/LndStandings";
import { LND_SNAPSHOT } from "@/lib/lnd-snapshot";
import { LND_TEAM_LABEL, cupRecord, ourStanding, type SnapshotCompetition } from "@/lib/lnd-standings";
import { PUBLICATION_RULE } from "@/lib/official-links";
import { PUBLIC_PAGES, pageHead } from "@/lib/share";

/**
 * Classifiche (UD-181, Francesco DG 17/10/2026 12:33 «ok classifiche LND»): the 4 championships and 3 cups of the
 * competitive teams, only as published by gare.lnd.it, each with the badge «Ufficiale LND», the fetch date and the
 * link to the source. Public page: club names and scores only, no people. Attività di base: no standings (SGS).
 * Engine PERSONE; measure: weekly visits of /classifiche.
 */
export const Route = createFileRoute("/classifiche")({
  loader: () => ({ snapshot: LND_SNAPSHOT }),
  head: () => pageHead(PUBLIC_PAGES.classifiche),
  component: ClassifichePage,
});

function ClassifichePage() {
  const { snapshot } = Route.useLoaderData();
  const leagues = snapshot.competitions.filter((c) => c.kind === "CAMPIONATO");
  const cups = snapshot.competitions.filter((c) => c.kind === "COPPA");
  return (
    <main data-screen="classifiche" className="min-h-dvh bg-[#eef3f9] pb-24 text-[#0b1e3a] lg:pb-12">
      <PublicPageHeader eyebrow={`Stagione ${snapshot.season || "2026/27"}`} title="Classifiche" accent="ufficiali">
        {PUBLICATION_RULE} Campionati e coppe delle nostre squadre, come li pubblica la federazione.
      </PublicPageHeader>
      <div className={`${PUBLIC_WRAP} grid gap-4 pt-5 lg:pt-8`}>
        <section aria-labelledby="campionati-t">
          <h2 id="campionati-t" className="m-0 mb-3 flex items-center gap-2 font-title text-[26px] font-black uppercase leading-none">
            <Trophy className="size-6 text-[#0457af]" aria-hidden="true" />
            Campionati
          </h2>
          <ul className="m-0 grid list-none gap-3 p-0 lg:grid-cols-2" data-testid="campionati">
            {leagues.map((c) => (
              <LeagueCard key={c.id} c={c} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="coppe-t">
          <h2 id="coppe-t" className="m-0 mb-3 mt-2 font-title text-[26px] font-black uppercase leading-none">
            Coppe
          </h2>
          <ul className="m-0 grid list-none gap-3 p-0 lg:grid-cols-3" data-testid="coppe">
            {cups.map((c) => (
              <CupCard key={c.id} c={c} />
            ))}
          </ul>
        </section>

        <p className="m-0 flex items-start gap-2 rounded-[14px] bg-white px-3.5 py-3 text-[14px] leading-[1.45] text-[#22385c] shadow-[0_2px_10px_rgb(11_42_91/0.06)]">
          <ShieldCheck className="mt-0.5 size-[18px] shrink-0 text-[#0457af]" aria-hidden="true" />
          <span>
            Piccoli Amici, Primi Calci, Pulcini ed Esordienti non hanno classifiche: nell'attività di base si gioca per
            imparare (regola del Settore Giovanile e Scolastico). Le gare sono nel{" "}
            <Link to="/calendario" className="scd-focus font-semibold text-[#0457af] underline">
              calendario
            </Link>
            .
          </span>
        </p>
      </div>
    </main>
  );
}

function CardHead({ c }: { c: SnapshotCompetition }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="m-0 text-[12.5px] font-bold uppercase tracking-[0.08em] text-[#0457af]">{LND_TEAM_LABEL[c.team] ?? c.team}</p>
        <h3 className="m-0 mt-0.5 text-[17px] font-extrabold leading-tight">
          {c.label} · {c.group_label}
        </h3>
      </div>
      <OfficialBadge />
    </div>
  );
}

function LeagueCard({ c }: { c: SnapshotCompetition }) {
  const rows = c.standings;
  const us = ourStanding(rows);
  return (
    <li className="grid content-start gap-3 rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]" data-testid={`campionato-${c.id}`}>
      <CardHead c={c} />
      {us && rows ? (
        <p className="m-0 font-title text-[24px] font-black uppercase leading-none text-[#0b2a5b]">{standingSummary(us, rows.length)}</p>
      ) : null}
      {rows ? (
        <StandingsTable rows={rows} caption={`Classifica ${c.label} ${c.group_label}`} />
      ) : (
        <p className="m-0 text-[14px] text-[#3e5272]">{c.standings_note ?? "Classifica non disponibile: vedi la fonte."}</p>
      )}
      <div>
        <h4 className="m-0 mb-1.5 text-[12.5px] font-bold uppercase tracking-[0.06em] text-[#5a6b85]">Ultimi risultati</h4>
        <ResultsList results={c.results.slice(0, 3)} />
      </div>
      <SourceLine url={c.source_url} fetchedAt={c.fetched_at} />
    </li>
  );
}

function CupCard({ c }: { c: SnapshotCompetition }) {
  const rec = cupRecord(c);
  return (
    <li className="grid content-start gap-3 rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]" data-testid={`coppa-${c.id}`}>
      <CardHead c={c} />
      {rec.played > 0 && (
        <p className="m-0 text-[14px] text-[#3e5272]">
          <b className="text-[#0b1e3a]">
            {rec.v} {rec.v === 1 ? "vinta" : "vinte"}
            {rec.n ? `, ${rec.n} pari` : ""}, {rec.p} {rec.p === 1 ? "persa" : "perse"}
          </b>{" "}
          (contate dai risultati ufficiali qui sotto)
        </p>
      )}
      <ResultsList results={c.results} />
      <SourceLine url={c.source_url} fetchedAt={c.fetched_at} />
    </li>
  );
}

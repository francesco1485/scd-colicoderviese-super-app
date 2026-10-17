import { BadgeCheck, ExternalLink } from "lucide-react";

import {
  fetchedLabel,
  isOurTeam,
  outcomeForUs,
  pendingNote,
  teamName,
  type SnapshotCompetition,
  type SnapshotResult,
  type StandingRow,
} from "@/lib/lnd-standings";

/**
 * Official LND blocks (UD-181): standings table, results list, badge «Ufficiale LND» and the source line.
 * Only what gare.lnd.it publishes is shown; a missing table says so in plain words.
 */

export function OfficialBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[#e3f0ff] px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#0457af] ${className}`}
      data-testid="badge-ufficiale-lnd"
    >
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      Ufficiale LND
    </span>
  );
}

export function SourceLine({ url, fetchedAt, className = "" }: { url: string; fetchedAt: string; className?: string }) {
  return (
    <p className={`m-0 text-[13px] leading-snug text-[#5a6b85] ${className}`}>
      Aggiornato il {fetchedLabel(fetchedAt)} ·{" "}
      <a href={url} target="_blank" rel="noopener noreferrer" className="scd-focus inline-flex items-center gap-1 font-semibold text-[#0457af] underline">
        fonte gare.lnd.it
        <ExternalLink className="size-3.5" aria-hidden="true" />
        <span className="sr-only">(si apre in una nuova scheda)</span>
      </a>
    </p>
  );
}

const ordinal = (n: number) => `${n}ª`;

/** "14ª su 16 · 3 punti", from the official row. */
export function standingSummary(row: StandingRow, total: number): string {
  return `${ordinal(row.pos)} su ${total} · ${row.pt} ${row.pt === 1 ? "punto" : "punti"}`;
}

export function StandingsTable({ rows, caption }: { rows: readonly StandingRow[]; caption: string }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[300px] border-collapse text-[13.5px] tabular-nums" data-testid="standings-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-[#5a6b85]">
            <th scope="col" className="w-7 px-1 py-1.5 text-right" title="Posizione">
              <abbr title="Posizione" className="no-underline">#</abbr>
            </th>
            <th scope="col" className="px-1.5 py-1.5 text-left">Squadra</th>
            <th scope="col" className="w-8 px-1 py-1.5 text-right"><abbr title="Punti" className="no-underline">Pt</abbr></th>
            <th scope="col" className="w-7 px-1 py-1.5 text-right"><abbr title="Gare giocate" className="no-underline">G</abbr></th>
            <th scope="col" className="w-7 px-1 py-1.5 text-right"><abbr title="Vinte" className="no-underline">V</abbr></th>
            <th scope="col" className="w-7 px-1 py-1.5 text-right"><abbr title="Pareggiate" className="no-underline">N</abbr></th>
            <th scope="col" className="w-7 px-1 py-1.5 text-right"><abbr title="Perse" className="no-underline">P</abbr></th>
            <th scope="col" className="hidden w-8 px-1 py-1.5 text-right sm:table-cell"><abbr title="Gol fatti" className="no-underline">GF</abbr></th>
            <th scope="col" className="hidden w-8 px-1 py-1.5 text-right sm:table-cell"><abbr title="Gol subiti" className="no-underline">GS</abbr></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ours = isOurTeam(r.team);
            return (
              <tr
                key={`${r.pos}-${r.team}`}
                className={ours ? "bg-[#fff6c7] font-bold text-[#0b1e3a]" : "border-t border-[#eef3f9] text-[#22385c]"}
                aria-current={ours ? "true" : undefined}
              >
                <td className="px-1 py-1.5 text-right">{r.pos}</td>
                <th scope="row" className="max-w-0 truncate px-1.5 py-1.5 text-left font-[inherit]">
                  {teamName(r.team)}
                </th>
                <td className="px-1 py-1.5 text-right font-extrabold text-[#0b1e3a]">{r.pt}</td>
                <td className="px-1 py-1.5 text-right">{r.g}</td>
                <td className="px-1 py-1.5 text-right">{r.v}</td>
                <td className="px-1 py-1.5 text-right">{r.n}</td>
                <td className="px-1 py-1.5 text-right">{r.p}</td>
                <td className="hidden px-1 py-1.5 text-right sm:table-cell">{r.gf}</td>
                <td className="hidden px-1 py-1.5 text-right sm:table-cell">{r.gs}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const OUTCOME_STYLE = {
  V: { label: "Vinta", cls: "bg-[#ffd600] text-[#0b1e3a]" },
  N: { label: "Pari", cls: "bg-[#e3eefb] text-[#0b2a5b]" },
  P: { label: "Persa", cls: "bg-[#eef1f5] text-[#3e5272]" },
} as const;

const shortDate = (d: string) =>
  new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", day: "numeric", month: "short" })
    .format(new Date(`${d}T12:00:00Z`))
    .replace(/\./g, "");

export function ResultsList({
  results,
  showCompetition = false,
}: {
  results: readonly (SnapshotResult & { competition?: Pick<SnapshotCompetition, "label" | "kind"> })[];
  showCompetition?: boolean;
}) {
  if (!results.length) return <p className="m-0 text-[14px] text-[#3e5272]">Nessun risultato ufficiale ancora pubblicato.</p>;
  return (
    <ul className="m-0 grid list-none gap-1.5 p-0" data-testid="results-list">
      {results.map((r) => {
        const o = outcomeForUs(r);
        const note = pendingNote(r.lnd_label);
        return (
          <li key={r.lnd_match_id} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-x-2.5 border-t border-[#eef3f9] pt-1.5 first:border-t-0 first:pt-0">
            <span className="text-[12.5px] font-bold uppercase text-[#5a6b85]">{shortDate(r.date)}</span>
            <span className="min-w-0">
              <span className="block truncate text-[14px] leading-snug">
                <span className={isOurTeam(r.home) ? "font-bold" : ""}>{teamName(r.home)}</span>
                {" – "}
                <span className={isOurTeam(r.away) ? "font-bold" : ""}>{teamName(r.away)}</span>
              </span>
              {(showCompetition && r.competition) || note ? (
                <span className="block truncate text-[12px] text-[#5a6b85]">
                  {[showCompetition && r.competition ? r.competition.label : null, note].filter(Boolean).join(" · ")}
                </span>
              ) : null}
            </span>
            <span className="flex items-center gap-2">
              <b className="font-title text-[20px] leading-none text-[#0b2a5b]">
                {r.home_goals}–{r.away_goals}
              </b>
              {o && (
                <span className={`w-[50px] rounded-full py-0.5 text-center text-[11px] font-extrabold uppercase ${OUTCOME_STYLE[o].cls}`}>
                  {OUTCOME_STYLE[o].label}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

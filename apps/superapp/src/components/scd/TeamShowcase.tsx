/**
 * «Vetrina squadre» roster block (UD-168): players by role with role, shirt (adults, when recorded) and the stats of
 * the recorded matches, then the staff. Everything comes from getTeamShowcase (r142): the age rule is already applied
 * by the database. No photos: initials in the team colour. Unknown values read «da confermare», never 0.
 */
import { ShieldCheck, Users } from "lucide-react";

import { InitialsAvatar } from "@/components/scd/Avatar";
import {
  showcaseRole,
  showcaseSections,
  statsSourceLine,
  statText,
  UNKNOWN,
  type ShowcasePlayer,
  type TeamShowcase,
} from "@/lib/team-showcase";

export function TeamShowcaseSection({
  showcase,
  color,
}: {
  showcase: TeamShowcase;
  color: string;
}) {
  const sections = showcaseSections(showcase.players);
  const count =
    showcase.state === "ok" && showcase.count !== null
      ? `${showcase.count} ${showcase.count === 1 ? "giocatore" : "giocatori"}`
      : `Rosa ${UNKNOWN}`;
  return (
    <>
      <section
        className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
        aria-labelledby="rosa-title"
        data-testid="team-showcase"
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2
            id="rosa-title"
            className="m-0 text-[13px] font-bold tracking-[0.04em] text-[#1e7fd8]"
          >
            ROSA {showcase.season ?? ""}
          </h2>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3e5272]">
            <Users className="size-4" aria-hidden="true" />
            {count}
          </span>
        </div>
        <p className="mb-3 mt-0 text-[13px] leading-[1.4] text-[#5a6b85]">
          Aperta a tutti, senza registrazione.
        </p>
        {sections.length === 0 ? (
          <p className="m-0 text-[15px] leading-[1.45] text-[#3e5272]">
            {showcase.state === "ok"
              ? `Nessun giocatore in rosa nei dati della stagione: ${UNKNOWN}.`
              : `Rosa in aggiornamento dalle liste ufficiali: ${UNKNOWN}.`}
          </p>
        ) : (
          <div className="grid gap-4">
            {sections.map((s) => (
              <div key={s.role ?? "none"}>
                <h3 className="mb-2 mt-0 text-[12px] font-bold uppercase tracking-[0.06em] text-[#5a6b85]">
                  {s.label}
                </h3>
                <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
                  {s.players.map((p) => (
                    <PlayerRow key={p.key} player={p} color={color} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="mb-0 mt-3 text-[12px] leading-[1.4] text-[#5a6b85]">
          {statsSourceLine(showcase)}
        </p>
      </section>

      <section
        className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
        aria-labelledby="staff-title"
        data-testid="team-showcase-staff"
      >
        <h2
          id="staff-title"
          className="mb-2.5 mt-0 text-[13px] font-bold tracking-[0.04em] text-[#1e7fd8]"
        >
          STAFF
        </h2>
        {showcase.staff.length === 0 ? (
          <p className="m-0 text-[15px] text-[#3e5272]">
            Staff {UNKNOWN}: arriva dall'organigramma della stagione.
          </p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {showcase.staff.map((s) => (
              <li
                key={`${s.name}-${s.role}`}
                className="flex min-w-0 items-center gap-2.5 rounded-[14px] bg-[#f2f6fb] px-3 py-2"
              >
                <InitialsAvatar name={s.name} color="#0b2a5b" size={34} />
                <span className="min-w-0">
                  <b className="block truncate text-[15px] leading-tight">
                    {s.name}
                  </b>
                  <span className="block text-[13px] text-[#5a6b85]">
                    {s.role}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mb-0 mt-3 flex items-start gap-1.5 text-[12px] leading-[1.4] text-[#5a6b85]">
          <ShieldCheck
            className="mt-px size-3.5 shrink-0 text-[#1e7fd8]"
            aria-hidden="true"
          />
          Per contattare lo staff scrivi alla segreteria: nessun numero di
          telefono in pubblico.
        </p>
      </section>
    </>
  );
}

function PlayerRow({
  player,
  color,
}: {
  player: ShowcasePlayer;
  color: string;
}) {
  const st = player.stats;
  return (
    <li
      className="min-w-0 rounded-[14px] border border-[#e3ebf5] px-3 py-2.5"
      data-testid="showcase-player"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <InitialsAvatar name={player.name} color={color} size={38} />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[15px] leading-tight">
            {player.name}
          </b>
          <span
            className={`block text-[13px] ${player.role ? "text-[#3e5272]" : "italic text-[#5a6b85]"}`}
          >
            {showcaseRole(player.role)}
          </span>
        </span>
        {player.shirt !== null && (
          <span
            className="grid h-9 min-w-9 place-items-center rounded-[8px] bg-[#0b2a5b] px-1.5 font-uv text-[17px] leading-none text-[#ffd600]"
            aria-label={`Maglia numero ${player.shirt}`}
          >
            {player.shirt}
          </span>
        )}
      </div>
      {st ? (
        <dl className="m-0 mt-2 grid grid-cols-4 gap-1 text-center">
          {(
            [
              ["Presenze", st.appearances],
              ["Gol", st.goals],
              ["Amm.", st.yellow],
              ["Esp.", st.red],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="rounded-[8px] bg-[#f2f6fb] py-1">
              <dt className="text-[11px] text-[#5a6b85]">{label}</dt>
              <dd className="m-0 text-[15px] font-bold">{statText(v)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="m-0 mt-2 text-[12px] text-[#5a6b85]">
          Presenze, gol e cartellini: {UNKNOWN}
        </p>
      )}
    </li>
  );
}

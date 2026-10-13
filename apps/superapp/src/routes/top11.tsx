import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ShieldCheck, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

import { SkyCameo } from "@/components/universe/Community";
import { KitTexture } from "@/components/scd/kit-texture";
import {
  castWeekVote,
  getWeekVote,
  type VoteCandidate,
} from "@/lib/social.functions";

/**
 * Top 11 della settimana (UD-094): ogni tesserato dà 3 voti ai giocatori delle squadre agonistiche. I conteggi della
 * settimana in corso restano chiusi; la Top 11 esce il lunedì. Minorenni solo con il consenso registrato, e solo con
 * nome e iniziale; attività di base mai (niente classifiche individuali). Solo punti e onore: nessun premio in denaro.
 */
export const Route = createFileRoute("/top11")({
  loader: () => getWeekVote(),
  head: () => ({
    meta: [
      { title: "Top 11 della settimana — S.C.D. ColicoDerviese" },
      {
        name: "description",
        content:
          "La Top 11 della settimana votata dai tesserati della S.C.D. ColicoDerviese: Prima Squadra, Juniores, U16 e U15 insieme.",
      },
    ],
  }),
  component: Top11Page,
});

const TEAM_LABEL: Readonly<Record<string, string>> = {
  prima: "Prima Squadra",
  u19: "Juniores U19",
  u16: "U16",
  u15: "U15",
};
const TEAM_COLOR: Readonly<Record<string, string>> = {
  prima: "#AD7616",
  u19: "#375B89",
  u16: "#C85D22",
  u15: "#C23C3F",
};

const fmtMonth = (d: string) =>
  d
    ? new Intl.DateTimeFormat("it-IT", {
        timeZone: "UTC",
        month: "long",
        year: "numeric",
      }).format(new Date(`${d}T12:00:00Z`))
    : "";

const fmtWeek = (d: string) => {
  if (!d) return "";
  const a = new Date(`${d}T12:00:00Z`);
  const b = new Date(a.getTime() + 6 * 86_400_000);
  const f = new Intl.DateTimeFormat("it-IT", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
  return `${f.format(a)} – ${f.format(b)}`.replace(/\./g, "");
};

function Top11Page() {
  const data = Route.useLoaderData();
  const [mine, setMine] = useState<string[]>(data.mine);
  const [sky, setSky] = useState<{ title: string; text: string } | null>(null);
  const cast = useServerFn(castWeekVote);
  const byTeam = useMemo(() => {
    const m = new Map<string, VoteCandidate[]>();
    for (const c of data.candidates)
      m.set(c.team, [...(m.get(c.team) ?? []), c]);
    return ["prima", "u19", "u16", "u15"]
      .filter((t) => m.has(t))
      .map((t) => ({ team: t, list: m.get(t)! }));
  }, [data.candidates]);

  const toggle = async (c: VoteCandidate) => {
    const on = !mine.includes(c.athleteId);
    if (on && mine.length >= 3) {
      setSky({
        title: "Tre voti",
        text: "Hai già dato i tuoi 3 voti: togline uno per cambiare.",
      });
      return;
    }
    setMine((m) =>
      on ? [...m, c.athleteId] : m.filter((x) => x !== c.athleteId),
    );
    const r = await cast({ data: { athleteId: c.athleteId, on } });
    if (!r.ok) {
      setMine((m) =>
        on ? m.filter((x) => x !== c.athleteId) : [...m, c.athleteId],
      );
      setSky({ title: "Non salvato", text: r.message });
    }
  };

  return (
    <main
      data-screen="top11"
      className="min-h-dvh bg-[#f2f6fb] pb-28 text-[#0b1e3a]"
    >
      <div className="relative isolate overflow-hidden bg-[#06306f] text-white" data-hero="top11">
        <KitTexture motif="mountains-lake" />
        <div className="relative mx-auto max-w-[720px] px-4 pb-5 pt-3 sm:pb-6 sm:pt-4">
          <h1 className="m-0 font-uv text-[32px] leading-none sm:text-[40px]">
            TOP 11{" "}
            <span className="text-[var(--uv-gold)]">DELLA SETTIMANA</span>
          </h1>
          <p className="mb-0 mt-2 text-[15px] text-[#dce8f7]">
            Votano i tesserati: 3 voti a testa, tutte le squadre agonistiche
            insieme. La Top 11 esce il lunedì.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-[720px] gap-3.5 px-3 pt-3.5">
        <section className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
          <h2 className="mb-2 mt-0 flex items-center gap-2 text-[13px] font-bold tracking-[0.04em] text-[#1e7fd8]">
            <Trophy className="size-4" aria-hidden="true" />
            SETTIMANA {fmtWeek(data.last.weekStart).toUpperCase()}
          </h2>
          {data.last.top.length ? (
            <ol className="m-0 grid list-none gap-1.5 p-0">
              {data.last.top.map((p, i) => (
                <li
                  key={p.athleteId}
                  className="flex items-center gap-3 border-t border-[#eef3f9] py-2 first:border-t-0"
                >
                  <span className="w-7 shrink-0 font-uv text-[22px] text-[#0b2a5b]">
                    {i + 1}
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full font-uv text-[12px] text-white"
                    style={{ background: TEAM_COLOR[p.team] ?? "#5a6b85" }}
                  >
                    {p.team === "prima" ? "1ª" : p.team.toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-bold">
                    {p.name}
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold text-[#5a6b85]">
                    {p.votes} {p.votes === 1 ? "voto" : "voti"}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="m-0 text-[15px] text-[#3e5272]">
              {data.last.voters
                ? "Risultati in arrivo lunedì."
                : "Nessun voto la scorsa settimana: la prima Top 11 esce lunedì prossimo."}
            </p>
          )}
        </section>

        <section className="rounded-[20px] bg-[#0b2a5b] p-4 text-white">
          <h2 className="mb-2 mt-0 text-[13px] font-bold tracking-[0.04em] text-[var(--uv-gold)]">
            PREMI DEL MESE
            {data.month.month
              ? ` · ${fmtMonth(data.month.month).toUpperCase()}`
              : ""}
          </h2>
          {data.month.awards.length ? (
            <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
              {data.month.awards.map((a) => (
                <li
                  key={a.athleteId}
                  className="flex items-center gap-3 rounded-[14px] bg-white/10 px-3 py-2.5"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full font-uv text-[12px] text-white"
                    style={{ background: TEAM_COLOR[a.team] ?? "#5a6b85" }}
                  >
                    {a.team === "prima" ? "1ª" : a.team.toUpperCase()}
                  </span>
                  <span className="grid min-w-0">
                    <b className="truncate text-[15px]">{a.name}</b>
                    <span className="text-[12.5px] text-[#c8d8ee]">
                      Giocatore del mese {TEAM_LABEL[a.team] ?? a.team} ·{" "}
                      {a.votes} {a.votes === 1 ? "voto" : "voti"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[14px] text-[#c8d8ee]">
              Il giocatore del mese di ogni squadra esce il primo giorno del
              mese dopo, dalla somma dei voti delle settimane. La premiazione si
              fa una volta al mese in club house: onore e premi non in denaro.
            </p>
          )}
        </section>

        {!data.signedIn ? (
          <section className="rounded-[20px] bg-white p-4 text-center shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
            <p className="m-0 text-[15px] text-[#3e5272]">
              Per votare serve l'account: iscriviti con un tocco.
            </p>
            <Link
              to="/registrati"
              className="scd-focus mt-3 inline-flex h-11 items-center rounded-[12px] bg-[var(--uv-gold)] px-5 font-bold text-[#0b1e3a]"
            >
              Iscriviti
            </Link>
          </section>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-[14px] bg-[#0b2a5b] px-4 py-3 text-white">
              <span className="text-[15px] font-bold">
                I tuoi voti di questa settimana
              </span>
              <span className="font-uv text-[26px] leading-none text-[var(--uv-gold)]">
                {mine.length}
                <span className="text-[16px] text-white/70">/3</span>
              </span>
            </div>
            {byTeam.length === 0 && (
              <p className="m-0 rounded-[14px] bg-white p-4 text-[15px] text-[#3e5272]">
                Nessun giocatore votabile al momento.
              </p>
            )}
            {byTeam.map(({ team, list }) => (
              <section
                key={team}
                className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
              >
                <h2 className="mb-2 mt-0 flex items-center gap-2 text-[15px] font-bold">
                  <span
                    aria-hidden="true"
                    className="size-3 rounded-full"
                    style={{ background: TEAM_COLOR[team] }}
                  />
                  {TEAM_LABEL[team] ?? team}
                </h2>
                <ul className="m-0 grid list-none grid-cols-1 gap-1.5 p-0 sm:grid-cols-2">
                  {list.map((c) => {
                    const on = mine.includes(c.athleteId);
                    return (
                      <li key={c.athleteId}>
                        <button
                          type="button"
                          onClick={() => toggle(c)}
                          aria-pressed={on}
                          className={`scd-focus flex min-h-12 w-full items-center gap-2.5 rounded-[12px] border px-3 text-left text-[15px] font-semibold ${on ? "border-[var(--uv-gold)] bg-[#fff6bf]" : "border-[#dce5f0] bg-white"}`}
                        >
                          <span
                            className={`grid size-6 shrink-0 place-items-center rounded-full ${on ? "bg-[var(--uv-gold)] text-[#0b1e3a]" : "bg-[#eef3f9] text-transparent"}`}
                          >
                            <Check className="size-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {c.name}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </>
        )}

        <p className="m-0 flex items-start gap-2 rounded-[14px] bg-[#eef5ff] px-3 py-3 text-[13px] leading-[1.4] text-[#22385c]">
          <ShieldCheck
            className="size-[18px] shrink-0 text-[#1e7fd8]"
            aria-hidden="true"
          />
          I ragazzi minorenni compaiono solo con il consenso della famiglia e
          con nome e iniziale. Per l'attività di base non ci sono classifiche
          individuali. Solo onore e punti, nessun premio in denaro.
        </p>
      </div>
      <SkyCameo message={sky} onClose={() => setSky(null)} />
    </main>
  );
}

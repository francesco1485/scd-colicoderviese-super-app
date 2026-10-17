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
import { PUBLIC_PAGES, pageHead } from "@/lib/share";

/**
 * Top 11 della settimana (UD-094): ogni account del club dà 3 voti ai giocatori delle squadre agonistiche (Francesco 15/10/2026: voto aperto a ogni account registrato, non solo ai tesserati). I conteggi della
 * settimana in corso restano chiusi; la Top 11 esce il lunedì. Minorenni solo con il consenso registrato, e solo con
 * nome e iniziale; attività di base mai (niente classifiche individuali). Solo punti e onore: nessun premio in denaro.
 */
export const Route = createFileRoute("/top11")({
  loader: () => getWeekVote(),
  head: () => pageHead(PUBLIC_PAGES.top11),
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
            Vota chi ha un account del club: 3 voti a testa, tutte le squadre agonistiche
            insieme. La Top 11 esce il lunedì.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-[720px] gap-3.5 px-3 pt-3.5">
        {data.last.top.length > 0 ? (
          <section
            className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
            data-testid="top11-last"
          >
            <h2 className="mb-2 mt-0 flex items-center gap-2 text-[13px] font-bold tracking-[0.04em] text-[#0457af]">
              <Trophy className="size-4" aria-hidden="true" />
              SETTIMANA {fmtWeek(data.last.weekStart).toUpperCase()}
            </h2>
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
          </section>
        ) : (
          // No published Top 11 yet: the page leads with how the game works, never with an empty week (16/10/2026).
          <HowItWorks />
        )}

        {data.month.awards.length > 0 && (
          <section className="scd-band rounded-[20px] p-4 text-white" data-testid="top11-month">
            <h2 className="mb-2 mt-0 text-[13px] font-bold tracking-[0.04em] text-[#ffd84a]">
              PREMI DEL MESE
              {data.month.month
                ? ` · ${fmtMonth(data.month.month).toUpperCase()}`
                : ""}
            </h2>
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
          </section>
        )}

        {!data.signedIn ? (
          <section
            className="scd-band-sole rounded-[20px] p-4 sm:p-5"
            aria-labelledby="top11-join-t"
            data-testid="top11-join"
          >
            <p className="m-0 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#034a96]">
              Vota anche tu
            </p>
            <h2 id="top11-join-t" className="m-0 mt-1 font-uv text-[24px] uppercase leading-none">
              Serve un account del club
            </h2>
            <p className="m-0 mt-2 text-[15px] leading-snug text-[#1c2c50]">
              Lo crei con la tua e-mail: poi dai i tuoi 3 voti ogni settimana e trovi calendario,
              fantacalcio e community.
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <Link
                to="/registrati"
                className="scd-navy-btn scd-focus inline-flex h-12 flex-1 items-center justify-center rounded-[12px] px-5 font-bold sm:flex-none"
              >
                Registrati
              </Link>
              <Link
                to="/accedi"
                search={{ next: "/top11" }}
                className="scd-focus inline-flex h-12 flex-1 items-center justify-center rounded-[12px] border-2 border-[#13254d] px-5 font-bold text-[#13254d] sm:flex-none"
              >
                Entra
              </Link>
            </div>
          </section>
        ) : (
          <>
            {byTeam.length > 0 && (
            <div className="flex items-center justify-between rounded-[14px] bg-[#0b2a5b] px-4 py-3 text-white">
              <span className="text-[15px] font-bold">
                I tuoi voti di questa settimana
              </span>
              <span className="font-uv text-[26px] leading-none text-[var(--uv-gold)]">
                {mine.length}
                <span className="text-[16px] text-white/70">/3</span>
              </span>
            </div>
            )}
            {byTeam.length === 0 && (
              <p className="m-0 text-[13.5px] text-[#3e5272]">
                Le liste dei giocatori votabili si aprono con le gare della settimana.
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

/** How the Top 11 works: shown first while no week has been published yet. */
function HowItWorks() {
  const steps = [
    { t: "3 voti a testa", d: "Ogni account del club dà 3 voti ai giocatori delle squadre agonistiche." },
    { t: "Il lunedì la Top 11", d: "I conteggi della settimana restano chiusi; la classifica esce il lunedì." },
    { t: "Il giocatore del mese", d: "Il primo giorno del mese, dalla somma delle settimane, per ogni squadra." },
    { t: "Premiazione in club house", d: "Una volta al mese: onore e premi non in denaro." },
  ] as const;
  return (
    <section
      className="rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgb(11_42_91/0.08)] sm:p-5"
      aria-labelledby="top11-how-t"
      data-testid="top11-how"
    >
      <h2 id="top11-how-t" className="m-0 flex items-center gap-2 text-[13px] font-bold tracking-[0.04em] text-[#0457af]">
        <Trophy className="size-4" aria-hidden="true" />
        COME FUNZIONA
      </h2>
      <ol className="m-0 mt-3 grid list-none gap-3 p-0 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.t} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="scd-band grid size-9 shrink-0 place-items-center rounded-full font-uv text-[18px] text-[#ffd84a]"
            >
              {i + 1}
            </span>
            <span className="min-w-0">
              <b className="block text-[15.5px] leading-tight">{s.t}</b>
              <span className="block text-[13.5px] leading-snug text-[#3e5272]">{s.d}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

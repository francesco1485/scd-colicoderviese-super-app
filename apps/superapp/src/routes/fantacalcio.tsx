import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  Clock3,
  Search,
  ShieldCheck,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { SkyCameo } from "@/components/universe/Community";
import { KitTexture } from "@/components/scd/kit-texture";
import {
  FANTA_TEAMS,
  PER_TEAM_MAX,
  ROLE_LABEL,
  ROSTER_SIZE,
  SCORING,
  TEAM_LABEL,
  fmtPoints,
  rosterProblems,
  type FantaCandidate,
  type FantaRole,
  type StandingRow,
} from "@/lib/fanta";
import {
  getFanta,
  saveFantaRoster,
  type FantaPage,
} from "@/lib/fanta.functions";
import { PUBLIC_PAGES, pageHead } from "@/lib/share";

/**
 * Fantacalcio SCD (UD-094): free for every account, no money anywhere. Each member picks up to 11 players of the
 * competitive teams (max 4 per team) and earns points only from the match reports the staff records. Minors show
 * with first name and initial; the standings show the team name chosen by the player, never the real name.
 */
export const Route = createFileRoute("/fantacalcio")({
  loader: () => getFanta(),
  head: () => pageHead(PUBLIC_PAGES.fantacalcio),
  component: FantaRoute,
});

const TEAM_COLOR: Readonly<Record<string, string>> = {
  prima: "#AD7616",
  u19: "#375B89",
  u16: "#C85D22",
  u15: "#C23C3F",
};
const ROLE_ORDER: Readonly<Record<string, number>> = { P: 0, D: 1, C: 2, A: 3 };

type Tab = "squadra" | "classifica" | "regole";

function FantaRoute() {
  const data = Route.useLoaderData();
  const [tab, setTab] = useState<Tab>(data.me ? "squadra" : "classifica");
  return (
    <main
      data-screen="fantacalcio"
      className="min-h-dvh bg-[#f2f6fb] pb-28 text-[#0b1e3a]"
    >
      <Hero data={data} />
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-10 bg-[#f2f6fb]/95 backdrop-blur">
        <div
          role="tablist"
          aria-label="Fantacalcio"
          className="mx-auto flex max-w-[960px] gap-1.5 px-3 py-2.5"
        >
          {(["squadra", "classifica", "regole"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`scd-focus h-10 flex-1 rounded-full text-[14.5px] font-bold ${tab === t ? "bg-[#0b2a5b] text-white" : "bg-white text-[#3e5272] shadow-[0_1px_4px_rgb(11_42_91/0.08)]"}`}
            >
              {t === "squadra"
                ? "La mia squadra"
                : t === "classifica"
                  ? "Classifica"
                  : "Regole"}
            </button>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-[960px] px-3 pt-1.5">
        {tab === "squadra" && (data.me ? <MyTeam me={data.me} /> : <JoinCta />)}
        {tab === "classifica" && <Standings data={data} />}
        {tab === "regole" && <Rules />}
      </div>
    </main>
  );
}

function Hero({ data }: { data: FantaPage }) {
  const lock = data.me?.lockAt ? new Date(data.me.lockAt) : null;
  const lockLabel = lock
    ? new Intl.DateTimeFormat("it-IT", {
        timeZone: "Europe/Rome",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(lock)
    : "";
  return (
    <div className="relative isolate overflow-hidden bg-[#06306f] text-white" data-hero="fanta">
      <KitTexture motif="mountains-lake" />
      <div className="relative mx-auto max-w-[960px] px-4 pb-5 pt-3 sm:pt-4">
        <h1 className="m-0 font-uv text-[34px] leading-none sm:text-[42px]">
          FANTACALCIO <span className="text-[var(--uv-gold)]">SCD</span>
        </h1>
        <p className="mb-0 mt-2 max-w-[560px] text-[15px] text-[#dce8f7]">
          Scegli i tuoi 11 tra Prima Squadra, Juniores, U16 e U15. Fanno punti
          con le partite vere. Gratis, per tutti.
        </p>
        {data.me?.joined ? (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-[560px]">
            <Stat
              value={fmtPoints(data.me.monthPoints)}
              label="punti del mese"
            />
            <Stat
              value={fmtPoints(data.me.seasonPoints)}
              label="punti stagione"
            />
            <Stat
              value={`${data.me.roster.length}/${ROSTER_SIZE}`}
              label="in squadra"
            />
          </div>
        ) : (
          <p className="mb-0 mt-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[14px] font-semibold">
            <UsersRound className="size-4" aria-hidden="true" />{" "}
            {data.standings.players}{" "}
            {data.standings.players === 1
              ? "squadra iscritta"
              : "squadre iscritte"}
          </p>
        )}
        {lock && (
          <p className="mb-0 mt-3 flex items-center gap-2 text-[13.5px] text-[#c8d8ee]">
            <Clock3 className="size-4" aria-hidden="true" /> Cambi aperti fino a{" "}
            {lockLabel}
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[14px] bg-white/10 px-3 py-2.5">
      <div className="font-uv text-[28px] leading-none text-[var(--uv-gold)] tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-[12.5px] text-[#c8d8ee]">{label}</div>
    </div>
  );
}

function JoinCta() {
  return (
    <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <Pitch chosen={[]} onRemove={() => undefined} />
      <section className="self-start rounded-[20px] bg-white p-5 text-center shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
        <p className="m-0 text-[16px] font-bold">Per giocare serve l'account</p>
        <p className="mb-0 mt-1 text-[14.5px] text-[#3e5272]">
          È gratis. Sotto i 14 anni si gioca con l'account della famiglia.
        </p>
        <Link
          to="/registrati"
          className="scd-focus mt-3 inline-flex h-11 items-center rounded-[12px] bg-[var(--uv-gold)] px-5 font-bold text-[#0b1e3a]"
        >
          Iscriviti
        </Link>
      </section>
    </div>
  );
}

function MyTeam({ me }: { me: NonNullable<FantaPage["me"]> }) {
  const save = useServerFn(saveFantaRoster);
  const [name, setName] = useState(me.displayName);
  const [picked, setPicked] = useState<string[]>(me.roster);
  const [team, setTeam] = useState<string>("tutte");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [sky, setSky] = useState<{ title: string; text: string } | null>(null);

  const byId = useMemo(
    () => new Map(me.candidates.map((c) => [c.athleteId, c])),
    [me.candidates],
  );
  const chosen = useMemo(
    () =>
      picked
        .map((id) => byId.get(id))
        .filter((c): c is FantaCandidate => !!c)
        .sort(
          (a, b) =>
            (ROLE_ORDER[a.role ?? "C"] ?? 2) - (ROLE_ORDER[b.role ?? "C"] ?? 2),
        ),
    [picked, byId],
  );
  const perTeam = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of chosen) m.set(c.team, (m.get(c.team) ?? 0) + 1);
    return m;
  }, [chosen]);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return me.candidates.filter(
      (c) =>
        (team === "tutte" || c.team === team) &&
        (!q || c.name.toLowerCase().includes(q)),
    );
  }, [me.candidates, team, query]);
  const problems = rosterProblems(picked, me.candidates);
  const dirty = name !== me.displayName || picked.join() !== me.roster.join();

  const toggle = (c: FantaCandidate) => {
    if (picked.includes(c.athleteId)) {
      setPicked((p) => p.filter((x) => x !== c.athleteId));
      return;
    }
    if (picked.length >= ROSTER_SIZE)
      return setSky({
        title: "Squadra piena",
        text: `Hai già ${ROSTER_SIZE} giocatori: togline uno per cambiare.`,
      });
    if ((perTeam.get(c.team) ?? 0) >= PER_TEAM_MAX)
      return setSky({
        title: "Troppi della stessa squadra",
        text: `Al massimo ${PER_TEAM_MAX} giocatori di ${TEAM_LABEL[c.team] ?? c.team}.`,
      });
    setPicked((p) => [...p, c.athleteId]);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const r = await save({ data: { displayName: name, athleteIds: picked } });
      setSky({ title: r.ok ? "Fatto!" : "Non salvato", text: r.message });
    } catch {
      setSky({
        title: "Non salvato",
        text: "Salvataggio non riuscito, riprova.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <label className="flex flex-col gap-1.5 rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
          <span className="text-[13px] font-bold tracking-[0.04em] text-[#1e7fd8]">
            NOME DELLA TUA SQUADRA
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            placeholder="Es. Lario Legends"
            className="scd-focus h-11 rounded-[12px] border border-[#dce5f0] px-3 text-[16px] font-semibold"
            autoComplete="off"
          />
          <span className="text-[12.5px] text-[#5a6b85]">
            In classifica si vede questo nome, non il tuo.
          </span>
        </label>
        <Pitch chosen={chosen} onRemove={(c) => toggle(c)} />
        {problems.length > 0 && (
          <ul className="m-0 list-none rounded-xl bg-[#fff4e5] px-3 py-2 text-[14px] text-[#7a4b00]">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={
            busy ||
            !dirty ||
            problems.length > 0 ||
            name.trim().length < 2 ||
            picked.length === 0
          }
          className="scd-focus h-12 rounded-[14px] bg-[var(--uv-gold)] text-[16px] font-bold text-[#0b1e3a] shadow-[0_3px_0_#b89a00] disabled:opacity-50 disabled:shadow-none"
        >
          {busy ? "Salvo…" : me.joined ? "Salva i cambi" : "Iscrivi la squadra"}
        </button>
      </div>

      <section
        className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
        aria-label="Scegli i giocatori"
      >
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-[15px] font-bold">Scegli i giocatori</h2>
          <span className="font-uv text-[22px] text-[#0b2a5b]">
            {picked.length}
            <span className="text-[15px] text-[#8a99b0]">/{ROSTER_SIZE}</span>
          </span>
        </div>
        <div
          className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1"
          role="group"
          aria-label="Filtra per squadra"
        >
          {["tutte", ...FANTA_TEAMS].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTeam(t)}
              aria-pressed={team === t}
              className={`scd-focus h-9 shrink-0 rounded-full px-3 text-[13.5px] font-bold ${team === t ? "bg-[#0b2a5b] text-white" : "bg-[#eef3f9] text-[#3e5272]"}`}
            >
              {t === "tutte"
                ? "Tutte"
                : `${TEAM_LABEL[t]} ${perTeam.get(t) ?? 0}/${PER_TEAM_MAX}`}
            </button>
          ))}
        </div>
        <label className="mt-2 flex h-10 items-center gap-2 rounded-[12px] bg-[#f2f6fb] px-3">
          <Search className="size-4 text-[#5a6b85]" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca un nome"
            className="h-full flex-1 bg-transparent text-[15px] outline-none"
            aria-label="Cerca un nome"
          />
        </label>
        {list.length === 0 ? (
          <p className="m-0 mt-3 text-[14.5px] text-[#3e5272]">
            Nessun giocatore disponibile con questi filtri.
          </p>
        ) : (
          <ul className="m-0 mt-2 grid max-h-[560px] list-none gap-1.5 overflow-y-auto p-0 pr-0.5">
            {list.map((c) => {
              const on = picked.includes(c.athleteId);
              return (
                <li key={c.athleteId}>
                  <button
                    type="button"
                    onClick={() => toggle(c)}
                    aria-pressed={on}
                    className={`scd-focus flex min-h-12 w-full items-center gap-2.5 rounded-[12px] border px-2.5 text-left ${on ? "border-[var(--uv-gold)] bg-[#fff6bf]" : "border-[#dce5f0] bg-white"}`}
                  >
                    <TeamDot team={c.team} />
                    <span className="grid min-w-0 flex-1">
                      <b className="truncate text-[15px]">{c.name}</b>
                      <span className="text-[12.5px] text-[#5a6b85]">
                        {TEAM_LABEL[c.team] ?? c.team}
                        {c.role ? ` · ${ROLE_LABEL[c.role]}` : ""}
                      </span>
                    </span>
                    {c.lastPoints != null && (
                      <span className="text-[13px] font-bold text-[#0b2a5b] tabular-nums">
                        {fmtPoints(c.lastPoints)} pt
                      </span>
                    )}
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full ${on ? "bg-[var(--uv-gold)] text-[#0b1e3a]" : "bg-[#eef3f9] text-transparent"}`}
                    >
                      <Check className="size-4" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <SkyCameo message={sky} onClose={() => setSky(null)} />
    </div>
  );
}

function TeamDot({ team }: { team: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-full font-uv text-[12px] text-white"
      style={{ background: TEAM_COLOR[team] ?? "#5a6b85" }}
    >
      {team === "prima" ? "1ª" : team.toUpperCase()}
    </span>
  );
}

/** The roster drawn on a pitch, one row per role from the goal up; players without a role sit in midfield. */
function Pitch({
  chosen,
  onRemove,
}: {
  chosen: FantaCandidate[];
  onRemove: (c: FantaCandidate) => void;
}) {
  const rows: { role: FantaRole; list: FantaCandidate[] }[] = (
    ["A", "C", "D", "P"] as const
  ).map((r) => ({
    role: r,
    list: chosen.filter((c) => (c.role ?? "C") === r),
  }));
  const empty = ROSTER_SIZE - chosen.length;
  return (
    <section
      aria-label="La tua formazione"
      className="relative overflow-hidden rounded-[20px] bg-[repeating-linear-gradient(180deg,#2f8f4e_0_44px,#2a8447_44px_88px)] px-2 py-4 text-white shadow-[0_2px_10px_rgb(11_42_91/0.12)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 rounded-[10px] border-2 border-white/45"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-3 right-3 top-1/2 border-t-2 border-white/45"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/45"
      />
      <div className="relative flex min-h-[340px] flex-col justify-between gap-3">
        {rows.map(({ role, list }) => (
          <div
            key={role}
            className="flex flex-wrap justify-center gap-2"
            aria-label={ROLE_LABEL[role]}
          >
            {list.length === 0 && role !== "C" ? (
              <span className="rounded-full bg-black/15 px-3 py-1 text-[12.5px] text-white/80">
                {ROLE_LABEL[role]}
              </span>
            ) : (
              list.map((c) => (
                <button
                  key={c.athleteId}
                  type="button"
                  onClick={() => onRemove(c)}
                  className="scd-focus group flex w-[84px] flex-col items-center gap-1"
                  aria-label={`Togli ${c.name}`}
                >
                  <span
                    className="relative grid size-11 place-items-center rounded-full border-2 border-white font-uv text-[13px] shadow-[0_2px_6px_rgb(0_0_0/0.25)]"
                    style={{ background: TEAM_COLOR[c.team] ?? "#5a6b85" }}
                  >
                    {c.team === "prima" ? "1ª" : c.team.toUpperCase()}
                    <X
                      className="absolute -right-1 -top-1 size-4 rounded-full bg-white p-0.5 text-[#0b1e3a] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="max-w-full truncate rounded-[6px] bg-[#0b1e3a]/75 px-1.5 py-0.5 text-[12px] font-semibold">
                    {c.name}
                  </span>
                </button>
              ))
            )}
          </div>
        ))}
        {empty > 0 && (
          <p className="m-0 text-center text-[13px] font-semibold text-white/90">
            {empty === ROSTER_SIZE
              ? "Scegli i giocatori dalla lista per comporre la squadra"
              : `Ancora ${empty} ${empty === 1 ? "posto" : "posti"}`}
          </p>
        )}
      </div>
    </section>
  );
}

function Standings({ data }: { data: FantaPage }) {
  const [season, setSeason] = useState(false);
  const rows: StandingRow[] = season
    ? data.standings.seasonTop
    : data.standings.monthTop;
  const month = data.standings.month
    ? new Intl.DateTimeFormat("it-IT", {
        timeZone: "UTC",
        month: "long",
      }).format(new Date(`${data.standings.month}T12:00:00Z`))
    : new Intl.DateTimeFormat("it-IT", {
        timeZone: "Europe/Rome",
        month: "long",
      }).format(new Date());
  const mine = data.me?.displayName ?? "";
  return (
    <section className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 flex items-center gap-2 text-[15px] font-bold">
          <Trophy className="size-[18px] text-[#AD7616]" aria-hidden="true" />{" "}
          Classifica {season ? "della stagione" : `di ${month}`}
        </h2>
        <div
          className="flex rounded-full bg-[#eef3f9] p-1"
          role="group"
          aria-label="Periodo"
        >
          {[false, true].map((s) => (
            <button
              key={String(s)}
              type="button"
              aria-pressed={season === s}
              onClick={() => setSeason(s)}
              className={`scd-focus h-8 rounded-full px-3 text-[13px] font-bold ${season === s ? "bg-white text-[#0b2a5b] shadow" : "text-[#5a6b85]"}`}
            >
              {s ? "Stagione" : "Mese"}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 mt-3 text-[15px] text-[#3e5272]">
          Ancora nessuna squadra iscritta: la prima sei tu.
        </p>
      ) : (
        <ol className="m-0 mt-2 grid list-none gap-1 p-0">
          {rows.map((r, i) => (
            <li
              key={r.entryId}
              className={`flex items-center gap-3 rounded-[12px] px-2.5 py-2.5 ${r.name === mine ? "bg-[#fff6bf]" : i % 2 ? "bg-[#f8fafd]" : ""}`}
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full font-uv text-[16px] ${i === 0 ? "bg-[var(--uv-gold)] text-[#0b1e3a]" : i < 3 ? "bg-[#0b2a5b] text-white" : "text-[#0b2a5b]"}`}
              >
                {i + 1}
              </span>
              <b className="min-w-0 flex-1 truncate text-[15px]">{r.name}</b>
              <span className="font-uv text-[20px] text-[#0b2a5b] tabular-nums">
                {fmtPoints(r.points)}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="mb-0 mt-3 text-[13px] text-[#5a6b85]">
        Il podio del mese viene premiato in club house insieme al giocatore del
        mese. Premi offerti dalla società, mai in denaro.
      </p>
    </section>
  );
}

function Rules() {
  const rows: [string, string][] = [
    ["Ha giocato", `+${SCORING.played}`],
    ["Gol di attaccante o centrocampista", `+${SCORING.goal}`],
    ["Gol di portiere o difensore", `+${SCORING.goalGkDef}`],
    ["Assist", `+${SCORING.assist}`],
    ["Porta inviolata (portiere, almeno 60')", `+${SCORING.cleanSheet}`],
    ["Ammonizione", fmtPoints(SCORING.yellow)],
    ["Espulsione", String(SCORING.red)],
  ];
  return (
    <div className="grid gap-3.5 lg:grid-cols-2">
      <section className="rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
        <h2 className="m-0 text-[15px] font-bold">Come si gioca</h2>
        <ol className="mb-0 mt-2 grid list-decimal gap-1.5 pl-5 text-[15px] leading-[1.45] marker:font-bold marker:text-[#1e7fd8]">
          <li>Dai un nome alla tua squadra.</li>
          <li>
            Scegli fino a {ROSTER_SIZE} giocatori tra Prima Squadra, Juniores,
            U16 e U15, al massimo {PER_TEAM_MAX} per squadra.
          </li>
          <li>
            Puoi cambiare fino al venerdì alle 20:00: la squadra vale per le
            partite del weekend.
          </li>
          <li>
            Dopo ogni gara il mister compila il tabellino e i punti arrivano da
            soli.
          </li>
          <li>Ogni mese il podio viene premiato in club house.</li>
        </ol>
      </section>
      <section className="rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
        <h2 className="m-0 text-[15px] font-bold">Punti</h2>
        <table className="mt-2 w-full text-[15px]">
          <tbody>
            {rows.map(([k, v]) => (
              <tr
                key={k}
                className="border-t border-[#eef3f9] first:border-t-0"
              >
                <td className="py-2">{k}</td>
                <td
                  className={`py-2 text-right font-bold tabular-nums ${v.startsWith("-") ? "text-[#b4232a]" : "text-[#1d7a4c]"}`}
                >
                  {v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="m-0 flex items-start gap-2 rounded-[14px] bg-[#eef5ff] px-3 py-3 text-[13px] leading-[1.4] text-[#22385c] lg:col-span-2">
        <ShieldCheck
          className="size-[18px] shrink-0 text-[#1e7fd8]"
          aria-hidden="true"
        />
        Gioco gratuito per tutti, senza quote e senza premi in denaro. I ragazzi
        minorenni compaiono solo con nome e iniziale; sotto i 14 anni si gioca
        con l'account della famiglia. Le squadre dell'attività di base non fanno
        parte del gioco.
      </p>
    </div>
  );
}

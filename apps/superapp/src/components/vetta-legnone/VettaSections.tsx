import { Link } from "@tanstack/react-router";
import { ArrowRight, Flag, Lock, Mountain, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import {
  VETTA_AUDIENCES,
  VETTA_BETTER,
  VETTA_CAST,
  VETTA_EPOCHS,
  VETTA_HISTORY_NOTE,
  VETTA_LEVELS,
  VETTA_LEVELS_NOTE,
  VETTA_NEEDS,
  VETTA_NEEDS_STATE_LABEL,
  VETTA_PROFILE_STATUS,
  VETTA_RULES,
  VETTA_STEPS,
  type Need,
} from "@/lib/vetta-legnone";

export function SectionHead({ id, kicker, title, children }: { id: string; kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-4 lg:mb-6">
      <p className="m-0 font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--scd-blue)]">{kicker}</p>
      <h2 id={id} className="m-0 mt-1 font-display text-[26px] font-bold leading-[1.05] text-[var(--scd-navy)] lg:text-[36px]">
        {title}
      </h2>
      {children && <p className="m-0 mt-2 max-w-2xl text-[15px] leading-snug text-[var(--scd-sub)] lg:text-[16px]">{children}</p>}
    </header>
  );
}

/** Initials badge: the cast artwork is not approved yet (UD-174), so only the initial is shown. */
export function CastBadge({ initials, tone }: { initials: string; tone: "navy" | "gold" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-12 shrink-0 items-center justify-center rounded-full font-display text-[22px] font-bold shadow-[inset_0_0_0_2px_rgb(255_255_255/0.5)] ${
        tone === "navy" ? "scd-navy-btn" : "scd-gold"
      }`}
    >
      {initials}
    </span>
  );
}

export function AudienceCtas() {
  return (
    <section aria-labelledby="vl-chi" className="mx-auto max-w-6xl px-4 py-8 lg:py-12" data-testid="vetta-audiences">
      <SectionHead id="vl-chi" kicker="Da dove parti" title="Scegli il tuo sentiero">
        Cinque modi per salire con noi. Ogni pulsante porta a una pagina che funziona già oggi.
      </SectionHead>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-5">
        {VETTA_AUDIENCES.map((a) => (
          <li key={a.id} className="flex flex-col rounded-2xl border border-[var(--scd-line)] bg-white p-4 shadow-[var(--scd-card-shadow)]" data-audience={a.id}>
            <p className="m-0 font-display text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--scd-blue)]">{a.who}</p>
            <p className="m-0 mt-1.5 font-display text-[19px] font-bold leading-[1.15] text-[var(--scd-navy)]">{a.invite}</p>
            <p className="m-0 mt-2 flex-1 text-[14px] leading-snug text-[var(--scd-sub)]">{a.gets}</p>
            <Link
              to={a.cta.to}
              className="scd-gold scd-focus mt-3 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] px-4 font-display text-[16px] font-bold"
              aria-describedby={`vl-hint-${a.id}`}
            >
              {a.cta.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <p id={`vl-hint-${a.id}`} className="m-0 mt-1.5 text-[12.5px] leading-snug text-[var(--scd-sub)]">
              {a.cta.hint}
            </p>
            <p className="m-0 mt-2 inline-flex items-center gap-1.5 self-start rounded-full bg-[var(--scd-page)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--scd-navy)]">
              <span className="rounded-full bg-[var(--scd-navy)] px-1.5 py-px font-display text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--scd-yellow)]">Presto</span>
              {a.soon}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CastIntro() {
  const { lario, ottavio } = VETTA_CAST;
  return (
    <section aria-labelledby="vl-cast" className="scd-band-azzurro text-white" data-testid="vetta-cast">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 lg:grid-cols-2 lg:gap-6 lg:py-10">
        <h2 id="vl-cast" className="sr-only">Chi ti accompagna</h2>
        {[
          { c: lario, tone: "gold" as const },
          { c: ottavio, tone: "navy" as const },
        ].map(({ c, tone }) => (
          <figure key={c.name} className="m-0 flex gap-3 rounded-2xl bg-white/10 p-4 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.25)] lg:p-5">
            <CastBadge initials={c.initials} tone={tone} />
            <div className="min-w-0">
              <figcaption className="font-display text-[17px] font-bold leading-none">
                {c.name} <span className="font-semibold text-[#dbe5f7]">· {c.role}</span>
              </figcaption>
              {c.lines.map((l) => (
                <blockquote key={l} className="m-0 mt-2 text-[15px] leading-snug">
                  «{l}»
                </blockquote>
              ))}
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function HistoryEpochs() {
  return (
    <section aria-labelledby="vl-storia" className="mx-auto max-w-6xl px-4 py-8 lg:py-12" data-testid="vetta-epochs">
      <SectionHead id="vl-storia" kicker="La nostra storia" title="La nostra storia in 6 epoche">
        {VETTA_HISTORY_NOTE}
      </SectionHead>
      <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 lg:grid-cols-3">
        {VETTA_EPOCHS.map((e, i) => (
          <li key={e.id} className="relative overflow-hidden rounded-2xl border border-[var(--scd-line)] bg-white p-4 shadow-[var(--scd-card-shadow)]">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0457af,#1b95d3,#ffd84a)]" />
            <p className="m-0 flex items-baseline gap-2">
              <span className="font-display text-[13px] font-bold text-[var(--scd-sub)]">{i + 1}/6</span>
              <span className="font-display text-[22px] font-bold leading-none text-[var(--scd-blue)]">{e.years}</span>
            </p>
            <h3 className="m-0 mt-1 font-display text-[19px] font-bold text-[var(--scd-navy)]">{e.title}</h3>
            <ul className="m-0 mt-2 grid list-none gap-1 p-0 text-[14px] leading-snug text-[var(--scd-ink)]">
              {e.facts.map((f) => (
                <li key={f} className="flex gap-2">
                  <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[var(--scd-yellow)] shadow-[0_0_0_1px_#b38f00]" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="m-0 mt-3 text-[12px] leading-snug text-[var(--scd-sub)]">Fonte: {e.source}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const NEED_TONE: Readonly<Record<Need["state"], string>> = {
  "da-indicare": "bg-[var(--scd-page)] text-[var(--scd-navy)]",
  "da-confermare": "bg-[#fff6cc] text-[#5c4500]",
  aperto: "bg-[#e3f4ff] text-[#034a96]",
};

export function WhoWeSeek() {
  return (
    <section aria-labelledby="vl-cerchiamo" className="bg-[var(--scd-page)]" data-testid="vetta-needs">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:py-12">
        <SectionHead id="vl-cerchiamo" kicker="Ottavio guarda le rose" title="Chi cerchiamo">
          Lo stato vero di oggi. I ruoli li indica ogni mister e li conferma il direttore sportivo: finché non lo fanno, qui non inventiamo nulla.
        </SectionHead>
        <ul className="m-0 grid list-none gap-2.5 p-0 md:grid-cols-2">
          {VETTA_NEEDS.map((n) => (
            <li key={n.team} className="flex flex-col gap-1.5 rounded-2xl border border-[var(--scd-line)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="m-0 font-display text-[18px] font-bold text-[var(--scd-navy)]">{n.team}</p>
                <p className="m-0 text-[14px] leading-snug text-[var(--scd-sub)]">{n.status}</p>
              </div>
              <span className={`self-start rounded-full px-2.5 py-1 font-display text-[12px] font-bold uppercase tracking-[0.06em] sm:self-center ${NEED_TONE[n.state]}`}>
                {VETTA_NEEDS_STATE_LABEL[n.state]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function LevelLadder() {
  return (
    <section aria-labelledby="vl-salita" className="mx-auto max-w-6xl px-4 py-8 lg:py-12" data-testid="vetta-ladder">
      <SectionHead id="vl-salita" kicker="Come cresce un profilo" title={<>La salita: dalla Riva alla <span className="text-[var(--scd-blue)]">Vetta</span></>}>
        {VETTA_LEVELS_NOTE}
      </SectionHead>
      <ol className="m-0 grid list-none gap-2 p-0 lg:grid-cols-5 lg:gap-3">
        {VETTA_LEVELS.map((l, i) => {
          const top = i === VETTA_LEVELS.length - 1;
          return (
            <li
              key={l.id}
              className={`relative ml-[calc(var(--step)*min(4vw,14px))] flex gap-3 rounded-2xl p-4 lg:ml-0 lg:mt-[calc(var(--rest)*22px)] lg:flex-col lg:gap-2 ${top ? "scd-band text-white" : "border border-[var(--scd-line)] bg-white"}`}
              style={{ ["--step" as string]: i, ["--rest" as string]: VETTA_LEVELS.length - 1 - i }}
              data-level={l.id}
            >
              <span
                aria-hidden="true"
                className={`flex size-10 shrink-0 items-center justify-center rounded-full font-display text-[18px] font-bold ${top ? "scd-gold" : "bg-[var(--scd-page)] text-[var(--scd-navy)]"}`}
              >
                {top ? <Flag className="size-5" /> : i + 1}
              </span>
              <div className="min-w-0">
                <h3 className={`m-0 font-display text-[20px] font-bold leading-none ${top ? "text-[#ffd84a]" : "text-[var(--scd-navy)]"}`}>
                  {l.name} <span className={`text-[14px] font-semibold ${top ? "text-white" : "text-[var(--scd-sub)]"}`}>· {l.meaning}</span>
                </h3>
                <p className={`m-0 mt-1 text-[14px] leading-snug ${top ? "text-[#dbe5f7]" : "text-[var(--scd-sub)]"}`}>{l.how}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex gap-3 rounded-2xl border border-dashed border-[var(--scd-blue)]/50 bg-[#f2f9ff] p-4" role="status" data-testid="vetta-profile-status">
        <Lock className="mt-0.5 size-5 shrink-0 text-[var(--scd-blue)]" aria-hidden="true" />
        <div>
          <p className="m-0 font-display text-[17px] font-bold text-[var(--scd-navy)]">
            {VETTA_PROFILE_STATUS.title} <span className="ml-1 rounded-full bg-[var(--scd-navy)] px-2 py-0.5 align-middle font-display text-[11px] uppercase tracking-[0.08em] text-[var(--scd-yellow)]">In arrivo</span>
          </p>
          <p className="m-0 mt-1 text-[14px] leading-snug text-[var(--scd-sub)]">{VETTA_PROFILE_STATUS.text}</p>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section aria-labelledby="vl-come" className="bg-[var(--scd-page)]">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-2 lg:gap-10 lg:py-12">
        <div>
          <SectionHead id="vl-come" kicker="Tre passi" title="Come funziona" />
          <ol className="m-0 grid list-none gap-3 p-0">
            {VETTA_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span aria-hidden="true" className="scd-gold flex size-9 shrink-0 items-center justify-center rounded-full font-display text-[17px] font-bold">
                  {i + 1}
                </span>
                <div>
                  <h3 className="m-0 font-display text-[18px] font-bold text-[var(--scd-navy)]">{s.title}</h3>
                  <p className="m-0 text-[14.5px] leading-snug text-[var(--scd-sub)]">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <SectionHead id="vl-meglio" kicker="Perché qui è diverso" title="Altrove e qui" />
          <table className="w-full border-separate border-spacing-y-1.5 text-left text-[14px]" aria-labelledby="vl-meglio">
            <thead className="sr-only">
              <tr>
                <th scope="col">Altrove</th>
                <th scope="col">Su Vetta Legnone</th>
              </tr>
            </thead>
            <tbody>
              {VETTA_BETTER.map((b) => (
                <tr key={b.here}>
                  <td className="w-[44%] rounded-l-xl bg-white px-3 py-2.5 align-top text-[var(--scd-sub)] line-through decoration-[var(--scd-red)]/60">{b.elsewhere}</td>
                  <td className="rounded-r-xl bg-white px-3 py-2.5 align-top font-semibold text-[var(--scd-navy)]">
                    <Mountain className="mr-1.5 inline size-4 -translate-y-px text-[var(--scd-blue)]" aria-hidden="true" />
                    {b.here}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function RulesBand() {
  return (
    <section aria-labelledby="vl-regole" className="scd-band text-white" data-testid="vetta-rules">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
        <h2 id="vl-regole" className="m-0 flex items-center gap-2 font-display text-[24px] font-bold lg:text-[30px]">
          <ShieldCheck className="size-6 text-[#ffd84a]" aria-hidden="true" />
          Le regole della montagna
        </h2>
        <ul className="m-0 mt-4 grid list-none gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-5">
          {VETTA_RULES.map((r) => (
            <li key={r.title} className="rounded-2xl bg-white/10 p-4 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)]">
              <h3 className="m-0 font-display text-[17px] font-bold text-[#ffd84a]">{r.title}</h3>
              <p className="m-0 mt-1 text-[14px] leading-snug text-[#dbe5f7]">{r.text}</p>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-4 text-[13.5px] text-[#dbe5f7]">
          Come trattiamo i dati:{" "}
          <Link to="/privacy" className="scd-focus font-semibold text-white underline underline-offset-2">
            informativa privacy
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

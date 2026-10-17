/**
 * «La prima pagina di oggi» on the public home (UD-187, Francesco DG 17/10/2026 16:36–16:40). The Super Giornalista
 * agent writes it every morning (r145, VERIFIED items only) and it goes online by itself: one apertura told big, up to
 * four brevi, the question of the day, then people / sponsor / «dentro l'app». It replaces nothing the agent did not
 * write: with an empty day the block is not shown at all (no invented story, no placeholder).
 *
 * Drawn graphics only (AGENTS.md Grafica: no pitch photos): navy-to-blue band with pitch lines, yellow accents,
 * white cards. Every link is an internal app route checked by the parser (front-page.ts). No minors are named by the
 * agent's rules; nothing here adds personal data.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircleQuestion, Newspaper, Sparkles } from "lucide-react";

import { openAssistant } from "@/lib/assistant-open";
import { frontPageEmpty, type FrontItem, type FrontPage as FrontPageData } from "@/lib/front-page";

const WRAP = "mx-auto w-full max-w-[1240px] px-4 lg:px-8";

function ItemLink({ item, className, children }: { item: FrontItem; className: string; children: React.ReactNode }) {
  if (!item.href) return <div className={className}>{children}</div>;
  // href is an internal path validated by safeHref; the router resolves it as a plain URL.
  return (
    <Link to={item.href as "/"} className={`scd-focus ${className}`}>
      {children}
    </Link>
  );
}

function Apertura({ item }: { item: FrontItem }) {
  return (
    <article
      className="relative overflow-hidden rounded-[22px] bg-[linear-gradient(140deg,#0b2a5b_0%,#123f8a_55%,#1556c4_100%)] text-white shadow-[0_18px_36px_-20px_rgb(11_42_91/0.7)]"
      data-testid="front-apertura"
    >
      {/* drawn pitch lines, decoration only */}
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 top-1/2 size-56 -translate-y-1/2 rounded-full border-[3px] border-white/10 lg:size-80" />
      <span aria-hidden="true" className="pointer-events-none absolute right-[7.5rem] top-0 h-full w-[3px] bg-white/10 lg:right-[10rem]" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-1.5 w-full bg-[#ffd600]" />
      <div className="relative grid gap-3 px-5 pb-6 pt-5 lg:max-w-[760px] lg:px-8 lg:pb-8 lg:pt-7">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#ffd600] px-2.5 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[#0b1e3a]">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {item.kicker || "Oggi"}
        </span>
        <h2 className="m-0 font-display text-[28px] font-bold leading-[1.08] lg:text-[42px]">{item.title}</h2>
        {item.body && <p className="m-0 text-[16px] leading-snug text-[#dfe7f7] lg:text-[18px]">{item.body}</p>}
        {item.href && (
          <Link
            to={item.href as "/"}
            className="scd-focus mt-1 inline-flex min-h-12 w-fit items-center gap-2 rounded-[12px] bg-white px-5 font-display text-[16px] font-semibold text-[#0b2a5b] hover:bg-[#ffd600]"
            data-testid="front-apertura-cta"
          >
            {item.cta || "Scopri"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}

function Breve({ item }: { item: FrontItem }) {
  return (
    <li className="min-w-[78%] snap-start sm:min-w-0">
      <ItemLink
        item={item}
        className="flex h-full flex-col gap-1.5 rounded-[18px] border-l-[5px] border-[#1556c4] bg-white px-4 py-3.5 text-[#0b1e3a] shadow-[0_6px_18px_-12px_rgb(11_42_91/0.45)] transition-transform hover:-translate-y-0.5"
      >
        {item.kicker && <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#1556c4]">{item.kicker}</span>}
        <h3 className="m-0 text-[17px] font-bold leading-snug">{item.title}</h3>
        {item.body && <p className="m-0 line-clamp-3 text-[14px] leading-snug text-[#4a5b78]">{item.body}</p>}
        {item.href && (
          <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[13.5px] font-semibold text-[#1556c4]">
            {item.cta || "Apri"}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </span>
        )}
      </ItemLink>
    </li>
  );
}

function Domanda({ item }: { item: FrontItem }) {
  // The answer lives in the app: one tap opens the club chat with the chosen answer (no vote is stored here).
  return (
    <section
      aria-label="La domanda del giorno"
      className="grid gap-3 rounded-[20px] bg-[#ffd600] px-5 py-4 text-[#0b1e3a] lg:px-6"
      data-testid="front-domanda"
    >
      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.1em]">
        <MessageCircleQuestion className="size-4" aria-hidden="true" />
        {item.kicker || "La domanda del giorno"}
      </span>
      <h3 className="m-0 text-[20px] font-bold leading-snug lg:text-[22px]">{item.title}</h3>
      {item.body && <p className="m-0 text-[14.5px] leading-snug">{item.body}</p>}
      {item.options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => openAssistant(null, `${item.title} ${o}`)}
              className="scd-focus min-h-11 rounded-full bg-[#0b2a5b] px-4 text-[14.5px] font-semibold text-white hover:bg-[#123f8a]"
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function Altra({ item }: { item: FrontItem }) {
  const label = item.kicker || (item.slot === "sponsor" ? "Con noi" : item.slot === "app" ? "Dentro l'app" : "Le persone del club");
  return (
    <li>
      <ItemLink
        item={item}
        className="flex h-full items-start gap-3 rounded-[16px] bg-white px-4 py-3 text-[#0b1e3a] ring-1 ring-[#d6e0ef] hover:ring-[#1556c4]"
      >
        <span className="grid gap-0.5">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#5a6b85]">{label}</span>
          <span className="text-[15.5px] font-bold leading-snug">{item.title}</span>
          {item.body && <span className="line-clamp-2 text-[13.5px] leading-snug text-[#4a5b78]">{item.body}</span>}
        </span>
      </ItemLink>
    </li>
  );
}

export function FrontPage({ page, today }: { page: FrontPageData; today: string }) {
  if (frontPageEmpty(page)) return null;
  const date = new Date(`${today}T12:00:00Z`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Rome",
  });
  return (
    <section aria-labelledby="prima-pagina-t" className={`${WRAP} grid gap-4 pt-4 lg:gap-5 lg:pt-6`} data-testid="front-page">
      <header className="flex items-end justify-between gap-3">
        <h2 id="prima-pagina-t" className="m-0 flex items-center gap-2 font-display text-[15px] font-bold uppercase tracking-[0.12em] text-[#0b2a5b]">
          <Newspaper className="size-4" aria-hidden="true" />
          La prima pagina
        </h2>
        <span className="text-[13px] capitalize text-[#5a6b85]">{date}</span>
      </header>
      {page.apertura && <Apertura item={page.apertura} />}
      {page.brevi.length > 0 && (
        <ul
          className={`m-0 -mx-4 flex snap-x snap-mandatory list-none gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 ${page.brevi.length >= 4 ? "lg:grid-cols-4" : page.brevi.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
          aria-label="Le brevi del giorno"
          data-testid="front-brevi"
        >
          {page.brevi.map((b) => (
            <Breve key={b.id} item={b} />
          ))}
        </ul>
      )}
      {page.domanda && <Domanda item={page.domanda} />}
      {page.altre.length > 0 && (
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3" aria-label="Altro dal club" data-testid="front-altre">
          {page.altre.map((a) => (
            <Altra key={a.id} item={a} />
          ))}
        </ul>
      )}
    </section>
  );
}

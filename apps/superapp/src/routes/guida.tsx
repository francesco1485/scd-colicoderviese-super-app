import { Link, createFileRoute } from "@tanstack/react-router";
import { BookOpen, CircleHelp, PlayCircle, Search, ShieldCheck } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { CastDirectory } from "@/components/scd/CastDirectory";
import {
  FAQ_ENTRIES,
  FEDERAL_DISCLAIMER,
  GUIDE_ROLES,
  ROLE_INTRO,
  ROLE_LABEL,
  cardsFor,
  isFederal,
  isGuideRole,
  itDay,
  searchCards,
  searchFaq,
  type FaqEntry,
  type FaqTopic,
  type GuideCard,
  type GuideRole,
} from "@/lib/guide-content";
import { requestTour } from "@/lib/guide-tour";
import { PUBLIC_PAGES, pageHead } from "@/lib/share";

/**
 * Guida (UD-172, UD-173): the always-available guide of every portal. Same cards as the first-access tour, one section
 * per role, plus the general FAQ and the FIGC / LND / SGS FAQ with sources, all from src/lib/guide-content.ts.
 * Public, no personal data. Deep links: /guida?ruolo=mister#convocazioni (anchor = card id without the role prefix).
 */
interface GuidaSearch {
  ruolo?: GuideRole;
}

export const Route = createFileRoute("/guida")({
  validateSearch: (s: Record<string, unknown>): GuidaSearch => (isGuideRole(s["ruolo"]) ? { ruolo: s["ruolo"] } : {}),
  head: () => pageHead(PUBLIC_PAGES.guida),
  component: Guida,
});

const TOPIC_LABEL: Record<FaqTopic, string> = {
  app: "App e account",
  squadre: "Squadre e convocazioni",
  pulmini: "Pulmini",
  documenti: "Documenti",
  figc: "FIGC",
  lnd: "LND",
  sgs: "Settore Giovanile e Scolastico",
  "tutela-minori": "Tutela dei minori",
};

const GENERAL_TOPICS: readonly FaqTopic[] = ["app", "squadre", "pulmini", "documenti"];

const chip =
  "inline-flex h-11 items-center rounded-full border px-4 text-[15px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--scd-blue)]";

function anchorOf(card: GuideCard): string {
  return card.id.startsWith(`${card.role}-`) ? card.id.slice(card.role.length + 1) : card.id;
}

function CardItem({ card }: { card: GuideCard }) {
  return (
    <li id={anchorOf(card)} className="scroll-mt-24 rounded-2xl border border-border bg-white p-4" data-testid="guida-card">
      <h3 className="m-0 text-[17px] font-bold leading-tight">
        {card.title}
        {card.status === "in-arrivo" && (
          <span className="ml-2 inline-block rounded-full bg-[#fff4b8] px-2 py-0.5 align-middle text-[12px] font-bold text-[#5a4600]">in arrivo</span>
        )}
      </h3>
      <p className="m-0 mt-1.5 text-[15.5px] leading-relaxed text-[#33405a]">{card.body}</p>
      {card.action && card.status === "live" && (
        <Link to={card.action.to as never} className="mt-2 inline-flex min-h-11 items-center font-semibold text-[var(--scd-blue)] underline">
          {card.action.label}
        </Link>
      )}
    </li>
  );
}

function RoleSection({ role, cards }: { role: GuideRole; cards: GuideCard[] }) {
  return (
    <section id={role} aria-labelledby={`${role}-t`} className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${role}-t`} className="m-0 text-[24px] font-bold leading-tight">{ROLE_LABEL[role]}</h2>
          <p className="m-0 mt-1 text-[15px] text-muted-foreground">{ROLE_INTRO[role]}</p>
        </div>
        <button
          type="button"
          onClick={() => requestTour(role)}
          className={`${chip} border-[var(--scd-blue)] bg-white text-[var(--scd-blue)]`}
          data-testid={`guida-tour-${role}`}
        >
          <PlayCircle className="mr-1.5 size-5" aria-hidden="true" /> Rivedi il tour
        </button>
      </div>
      <ol className="m-0 mt-4 grid list-none gap-3 p-0 lg:grid-cols-2">
        {cards.map((c) => (
          <CardItem key={c.id} card={c} />
        ))}
      </ol>
    </section>
  );
}

function FaqItem({ entry }: { entry: FaqEntry }) {
  return (
    <details className="group rounded-xl border border-border bg-white" data-testid="guida-faq">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[16px] font-semibold">
        <span>{entry.q}</span>
        {entry.status === "da-confermare" && (
          <span className="shrink-0 rounded-full bg-[#fff4b8] px-2 py-0.5 text-[12px] font-bold text-[#5a4600]">da confermare</span>
        )}
      </summary>
      <div className="px-4 pb-4">
        <p className="m-0 text-[15.5px] leading-relaxed text-[#33405a]">{entry.a}</p>
        {entry.source && (
          <p className="m-0 mt-2 text-[13.5px] text-muted-foreground">
            Fonte:{" "}
            <a href={entry.source.url} target="_blank" rel="noopener noreferrer" className="underline">
              {entry.source.label}
            </a>{" "}
            · Verificato il {itDay(entry.source.checkedAt)}
          </p>
        )}
        {entry.action && (
          <Link to={entry.action.to as never} className="mt-1 inline-flex min-h-11 items-center font-semibold text-[var(--scd-blue)] underline">
            {entry.action.label}
          </Link>
        )}
      </div>
    </details>
  );
}

function FaqGroup({ title, entries }: { title: string; entries: FaqEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div>
      <h3 className="m-0 text-[17px] font-bold">{title}</h3>
      <div className="mt-2 grid gap-2">
        {entries.map((e) => (
          <FaqItem key={e.id} entry={e} />
        ))}
      </div>
    </div>
  );
}

function Guida() {
  const { ruolo } = Route.useSearch();
  const [query, setQuery] = useState("");
  const searchId = useId();

  const roles = ruolo ? [ruolo] : [...GUIDE_ROLES];
  const q = query.trim();
  const faq = useMemo(() => {
    const byRole = ruolo ? FAQ_ENTRIES.filter((e) => e.roles.includes(ruolo)) : FAQ_ENTRIES;
    return searchFaq(q, byRole);
  }, [q, ruolo]);
  const cardHits = useMemo(() => new Set(searchCards(q).map((c) => c.id)), [q]);
  const general = faq.filter((e) => !isFederal(e));
  const federal = faq.filter(isFederal);
  const sections = roles.map((r) => ({ role: r, cards: cardsFor(r).filter((c) => !q || cardHits.has(c.id)) })).filter((s) => s.cards.length > 0);
  const nothing = q !== "" && sections.length === 0 && faq.length === 0;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10" data-testid="guida">
      <header>
        <p className="m-0 inline-flex items-center gap-2 text-[14px] font-bold uppercase tracking-wide text-[var(--scd-blue)]">
          <BookOpen className="size-4" aria-hidden="true" /> Guida S.C.D. ColicoDerviese
        </p>
        <h1 className="m-0 mt-1 text-[34px] font-bold leading-tight">Come funziona l'app</h1>
        <p className="mt-2 text-[16px] leading-relaxed">
          Scegli chi sei: trovi le schede del tuo ruolo e le domande più frequenti. Per seguire la squadra non serve un account.
        </p>
        <nav aria-label="Scegli il tuo ruolo" className="mt-4 flex flex-wrap gap-2">
          <Link to="/guida" search={{}} className={`${chip} ${!ruolo ? "border-[var(--scd-blue)] bg-[var(--scd-blue)] text-white" : "border-border bg-white"}`} aria-current={!ruolo ? "page" : undefined}>
            Tutti
          </Link>
          {GUIDE_ROLES.map((r) => (
            <Link
              key={r}
              to="/guida"
              search={{ ruolo: r }}
              className={`${chip} ${ruolo === r ? "border-[var(--scd-blue)] bg-[var(--scd-blue)] text-white" : "border-border bg-white"}`}
              aria-current={ruolo === r ? "page" : undefined}
              data-testid={`guida-ruolo-${r}`}
            >
              {ROLE_LABEL[r]}
            </Link>
          ))}
        </nav>
        <div className="mt-4">
          <label htmlFor={searchId} className="text-[15px] font-semibold">Cerca nella guida</label>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Es. convocazione, pulmino, certificato"
              className="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-[16px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--scd-blue)]"
              data-testid="guida-search"
            />
          </div>
          <p className="m-0 mt-1.5 text-[14px] text-muted-foreground" aria-live="polite">
            {q ? `${sections.reduce((n, s) => n + s.cards.length, 0)} schede e ${faq.length} risposte` : ""}
          </p>
        </div>
      </header>

      {sections.map((s) => (
        <RoleSection key={s.role} role={s.role} cards={s.cards} />
      ))}

      <section id="faq" aria-labelledby="faq-t" className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 id="faq-t" className="m-0 inline-flex items-center gap-2 text-[24px] font-bold leading-tight">
          <CircleHelp className="size-6" aria-hidden="true" /> Domande frequenti
        </h2>
        <div className="mt-4 grid gap-5">
          {GENERAL_TOPICS.map((t) => (
            <FaqGroup key={t} title={TOPIC_LABEL[t]} entries={general.filter((e) => e.topic === t)} />
          ))}
        </div>
        {nothing && (
          <p className="m-0 mt-2 text-[15.5px]">
            Nessuna risposta per «{q}». Prova con un'altra parola o scrivi alla Segreteria dalla pagina{" "}
            <Link to="/contatti" className="font-semibold text-[var(--scd-blue)] underline">Contatti</Link>.
          </p>
        )}
      </section>

      {federal.length > 0 && (
        <section id="faq-figc" aria-labelledby="faq-figc-t" className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 id="faq-figc-t" className="m-0 inline-flex items-center gap-2 text-[24px] font-bold leading-tight">
            <ShieldCheck className="size-6" aria-hidden="true" /> FIGC, LND e Settore Giovanile
          </h2>
          <p className="m-0 mt-1 text-[15px] text-muted-foreground">{FEDERAL_DISCLAIMER}</p>
          <div className="mt-4 grid gap-5">
            {(["figc", "lnd", "sgs", "tutela-minori"] as const).map((t) => (
              <FaqGroup key={t} title={TOPIC_LABEL[t]} entries={federal.filter((e) => e.topic === t)} />
            ))}
          </div>
        </section>
      )}

      {!q && (
        <section id="personaggi" aria-labelledby="personaggi-t" className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 id="personaggi-t" className="m-0 text-[24px] font-bold leading-tight">I nostri personaggi</h2>
          <p className="mt-1 text-[15px] text-muted-foreground">Una sola chat, Iride, che risponde a tutto e ti porta dal volto giusto; quattro volti con azioni concrete; e i consigli del giorno.</p>
          <div className="mt-4">
            <CastDirectory />
          </div>
        </section>
      )}

      <p className="m-0 text-[14.5px] text-muted-foreground">
        Dubbi? Scrivi alla segreteria: <b className="select-all">sportclubcolico@gmail.com</b>. Come trattiamo i dati: <Link to="/privacy" className="underline">informativa privacy</Link>.
      </p>
    </main>
  );
}

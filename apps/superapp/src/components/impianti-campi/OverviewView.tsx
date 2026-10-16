/** Panoramica of /gestionale/impianti: one card per 2D work environment, with live numbers from the engine. */
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { ddmm, longDay } from "@/lib/rotation";
import { useImpianti } from "./context";
import { presetLabel } from "./model";
import { SimulationNote } from "./ui";

type EnvPath =
  | "/gestionale/impianti/colico"
  | "/gestionale/impianti/dervio"
  | "/gestionale/impianti/simulazione"
  | "/gestionale/impianti/nuova"
  | "/gestionale/impianti/approvazioni";

export function OverviewView() {
  const { model, canApprove } = useImpianti();
  const r = model.analysis;
  const nextConflict = r.conflictDays.find((d) => d >= model.today) ?? null;
  const dervio = r.dervio.filter((d) => d.match.kind === "match");
  const cards: {
    to: EnvPath;
    title: string;
    text: string;
    stat: string;
    statLabel: string;
  }[] = [
    {
      to: "/gestionale/impianti/colico",
      title: "Colico · mappa 2D",
      text: "Campo 1 e campo 2 per giorno e orario: gare in casa e turni di allenamento.",
      stat: nextConflict ? ddmm(nextConflict) : "—",
      statLabel: nextConflict
        ? `prossimo conflitto sul campo 1 (${longDay(nextConflict)})`
        : "nessun conflitto in arrivo",
    },
    {
      to: "/gestionale/impianti/dervio",
      title: "Dervio · mappa 2D",
      text: "Le otto zone del centro, le gare proposte e gli avvisi alle squadre.",
      stat: String(dervio.length),
      statLabel: `gare a Dervio nello scenario «${presetLabel(model.preset)}»`,
    },
    {
      to: "/gestionale/impianti/simulazione",
      title: "Simulazione",
      text: "Scenari Colico/Dervio, giorno per giorno, con conflitti, luci e inverno.",
      stat: String(r.conflictDays.filter((d) => d >= model.today).length),
      statLabel: "giorni con sovrapposti da oggi",
    },
    {
      to: "/gestionale/impianti/nuova",
      title: "Nuova prenotazione",
      text: "Allenamento, amichevole, torneo, affitto o chiusura con anteprima 2D e invio alla Direzione.",
      stat: String(model.bookings.length),
      statLabel: "ipotesi in questo browser",
    },
  ];
  if (canApprove)
    cards.push({
      to: "/gestionale/impianti/approvazioni",
      title: "Approvazioni",
      text: "Presidente e Direttore generale: proposte dal registro, conflitti ricalcolati, decisione rapida.",
      stat: "—",
      statLabel: "proposte: si leggono dal registro",
    });
  return (
    <div className="grid gap-[18px]">
      <ul className="m-0 grid list-none gap-3 p-0 @[700px]:grid-cols-2 @[1100px]:grid-cols-3">
        {cards.map((c) => (
          <li key={c.to}>
            <Link
              to={c.to}
              className="scd-focus group grid h-full gap-2 rounded-2xl border border-[var(--in-line)] bg-white p-4 shadow-[var(--in-card-shadow)] transition-transform duration-150 hover:border-[var(--in-info)] active:scale-[0.99] motion-reduce:transition-none"
            >
              <span className="flex items-center justify-between gap-2">
                <b className="text-[18px]">{c.title}</b>
                <ArrowRight
                  className="size-5 text-[var(--in-info)]"
                  aria-hidden="true"
                />
              </span>
              <span className="text-[14px] leading-snug text-[var(--in-sub)]">
                {c.text}
              </span>
              <span className="mt-1 flex items-baseline gap-2">
                <b
                  className={`font-title text-[30px] font-black leading-none ${c.stat === "—" || c.stat === "0" ? "text-[var(--in-sub)]" : "text-[var(--in-ink)]"}`}
                >
                  {c.stat}
                  {c.stat === "—" && (
                    <span className="sr-only"> (non disponibile)</span>
                  )}
                </b>
                <span className="text-[13px] text-[var(--in-sub)]">
                  {c.statLabel}
                </span>
              </span>
              <span className="text-[12.5px] font-semibold text-[var(--in-info)]">
                {c.to}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <SimulationNote>
        L'11 ottobre la società ha deciso di valutare le rotazioni con
        simulazioni; il Comune di Dervio è già informato con il programma
        stagionale.
      </SimulationNote>
    </div>
  );
}

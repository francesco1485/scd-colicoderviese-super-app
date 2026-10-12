import { Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";

import { Card, Chip, SourceLine } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import { areaLabel, dueIn, dueText, dueTone } from "@/lib/knowledge";
import type { KbData } from "@/lib/knowledge.functions";

/**
 * Club deadlines from the Cervellone (scd_kb_items with a scadenza, UD-077/UD-080): documents,
 * homologations, bandi, federal obligations. The database decides what each role may see.
 */
export function ClubDeadlinesCard({
  due,
  today,
  id,
  title = "Scadenze del club",
  sub = "Documenti, omologazioni, bandi e obblighi federali con una data, dal Cervellone.",
  limit = 8,
  className = "",
}: {
  due: KbData;
  today: string;
  id: string;
  title?: string;
  sub?: string;
  limit?: number;
  className?: string;
}) {
  const items = (due.result?.items ?? []).filter((it) => it.due).slice(0, limit);
  return (
    <Card id={id} title={title} sub={sub} className={className}>
      <div className="px-4 pb-3 sm:px-[18px]">
        {!due.connected ? (
          <EmptyState title="Entra con il tuo account">Le scadenze compaiono dopo l'accesso personale.</EmptyState>
        ) : due.error ? (
          <EmptyState title="Scadenze non disponibili">{due.error}</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState title="Nessuna scadenza in vista">Le date arrivano dai documenti e dalle comunicazioni catalogate nel Cervellone.</EmptyState>
        ) : (
          <ul className="m-0 list-none divide-y divide-[var(--in-line)] p-0" data-testid={`${id}-list`}>
            {items.map((it) => {
              const days = dueIn(today, it.due!);
              return (
                <li key={it.id} className="flex items-start gap-2 py-2.5">
                  <CalendarClock className="mt-0.5 size-4 flex-none text-[var(--in-sub)]" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-[14.5px] leading-snug">
                    {it.link ? (
                      <a href={it.link} target="_blank" rel="noopener noreferrer" className="font-semibold underline-offset-4 hover:underline">{it.title}</a>
                    ) : (
                      <b>{it.title}</b>
                    )}
                    <small className="block text-[12.5px] text-[var(--in-sub)]">
                      {areaLabel(it.area)} · {it.due!.split("-").reverse().join("/")}
                    </small>
                  </span>
                  <Chip tone={dueTone(days)}>{dueText(days)}</Chip>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <SourceLine>
        Dal Cervellone, aggiornato ogni notte.{" "}
        <Link to="/direzione/cervellone" className="font-semibold underline">Tutte le scadenze</Link>
      </SourceLine>
    </Card>
  );
}

/**
 * «Spegni notizia» (UD-188, Francesco DG 17/10/2026 17:20): the Direzione sees today's Prima pagina written by the Super
 * Giornalista and switches a story, or the whole page, off and on again. The database (r120) checks the DIRECTION role;
 * this card only shows the buttons. The public home applies the switch within about a minute (server cache 30 s).
 */
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Newspaper } from "lucide-react";
import { useState } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import type { FrontPageDesk as Desk } from "@/lib/front-page.functions";
import { setFrontPageHidden } from "@/lib/front-page.functions";

const SLOT_LABEL: Record<string, string> = {
  apertura: "Apertura",
  breve: "Breve",
  domanda: "Domanda del giorno",
  persone: "Persone",
  sponsor: "Sponsor",
  app: "Dentro l'app",
};

export function FrontPageDesk({ desk }: { desk: Desk }) {
  const [hidden, setHidden] = useState<string[]>(desk.hidden ?? []);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(desk.hidden === null ? "Non riesco a leggere l'interruttore: la prima pagina è nascosta per sicurezza finché non torna." : null);
  const toggle = useServerFn(setFrontPageHidden);
  // An unreadable switch hides the whole page on the home (fail closed): show it as off here too.
  const pageOff = hidden.includes("*") || desk.hidden === null;

  async function flip(itemId: string, next: boolean) {
    setBusy(itemId);
    try {
      const r = await toggle({ data: { day: desk.day, itemId, hidden: next } });
      setMsg(r.message);
      if (r.ok) setHidden((h) => (next ? [...new Set([...h, itemId])] : h.filter((x) => x !== itemId)));
    } catch {
      setMsg("Non riuscito, riprova.");
    } finally {
      setBusy(null);
    }
  }

  const btn =
    "scd-focus inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[12px] px-3.5 text-[14px] font-bold";

  return (
    <Card
      id="prima-pagina"
      title="Prima pagina di oggi"
      sub="La scrive ogni mattina il Super Giornalista e va online da sola, solo con notizie verificate. Qui puoi spegnere una notizia o tutta la prima pagina, e riaccenderle."
    >
      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]" data-testid="front-page-desk">
        {msg && (
          <p role="status" className="m-0 rounded-[12px] bg-[#e3eefb] px-3 py-2.5 text-[14px] font-semibold text-[#0b2a5b]">
            {msg}
          </p>
        )}
        {desk.items.length === 0 ? (
          <EmptyState title="Oggi nessuna prima pagina">
            Il Super Giornalista non ha ancora pubblicato le notizie di oggi: sulla home il blocco non compare.
          </EmptyState>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[var(--in-line)] p-3">
              <span className="flex items-center gap-2 text-[15px] font-bold">
                <Newspaper className="size-5" aria-hidden="true" />
                Tutta la prima pagina
                {pageOff ? <Chip tone="crit">Spenta</Chip> : <Chip tone="ok">Online</Chip>}
              </span>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => flip("*", !pageOff)}
                className={`${btn} ${pageOff ? "bg-[var(--uv-gold)] text-[#0b1e3a]" : "border border-[var(--in-line)] bg-white text-[#8a2a1c]"}`}
              >
                {pageOff ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
                {pageOff ? "Riaccendi tutto" : "Spegni tutto"}
              </button>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {desk.items.map((it) => {
                const off = hidden.includes(it.id);
                return (
                  <li key={it.id} className="flex items-start justify-between gap-3 rounded-[14px] border border-[var(--in-line)] p-3">
                    <span className="grid min-w-0 gap-0.5">
                      <span className="flex flex-wrap items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#5a6b85]">
                        {SLOT_LABEL[it.slot] ?? it.slot}
                        {off && <Chip tone="crit">Spenta</Chip>}
                      </span>
                      <span className={`text-[15px] font-bold leading-snug ${off ? "text-[#8a95a8] line-through" : ""}`}>{it.title}</span>
                      {it.body && <span className="line-clamp-2 text-[13.5px] text-[#4a5b78]">{it.body}</span>}
                    </span>
                    <button
                      type="button"
                      disabled={busy !== null || pageOff}
                      onClick={() => flip(it.id, !off)}
                      aria-label={`${off ? "Riaccendi" : "Spegni"}: ${it.title}`}
                      className={`${btn} ${off ? "bg-[var(--uv-gold)] text-[#0b1e3a]" : "border border-[var(--in-line)] bg-white text-[#8a2a1c]"} disabled:opacity-50`}
                    >
                      {off ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
                      {off ? "Riaccendi" : "Spegni"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}

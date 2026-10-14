import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import { AREA_REQUEST_STATUS_LABEL, CONTACT_PREF_LABEL, type AreaRequestStatus, type BoardAreaRequest } from "@/lib/area-requests";
import { decideAreaRequest } from "@/lib/area-requests.functions";

const TONE: Readonly<Record<AreaRequestStatus, ChipTone>> = { NUOVA: "info", IN_CARICO: "info", CONFERMATA: "ok", NON_POSSIBILE: "warn", ANNULLATA: "mute" };

function itDay(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : iso;
}

/**
 * Club House office: order requests for parties and initiatives sent by families with "Lo chef" (UD-114). A person
 * takes the request, confirms it (payment at the till, SQUBY/SumUp) or answers "non possibile". `board` is null while
 * the staged migration r103 is not applied or the caller is not the Club House office: the card says so, nothing is
 * invented.
 */
export function ClubHouseBoardCard({ board }: { board: BoardAreaRequest[] | null }) {
  const decide = useServerFn(decideAreaRequest);
  const [items, setItems] = useState(board ?? []);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  async function act(r: BoardAreaRequest, status: "IN_CARICO" | "CONFERMATA" | "NON_POSSIBILE") {
    setBusy(r.id);
    setNote(null);
    try {
      const res = await decide({ data: { id: r.id, status } });
      setNote(res.message);
      if (res.ok) setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, status } : x)));
    } catch {
      setNote("Non salvato, riprova.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Card id="ch-richieste" title="Richieste d'ordine delle famiglie" sub="Feste e iniziative: una persona conferma, si paga alla cassa. L'app non incassa.">
      <div className="px-4 pb-4 sm:px-[18px]" data-testid="clubhouse-board" data-board-state={board === null ? "off" : "ok"}>
        {board === null ? (
          <EmptyState title="Servizio richieste non ancora attivo">
            Le richieste delle famiglie arriveranno qui quando la Direzione attiva il servizio (migrazione r103 da approvare). Fino ad allora arrivano alla segreteria come messaggio.
          </EmptyState>
        ) : items.length === 0 ? (
          <EmptyState title="Nessuna richiesta aperta">Quando una famiglia manda una richiesta d'ordine la trovi qui.</EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {items.map((r) => (
              <li key={r.id} className="rounded-xl border border-[var(--in-line)] bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0">
                    <b className="block text-[15px]">
                      {r.occasion} · {itDay(r.when)}
                      {r.time ? ` ore ${r.time}` : ""} · {r.people} persone
                    </b>
                    <span className="block text-[14px]">{r.what}</span>
                    <span className="block text-[13px] text-[var(--in-sub)]">
                      {r.requester} · {CONTACT_PREF_LABEL[r.contact]}
                    </span>
                  </span>
                  <Chip tone={TONE[r.status]}>{AREA_REQUEST_STATUS_LABEL[r.status]}</Chip>
                </div>
                {(r.status === "NUOVA" || r.status === "IN_CARICO") && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.status === "NUOVA" && (
                      <button type="button" disabled={busy === r.id} onClick={() => void act(r, "IN_CARICO")} className="scd-focus inline-flex min-h-11 items-center rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14.5px] font-semibold disabled:opacity-60">
                        Prendo in carico
                      </button>
                    )}
                    <button type="button" disabled={busy === r.id} onClick={() => void act(r, "CONFERMATA")} className="scd-focus inline-flex min-h-11 items-center rounded-[10px] bg-[#0f7a28] px-3 text-[14.5px] font-semibold text-white disabled:opacity-60">
                      Confermo
                    </button>
                    <button type="button" disabled={busy === r.id} onClick={() => void act(r, "NON_POSSIBILE")} className="scd-focus inline-flex min-h-11 items-center rounded-[10px] px-3 text-[14.5px] font-semibold text-[var(--in-crit)] disabled:opacity-60">
                      Non possibile
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p role="status" aria-live="polite" className="m-0 mt-2 min-h-[1.2em] text-[13.5px] text-[var(--in-sub)]">
          {note}
        </p>
      </div>
    </Card>
  );
}

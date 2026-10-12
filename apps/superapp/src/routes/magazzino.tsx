import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { Dialog } from "@/components/scd/Dialog";
import { Card, Chip, SourceLine, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { itDateTime } from "@/lib/fees";
import { KITS, KIT_AS_OF, KIT_SEASON, euro, supplierOf } from "@/lib/kit-catalog";
import {
  COMPONENT_LABEL,
  GROUP_STATE_LABEL,
  KIT_SIZES,
  deliveryError,
  groupState,
  kitTotals,
  sumSizes,
  type GroupState,
  type KitGroup,
  type KitOrder,
  type KitSize,
} from "@/lib/kit-order";
import { getKitBoard, setKitDelivered, type KitData } from "@/lib/kit-order.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Magazzino (board Magazzino.dc.html, r83): copy of the kit order SCD_ORDINE_KIT (sizes per group, people still
 * without a size) and deliveries recorded per group and size. Counts only: no names of athletes.
 */
export const Route = createFileRoute("/magazzino")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "magazzino" } });
    const data: KitData = gate.view === "page" ? await getKitBoard() : { connected: false, orders: null, error: null };
    return { gate, interior: gate.view === "page", data };
  },
  head: ({ loaderData }) => workAreaHead("magazzino", loaderData?.gate),
  component: MagazzinoRoute,
});

function MagazzinoRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="magazzino" gate={d.gate}>
      {d.interior && <MagazzinoPage initial={d.data} preview={d.gate.preview} />}
    </WorkAreaGateView>
  );
}

const STATE_TONE: Readonly<Record<GroupState, ChipTone>> = {
  vuoto: "mute",
  "taglie-mancanti": "warn",
  "da-consegnare": "info",
  "in-consegna": "info",
  consegnato: "ok",
};
const btnMain = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#F8D000] px-4 text-[15px] font-bold text-[#062a52] disabled:opacity-50";
const btnGhost = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold disabled:opacity-50";

function MagazzinoPage({ initial, preview }: { initial: KitData; preview: boolean }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const reload = useServerFn(getKitBoard);

  const order: KitOrder | null = data.orders?.[0] ?? null;
  const t = useMemo(() => (order ? kitTotals(order) : null), [order]);
  const current = order?.groups.find((g) => g.key === open) ?? null;

  async function refresh() {
    setBusy(true);
    try {
      setData(await reload());
    } finally {
      setBusy(false);
    }
  }

  function saved(group: string, size: KitSize, n: number) {
    setData((d) => ({
      ...d,
      orders: (d.orders ?? []).map((o) => (o.key !== order?.key ? o : {
        ...o,
        groups: o.groups.map((g) => (g.key !== group ? g : { ...g, delivered: { ...g.delivered, [size]: n } })),
      })),
    }));
  }

  return (
    <WorkAreaShell
      id="magazzino"
      preview={preview}
      highlights={[
        { value: t ? t.people : null, label: "persone nell'ordine kit" },
        { value: t ? t.undefinedCount : null, label: "senza taglia scelta" },
        { value: t ? t.kitsDelivered : null, label: "kit consegnati" },
      ]}
      note={order
        ? <>Copia del foglio SCD_ORDINE_KIT aggiornato il {itDateTime(order.sourceModifiedAt)}. Solo numeri per squadra e taglia: nessun nome.</>
        : <>Ordine kit non ancora disponibile per il tuo ruolo o non ancora copiato.</>}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          {!data.connected && (
            <Card id="mag-accesso" title="Ordine kit">
              <div className="px-4 pb-4 sm:px-[18px]">
                <EmptyState title="Entra con il tuo account">L'ordine kit è visibile a magazzino, Segreteria, Tesoreria e Direzione.</EmptyState>
              </div>
            </Card>
          )}
          {data.connected && !order && (
            <Card id="mag-accesso" title="Ordine kit">
              <div className="px-4 pb-4 sm:px-[18px]">
                <EmptyState title={data.error ?? "Nessun ordine da mostrare"}>
                  {data.error ? "Riprova tra poco." : "L'ordine è visibile a magazzino, Segreteria, Tesoreria e Direzione."}
                </EmptyState>
              </div>
            </Card>
          )}
          {order && t && (
            <>
              <Card id="mag-ordine" title={order.title} sub="Totale per taglia: quanto ordinare al fornitore.">
                <div className="overflow-x-auto px-4 pb-2 sm:px-[18px]">
                  <table className="w-full min-w-[520px] border-collapse text-[14.5px] tabular-nums" data-testid="kit-taglie">
                    <thead>
                      <tr className="text-left text-[13px] text-[var(--in-sub)]">
                        <th scope="col" className="py-2 pr-3 font-semibold">Taglia</th>
                        {KIT_SIZES.map((s) => <th key={s} scope="col" className="px-2 py-2 text-right font-semibold">{s}</th>)}
                        <th scope="col" className="py-2 pl-3 text-right font-semibold">Totale</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-[var(--in-line)]">
                        <th scope="row" className="py-2 pr-3 text-left font-semibold">Kit</th>
                        {KIT_SIZES.map((s) => <td key={s} className="px-2 py-2 text-right">{t.bySize[s] || "·"}</td>)}
                        <td className="py-2 pl-3 text-right font-bold">{t.sized}</td>
                      </tr>
                      {Object.entries(order.components).map(([k, n]) => (
                        <tr key={k} className="border-t border-[var(--in-line)] text-[var(--in-sub)]">
                          <th scope="row" className="py-2 pr-3 text-left font-normal">{COMPONENT_LABEL[k] ?? k} ×{n}</th>
                          {KIT_SIZES.map((s) => <td key={s} className="px-2 py-2 text-right">{t.bySize[s] ? t.bySize[s] * n : "·"}</td>)}
                          <td className="py-2 pl-3 text-right font-semibold text-[var(--in-ink)]">{t.pieces[k]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {t.undefinedCount > 0 && (
                  <p className="mx-4 mb-3 mt-1 rounded-[10px] bg-[var(--in-warn-bg,#fff6d6)] px-3 py-2 text-[14px] sm:mx-[18px]">
                    {t.undefinedCount} persone in {t.groupsToComplete} squadre non hanno ancora la taglia: va scelta nella colonna blu del foglio, poi la copia si aggiorna da sola.
                  </p>
                )}
                <SourceLine>Foglio SCD_ORDINE_KIT_SEMPLICE_TAGLIA_UNICA 2026-27 (Segreteria). Le taglie si cambiano solo nel foglio.</SourceLine>
              </Card>

              <Card id="mag-squadre" title="Squadre" sub="Tocca una squadra per segnare i kit consegnati.">
                <div className="flex justify-end px-4 sm:px-[18px]">
                  <button type="button" onClick={() => void refresh()} disabled={busy} className={btnGhost}>
                    <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />Aggiorna
                  </button>
                </div>
                <ul className="m-0 grid list-none gap-2 px-4 pb-4 pt-3 sm:grid-cols-2 sm:px-[18px]" data-testid="kit-squadre">
                  {order.groups.map((g) => {
                    const st = groupState(g);
                    const ordered = sumSizes(g.sizes);
                    const done = sumSizes(g.delivered);
                    return (
                      <li key={g.key}>
                        <button type="button" onClick={() => setOpen(g.key)} disabled={st === "vuoto"}
                          className="scd-focus flex w-full min-w-0 flex-col gap-1.5 rounded-2xl border border-[var(--in-line)] bg-white p-3 text-left disabled:opacity-60">
                          <span className="flex w-full flex-wrap items-center justify-between gap-2">
                            <b className="text-[15px]">{g.label}</b>
                            <Chip tone={STATE_TONE[st]}>{GROUP_STATE_LABEL[st]}</Chip>
                          </span>
                          <span className="text-[13.5px] text-[var(--in-sub)] tabular-nums">
                            {g.athletes} atleti · {g.staff} staff{g.undefined ? ` · ${g.undefined} senza taglia` : ""}
                          </span>
                          {ordered > 0 && (
                            <span className="flex items-center gap-2 text-[13.5px] tabular-nums">
                              <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--in-line)]" aria-hidden="true">
                                <span className="block h-full rounded-full bg-[#0860A8]" style={{ width: `${Math.round((done / ordered) * 100)}%` }} />
                              </span>
                              {done}/{ordered} consegnati
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="mag-kit" title={`Kit ufficiale ${KIT_SEASON}`} sub={`Dalle tavole dei fornitori, prezzi come stampati, dato al ${KIT_AS_OF.split("-").reverse().join("/")}.`}>
            <ul className="m-0 grid list-none gap-3 px-4 pb-4 sm:px-[18px]" data-testid="kit-catalog">
              {KITS.map((k) => {
                const sup = supplierOf(k);
                return (
                  <li key={k.id} className="grid gap-2 rounded-2xl border border-[var(--in-line)] p-3">
                    <a href={k.board} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-[var(--in-line)] bg-white">
                      <img src={k.board} alt={`Tavola ${k.title}`} loading="lazy" className="block w-full" />
                    </a>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <b className="text-[15px]">{k.title}</b>
                        {k.mandatory && <Chip tone="warn">obbligatorio</Chip>}
                        <Chip tone="info">{euro(k.total)}</Chip>
                      </div>
                      <p className="m-0 mt-0.5 text-[13.5px] text-[var(--in-sub)]">{k.audience} · {sup?.name}{sup?.brand ? ` (${sup.brand})` : ""}</p>
                      <p className="m-0 mt-1.5 text-[13px] leading-snug">{k.items.map((i) => `${i.name} ${euro(i.price)}`).join(" · ")}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <SourceLine>Gli incassi passano dalla Tesoreria. Le tavole sono dei fornitori: non si ridisegnano.</SourceLine>
          </Card>
          <SourcesBox id="magazzino" />
        </div>
      </div>
      {current && order && <DeliveryDialog order={order.key} g={current} onClose={() => setOpen(null)} onSaved={saved} />}
    </WorkAreaShell>
  );
}

function DeliveryDialog({ order, g, onClose, onSaved }: { order: string; g: KitGroup; onClose: () => void; onSaved: (group: string, size: KitSize, n: number) => void }) {
  const sizes = KIT_SIZES.filter((s) => (g.sizes[s] ?? 0) > 0);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(sizes.map((s) => [s, String(g.delivered[s] ?? 0)])));
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = useServerFn(setKitDelivered);

  async function run(size: KitSize, n: number) {
    const err = deliveryError(g, size, n);
    if (err) {
      setMsg({ ok: false, text: err });
      return;
    }
    setBusy(size);
    setMsg(null);
    try {
      const out = await save({ data: { order, group: g.key, size, delivered: n } });
      setMsg({ ok: out.ok, text: out.ok ? `${size}: ${n} su ${g.sizes[size]}. ${out.message}` : out.message });
      if (out.ok) {
        setValues((v) => ({ ...v, [size]: String(n) }));
        onSaved(g.key, size, n);
      }
    } catch {
      setMsg({ ok: false, text: "Operazione non riuscita. Riprova tra poco." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog title={g.label} onClose={onClose} testId="kit-consegna">
      <div className="mt-3 flex flex-col gap-3 text-[14.5px]">
        <p className="m-0 text-[var(--in-sub)]">Kit consegnati per taglia. Ogni modifica resta registrata con il tuo nome e l'ora.</p>
        {g.undefined > 0 && <p className="m-0 rounded-[10px] bg-[var(--in-warn-bg,#fff6d6)] px-3 py-2">{g.undefined} persone senza taglia: da scegliere nel foglio prima dell'ordine.</p>}
        {sizes.length === 0 && <p className="m-0">Nessuna taglia ancora scelta per questa squadra.</p>}
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {sizes.map((s) => {
            const ordered = g.sizes[s] ?? 0;
            const n = Number(values[s] ?? "0");
            return (
              <li key={s} className="flex flex-wrap items-center gap-2 rounded-[12px] border border-[var(--in-line)] p-2">
                <b className="w-12 text-[16px]">{s}</b>
                <label className="flex items-center gap-2">
                  <span className="sr-only">Consegnati taglia {s}</span>
                  <input type="number" inputMode="numeric" min={0} max={ordered} value={values[s] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [s]: e.target.value }))}
                    className="h-11 w-20 rounded-[10px] border border-[var(--in-line)] px-3 text-right text-[15px] tabular-nums" />
                  <span className="tabular-nums text-[var(--in-sub)]">su {ordered}</span>
                </label>
                <span className="ml-auto flex gap-2">
                  <button type="button" disabled={busy !== null} onClick={() => void run(s, n)} className={btnGhost}>Salva</button>
                  <button type="button" disabled={busy !== null || n === ordered} onClick={() => void run(s, ordered)} className={btnMain}>
                    <Check className="size-4" aria-hidden="true" />Tutti
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
        {msg && <p role="status" className={`m-0 rounded-[10px] px-3 py-2 text-[14px] ${msg.ok ? "bg-[var(--in-ok-bg)]" : "bg-[#fdecea]"}`}>{msg.text}</p>}
      </div>
    </Dialog>
  );
}

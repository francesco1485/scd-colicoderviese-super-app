import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { CRM_STAGES, PRIORITY_LABEL, REVENUE_MODULES, SPONSOR_ASSETS } from "@/lib/catalog";
import type { PriorityLevel } from "@/lib/club.types";
import { getDirectionData } from "@/lib/private.functions";

type Data = { leadsActive: boolean; moderationActive: boolean };

/** Dashboard DG: CRM, moderazione, revenue engine, priority engine. Solo con token valido. */
export function DirectionPanel({ token }: { token: string }) {
  const load = useServerFn(getDirectionData);
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    load({ data: { token } }).then((r) => setData({ leadsActive: r.leadsActive, moderationActive: r.moderationActive })).catch(() => setData(null));
  }, [load, token]);

  const Pending = ({ on }: { on?: boolean | undefined }) =>
    on ? null : <span className="rounded bg-accent px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-accent-foreground">API da attivare su R20</span>;

  return (
    <div className="mt-8 space-y-6">
      <section className="card-premium p-5">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Pipeline commerciale</h2><Pending on={data?.leadsActive} /></div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {CRM_STAGES.map((s) => (
            <div key={s.id} className="min-w-36 rounded-xl bg-muted p-3">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest">{s.label}</p>
              <p className="mt-2 font-display text-2xl font-bold">—</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Fonte: direction.leads (sponsor, fornitori, pre-iscrizioni). Nessun dato mostrato finché l'azione non è implementata.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card-premium p-5">
          <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Coda moderazione</h2><Pending on={data?.moderationActive} /></div>
          <p className="mt-2 text-sm text-muted-foreground">Muro, foto, storie, pronostici e ticket in attesa di approvazione. Nulla va online senza consenso.</p>
          <p className="mt-2 text-xs text-muted-foreground">Le segnalazioni safeguarding NON compaiono qui: canale dedicato con accesso ristretto.</p>
        </div>
        <div className="card-premium p-5">
          <h2 className="text-xl font-bold">Priority engine</h2>
          <ul className="mt-3 space-y-1 text-xs">
            {(Object.keys(PRIORITY_LABEL) as unknown as PriorityLevel[]).map((k) => <li key={k} className="rounded bg-muted px-2 py-1">{PRIORITY_LABEL[k]}</li>)}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Ogni contenuto: priorityScore, startAt, endAt, pinned, audience. Il DG può forzare PINNED e priorità dal gestionale.</p>
        </div>
      </section>

      <section className="card-premium p-5">
        <h2 className="text-xl font-bold">Revenue engine</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {[["Valore stimato asset", "—"], ["Impression banner", "—"], ["Click banner", "—"], ["Lead generate", "—"]].map(([l, v]) => (
            <div key={l} className="surface-deep rounded-xl p-3"><p className="text-[0.65rem] uppercase opacity-75">{l}</p><p className="font-display text-2xl font-bold">{v}</p></div>
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Inventory asset ({SPONSOR_ASSETS.length}) · moduli predisposti</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {REVENUE_MODULES.map((m) => <span key={m.id} className="rounded-full border border-border px-2 py-1 text-xs">{m.nome}</span>)}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Nessun pagamento attivo. Metriche disponibili quando il tracciamento impression/click sarà collegato.</p>
      </section>
    </div>
  );
}

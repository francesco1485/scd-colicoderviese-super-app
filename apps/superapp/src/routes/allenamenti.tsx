import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bus } from "lucide-react";

import { BellAction, PageHeader } from "@/components/scd/board";
import { SNAPSHOT_BANNER } from "@/lib/public-snapshots";
import { EMPTY_MESSAGE, appliesToWeek, fieldMatches, findSessions, loadQuadro, logoKeysFor } from "@/lib/public-snapshots";
import juniores from "@/assets/scd/SCD_JUNIORES_2008_2009.png.asset.json";
import piccoli from "@/assets/scd/SCD_PICCOLI_2020_2021.png.asset.json";
import prima from "@/assets/scd/SCD_PRIMA_SQUADRA.png.asset.json";
import primi from "@/assets/scd/SCD_PRIMI_2018_2019.png.asset.json";
import pulcini from "@/assets/scd/SCD_PULCINI_2016_2017.png.asset.json";
import u12 from "@/assets/scd/SCD_U12_2015.png.asset.json";
import u13 from "@/assets/scd/SCD_U13_2014.png.asset.json";
import u15 from "@/assets/scd/SCD_U15_2012_2013.png.asset.json";
import u16 from "@/assets/scd/SCD_U16_2011.png.asset.json";
import planimetria from "@/assets/scd/planimetria_colico.webp.asset.json";

const LOGOS: Record<string, string> = { JUNIORES: juniores.url, PICCOLI: piccoli.url, PRIMA: prima.url, PRIMI: primi.url, PULCINI: pulcini.url, U12: u12.url, U13: u13.url, U15: u15.url, U16: u16.url };
function Logos({ text, size = 22 }: { text: string; size?: number }) {
  const keys = logoKeysFor(text);
  if (!keys.length) return null;
  return <span className="inline-flex shrink-0 gap-0.5">{keys.map((k) => <img key={k} src={LOGOS[k]} alt={`Logo ${k}`} width={size} height={size} loading="lazy" className="rounded-full object-contain" style={{ width: size, height: size }} />)}</span>;
}

export const Route = createFileRoute("/allenamenti")({
  validateSearch: (s: Record<string, unknown>): { annata?: string | undefined } => {
    const v = s["annata"];
    return typeof v === "string" || typeof v === "number" ? { annata: String(v).slice(0, 40) } : {};
  },
  loader: () => loadQuadro(),
  head: () => ({
    meta: [
      { title: "Quadro allenamenti lun-ven — S.C.D. ColicoDerviese" },
      { name: "description", content: "Quadro settimanale degli allenamenti SCD dal lunedì al venerdì: campi, zone e spogliatoi per annata (anteprima non live)." },
      { property: "og:title", content: "Quadro allenamenti — S.C.D. ColicoDerviese" },
      { property: "og:description", content: "Orari, campi e spogliatoi per annata, dal lunedì al venerdì." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Allenamenti,
});

const ROOMS = ["SP1", "SP2", "SP3", "SP4"] as const;

function Allenamenti() {
  const { days, slots, rotations, rooms, note } = Route.useLoaderData();
  const [day, setDay] = useState(days[0] ?? "");
  const [week, setWeek] = useState<"A" | "B">("A");
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  // Filtro annata nell'URL (?annata=), niente storage: link condivisibile e reload stabile.
  const q = search.annata ?? "";
  const setQ = (v: string) => navigate({ search: v.trim() ? { annata: v } : {}, replace: true, resetScroll: false });
  const query = q.trim();
  // Fonte della fascia: solo Campo 1/Campo 2 del master; spogliatoi e rotazioni non includono sessioni.
  const daySlots = slots.filter((s) => s.day === day && (!query || fieldMatches(s.fields.C1, query) || fieldMatches(s.fields.C2, query)));
  const sessions = query ? findSessions(slots, query) : [];
  const dayRot = rotations.filter((r) => appliesToWeek(r.week, week) && r.days.includes(day)).sort((a, b) => a.start - b.start);
  const roomsAt = (start: number) => rooms.filter((r) => appliesToWeek(r.week, week) && r.day === day && r.start <= start && r.end > start);

  return (
    <main className="pb-12" data-screen="allenamenti">
      <PageHeader title="Allenamenti" action={<BellAction dot={false} />} testId="allenamenti-header" />
      <div className="relative z-[5] -mt-[14px] rounded-t-[18px] bg-[var(--scd-page)] px-4 pt-[14px] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-[15px] font-semibold text-[var(--scd-ink)]">Centro sportivo Colico · lunedì–venerdì</p>
          <p className="mt-[2px] text-[13px] text-[var(--scd-sub)]">Fotografia del quadro settimanale: {slots.length} fasce orarie. Sola consultazione.</p>
          <p role="note" className="mt-[8px] inline-block rounded-[7px] bg-[#fff3c4] px-[8px] py-[3px] text-[11.5px] font-bold uppercase tracking-[0.03em] text-[#7a5200]">{SNAPSHOT_BANNER}</p>
        </div>
      </div>

      <div className="sticky top-0 z-30 border-b border-[var(--scd-line)] bg-[var(--scd-page)]/95 px-4 py-3 backdrop-blur sm:px-6 lg:top-[57px]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
          <div className="scd-scroll-x -mx-1 flex w-full gap-[6px] overflow-x-auto px-1 sm:w-auto" role="group" aria-label="Giorno">
            {days.map((d) => <button key={d} onClick={() => setDay(d)} aria-pressed={day === d} className={`h-[40px] min-w-[56px] shrink-0 rounded-[9px] px-3 text-[14px] font-bold capitalize ${day === d ? "bg-[var(--scd-blue)] text-white shadow-[0_2px_5px_rgb(4_87_175/0.35)]" : "bg-white text-[var(--scd-ink)] shadow-[var(--scd-card-shadow)]"}`}>{d.slice(0, 3).toLowerCase()}</button>)}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca annata (es. 2015, U15)" aria-label="Cerca annata" className="h-[42px] min-w-0 flex-1 rounded-[9px] border border-[#cfd5df] bg-white px-3 text-[15px] sm:max-w-xs" />
        </div>
      </div>

      {query && (
        <section aria-label="Settimana dell'annata" className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
          <h2 className="mb-2 text-xl font-bold">Settimana lun–ven · “{query}”</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {days.map((d) => {
              const list = sessions.filter((x) => x.day === d).sort((a, b) => a.start - b.start);
              return (
                <button key={d} onClick={() => setDay(d)} className={`rounded-[12px] border p-3 text-left ${day === d ? "border-[var(--scd-blue)] bg-[#eaf2fc]" : "border-transparent bg-white shadow-[var(--scd-card-shadow)]"}`}>
                  <p className="text-xs font-bold uppercase text-primary">{d}</p>
                  {list.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Nessun allenamento</p> : list.map((x) => (
                    <div key={x.timeLabel + x.field} className="mt-1 flex items-center gap-2">
                      <Logos text={x.text} size={20} />
                      <span className="text-sm"><strong className="font-display">{x.timeLabel}</strong> · Campo {x.field.slice(1)}</span>
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
          {sessions.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Nessuna annata o categoria corrispondente nel quadro.</p>}
        </section>
      )}

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pt-5 sm:px-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <div className="min-w-0">
          <h2 className="mb-3 text-xl font-bold">{day.charAt(0) + day.slice(1).toLowerCase()} · orari e campi</h2>
          {slots.length === 0 ? <p className="text-muted-foreground">{EMPTY_MESSAGE}</p>
            : daySlots.length === 0 ? <p className="text-muted-foreground">Nessuna fascia per questa ricerca.</p>
            : <div className="grid gap-3">
              {daySlots.map((s) => (
                <article key={s.timeLabel + s.start} className="scd-card overflow-hidden">
                  <header className="flex items-center justify-between bg-[var(--scd-blue)] px-3 py-2 text-white"><strong className="text-[17px] font-bold">{s.timeLabel}</strong></header>
                  <div className="grid gap-px bg-border sm:grid-cols-2">
                    {(["C1", "C2"] as const).map((c) => <div key={c} className="bg-card p-3"><p className="text-[0.65rem] font-bold uppercase text-primary">Campo {c.slice(1)}</p><div className="flex items-start gap-2"><Logos text={s.fields[c]} /><p className="whitespace-pre-line text-sm font-semibold">{s.fields[c] || "Nessun allenamento in quadro"}</p></div></div>)}
                  </div>
                  <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
                    {ROOMS.map((r) => <div key={r} className="bg-secondary p-2"><p className="text-[0.65rem] font-bold text-muted-foreground">{r}</p><p className="text-xs font-semibold">{s.rooms[r] && s.rooms[r] !== "—" ? s.rooms[r] : "—"}</p></div>)}
                  </div>
                </article>
              ))}
            </div>}
        </div>

        <aside className="grid content-start gap-5">
          <div className="scd-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Zone campi · indicative</h2>
              <div className="flex rounded-md border border-border" role="group" aria-label="Settimana">
                {(["A", "B"] as const).map((w) => <button key={w} onClick={() => setWeek(w)} className={`h-9 px-3 text-xs font-bold ${week === w ? "surface-sun" : ""}`}>Sett. {w}</button>)}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Scelta manuale: la data di inizio della settimana A non è ancora verificata.</p>
            {dayRot.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nessuna rotazione a zone per questo giorno.</p> : dayRot.map((r) => (
              <figure key={r.timeLabel + r.week} className="mt-4">
                <figcaption className="flex items-center justify-between text-xs font-bold uppercase text-primary"><span>{r.timeLabel}{r.week === "A/B" ? " · A e B" : ""}</span><span className="rounded bg-secondary px-1.5 py-0.5 text-[0.6rem] text-muted-foreground">NON IN SCALA</span></figcaption>
                <div className="mt-2 grid gap-2">
                  {(["C2", "C1"] as const).map((c) => {
                    const zones = Object.entries(r.zones).filter(([k]) => k.startsWith(c));
                    return <div key={c} className="rounded border-2 border-primary/60 bg-primary/10 p-1">
                      <p className="text-center text-[0.6rem] font-bold uppercase text-primary">Campo {c.slice(1)}</p>
                      <div className="mt-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(zones.length, 1)}, minmax(0, 1fr))` }}>{zones.length ? zones.map(([k, v]) => <div key={k} className="flex min-w-0 flex-col items-center gap-1 rounded-sm border border-dashed border-primary/50 bg-card px-1 py-1.5 text-center text-[0.65rem] font-semibold"><Logos text={v} size={26} /><span className="break-words"><span className="text-muted-foreground">{k.slice(-1)} · </span>{v || "—"}</span></div>) : <div className="py-2 text-center text-[0.65rem] text-muted-foreground">—</div>}</div>
                    </div>;
                  })}
                  <div className="grid grid-cols-4 gap-1">
                    {ROOMS.map((id) => { const g = roomsAt(r.start).find((x) => x.id === id)?.group; return <div key={id} className="flex min-w-0 flex-col items-center gap-0.5 rounded-sm border border-border bg-secondary p-1 text-center"><span className="text-[0.6rem] font-bold text-muted-foreground">{id}</span>{g && <Logos text={g} size={18} />}<span className="break-words text-[0.6rem] font-semibold">{g && g !== "—" ? g : "—"}</span></div>; })}
                  </div>
                </div>
              </figure>
            ))}
            <p className="mt-3 text-[0.65rem] text-muted-foreground">{note || "Confini delle zone non certificati sulla planimetria."}</p>
          </div>
          <figure className="scd-card p-4">
            <figcaption className="mb-2 text-lg font-bold">Planimetria Colico</figcaption>
            <img src={planimetria.url} alt="Planimetria fotografica del centro sportivo di Colico" loading="lazy" className="w-full rounded" />
            <p className="mt-2 text-[0.65rem] text-muted-foreground">Foto di riferimento, separata dallo schema: le zone non sono riportate sulla planimetria.</p>
          </figure>
          <div className="scd-card flex gap-3 p-4">
            <Bus className="size-6 shrink-0 text-primary" />
            <div><h2 className="font-bold">Pulmini</h2><p className="text-sm text-muted-foreground">Nessuna corsa di allenamento confermata.</p></div>
          </div>
        </aside>
      </section>
    </main>
  );
}

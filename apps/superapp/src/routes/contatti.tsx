import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Globe, Mail, MapPin, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Field, OutcomeBox, PageHero, SafeguardingStrip, inputCls } from "@/components/ui-kit";
import { TICKET_CATEGORIES } from "@/lib/catalog";
import { CLUB_PROFILE } from "@/lib/club-profile";
import { submitTicket } from "@/lib/club.functions";
import type { SubmitOutcome } from "@/lib/club.types";

export const Route = createFileRoute("/contatti")({
  head: () => ({
    meta: [
      { title: "Parla con noi — Centro contatti SCD ColicoDerviese" },
      { name: "description", content: "Canali ufficiali della S.C.D. ColicoDerviese (mail, PEC, sito, sede in Via Lido SNC a Colico). Segnala una notizia, invia foto, correggi un risultato, proponi un evento o una collaborazione: ogni richiesta diventa un ticket seguito dalla società." },
      { property: "og:title", content: "Parla con noi — SCD ColicoDerviese" },
      { property: "og:description", content: "Centro contatti con ticket per categoria." },
    ],
  }),
  component: Contatti,
});

type Cat = (typeof TICKET_CATEGORIES)[number]["id"];
const empty = { nome: "", email: "", oggetto: "", messaggio: "", link: "" };

function Contatti() {
  const send = useServerFn(submitTicket);
  const [cat, setCat] = useState<Cat>("notizia");
  const [f, setF] = useState(empty);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!privacy) return setErr("Serve il consenso privacy.");
    setBusy(true);
    try {
      const r = await send({ data: { ...f, categoria: cat, privacy: true } });
      setOutcome(r);
      if (r.delivered) setF(empty);
    } catch {
      setErr("Controlla i campi (messaggio di almeno 10 caratteri, link valido).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHero eyebrow="Centro contatti" title={<>Parla <span className="text-accent">con noi</span></>}>
        Scegli la categoria: ogni invio diventa un ticket con stato, assegnato alla persona giusta.
      </PageHero>
      <section className="relative z-10 mx-auto -mt-8 max-w-4xl space-y-4 px-4">
        <OfficialChannels />
        <div className="card-premium p-5">
          <p className="eyebrow">Categoria</p>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {TICKET_CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} className={`rounded-xl border p-3 text-left text-xs font-bold uppercase leading-tight ${cat === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={submit} className="grid gap-4 p-6 card-premium sm:grid-cols-2">
          <Field label="Nome"><input required className={inputCls} value={f.nome} onChange={set("nome")} /></Field>
          <Field label="Email"><input required type="email" className={inputCls} value={f.email} onChange={set("email")} /></Field>
          <div className="sm:col-span-2"><Field label="Oggetto"><input required className={inputCls} value={f.oggetto} onChange={set("oggetto")} /></Field></div>
          <div className="sm:col-span-2"><Field label="Messaggio"><textarea required rows={5} className={inputCls} value={f.messaggio} onChange={set("messaggio")} /></Field></div>
          {(cat === "media" || cat === "notizia") && (
            <div className="sm:col-span-2"><Field label="Link foto/video (opzionale)" hint="Materiale pubblicato solo dopo approvazione."><input type="url" className={inputCls} value={f.link} onChange={set("link")} /></Field></div>
          )}
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="mt-1" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} /> Acconsento al trattamento dei dati per la gestione della richiesta.
          </label>
          <button disabled={busy} className="surface-sun rounded-xl px-5 py-3 text-sm font-bold uppercase disabled:opacity-60 sm:col-span-2">{busy ? "Invio…" : "Apri ticket"}</button>
          {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
          <div className="sm:col-span-2"><OutcomeBox outcome={outcome} /></div>
        </form>
        <SafeguardingStrip />
        <p className="text-xs text-muted-foreground">Le segnalazioni safeguarding hanno un canale separato e non entrano in questa coda.</p>
      </section>
    </main>
  );
}

/** Official channels from the club profile: selectable text, plain links, no form needed. */
function OfficialChannels() {
  const c = CLUB_PROFILE.contacts;
  const row = "flex items-start gap-3 rounded-xl bg-[var(--scd-page)] p-3";
  const label = "block text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--scd-sub)]";
  const value = "block select-text break-all text-[16px] font-semibold text-[var(--scd-ink)]";
  return (
    <section aria-labelledby="canali-t" className="card-premium p-5" data-testid="official-channels">
      <h2 id="canali-t" className="font-title text-[26px] font-black uppercase leading-none text-[var(--scd-ink)]">Canali ufficiali</h2>
      <ul className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
        <li className={row}>
          <Mail className="mt-1 size-5 shrink-0 text-[var(--scd-blue)]" aria-hidden="true" />
          <span className="min-w-0"><span className={label}>Email</span><a href={`mailto:${c.email}`} className={`${value} underline decoration-[var(--scd-blue)]/40`}>{c.email}</a></span>
        </li>
        <li className={row}>
          <ShieldCheck className="mt-1 size-5 shrink-0 text-[var(--scd-blue)]" aria-hidden="true" />
          <span className="min-w-0"><span className={label}>PEC</span><a href={`mailto:${c.pec}`} className={`${value} underline decoration-[var(--scd-blue)]/40`}>{c.pec}</a></span>
        </li>
        <li className={row}>
          <Globe className="mt-1 size-5 shrink-0 text-[var(--scd-blue)]" aria-hidden="true" />
          <span className="min-w-0"><span className={label}>Sito</span>
            <a href={c.site} target="_blank" rel="noopener noreferrer" className={`${value} inline-flex items-center gap-1 underline decoration-[var(--scd-blue)]/40`}>{c.siteLabel}<ExternalLink className="size-3.5 shrink-0" aria-hidden="true" /></a>
          </span>
        </li>
        <li className={row}>
          <MapPin className="mt-1 size-5 shrink-0 text-[var(--scd-blue)]" aria-hidden="true" />
          <span className="min-w-0"><span className={label}>Sede e centro sportivo</span>
            <span className={value}>{c.address}</span>
            <Link to="/impianti" className="mt-1 inline-block text-[14px] font-bold text-[var(--scd-blue)] underline">Mappa dei campi e ingressi</Link>
          </span>
        </li>
      </ul>
    </section>
  );
}

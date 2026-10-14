/**
 * Domanda al Fondo Solidale (UD-113). Two uses:
 *   - "family": a signed-in parent/guardian applies for one of their own children (list from scd_my_family);
 *   - "office": the Fund office records an application received on paper or by e-mail (free beneficiary label and the
 *     Gestionale fee code).
 * ISEE is optional here and stays confidential: only the Direzione and people granted «Fondo Solidale» see it.
 */
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { SIBLING_LABEL, SIBLING_OPTIONS, type SiblingDiscount } from "@/lib/giving";
import { fundSubmitApplication, type ActionResult } from "@/lib/giving.functions";
import type { FamilyMember } from "@/lib/roster.functions";

/** Top-level so inputs keep focus across renders. */
function Labelled({ cls, t, hint, children }: { cls: string; t: string; hint?: string | undefined; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className={cls}>{t}</span>
      {children}
      {hint && <span className="block text-xs opacity-70">{hint}</span>}
    </label>
  );
}

export function FundApplicationForm({
  mode,
  children,
  active,
  inputCls,
  buttonCls,
  labelCls = "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
  onDone,
}: {
  mode: "family" | "office";
  children: readonly FamilyMember[];
  active: boolean;
  inputCls: string;
  buttonCls: string;
  labelCls?: string;
  onDone?: (r: ActionResult) => void;
}) {
  const send = useServerFn(fundSubmitApplication);
  const kids = children.filter((m) => m.relationship !== "SELF" && m.minor !== false);
  const [f, setF] = useState({ child: kids[0]?.personId ?? "", label: "", applicant: "", email: "", phone: "", fee: "", isee: "", iseeExp: "", docs: "", note: "" });
  const [sib, setSib] = useState<SiblingDiscount>("DA_VERIFICARE");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const isee = f.isee.trim() ? Number(f.isee.replace(",", ".")) : null;
  const problem =
    f.applicant.trim().length < 2 ? "Scrivi il nome di chi fa domanda." :
    mode === "family" && !f.child ? "Scegli per chi fai domanda." :
    mode === "office" && f.label.trim().length < 2 && !f.child ? "Indica per chi è la domanda." :
    isee !== null && !(Number.isFinite(isee) && isee >= 0) ? "Valore ISEE non valido." : null;
  const [tried, setTried] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (problem) return;
    if (!active) return setResult({ ok: false, message: "Da attivare: serve l'OK della Direzione per applicare r101." });
    setBusy(true);
    try {
      const kid = kids.find((k) => k.personId === f.child);
      const r = await send({ data: {
        season: "2026/27",
        beneficiaryPersonId: f.child || null,
        beneficiaryLabel: mode === "family" ? (kid ? `${kid.displayName}${kid.birthYear ? ` (${kid.birthYear})` : ""}` : "") : f.label,
        applicantName: f.applicant,
        contactEmail: f.email,
        contactPhone: f.phone,
        feeSourceRecordId: f.fee,
        iseeValue: isee,
        iseeExpiresOn: f.iseeExp || null,
        documentsRef: f.docs,
        householdNote: f.note,
        siblingDiscount: sib,
      } });
      setResult(r);
      onDone?.(r);
    } catch {
      setResult({ ok: false, message: "Invio non riuscito. Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  }

  if (result?.ok) return <p role="status" className="m-0 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">{result.message}</p>;

  return (
    <form onSubmit={submit} noValidate className="space-y-4" data-testid={`fund-apply-${mode}`}>
      <p className="m-0 flex items-start gap-2 text-sm"><Lock className="mt-0.5 size-4 flex-none" aria-hidden="true" />La domanda è riservata: la vedono solo la Direzione e chi la Direzione ha abilitato al Fondo Solidale.</p>
      {mode === "family" ? (
        kids.length > 0 ? (
          <Labelled cls={labelCls} t="Per chi fai domanda">
            <select className={inputCls} value={f.child} onChange={(e) => setF({ ...f, child: e.target.value })}>
              {kids.map((k) => <option key={k.personId} value={k.personId}>{k.displayName}{k.birthYear ? ` (${k.birthYear})` : ""}</option>)}
            </select>
          </Labelled>
        ) : (
          <p className="m-0 text-sm">Non troviamo figli collegati al tuo account: chiedi alla segreteria di collegarli, oppure consegna la domanda in segreteria.</p>
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Labelled cls={labelCls} t="Per chi è (nome e anno)"><input className={inputCls} value={f.label} maxLength={120} onChange={(e) => setF({ ...f, label: e.target.value })} /></Labelled>
          <Labelled cls={labelCls} t="Codice quota nel Gestionale" hint="ATLETA_ID della quota, se c'è: serve al controllo sconto fratelli."><input className={inputCls} value={f.fee} maxLength={60} onChange={(e) => setF({ ...f, fee: e.target.value })} /></Labelled>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Labelled cls={labelCls} t="Chi fa domanda"><input className={inputCls} value={f.applicant} maxLength={120} onChange={(e) => setF({ ...f, applicant: e.target.value })} autoComplete="name" /></Labelled>
        <Labelled cls={labelCls} t="E-mail"><input className={inputCls} type="email" value={f.email} maxLength={120} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Labelled>
        <Labelled cls={labelCls} t="Telefono"><input className={inputCls} value={f.phone} maxLength={30} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" /></Labelled>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labelled cls={labelCls} t="ISEE (facoltativo, riservato)"><input className={inputCls} inputMode="decimal" value={f.isee} onChange={(e) => setF({ ...f, isee: e.target.value })} /></Labelled>
        <Labelled cls={labelCls} t="Scadenza dell'attestazione ISEE"><input className={inputCls} type="date" value={f.iseeExp} onChange={(e) => setF({ ...f, iseeExp: e.target.value })} /></Labelled>
      </div>
      <Labelled cls={labelCls} t="Sconto fratelli" hint="Fondo e sconto fratelli non sono cumulabili.">
        <select className={inputCls} value={sib} onChange={(e) => setSib(e.target.value as SiblingDiscount)}>
          {SIBLING_OPTIONS.map((s) => <option key={s} value={s}>{SIBLING_LABEL[s]}</option>)}
        </select>
      </Labelled>
      <Labelled cls={labelCls} t={mode === "office" ? "Dove sono i documenti" : "Documenti"} hint={mode === "office" ? "Riferimento al file riservato del Fondo (non caricare file qui)." : "I documenti li consegni in segreteria o li manda la segreteria: qui non si caricano file."}>
        <input className={inputCls} value={f.docs} maxLength={200} onChange={(e) => setF({ ...f, docs: e.target.value })} />
      </Labelled>
      <Labelled cls={labelCls} t="Note (facoltative)"><textarea className={inputCls} rows={3} maxLength={1000} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Labelled>
      {tried && problem && <p role="alert" className="m-0 text-sm font-semibold text-destructive">{problem}</p>}
      {result && !result.ok && <p role="alert" className="m-0 rounded-lg bg-accent/20 px-3 py-2 text-sm font-semibold">{result.message}</p>}
      <button type="submit" className={buttonCls} disabled={busy || (mode === "family" && kids.length === 0)}>{busy ? "Invio…" : "Invia la domanda"}</button>
    </form>
  );
}

/**
 * /segreteria/richieste/$id/modulo — printable A4 of the friendly-match request (UD-154), prefilled with the
 * confirmed request and laid out on the fields of the official FIGC-SGS "Scheda richiesta gare amichevoli"
 * (FORM_FIELDS in lib/request-machine.ts). Names and phone numbers of managers and of the Safeguarding officer are
 * written by hand (never stored per request). Signature line for the Presidente / legale rappresentante and the
 * club stamp. The e-mail to the Ufficio Tornei is only a DRAFT to copy: the app never sends it.
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ClipboardCopy, ExternalLink, Printer } from "lucide-react";
import { useState } from "react";

import { WorkAreaGateView, workAreaHead } from "@/components/scd/work-area-ui";
import { romeParts } from "@/lib/home-week";
import {
  FORM_SOURCE,
  FRIENDLY_OFFICE,
  formValues,
  friendlyEmailDraft,
  noticeDeadline,
  teamLabel,
  type FormValue,
  type RequestRow,
} from "@/lib/request-machine";
import { getRequestForm, type RequestFormData } from "@/lib/request-machine.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

export const Route = createFileRoute("/segreteria_/richieste_/$id/modulo")({
  loader: async ({ params }) => {
    const gate = await getWorkAreaGate({ data: { area: "richieste" } });
    if (gate.view !== "page") return { gate, form: null };
    return { gate, form: await getRequestForm({ data: { id: params.id } }) };
  },
  head: ({ loaderData }) => {
    const base = workAreaHead("richieste", loaderData?.gate);
    if (loaderData?.gate.view !== "page") return base;
    return { meta: [{ title: "Modulo amichevole · S.C.D. ColicoDerviese" }, { name: "robots", content: "noindex" }] };
  },
  component: ModuloRoute,
});

const CREST = "/media/brand/logo-scd.webp";

function ModuloRoute() {
  const { gate, form } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="richieste" gate={gate}>
      {form && <ModuloPage form={form} />}
    </WorkAreaGateView>
  );
}

function Back() {
  return (
    <Link to="/segreteria/richieste" className="scd-focus rf-btn">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Richieste
    </Link>
  );
}

function ModuloPage({ form }: { form: RequestFormData }) {
  if (!form.ready || !form.row) {
    return (
      <div className="rf-root">
        <style>{CSS}</style>
        <main className="rf-toolbar" data-testid="request-form-off">
          <div className="rf-toolbar-row">
            <Back />
            <h1 className="rf-toolbar-title">Modulo amichevole</h1>
          </div>
          <p className="rf-warn" role="status">
            {!form.ready
              ? "Funzione in preparazione: le richieste vanno ancora attivate nel database dalla Direzione (migrazione r133)."
              : form.error ?? "Richiesta non trovata."}
          </p>
        </main>
      </div>
    );
  }
  return <Sheet row={form.row} />;
}

function Sheet({ row }: { row: RequestRow }) {
  const values = formValues(row);
  const sections = [...new Set(values.map((v) => v.section))];
  const day = row.startsAt ? romeParts(row.startsAt)?.date ?? null : null;
  const notice = noticeDeadline(row.teamKey, row.scope, day);
  const mail = friendlyEmailDraft(row);
  const [copied, setCopied] = useState<string | null>(null);
  const lnd = row.teamKey === "prima" || row.teamKey === "u19";

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied("manual");
    }
  }

  return (
    <div className="rf-root">
      <style>{CSS}</style>
      <div className="rf-toolbar" data-testid="request-form-toolbar">
        <div className="rf-toolbar-row">
          <Back />
          <h1 className="rf-toolbar-title">Modulo amichevole</h1>
          <button type="button" onClick={() => window.print()} className="scd-focus rf-btn rf-btn-primary" data-testid="request-form-print">
            <Printer className="size-4" aria-hidden="true" />
            Stampa
          </button>
        </div>
        {row.status !== "CONFERMATA" && (
          <p className="rf-warn" role="status">
            Questa richiesta non è ancora confermata: il modulo si stampa solo come promemoria.
          </p>
        )}
        {lnd && (
          <p className="rf-warn" role="status">
            Prima Squadra e Juniores: regole LND da verificare (CU n.1 CR Lombardia non ancora letto). Il modulo qui sotto è quello SGS, usalo solo se il Comitato lo conferma.
          </p>
        )}
        <p className="rf-hint">
          {notice.text} Modello ufficiale:{" "}
          <a href={FORM_SOURCE.url} target="_blank" rel="noopener noreferrer" className="scd-focus rf-link">
            {FORM_SOURCE.name}
            <ExternalLink className="ml-1 inline size-3.5" aria-hidden="true" />
            <span className="sr-only"> (si apre in una nuova scheda)</span>
          </a>{" "}
          · controllato il {FORM_SOURCE.checkedAt.split("-").reverse().join("/")}.
        </p>
        <details className="rf-mail">
          <summary className="scd-focus">Bozza e-mail per l'Ufficio Tornei (da copiare, l'app non la invia)</summary>
          <div className="rf-mail-body">
            <p>
              <b>A:</b> {mail.to} <span className="rf-sub">({FRIENDLY_OFFICE.label}, indirizzo dedotto dalla posta del club: da verificare)</span>
            </p>
            <p>
              <b>Oggetto:</b> {mail.subject}
            </p>
            <pre>{mail.body}</pre>
            <div className="rf-toolbar-row">
              <button type="button" className="scd-focus rf-btn" onClick={() => void copy(mail.subject, "oggetto")}>
                <ClipboardCopy className="size-4" aria-hidden="true" />
                Copia oggetto
              </button>
              <button type="button" className="scd-focus rf-btn" onClick={() => void copy(mail.body, "testo")}>
                <ClipboardCopy className="size-4" aria-hidden="true" />
                Copia testo
              </button>
            </div>
            {copied && (
              <p role="status" className="rf-sub">
                {copied === "manual" ? "Copia non riuscita: seleziona il testo a mano." : `Copiato: ${copied}.`}
              </p>
            )}
          </div>
        </details>
      </div>
      <div className="rf-scroll">
        <article className="rf-sheet" aria-label="Modulo da stampare" data-testid="request-form-sheet">
          <header className="rf-head">
            <img src={CREST} alt="Stemma S.C.D. ColicoDerviese" className="rf-crest" />
            <div className="rf-head-text">
              <p className="rf-club">S.C.D. COLICODERVIESE</p>
              <p className="rf-title">Richiesta gara amichevole</p>
              <p className="rf-sub">{teamLabel(row.teamKey)}</p>
            </div>
          </header>
          {sections.map((s) => (
            <section key={s} className="rf-sec">
              <h2>{s}</h2>
              <dl>
                {values
                  .filter((v) => v.section === s)
                  .map((v) => (
                    <Line key={v.key} v={v} />
                  ))}
              </dl>
            </section>
          ))}
          <section className="rf-sign">
            <div>
              <span className="rf-sign-line" />
              <span>Luogo e data</span>
            </div>
            <div>
              <span className="rf-sign-line" />
              <span>Firma del Presidente / legale rappresentante</span>
            </div>
            <div className="rf-stamp">Timbro della società</div>
          </section>
          <footer className="rf-foot">
            Preparato dalla Segreteria con l'app del club. Righe vuote da compilare a mano: nomi e telefoni non sono salvati
            nell'app. Il modello ufficiale FIGC-SGS chiede il timbro della società; la firma è richiesta dal club.
          </footer>
        </article>
      </div>
    </div>
  );
}

function Line({ v }: { v: FormValue }) {
  return (
    <div className={`rf-line${v.value ? "" : " rf-blank"}`}>
      <dt>{v.label}</dt>
      <dd>{v.value ?? " "}</dd>
    </div>
  );
}

const CSS = `
.rf-root{--rf-navy:#0b2a5b;--rf-blue:#1e5fae;--rf-yellow:#f5c400;--rf-ink:#0d1b3e;--rf-sub:#4a5b78;--rf-line:#c9d5e6;
  background:#e9eef5;min-height:100dvh;padding:16px 16px 40px;box-sizing:border-box;overflow-x:clip;color:var(--rf-ink);font-family:"Fira Sans",system-ui,sans-serif}
.rf-toolbar{max-width:210mm;margin:0 auto 14px;display:flex;flex-direction:column;gap:10px}
.rf-toolbar-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.rf-toolbar-title{flex:1;margin:0;font-size:19px;font-weight:700;text-align:center}
.rf-btn{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border-radius:10px;border:1px solid var(--rf-line);background:#fff;font-size:15px;font-weight:600;color:var(--rf-ink);cursor:pointer;text-decoration:none}
.rf-btn-primary{background:var(--rf-navy);border-color:var(--rf-navy);color:#fff}
.rf-warn{margin:0;padding:8px 12px;border-radius:10px;border:1px solid #f1d3a5;background:#fff8ec;font-size:14.5px}
.rf-hint{margin:0;font-size:14px;color:var(--rf-sub)}
.rf-link{color:var(--rf-blue);font-weight:600}
.rf-sub{color:var(--rf-sub);font-size:13.5px}
.rf-mail{background:#fff;border:1px solid var(--rf-line);border-radius:10px}
.rf-mail summary{min-height:44px;display:flex;align-items:center;padding:0 12px;font-size:15px;font-weight:600;cursor:pointer}
.rf-mail-body{padding:0 12px 12px;display:grid;gap:8px;font-size:14.5px}
.rf-mail-body p{margin:0}
.rf-mail-body pre{margin:0;white-space:pre-wrap;font:14px/1.45 "Fira Sans",system-ui,sans-serif;background:#f6f9fd;border:1px solid var(--rf-line);border-radius:8px;padding:10px}
.rf-scroll{max-width:100%;overflow-x:auto;padding-bottom:4px}
.rf-sheet{width:210mm;min-height:297mm;margin:0 auto;background:#fff;box-shadow:0 6px 30px rgba(11,42,91,.18);padding:12mm 14mm 10mm;
  display:flex;flex-direction:column;gap:4.5mm;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rf-sheet p,.rf-sheet h2,.rf-sheet dl,.rf-sheet dd{margin:0;padding:0}
.rf-head{display:flex;align-items:center;gap:5mm;padding-bottom:3.5mm;border-bottom:1.2mm solid var(--rf-navy);position:relative}
.rf-head::after{content:"";position:absolute;left:0;right:0;bottom:-2.2mm;height:.8mm;background:var(--rf-yellow)}
.rf-crest{width:20mm;height:auto;flex:none}
.rf-head-text{flex:1;min-width:0}
.rf-club{font-family:"Anton","Fira Sans Condensed",Impact,sans-serif;font-size:22pt;line-height:1.05;color:var(--rf-navy)}
.rf-title{font-family:"Fira Sans Condensed","Fira Sans",sans-serif;font-size:14pt;font-weight:800;color:var(--rf-blue);text-transform:uppercase;letter-spacing:.04em}
.rf-sec{margin-top:2mm}
.rf-sec h2{font-family:"Fira Sans Condensed",sans-serif;font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--rf-navy);border-left:1.2mm solid #3fa9f5;padding:1mm 0 1mm 2.5mm;background:#eef4fb;margin-bottom:1.5mm}
.rf-line{display:grid;grid-template-columns:62mm 1fr;gap:3mm;align-items:end;min-height:8mm;border-bottom:.25mm solid var(--rf-line);padding:1mm 0}
.rf-line dt{font-size:9.5pt;color:var(--rf-sub)}
.rf-line dd{font-size:11.5pt;font-weight:600}
.rf-blank dd{border-bottom:.3mm dotted #8a9ab3;min-height:6mm}
.rf-sign{margin-top:auto;display:grid;grid-template-columns:1fr 1.3fr 40mm;gap:6mm;align-items:end;padding-top:10mm}
.rf-sign div{display:flex;flex-direction:column;gap:1.5mm;font-size:9pt;color:var(--rf-sub)}
.rf-sign-line{display:block;border-bottom:.35mm solid var(--rf-ink);height:12mm}
.rf-stamp{height:30mm;border:.35mm dashed var(--rf-line);border-radius:2mm;display:grid!important;place-items:center;text-align:center}
.rf-foot{font-size:7.5pt;color:var(--rf-sub);border-top:.3mm solid var(--rf-line);padding-top:2mm}
@page{size:A4 portrait;margin:0}
@media print{
  html,body{background:#fff!important;margin:0!important;padding:0!important}
  body *{visibility:hidden!important}
  .rf-sheet,.rf-sheet *{visibility:visible!important}
  .rf-root{padding:0!important;background:#fff!important;min-height:0!important}
  .rf-toolbar{display:none!important}
  .rf-scroll{overflow:visible!important;padding:0!important}
  .rf-sheet{position:absolute;left:0;top:0;margin:0;box-shadow:none;height:297mm}
}
`;

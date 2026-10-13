import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useId, useMemo, useState } from "react";

import { WorkAreaGateView, workAreaHead } from "@/components/scd/work-area-ui";
import { crestFor, OpponentCrest } from "@/lib/crests";
import { displayAddress, installUrl } from "@/lib/install-link";
import {
  BASE_ACTIVITY_NOTE,
  parseOpponentList,
  SOCIAL_HANDLES,
  type SpectatorLine,
  type SpectatorSheet,
} from "@/lib/spectator-sheet";
import { getSpectatorSheet } from "@/lib/spectator-sheet.functions";
import { SPONSORS, sponsorLabel } from "@/lib/sponsors";
import { sponsorOfTheDay } from "@/lib/stories";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Distinta spettatori (Direzione 13/10/2026): the second, public version of the pre-distinta, printed on one A4 sheet
 * for the stands at home matches. Same access as the distinta (work area "mister" + team scope on the server).
 * Minors appear as "Luca B.", attività di base without names (rules in lib/spectator-sheet.ts).
 */
export const Route = createFileRoute(
  "/gestionale_/distinta/$eventId/spettatori",
)({
  loader: async ({ params }) => {
    const gate = await getWorkAreaGate({ data: { area: "mister" } });
    if (gate.view !== "page")
      return { gate, interior: false as const, sheet: null };
    const sheet = await getSpectatorSheet({
      data: { eventId: params.eventId },
    });
    return { gate, interior: true as const, sheet };
  },
  head: ({ loaderData }) => {
    const base = workAreaHead("mister", loaderData?.gate);
    if (loaderData?.gate.view !== "page") return base;
    return {
      meta: [
        { title: "Distinta spettatori · S.C.D. ColicoDerviese" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: SpectatorRoute,
});

const CREST = "/media/brand/logo-scd.webp";

function SpectatorRoute() {
  const data = Route.useLoaderData();
  return (
    <WorkAreaGateView id="mister" gate={data.gate}>
      {data.interior && data.sheet && <SpectatorPage sheet={data.sheet} />}
    </WorkAreaGateView>
  );
}

function longDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "Data da definire";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}

function SpectatorPage({ sheet }: { sheet: SpectatorSheet }) {
  const [opponentText, setOpponentText] = useState("");
  const fieldId = useId();

  const opponentLines = useMemo(
    () => parseOpponentList(opponentText, sheet.teamCode, sheet.blankLines),
    [opponentText, sheet.teamCode, sheet.blankLines],
  );

  if (sheet.state !== "ok") {
    const text =
      sheet.state === "not-home"
        ? "La distinta per gli spettatori si stampa solo per le gare in casa."
        : sheet.state === "no-event"
          ? "Gara non trovata nel calendario."
          : sheet.state === "signed-out"
            ? "Accedi per stampare la distinta."
            : "Distinta non disponibile, riprova tra poco.";
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-4 py-10 text-[var(--in-ink,#0d1b3e)]">
        <h1 className="m-0 text-[22px] font-bold">Distinta spettatori</h1>
        <p
          className="m-0 rounded-xl bg-[#f6f9fd] px-3 py-3 text-[15px]"
          role="status"
        >
          {text}
        </p>
        <Link
          to="/gestionale/mister"
          className="scd-focus inline-flex h-11 items-center gap-2 self-start rounded-[10px] border border-[#c9d5e6] bg-white px-3 text-[15px] font-semibold"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Torna alla pagina mister
        </Link>
      </main>
    );
  }

  // 20 players plus a full bench do not fit at the normal row height: tighten rows instead of spilling onto page 2.
  const dense =
    (sheet.players.length || sheet.blankLines) + sheet.staff.length > 22;
  const link = installUrl();
  const address = displayAddress();

  return (
    <div className="ds-root">
      <style>{PRINT_CSS}</style>
      <div className="ds-toolbar" data-testid="spectator-toolbar">
        <div className="ds-toolbar-row">
          <Link to="/gestionale/mister" className="scd-focus ds-btn">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Mister
          </Link>
          <h1 className="ds-toolbar-title">Distinta spettatori</h1>
          <button
            type="button"
            onClick={() => window.print()}
            className="scd-focus ds-btn ds-btn-primary"
            data-testid="spectator-print"
          >
            <Printer className="size-4" aria-hidden="true" />
            Stampa
          </button>
        </div>
        {!sheet.base && sheet.status === "NONE" && (
          <p className="ds-warn" role="status">
            La distinta non è ancora salvata: si stampano righe vuote da
            compilare a mano.
          </p>
        )}
        {!sheet.base && sheet.status === "DRAFT" && (
          <p className="ds-warn" role="status">
            Stampi la bozza salvata. Le modifiche non salvate nella pagina
            mister non compaiono.
          </p>
        )}
        {!sheet.base && (
          <details className="ds-opp">
            <summary className="scd-focus">
              Elenco avversari (facoltativo)
            </summary>
            <label htmlFor={fieldId} className="ds-opp-label">
              Un giocatore per riga, con il numero: «10 Mario Rossi». Non viene
              salvato.{" "}
              {sheet.teamCode === "prima"
                ? ""
                : "Per le giovanili si stampa nome e iniziale del cognome."}
            </label>
            <textarea
              id={fieldId}
              value={opponentText}
              onChange={(e) => setOpponentText(e.target.value)}
              rows={6}
              className="scd-focus ds-opp-input"
            />
          </details>
        )}
        <p className="ds-hint">
          Formato A4 verticale. Nella finestra di stampa scegli «Nessun margine»
          o margini predefiniti, scala 100%.
        </p>
      </div>

      {/* On a phone the A4 preview scrolls inside this box, the page itself never scrolls sideways. */}
      <div className="ds-scroll">
        <article
          className={`ds-sheet${dense ? " ds-dense" : ""}`}
          aria-label="Distinta per gli spettatori"
          data-testid="spectator-sheet"
        >
          <header className="ds-head">
            <img
              src={CREST}
              alt="Stemma ufficiale S.C.D. ColicoDerviese"
              className="ds-crest"
              width={96}
              height={126}
            />
            <div className="ds-head-text">
              <p className="ds-club">S.C.D. ColicoDerviese</p>
              <p className="ds-comp">
                {sheet.competition}
                {sheet.round ? ` · ${sheet.round}` : ""}
              </p>
              <p className="ds-when">
                <span>{longDate(sheet.date)}</span>
                <span className="ds-dot" aria-hidden="true">
                  ·
                </span>
                <span>Calcio d'inizio {sheet.time || "da definire"}</span>
                <span className="ds-dot" aria-hidden="true">
                  ·
                </span>
                <span>{sheet.field}</span>
              </p>
            </div>
            <div className="ds-badge">
              Distinta
              <br />
              spettatori
            </div>
          </header>

          <div className="ds-cols">
            {sheet.base && (
              <img
                src={CREST}
                alt=""
                className="ds-watermark"
                aria-hidden="true"
              />
            )}
            <section className="ds-col" aria-label="Squadra di casa">
              <div className="ds-col-head">
                <img
                  src={CREST}
                  alt=""
                  className="ds-col-crest"
                  width={40}
                  height={52}
                />
                <div>
                  <p className="ds-side">In casa</p>
                  <h2 className="ds-team">ColicoDerviese</h2>
                  <p className="ds-team-sub">{sheet.teamLabel}</p>
                </div>
              </div>
              {sheet.base ? (
                <p className="ds-base">{BASE_ACTIVITY_NOTE}</p>
              ) : (
                <HomeList sheet={sheet} />
              )}
            </section>

            <section className="ds-col" aria-label="Squadra ospite">
              <OpponentHead name={sheet.opponent} />
              {sheet.base ? (
                <p className="ds-base">{BASE_ACTIVITY_NOTE}</p>
              ) : opponentLines.length > 0 ? (
                <Lines lines={opponentLines} title="In distinta" />
              ) : (
                <BlankLines count={sheet.blankLines} />
              )}
            </section>
          </div>

          <SheetFooter date={sheet.date} link={link} address={address} />
        </article>
      </div>
    </div>
  );
}

function HomeList({ sheet }: { sheet: SpectatorSheet }) {
  if (sheet.players.length === 0)
    return <BlankLines count={sheet.blankLines} />;
  const starters = sheet.players.filter((p) => p.starter);
  const others = sheet.players.filter((p) => !p.starter);
  return (
    <>
      {sheet.splitStarters ? (
        <>
          <Lines lines={starters} title="Titolari" />
          {others.length > 0 && <Lines lines={others} title="A disposizione" />}
        </>
      ) : (
        <Lines lines={sheet.players} title="In distinta" />
      )}
      {sheet.staff.length > 0 && (
        <div className="ds-staff">
          <h3 className="ds-sub">In panchina</h3>
          <ul>
            {sheet.staff.map((s, i) => (
              <li key={`${s.role}-${i}`}>
                <span className="ds-role">{s.role}</span>
                <span className="ds-staff-name">{s.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Lines({ lines, title }: { lines: SpectatorLine[]; title: string }) {
  return (
    <div className="ds-group">
      <h3 className="ds-sub">{title}</h3>
      <ol className="ds-lines">
        {lines.map((p) => (
          <li key={p.shirt} className="ds-line">
            <span className="ds-num">{p.shirt}</span>
            <span className="ds-name">{p.name}</span>
            {p.mark && (
              <span
                className="ds-mark"
                aria-label={p.mark === "C" ? "capitano" : "vice capitano"}
              >
                {p.mark}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function BlankLines({ count }: { count: number }) {
  return (
    <div className="ds-group">
      <h3 className="ds-sub">In distinta</h3>
      <ol className="ds-lines" aria-label="Righe da compilare">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="ds-line ds-line-blank">
            <span className="ds-num">{i + 1}</span>
            <span className="ds-name" />
          </li>
        ))}
      </ol>
    </div>
  );
}

function OpponentHead({ name }: { name: string }) {
  const { src, label } = crestFor(name);
  return (
    <div className="ds-col-head">
      {src ? (
        <img
          src={src}
          alt={`Stemma ${label}`}
          className="ds-col-crest ds-opp-crest"
          width={44}
          height={44}
        />
      ) : (
        <OpponentCrest name={name} size={44} />
      )}
      <div>
        <p className="ds-side">Ospiti</p>
        <h2 className="ds-team">{label}</h2>
      </div>
    </div>
  );
}

function SheetFooter({
  date,
  link,
  address,
}: {
  date: string;
  link: string;
  address: string;
}) {
  const partner = useMemo(
    () => (date ? sponsorOfTheDay(SPONSORS, date) : null),
    [date],
  );
  return (
    <footer className="ds-foot">
      <div className="ds-foot-row">
        <div className="ds-partner">
          {partner ? (
            <>
              <p className="ds-foot-title">Partner del giorno</p>
              <img
                src={partner.src}
                alt={sponsorLabel(partner)}
                className="ds-partner-logo"
              />
            </>
          ) : (
            <p className="ds-foot-title">Grazie ai nostri sponsor</p>
          )}
        </div>
        <div className="ds-social">
          <p className="ds-foot-title">Seguici</p>
          <ul>
            {SOCIAL_HANDLES.map((s) => (
              <li key={s.network}>
                <b>{s.network}</b> {s.handle}
              </li>
            ))}
          </ul>
        </div>
        <div className="ds-qr">
          <QrSvg text={link} />
          <div>
            <p className="ds-foot-title">Scarica l'app</p>
            <p className="ds-qr-url">{address}/installa</p>
          </div>
        </div>
      </div>
      <ul className="ds-sponsors" aria-label="Sponsor 2026/27">
        {SPONSORS.map((s) => (
          <li key={s.slug}>
            <img src={s.src} alt={sponsorLabel(s)} />
          </li>
        ))}
      </ul>
      <p className="ds-legal">
        Elenco a cura della società. Per i giocatori minorenni solo nome e
        iniziale del cognome. Vietata la riproduzione online.
      </p>
    </footer>
  );
}

/** QR code drawn as SVG in code (qrcode, already a dependency): nothing is sent to an external service. */
function QrSvg({ text }: { text: string }) {
  const path = useMemo(() => {
    try {
      const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
      const n = qr.modules.size;
      let d = "";
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++)
          if (qr.modules.get(x, y)) d += `M${x + 2} ${y + 2}h1v1h-1z`;
      return { d, size: n + 4 };
    } catch {
      return null;
    }
  }, [text]);
  if (!path) return null;
  return (
    <svg
      viewBox={`0 0 ${path.size} ${path.size}`}
      className="ds-qr-svg"
      role="img"
      aria-label={`Codice QR: ${text}`}
      shapeRendering="crispEdges"
    >
      <rect width={path.size} height={path.size} fill="#ffffff" />
      <path d={path.d} fill="#062a52" />
    </svg>
  );
}

const PRINT_CSS = `
.ds-root{--ds-navy:#0b2a5b;--ds-blue:#1e5fae;--ds-sky:#3fa9f5;--ds-yellow:#f5c400;--ds-ink:#0d1b3e;--ds-sub:#4a5b78;--ds-line:#c9d5e6;
  background:#e9eef5;min-height:100dvh;padding:16px 16px 40px;box-sizing:border-box;overflow-x:clip;color:var(--ds-ink);font-family:"Fira Sans",system-ui,sans-serif}
.ds-toolbar{max-width:210mm;margin:0 auto 14px;display:flex;flex-direction:column;gap:10px}
.ds-toolbar-row{display:flex;align-items:center;gap:10px}
.ds-toolbar-title{flex:1;margin:0;font-size:19px;font-weight:700;text-align:center}
.ds-btn{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border-radius:10px;border:1px solid var(--ds-line);background:#fff;font-size:15px;font-weight:600;color:var(--ds-ink);cursor:pointer;text-decoration:none}
.ds-btn-primary{background:var(--ds-navy);border-color:var(--ds-navy);color:#fff}
.ds-warn{margin:0;padding:8px 12px;border-radius:10px;border:1px solid #f1d3a5;background:#fff8ec;font-size:14px}
.ds-hint{margin:0;font-size:13px;color:var(--ds-sub)}
.ds-opp{background:#fff;border:1px solid var(--ds-line);border-radius:10px}
.ds-opp summary{min-height:44px;display:flex;align-items:center;padding:0 12px;font-size:15px;font-weight:600;cursor:pointer}
.ds-opp-label{display:block;padding:0 12px 6px;font-size:13.5px;color:var(--ds-sub)}
.ds-opp-input{display:block;width:calc(100% - 24px);margin:0 12px 12px;padding:8px;border:1px solid var(--ds-line);border-radius:8px;font:14px/1.4 inherit;resize:vertical}

.ds-scroll{max-width:100%;overflow-x:auto;padding-bottom:4px}
.ds-sheet{width:210mm;height:297mm;margin:0 auto;background:#fff;box-shadow:0 6px 30px rgba(11,42,91,.18);padding:10mm 11mm 8mm;
  display:flex;flex-direction:column;gap:4mm;overflow:hidden;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ds-sheet p,.ds-sheet h2,.ds-sheet h3,.ds-sheet ul,.ds-sheet ol{margin:0;padding:0}
.ds-sheet ul,.ds-sheet ol{list-style:none}
.ds-head{display:flex;align-items:center;gap:5mm;padding-bottom:3.5mm;border-bottom:1.2mm solid var(--ds-navy);position:relative}
.ds-head::after{content:"";position:absolute;left:0;right:0;bottom:-2.2mm;height:.8mm;background:var(--ds-yellow)}
.ds-crest{width:21mm;height:auto;flex:none}
.ds-head-text{flex:1;min-width:0}
.ds-club{font-family:"Anton","Fira Sans Condensed",Impact,sans-serif;font-size:25pt;line-height:1.05;color:var(--ds-navy);letter-spacing:.01em}
.ds-comp{margin-top:1mm!important;font-family:"Fira Sans Condensed","Fira Sans",sans-serif;font-size:12pt;font-weight:700;color:var(--ds-blue)}
.ds-when{margin-top:1mm!important;font-size:10.5pt;color:var(--ds-ink);display:flex;flex-wrap:wrap;gap:0 2mm}
.ds-when span:first-child::first-letter{text-transform:uppercase}
.ds-dot{color:var(--ds-sub)}
.ds-badge{flex:none;align-self:flex-start;background:var(--ds-navy);color:#fff;font-family:"Fira Sans Condensed",sans-serif;font-weight:700;text-transform:uppercase;font-size:9pt;line-height:1.15;letter-spacing:.06em;padding:2mm 3mm;border-radius:1.5mm;text-align:center;border-bottom:1mm solid var(--ds-yellow)}

.ds-cols{flex:1;min-height:0;position:relative;display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:2mm}
.ds-col{position:relative;z-index:1;min-width:0;display:flex;flex-direction:column;gap:2.5mm}
.ds-col-head{display:flex;align-items:center;gap:3mm;padding:2mm 3mm;background:#eef4fb;border-radius:2mm;border-left:1.2mm solid var(--ds-sky)}
.ds-col-crest{width:10mm;height:auto;flex:none}
.ds-opp-crest{height:11mm;width:11mm;object-fit:contain;border-radius:50%;background:#fff}
.ds-col-head svg{width:11mm!important;height:11mm!important}
.ds-side{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--ds-sub)}
.ds-team{font-family:"Fira Sans Condensed","Fira Sans",sans-serif;font-size:14pt;font-weight:800;line-height:1.1;color:var(--ds-navy)}
.ds-team-sub{font-size:9pt;color:var(--ds-sub)}
.ds-group{display:flex;flex-direction:column}
.ds-sub{font-family:"Fira Sans Condensed",sans-serif;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--ds-blue);padding:0 0 .8mm 1mm}
.ds-line{display:flex;align-items:center;gap:2.5mm;height:6.1mm;border-bottom:.25mm solid var(--ds-line)}
.ds-num{flex:none;width:7.5mm;height:5mm;display:grid;place-items:center;background:var(--ds-navy);color:#fff;font-family:"Fira Sans Condensed",sans-serif;font-weight:700;font-size:10pt;border-radius:1mm;font-variant-numeric:tabular-nums}
.ds-line-blank .ds-num{background:#fff;color:var(--ds-sub);border:.3mm solid var(--ds-line)}
.ds-name{flex:1;min-width:0;font-size:11pt;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ds-mark{flex:none;font-size:7.5pt;font-weight:800;background:var(--ds-yellow);color:var(--ds-ink);border-radius:1mm;padding:.3mm 1.2mm}
.ds-staff{margin-top:1mm}
.ds-staff li{display:flex;justify-content:space-between;gap:2mm;font-size:9.5pt;padding:.9mm 1mm;border-bottom:.25mm dashed var(--ds-line)}
.ds-dense .ds-line{height:5.1mm}
.ds-dense .ds-num{height:4.4mm;font-size:9pt}
.ds-dense .ds-name{font-size:10pt}
.ds-dense .ds-col-head{padding:1.5mm 3mm}
.ds-dense .ds-staff li{font-size:8.5pt;padding:.5mm 1mm}
.ds-role{color:var(--ds-sub)}
.ds-staff-name{font-weight:600;text-align:right}
.ds-sheet .ds-base{margin-top:4mm;padding:6mm 4mm;background:#fff;border:.4mm dashed var(--ds-line);border-radius:2mm;text-align:center;font-size:11pt;color:var(--ds-sub)}

.ds-watermark{position:absolute;left:50%;top:58%;width:70mm;transform:translate(-50%,-50%);opacity:.07;pointer-events:none}
.ds-foot{flex:none;display:flex;flex-direction:column;gap:2.5mm;border-top:.4mm solid var(--ds-line);padding-top:3mm}
.ds-foot-row{display:grid;grid-template-columns:1.1fr 1.3fr 1.2fr;gap:4mm;align-items:center}
.ds-foot-title{font-family:"Fira Sans Condensed",sans-serif;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--ds-navy)}
.ds-partner{display:flex;flex-direction:column;gap:1.5mm;align-items:flex-start}
.ds-partner-logo{max-height:13mm;max-width:45mm;object-fit:contain}
.ds-social ul{margin-top:1mm!important;display:grid;grid-template-columns:1fr;gap:.2mm;font-size:8pt;color:var(--ds-ink)}
.ds-social b{color:var(--ds-blue);font-weight:700}
.ds-qr{display:flex;align-items:center;gap:3mm;justify-content:flex-end}
.ds-qr-svg{width:22mm;height:22mm;flex:none}
.ds-qr-url{font-size:8.5pt;font-weight:600;color:var(--ds-ink);word-break:break-all}
.ds-sponsors{display:grid;grid-template-columns:repeat(13,1fr);gap:1.2mm 1.6mm;align-items:center}
.ds-sponsors li{height:8.5mm;display:grid;place-items:center}
.ds-sponsors img{max-width:100%;max-height:8.5mm;object-fit:contain}
.ds-legal{font-size:6.5pt;color:var(--ds-sub);text-align:center}

@page{size:A4 portrait;margin:0}
@media print{
  html,body{background:#fff!important;margin:0!important;padding:0!important}
  body *{visibility:hidden!important}
  .ds-sheet,.ds-sheet *{visibility:visible!important}
  .ds-root{padding:0!important;background:#fff!important;min-height:0!important}
  .ds-toolbar{display:none!important}
  .ds-scroll{overflow:visible!important;padding:0!important}
  .ds-sheet{position:absolute;left:0;top:0;margin:0;box-shadow:none}
}
`;

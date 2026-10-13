import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, CircleDashed, ExternalLink, PlugZap, ShieldAlert, XCircle } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { SYNC_CODE, getCommSetup, setCommSending, verifyCommConnection, type CommOutcome, type CommSetup, type VerifyOutcome } from "@/lib/comm.functions";
import { capSummary } from "@/lib/comm/rules";
import { TRANSPORT_LABEL } from "@/lib/comm/transport";
import { itDateTime } from "@/lib/fees";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Collega la casella (r95, UD-101): the Direzione connects sportclubcolico@gmail.com with a Google "password per le
 * app" (five plain steps, one Render variable) and turns sending on. The page never asks for a secret: the value goes
 * only into the Render environment. The OAuth path stays available for technical setups, folded at the bottom.
 */
export const Route = createFileRoute("/direzione_/posta/collega")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "posta-collega" } });
    const setup: CommSetup | null = gate.view === "page" ? await getCommSetup() : null;
    return { gate, interior: gate.view === "page", setup };
  },
  head: ({ loaderData }) => workAreaHead("posta-collega", loaderData?.gate),
  component: CollegaRoute,
});

function CollegaRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="posta-collega" gate={d.gate}>
      {d.interior && d.setup && <SetupPage initial={d.setup} preview={d.gate.preview} />}
    </WorkAreaGateView>
  );
}

const btn = "scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const code = "rounded bg-[#eef3f9] px-1.5 py-0.5 font-mono text-[13px] text-[var(--in-ink)] [overflow-wrap:anywhere]";
const link = "scd-focus inline-flex items-center gap-1 font-semibold text-[var(--in-info)] underline underline-offset-2 [overflow-wrap:anywhere]";

type EnvKey = Exclude<keyof CommSetup["env"], "mode">;

const APP_ENV_ROWS: ReadonlyArray<{ key: EnvKey; name: string; what: string }> = [
  { key: "appPassword", name: "SCD_GMAIL_APP_PASSWORD", what: "le 16 lettere della password per le app (passo 4)" },
  { key: "serviceKey", name: "SCD_SUPABASE_SECRET_KEY", what: "chiave di servizio del database del club (la imposta chi gestisce il server)" },
  { key: "syncSecret", name: "SCD_COMM_SYNC_SECRET", what: "facoltativa: giro automatico ogni 10 minuti anche quando nessuno apre la posta" },
];

const OAUTH_ENV_ROWS: ReadonlyArray<{ key: EnvKey; name: string }> = [
  { key: "clientId", name: "SCD_GMAIL_CLIENT_ID" },
  { key: "clientSecret", name: "SCD_GMAIL_CLIENT_SECRET" },
  { key: "refreshToken", name: "SCD_GMAIL_REFRESH_TOKEN" },
];

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={link}>
      {children}
      <ExternalLink className="size-3.5 flex-none" aria-hidden="true" />
      <span className="sr-only"> (si apre in una nuova scheda)</span>
    </a>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3 border-t border-[var(--in-line)] px-4 py-4 sm:px-[18px]">
      <span className="grid size-9 flex-none place-items-center rounded-full bg-[var(--in-info)] text-[16px] font-bold text-white" aria-hidden="true">{n}</span>
      <div className="min-w-0 flex-1 text-[15px] leading-relaxed">
        <b className="block text-[16px]">
          <span className="sr-only">Passo {n}: </span>
          {title}
        </b>
        {children}
      </div>
    </li>
  );
}

function EnvRow({ present, name, what, warn }: { present: boolean; name: string; what?: string; warn?: string | null }) {
  return (
    <li className="flex items-start gap-2 text-[14px]">
      {present ? (
        <CheckCircle2 className="mt-0.5 size-[18px] flex-none text-[var(--in-ok)]" aria-hidden="true" />
      ) : (
        <CircleDashed className="mt-0.5 size-[18px] flex-none text-[var(--in-warn)]" aria-hidden="true" />
      )}
      <span className="min-w-0">
        <span className={code}>{name}</span>
        {what && <span className="text-[var(--in-sub)]"> · {what}</span>}
        <span className="sr-only">{present ? " presente" : " mancante"}</span>
        {warn && <span className="mt-0.5 block font-semibold text-[var(--in-warn)]">{warn}</span>}
      </span>
    </li>
  );
}

function SetupPage({ initial, preview }: { initial: CommSetup; preview: boolean }) {
  const [setup, setSetup] = useState(initial);
  const [msg, setMsg] = useState<CommOutcome | null>(null);
  const [checks, setChecks] = useState<VerifyOutcome["checks"]>([]);
  const [busy, setBusy] = useState(false);
  const reload = useServerFn(getCommSetup);
  const toggle = useServerFn(setCommSending);
  const verify = useServerFn(verifyCommConnection);
  const s = setup.inbox?.settings ?? null;
  const env = setup.env;
  const canVerify = env.mode !== "DISABLED" && env.serviceKey;

  async function act(fn: () => Promise<CommOutcome | VerifyOutcome>) {
    setBusy(true);
    try {
      const r = await fn();
      setMsg(r);
      if ("checks" in r) setChecks(r.checks);
      setSetup(await reload());
    } catch {
      setMsg({ ok: false, message: "Operazione non riuscita. Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkAreaShell
      id="posta-collega"
      title="Collega la casella della società"
      preview={preview}
      editable
      highlights={[
        { value: s ? (s.gmailConnected ? 1 : 0) : null, label: s?.gmailConnected ? "casella collegata" : "casella non collegata" },
        { value: s ? (s.sendingEnabled ? 1 : 0) : null, label: s?.sendingEnabled ? "invio attivo" : "invio spento" },
        { value: s ? s.queued : null, label: "mail in coda" },
      ]}
      note="Nessuna password va scritta in questa pagina o in chat: solo nelle variabili di Render."
    >
      <Link to="/gestionale/posta" className={`${btn} w-fit border border-[var(--in-line)] bg-white`}>
        <ArrowLeft className="size-4" aria-hidden="true" /> Torna alla posta del club
      </Link>
      {!setup.connected ? (
        <EmptyState title="Accesso non attivo">Entra con il tuo account della società.</EmptyState>
      ) : !setup.isDirection ? (
        <EmptyState title="Solo Direzione">Il collegamento della casella e l'interruttore dell'invio sono riservati alla Direzione.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <Card id="collega-passi" title="Cinque passi, una volta sola" sub="Con l'account sportclubcolico@gmail.com e il telefono della società. Circa 5 minuti.">
              <ol className="m-0 list-none p-0" data-testid="collega-steps">
                <Step n={1} title="Apri la sicurezza dell'account Google">
                  Vai su <Ext href="https://myaccount.google.com/security">myaccount.google.com/security</Ext> ed entra con <b>sportclubcolico@gmail.com</b> (non con un account personale).
                </Step>
                <Step n={2} title="Verifica in due passaggi: deve essere attiva">
                  Nella stessa pagina apri <Ext href="https://myaccount.google.com/signinoptions/two-step-verification">Verifica in due passaggi</Ext>. Se è già <b>Attiva</b> vai avanti; altrimenti premi «Attiva» e segui Google (chiede un numero di telefono). Senza questo passo Google non mostra le password per le app.
                </Step>
                <Step n={3} title="Crea la password per le app">
                  Apri <Ext href="https://myaccount.google.com/apppasswords">Password per le app</Ext> (se non la trovi, cercala con la lente in alto: «password per le app»). Come nome scrivi <b>Super App SCD</b> e premi <b>Crea</b>. Google mostra <b>16 lettere</b> in quattro gruppi: copiale. Le vede una volta sola: non scriverle qui né in chat.
                </Step>
                <Step n={4} title="Incollala su Render e salva">
                  Su <Ext href="https://dashboard.render.com">dashboard.render.com</Ext> apri il servizio della Super App → <b>Environment</b> → <b>Add Environment Variable</b>. Key: <span className={code}>SCD_GMAIL_APP_PASSWORD</span>, Value: le 16 lettere (gli spazi non contano). Premi <b>Save Changes</b>: il servizio si riavvia in un paio di minuti.
                </Step>
                <Step n={5} title="Torna qui: verifica e attiva l'invio">
                  Ricarica questa pagina e premi <b>Verifica collegamento</b> (non parte nessuna mail). Se invio e ricezione risultano verdi, accendi <b>Invio attivo</b>. Da quel momento i messaggi in coda partono da sportclubcolico@gmail.com e le risposte arrivano nella Posta del club.
                </Step>
              </ol>
            </Card>

            <Card id="collega-render" title="Piano Render e come spegnere" sub="Da sapere prima di attivare.">
              <div className="flex flex-col gap-2 px-4 pb-4 text-[14.5px] leading-relaxed sm:px-[18px]">
                <p className="m-0">
                  Il piano <b>gratuito</b> di Render può bloccare le porte di invio della posta (SMTP). Se la verifica dice «<b>Porta SMTP bloccata dal server</b>», il servizio della Super App va portato al piano <b>Starter</b> (a pagamento) da Render → servizio → <b>Settings</b> → <b>Instance Type</b>. La ricezione delle risposte funziona lo stesso.
                </p>
                <p className="m-0">
                  <b>Per spegnere:</b> spegni «Invio attivo» qui a fianco (si scrivono solo bozze). Per scollegare del tutto, su <Ext href="https://myaccount.google.com/apppasswords">Password per le app</Ext> elimina «Super App SCD» oppure cancella la variabile su Render: l'invio si spegne da solo al giro successivo.
                </p>
              </div>
            </Card>

            <Card id="collega-oauth" title="Alternativa per tecnici: Gmail API (OAuth)" sub="Non serve se usi la password per le app.">
              <details className="px-4 pb-4 sm:px-[18px]">
                <summary className="scd-focus cursor-pointer text-[14.5px] font-semibold text-[var(--in-info)]">Mostra i passi OAuth</summary>
                <ol className="m-0 mt-2 list-decimal pl-5 text-[14px] leading-relaxed text-[var(--in-sub)]">
                  <li>Google Cloud Console con sportclubcolico@gmail.com: progetto «SCD Posta del club», attiva Gmail API.</li>
                  <li>Schermata di consenso Esterna, ambiti <span className={code}>gmail.send</span> e <span className={code}>gmail.readonly</span>, poi «Pubblica app» (in test il collegamento scade ogni 7 giorni).</li>
                  <li>ID client OAuth «Applicazione web» con URI di reindirizzamento <span className={code}>https://developers.google.com/oauthplayground</span>.</li>
                  <li>OAuth Playground con le tue credenziali: autorizza i due ambiti entrando con sportclubcolico@gmail.com e copia il Refresh token.</li>
                  <li>Su Render le tre variabili qui sotto. Se sono presenti, hanno la precedenza sulla password per le app.</li>
                </ol>
                <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0" data-testid="collega-env-oauth">
                  {OAUTH_ENV_ROWS.map((r) => (
                    <EnvRow key={r.key} present={!!env[r.key]} name={r.name} />
                  ))}
                </ul>
              </details>
            </Card>
          </div>

          <div className="flex min-w-0 flex-col gap-[18px]">
            <Card id="collega-stato" title="Stato" sub={s ? `Casella ${s.mailbox}` : undefined}>
              <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
                <div className="flex flex-wrap gap-1.5">
                  {s?.gmailConnected ? <Chip tone="ok">Collegata dal {itDateTime(s.connectedAt)}</Chip> : <Chip tone="warn">Non collegata</Chip>}
                  <Chip tone={env.mode === "DISABLED" ? "mute" : "info"}>{TRANSPORT_LABEL[env.mode]}</Chip>
                  {s?.lastSyncAt && <Chip tone="mute">Ultimo controllo {itDateTime(s.lastSyncAt)}</Chip>}
                </div>
                {setup.lastCode && SYNC_CODE[setup.lastCode] && <p className="m-0 text-[14px] font-semibold text-[var(--in-warn)]">{SYNC_CODE[setup.lastCode]}</p>}
                {s && s.gmailConnected && <p className="m-0 text-[14px] text-[var(--in-sub)]">{capSummary({ sentToday: s.sentToday, cap: s.dailyCap, queued: s.queued })}</p>}
                <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="collega-env">
                  {APP_ENV_ROWS.map((r) => (
                    <EnvRow
                      key={r.key}
                      present={!!env[r.key]}
                      name={r.name}
                      what={r.what}
                      warn={r.key === "appPassword" && env.appPassword && !env.appPasswordShape ? "Non sembra una password per le app (16 lettere): ricontrolla il passo 3." : null}
                    />
                  ))}
                </ul>
                <button type="button" className={`${btn} bg-[var(--in-info)] text-white`} disabled={busy || !canVerify} onClick={() => void act(() => verify())} data-testid="collega-verify">
                  <PlugZap className="size-4" aria-hidden="true" /> {busy ? "Verifica in corso…" : "Verifica collegamento"}
                </button>
                {!canVerify && (
                  <p className="m-0 text-[13px] text-[var(--in-sub)]">
                    {env.mode === "DISABLED" ? "Si attiva quando la password per le app è su Render (passo 4) e il servizio si è riavviato." : "Manca la chiave di servizio del database sul server: chiedila a chi gestisce Render."}
                  </p>
                )}
                {checks.length > 0 && (
                  <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="collega-checks">
                    {checks.map((c) => (
                      <li key={c.id} className="flex items-start gap-2 text-[14px]">
                        {c.ok ? <CheckCircle2 className="mt-0.5 size-[18px] flex-none text-[var(--in-ok)]" aria-hidden="true" /> : <XCircle className="mt-0.5 size-[18px] flex-none text-[var(--in-crit)]" aria-hidden="true" />}
                        <span className="min-w-0">
                          <b>{c.label}</b>
                          <span className="sr-only">{c.ok ? ": riuscito" : ": non riuscito"}</span>
                          <span className="block text-[var(--in-sub)]">{c.message}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
            <Card id="collega-invio" title="Invio attivo" sub="Solo Direzione. Spento: si scrivono bozze, nessuna mail parte.">
              <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
                <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[var(--in-line)] px-3.5">
                  <span className="text-[15.5px] font-bold">{s?.sendingEnabled ? "Invio attivo" : "Invio spento"}</span>
                  <input
                    type="checkbox"
                    role="switch"
                    className="scd-focus size-6 accent-[var(--in-info)]"
                    checked={!!s?.sendingEnabled}
                    disabled={busy || !s?.gmailConnected}
                    aria-checked={!!s?.sendingEnabled}
                    onChange={(e) => void act(() => toggle({ data: { enabled: e.target.checked } }))}
                    data-testid="collega-toggle"
                  />
                </label>
                {!s?.gmailConnected && <p className="m-0 text-[13px] text-[var(--in-sub)]">Si può attivare solo con la casella collegata (invio e ricezione verdi).</p>}
                <p className="m-0 flex items-start gap-2 text-[13.5px] leading-snug text-[var(--in-sub)]">
                  <ShieldAlert className="mt-0.5 size-4 flex-none text-[var(--in-warn)]" aria-hidden="true" />
                  Gmail consente circa 500 destinatari al giorno: l'app si ferma a {s?.dailyCap ?? 400} e manda il resto il giorno dopo. Se Google rifiuta la password o il server non può inviare, l'invio si spegne da solo.
                </p>
              </div>
            </Card>
            {msg && (
              <div role="status" className={`rounded-xl border px-3.5 py-2.5 text-[14.5px] font-semibold ${msg.ok ? "border-[#bfe3cd] bg-[var(--in-ok-bg)]" : "border-[#f3c1bb] bg-[var(--in-crit-bg)]"}`} data-testid="collega-msg">
                {msg.message}
              </div>
            )}
          </div>
        </div>
      )}
    </WorkAreaShell>
  );
}

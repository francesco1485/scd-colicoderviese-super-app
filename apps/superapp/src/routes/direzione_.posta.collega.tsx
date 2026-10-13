import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, CircleDashed, PlugZap, ShieldAlert } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { SYNC_CODE, getCommSetup, runCommSyncNow, setCommSending, type CommOutcome, type CommSetup } from "@/lib/comm.functions";
import { capSummary } from "@/lib/comm/rules";
import { itDateTime } from "@/lib/fees";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Collega la casella (r95): the Direzione connects sportclubcolico@gmail.com with its own Google OAuth client and
 * turns sending on. The page never asks for a secret: values go only into the Render environment.
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

const ENV_ROWS: ReadonlyArray<{ key: keyof CommSetup["env"]; name: string; what: string }> = [
  { key: "clientId", name: "SCD_GMAIL_CLIENT_ID", what: "ID client OAuth (passo 3)" },
  { key: "clientSecret", name: "SCD_GMAIL_CLIENT_SECRET", what: "segreto client OAuth (passo 3)" },
  { key: "refreshToken", name: "SCD_GMAIL_REFRESH_TOKEN", what: "token di aggiornamento della casella (passo 4)" },
  { key: "serviceKey", name: "SCD_SUPABASE_SECRET_KEY", what: "chiave di servizio del database del club (passo 5)" },
  { key: "syncSecret", name: "SCD_COMM_SYNC_SECRET", what: "frase casuale di almeno 32 caratteri per il giro automatico (passo 5)" },
];

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

function SetupPage({ initial, preview }: { initial: CommSetup; preview: boolean }) {
  const [setup, setSetup] = useState(initial);
  const [msg, setMsg] = useState<CommOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = useServerFn(getCommSetup);
  const toggle = useServerFn(setCommSending);
  const sync = useServerFn(runCommSyncNow);
  const s = setup.inbox?.settings ?? null;
  const allEnv = Object.values(setup.env).every(Boolean);

  async function act(fn: () => Promise<CommOutcome>) {
    setBusy(true);
    try {
      setMsg(await fn());
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
        { value: Object.values(setup.env).filter(Boolean).length, label: "variabili su 5 presenti sul server" },
        { value: s ? s.queued : null, label: "mail in coda" },
      ]}
      note="Nessun codice o password va scritto in questa pagina o in chat: solo nelle variabili di Render."
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
          <Card id="collega-passi" title="Cinque passi, una volta sola" sub="Da fare con l'account sportclubcolico@gmail.com. Circa 15 minuti.">
            <ol className="m-0 list-none p-0" data-testid="collega-steps">
              <Step n={1} title="Progetto Google Cloud e Gmail API">
                Entra su <span className={code}>console.cloud.google.com</span> con sportclubcolico@gmail.com, crea il progetto «SCD Posta del club», poi in «API e servizi → Libreria» attiva <b>Gmail API</b>.
              </Step>
              <Step n={2} title="Schermata di consenso OAuth">
                Tipo <b>Esterno</b>, nome app «SCD Posta del club», email di supporto la casella del club. Ambiti: <span className={code}>gmail.send</span> e{" "}
                <span className={code}>gmail.readonly</span>. Aggiungi sportclubcolico@gmail.com tra gli utenti di test, poi premi <b>Pubblica app</b>: in modalità test il collegamento scade ogni 7 giorni.
              </Step>
              <Step n={3} title="Credenziali: ID client OAuth">
                «Credenziali → Crea credenziali → ID client OAuth → Applicazione web». In «URI di reindirizzamento autorizzati» inserisci{" "}
                <span className={code}>https://developers.google.com/oauthplayground</span>. Google mostra <b>ID client</b> e <b>segreto client</b>: tienili per il passo 5, non incollarli qui.
              </Step>
              <Step n={4} title="Token di aggiornamento della casella">
                Apri <span className={code}>developers.google.com/oauthplayground</span>, ingranaggio in alto a destra → «Use your own OAuth credentials» con ID e segreto. Nel campo degli ambiti scrivi{" "}
                <span className={code}>https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly</span>, premi «Authorize APIs» entrando con sportclubcolico@gmail.com, poi «Exchange authorization code for tokens» e copia il <b>Refresh token</b>.
              </Step>
              <Step n={5} title="Variabili su Render e giro automatico">
                Nel servizio della Super App su Render → <b>Environment</b>, aggiungi le cinque variabili elencate a destra e salva (il servizio si riavvia). La chiave di servizio è la «secret / service_role key» del progetto Supabase SCD. Per il giro automatico crea un <b>Cron Job</b> Render ogni 10 minuti che chiama{" "}
                <span className={code}>POST /internal/comm-sync</span> con l'intestazione <span className={code}>Authorization: Bearer &lt;SCD_COMM_SYNC_SECRET&gt;</span>. Poi torna qui: «Verifica collegamento ora» e, se risulta collegata, attiva l'invio.
              </Step>
            </ol>
          </Card>
          <div className="flex min-w-0 flex-col gap-[18px]">
            <Card id="collega-stato" title="Stato" sub={s ? `Casella ${s.mailbox}` : undefined}>
              <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
                <div className="flex flex-wrap gap-1.5">
                  {s?.gmailConnected ? <Chip tone="ok">Collegata dal {itDateTime(s.connectedAt)}</Chip> : <Chip tone="warn">Non collegata</Chip>}
                  {s?.lastSyncAt && <Chip tone="mute">Ultimo controllo {itDateTime(s.lastSyncAt)}</Chip>}
                </div>
                {setup.lastCode && SYNC_CODE[setup.lastCode] && <p className="m-0 text-[14px] font-semibold text-[var(--in-warn)]">{SYNC_CODE[setup.lastCode]}</p>}
                {s && s.gmailConnected && <p className="m-0 text-[14px] text-[var(--in-sub)]">{capSummary({ sentToday: s.sentToday, cap: s.dailyCap, queued: s.queued })}</p>}
                <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="collega-env">
                  {ENV_ROWS.map((r) => (
                    <li key={r.key} className="flex items-start gap-2 text-[14px]">
                      {setup.env[r.key] ? <CheckCircle2 className="mt-0.5 size-[18px] flex-none text-[var(--in-ok)]" aria-hidden="true" /> : <CircleDashed className="mt-0.5 size-[18px] flex-none text-[var(--in-warn)]" aria-hidden="true" />}
                      <span className="min-w-0">
                        <span className={code}>{r.name}</span> <span className="text-[var(--in-sub)]">· {r.what}</span>
                        <span className="sr-only">{setup.env[r.key] ? " presente" : " mancante"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <button type="button" className={`${btn} border border-[var(--in-line)] bg-white`} disabled={busy || !allEnv} onClick={() => void act(() => sync())} data-testid="collega-verify">
                  <PlugZap className="size-4" aria-hidden="true" /> Verifica collegamento ora
                </button>
                {!allEnv && <p className="m-0 text-[13px] text-[var(--in-sub)]">Si attiva quando le cinque variabili sono presenti sul server.</p>}
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
                {!s?.gmailConnected && <p className="m-0 text-[13px] text-[var(--in-sub)]">Si può attivare solo con la casella collegata.</p>}
                <p className="m-0 flex items-start gap-2 text-[13.5px] leading-snug text-[var(--in-sub)]">
                  <ShieldAlert className="mt-0.5 size-4 flex-none text-[var(--in-warn)]" aria-hidden="true" />
                  Gmail consente circa 500 destinatari al giorno: l'app si ferma a {s?.dailyCap ?? 400} e manda il resto il giorno dopo. Se Google revoca il collegamento, l'invio si spegne da solo.
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

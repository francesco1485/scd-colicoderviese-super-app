/**
 * /gestionale/impianti/approvazioni — Direzione (Presidente, Direttore generale).
 * Proposals read from the published CSV of the bookings master plus the
 * browser-local ipotesi; conflicts recomputed with the engine against the
 * calendar snapshot; quick decisions copy the new Stato value and open the
 * sheet. Nothing is written by the app.
 */
import { ExternalLink } from "lucide-react";
import { useEffect, useId, useState } from "react";

import {
  OPEN_STATUSES,
  REGISTRY_URL,
  bookingToProposal,
  checkProposal,
  decisionCells,
  type Proposal,
} from "@/lib/bookings-register";
import { APPROVER_POSITIONS } from "@/lib/impianti-access";
import type { ProposalsFeed } from "@/lib/impianti.functions";
import { PITCHES, hhmm, longDay, type PitchFormat } from "@/lib/rotation";
import { PitchPreview, copyText, type Preview } from "./BookingPlanner";
import { useImpianti } from "./context";
import { AccessScreen } from "./ImpiantiPage";
import { BASE_MATCHES } from "./model";
import {
  Chip,
  SimulationNote,
  btnPrimary,
  btnSecondary,
  inputCls,
  type Tone,
} from "./ui";

const STATUS_TONE: Record<string, Tone> = {
  PROPOSTA: "info",
  "IN VALUTAZIONE": "warn",
  CONFERMATA: "ok",
  RESPINTA: "crit",
  ANNULLATA: "mute",
};
const fmtText = (f: PitchFormat | null) =>
  f === null ? "—" : f === "full" ? "campo intero" : `${f} contro ${f}`;

function ProposalCard({ p, buffer }: { p: Proposal; buffer: number }) {
  const check = checkProposal(p, BASE_MATCHES, buffer);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const rid = useId();
  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 6000);
    return () => window.clearTimeout(t);
  }, [msg]);

  const decide = async (d: "CONFERMATA" | "RESPINTA" | "IN VALUTAZIONE") => {
    const cells = decisionCells(d, reason);
    const ok = await copyText(cells.stato);
    window.open(REGISTRY_URL, "_blank", "noopener,noreferrer");
    setMsg(
      ok
        ? `Copiato «${cells.stato}»: incollalo nella colonna Stato della riga ${p.id}${d === "RESPINTA" ? " e copia il motivo nella colonna Note" : ""}; scrivi il tuo ruolo in «Approvato da».`
        : `Copia non riuscita: scrivi «${cells.stato}» nella colonna Stato della riga ${p.id}.`,
    );
  };

  const preview: Preview | null =
    check.checkable &&
    p.pitch &&
    p.format &&
    p.date &&
    p.start !== null &&
    p.end !== null
      ? {
          fits: !!check.fits,
          others: check.sharing,
          probe: {
            id: "__proposal__",
            date: p.date,
            start: p.start,
            end: p.end,
            endKnown: true,
            group: "ipotesi",
            label: p.subject || p.kindLabel,
            short: "IP",
            format: p.format,
            opponent: "",
            kind: p.kind ?? "gara",
            homePitch: p.pitch,
            pitch: p.pitch,
            moved: false,
          },
        }
      : null;
  const open = p.status === null || OPEN_STATUSES.includes(p.status);
  return (
    <article
      className="grid gap-3 rounded-2xl border border-[var(--in-line)] bg-white p-4 shadow-[var(--in-card-shadow)] @[900px]:grid-cols-[minmax(0,1fr)_360px]"
      aria-label={`Proposta ${p.id}`}
    >
      <div className="grid content-start gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-[17px]">
            {p.kindLabel || "—"}
            {p.subject ? ` · ${p.subject}` : ""}
          </b>
          <Chip tone={p.status ? (STATUS_TONE[p.status] ?? "mute") : "mute"}>
            {p.status ?? "Stato —"}
          </Chip>
          {p.source === "ipotesi" && (
            <Chip tone="mute">solo in questo browser</Chip>
          )}
        </div>
        <dl className="m-0 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-[14px]">
          <dt className="text-[var(--in-sub)]">Riga</dt>
          <dd className="m-0">{p.id}</dd>
          <dt className="text-[var(--in-sub)]">Quando</dt>
          <dd className="m-0">
            {p.date ? longDay(p.date) : "—"}
            {p.start !== null ? `, ${hhmm(p.start)}` : ""}
            {p.end !== null ? `–${hhmm(p.end)}` : ""}
          </dd>
          <dt className="text-[var(--in-sub)]">Dove</dt>
          <dd className="m-0">
            {p.pitch
              ? `${PITCHES[p.pitch].site} ${PITCHES[p.pitch].name.toLowerCase()}`
              : "—"}{" "}
            · {fmtText(p.format)}
          </dd>
          <dt className="text-[var(--in-sub)]">Spogliatoi</dt>
          <dd className="m-0">{p.rooms || "—"}</dd>
          <dt className="text-[var(--in-sub)]">Ingresso</dt>
          <dd className="m-0">{p.entrance || "—"}</dd>
          <dt className="text-[var(--in-sub)]">Richiesto da</dt>
          <dd className="m-0">{p.requestedBy || "—"}</dd>
          {p.kind === "affitto" && (
            <>
              <dt className="text-[var(--in-sub)]">Importo</dt>
              <dd className="m-0">{p.amount ? `${p.amount} €` : "—"}</dd>
            </>
          )}
          <dt className="text-[var(--in-sub)]">Avviso Comune</dt>
          <dd className="m-0">{p.notice || "—"}</dd>
        </dl>
        <p className="m-0 text-[14px]">
          {!check.checkable ? (
            <span className="text-[var(--in-sub)]">
              Conflitti: — (data, orario, spazio o formato non leggibili nella
              riga).
            </span>
          ) : check.fits ? (
            <span className="font-semibold text-[var(--in-ok)]">
              Nessun conflitto con il calendario gare.
            </span>
          ) : (
            <span className="font-semibold text-[var(--in-crit)]">
              Conflitto con il calendario:{" "}
              {check.sharing
                .map((m) => `${m.label} ${hhmm(m.start)}`)
                .join(", ") || "formato da verificare sulle misure"}
              .
            </span>
          )}
        </p>
        {open && (
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => void decide("IN VALUTAZIONE")}
              >
                In valutazione
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => void decide("CONFERMATA")}
              >
                Approva
              </button>
              <button
                type="button"
                className={btnSecondary}
                aria-expanded={rejecting}
                aria-controls={rid}
                onClick={() => setRejecting((v) => !v)}
              >
                Respingi
              </button>
            </div>
            {rejecting && (
              <div
                id={rid}
                className="grid gap-2 rounded-xl border border-[var(--in-line)] p-3"
              >
                <label className="grid gap-1 text-[13px] font-semibold text-[var(--in-sub)]">
                  Motivo (breve, va nella colonna Note)
                  <input
                    type="text"
                    className={inputCls}
                    maxLength={120}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="es. campo già occupato dalla U19"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => void decide("RESPINTA")}
                  >
                    Conferma il rifiuto
                  </button>
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={async () =>
                      setMsg(
                        (await copyText(decisionCells("RESPINTA", reason).note))
                          ? "Motivo copiato per la colonna Note."
                          : "Copia del motivo non riuscita.",
                      )
                    }
                  >
                    Copia il motivo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <p
          role="status"
          aria-live="polite"
          className="m-0 text-[13.5px] text-[var(--in-info)] empty:hidden"
        >
          {msg ?? ""}
        </p>
      </div>
      <div>
        {preview && p.pitch && p.format ? (
          <PitchPreview
            pitch={p.pitch}
            format={p.format}
            preview={preview}
            title="Proposta"
          />
        ) : (
          <div className="grid h-full min-h-[120px] place-items-center rounded-xl border border-dashed border-[var(--in-line)] text-[14px] text-[var(--in-sub)]">
            Anteprima 2D: —
          </div>
        )}
      </div>
    </article>
  );
}

export function ApprovazioniView({ feed }: { feed: ProposalsFeed }) {
  const { model, canApprove, requestedBy } = useImpianti();
  if (!canApprove)
    return (
      <AccessScreen
        title="Approvazioni prenotazioni"
        path="/gestionale/impianti/approvazioni"
        positions={APPROVER_POSITIONS}
        inside={[
          "Proposte di prenotazione dal registro",
          "Conflitti ricalcolati sul calendario",
          "Approva o respingi con il motivo",
        ]}
      />
    );
  const registry = feed.status === "ok" ? feed.proposals : [];
  const openFirst = [...registry].sort(
    (a, b) =>
      Number(!(a.status && OPEN_STATUSES.includes(a.status))) -
        Number(!(b.status && OPEN_STATUSES.includes(b.status))) ||
      (a.date ?? "").localeCompare(b.date ?? ""),
  );
  const local = model.bookings.map((b) => bookingToProposal(b, requestedBy));
  return (
    <div className="grid gap-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 max-w-[70ch] text-[15px] text-[var(--in-sub)]">
          Flusso: PROPOSTA → IN VALUTAZIONE → CONFERMATA o RESPINTA con un
          motivo breve. I pulsanti copiano il nuovo stato e aprono il registro:
          la decisione vale quando è scritta lì.
        </p>
        <a
          href={REGISTRY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={btnSecondary}
        >
          Apri il registro prenotazioni
          <ExternalLink className="size-4" aria-hidden="true" />
          <span className="sr-only">(si apre in una nuova scheda)</span>
        </a>
      </div>

      <section aria-labelledby="h-reg" className="grid gap-3">
        <h2 id="h-reg" className="m-0 text-[19px] font-bold">
          Dal registro prenotazioni
        </h2>
        {feed.status === "not-configured" && (
          <div className="rounded-[14px] border-[1.5px] border-dashed border-[#b9d5ef] bg-[#f8fbfe] p-4">
            <b className="block text-[16px]">
              Lettura del registro non ancora attiva
            </b>
            <p className="mb-0 mt-1 text-[14px] leading-snug text-[var(--in-sub)]">
              Per vedere qui le proposte: nel foglio «17 - PRENOTAZIONI IMPIANTI
              2026-27» scegli File → Condividi → Pubblica sul web, solo la
              scheda delle prenotazioni, formato CSV. Poi chi gestisce lo
              staging imposta l'indirizzo nella variabile SCD_BOOKINGS_CSV_URL
              del server. Il foglio non contiene dati personali.
            </p>
          </div>
        )}
        {feed.status === "error" && (
          <p
            role="alert"
            className="m-0 rounded-xl bg-[var(--in-warn-bg)] px-4 py-3 text-[14px] text-[var(--in-warn)]"
          >
            {feed.message} Le proposte del registro non sono visibili ora.
          </p>
        )}
        {feed.status === "forbidden" && (
          <p className="m-0 text-[14px] text-[var(--in-sub)]">
            Il registro si legge solo con un accesso da Direzione.
          </p>
        )}
        {feed.status === "ok" && (
          <>
            <p className="m-0 text-[13px] text-[var(--in-sub)]">
              Letto alle{" "}
              {new Date(feed.fetchedAt).toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/Rome",
              })}{" "}
              · {registry.length} {registry.length === 1 ? "riga" : "righe"}.
            </p>
            {openFirst.map((p) => (
              <ProposalCard
                key={`r-${p.id}`}
                p={p}
                buffer={model.options.buffer}
              />
            ))}
            {!registry.length && (
              <p className="m-0 text-[14px] text-[var(--in-sub)]">
                Nessuna proposta nel registro.
              </p>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="h-loc" className="grid gap-3">
        <h2 id="h-loc" className="m-0 text-[19px] font-bold">
          Ipotesi in questo browser
        </h2>
        {local.length ? (
          local.map((p) => (
            <ProposalCard
              key={`l-${p.id}`}
              p={p}
              buffer={model.options.buffer}
            />
          ))
        ) : (
          <p className="m-0 text-[14px] text-[var(--in-sub)]">
            Nessuna ipotesi salvata qui. Le nuove proposte arrivano dal
            registro.
          </p>
        )}
      </section>
      <SimulationNote>
        I conflitti sono ricalcolati sul calendario gare dello snapshot;
        allenamenti del Quadro e altre prenotazioni del registro non sono
        inclusi.
      </SimulationNote>
    </div>
  );
}

import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Plus, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Card, Chip, SourceLine, type ChipTone } from "@/components/scd/interior-ui";
import {
  createCustomPosition,
  setPositionStatus,
  type PositionCatalogView,
} from "@/lib/position-catalog.functions";
import {
  DRAFT_MESSAGES,
  POSITION_GROUPS,
  POSITION_GROUP_LABEL,
  ROLE_KINDS,
  ROLE_KIND_LABEL,
  SOURCE_LABEL,
  groupCatalog,
  holdersLabel,
  validateCustomDraft,
  type CatalogPosition,
  type CustomPositionDraft,
} from "@/lib/position-catalog";

/**
 * Catalogo ruoli (Francesco 16/10/2026 13:35): every position the club may fill, grouped and folded (progressive
 * disclosure), each with "da assegnare" when nobody holds it. Counts only, never names. "Crea ruolo nuovo" is shown
 * only when the server says the caller is the Presidente or the Direttore generale (r111 / r138).
 */
export function PositionCatalogCard({ view }: { view: PositionCatalogView }) {
  const groups = useMemo(() => groupCatalog(view.positions), [view.positions]);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const total = view.positions.filter((p) => p.status !== "RETIRED").length;
  const toAssign = view.source === "live" ? view.positions.filter((p) => p.status === "ACTIVE" && p.holders === 0).length : null;

  return (
    <Card
      id="org-catalogo"
      title="Catalogo ruoli"
      sub="Tutti i ruoli FIGC, LND, SGS, RASD e del club che si possono ricoprire: pronti per inserire il tesserato quando serve. Nessun nome, solo quanti lo ricoprono."
      aside={
        <>
          <Chip tone="info">{total} ruoli</Chip>
          {toAssign !== null ? <Chip tone={toAssign > 0 ? "warn" : "ok"}>{toAssign} da assegnare</Chip> : <Chip tone="mute">titolari da collegare</Chip>}
        </>
      }
    >
      {view.error && (
        <p role="alert" className="m-0 border-t border-[var(--in-line)] px-4 py-3 text-[14.5px] font-semibold text-[var(--in-crit)] sm:px-[18px]">
          {view.error}
        </p>
      )}
      {view.source !== "live" && !view.error && (
        <p className="m-0 border-t border-[var(--in-line)] px-4 py-3 text-[14px] leading-snug text-[var(--in-sub)] sm:px-[18px]">
          {view.source === "not-applied"
            ? "Catalogo del club in attesa di attivazione (r138): l'elenco è quello approvato nel repository, i titolari si vedono dopo l'attivazione."
            : "Registro non collegato al tuo profilo club: l'elenco è quello del repository, i titolari non sono letti."}
        </p>
      )}

      {view.create !== "off" && (
        <div className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
          {done && (
            <p role="status" className="m-0 mb-2 text-[14.5px] font-semibold text-[var(--in-ok)]">
              {done}
            </p>
          )}
          {view.create === "not-applied" ? (
            <p className="m-0 text-[14.5px] text-[var(--in-sub)]">
              <b className="text-[var(--in-ink)]">Crea ruolo nuovo</b> · Creazione non ancora attiva: si accende quando la Direzione applica il catalogo ruoli (r138).
            </p>
          ) : open ? (
            <CustomPositionForm
              existing={view.positions.map((p) => p.label)}
              onClose={() => setOpen(false)}
              onDone={(m) => {
                setOpen(false);
                setDone(m);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDone(null);
                setOpen(true);
              }}
              className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-3.5 text-[15px] font-bold text-white"
            >
              <Plus className="size-4" aria-hidden="true" />
              Crea ruolo nuovo
            </button>
          )}
        </div>
      )}

      <div>
        {groups.map((g) => (
          <details key={g.group} className="group border-t border-[var(--in-line)]">
            <summary className="scd-focus flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-2.5 sm:px-[18px]">
              <b className="min-w-0 flex-1 text-[15.5px] leading-snug">{g.label}</b>
              <Chip tone="mute">{g.positions.length} ruoli</Chip>
              {g.toAssign !== null && g.toAssign > 0 && <Chip tone="warn">{g.toAssign} da assegnare</Chip>}
              {g.mandatory > 0 && <Chip tone="info">{g.mandatory === 1 ? "1 obbligatorio" : `${g.mandatory} obbligatori`}</Chip>}
              <span aria-hidden="true" className="text-[var(--in-sub)] transition-transform group-open:rotate-90">›</span>
            </summary>
            <ul className="m-0 list-none p-0 pb-2">
              {g.positions.map((p) => (
                <PositionRow key={p.code} p={p} canDecide={view.create === "on"} onDone={setDone} />
              ))}
            </ul>
          </details>
        ))}
      </div>
      <SourceLine>
        Fonti: Regolamento Settore Tecnico e NOIF FIGC, C.U. n.18 SGS 2026, Regolamento Safeguarding FIGC, Regolamento RASD.
        Le qualifiche da allenatore sono un dato del tecnico, non un ruolo a parte. Assegna i ruoli nel registro del gestionale.
      </SourceLine>
    </Card>
  );
}

const HOLDER_TONE = (p: CatalogPosition): ChipTone =>
  p.status === "PROPOSED" ? "info" : p.status === "RETIRED" ? "mute" : p.holders === null ? "mute" : p.holders === 0 ? "warn" : "ok";

function PositionRow({ p, canDecide, onDone }: { p: CatalogPosition; canDecide: boolean; onDone: (m: string) => void }) {
  const router = useRouter();
  const decide = useServerFn(setPositionStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (status: "ACTIVE" | "RETIRED") => {
    setBusy(true);
    setError(null);
    try {
      const out = await decide({ data: { code: p.code, status } });
      if (out.ok) {
        onDone(out.message);
        void router.invalidate();
      } else setError(out.message);
    } catch {
      setError("Salvataggio non riuscito, riprova più tardi.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="flex flex-col gap-1 px-4 py-2 sm:flex-row sm:items-start sm:gap-3 sm:px-[18px]">
      <div className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-snug">{p.label}</span>
        <span className="block text-[13px] leading-snug text-[var(--in-sub)]">
          {p.sourceUrl ? (
            <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="scd-focus inline-flex items-center gap-1 text-[var(--in-info)]">
              {SOURCE_LABEL[p.source]}
              {p.sourceRef ? ` · ${p.sourceRef}` : ""}
              <ExternalLink className="size-3" aria-hidden="true" />
              <span className="sr-only"> (si apre in una nuova scheda)</span>
            </a>
          ) : (
            <>
              {SOURCE_LABEL[p.source]}
              {p.sourceRef ? ` · ${p.sourceRef}` : ""}
            </>
          )}
          {p.evidence === "INFERRED" && " · da verificare"}
          {p.description && ` · ${p.description}`}
        </span>
        {error && (
          <span role="alert" className="mt-1 block text-[13.5px] font-semibold text-[var(--in-crit)]">
            {error}
          </span>
        )}
      </div>
      <div className="flex flex-none flex-wrap items-center gap-1.5 sm:justify-end">
        {p.mandatoryForClub && <Chip tone="info">obbligatorio</Chip>}
        {p.requiresLicence && <Chip tone="mute">serve qualifica</Chip>}
        <Chip tone={HOLDER_TONE(p)}>{holdersLabel(p)}</Chip>
        {canDecide && p.status === "PROPOSED" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run("ACTIVE")}
              className="scd-focus min-h-11 rounded-[10px] bg-[var(--in-info)] px-3 text-[14px] font-bold text-white disabled:opacity-60"
            >
              Approva
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run("RETIRED")}
              className="scd-focus min-h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14px] font-semibold disabled:opacity-60"
            >
              Rifiuta
            </button>
          </>
        )}
      </div>
    </li>
  );
}

const EMPTY: CustomPositionDraft = { label: "", group: "operativi", roleKind: "STAFF", description: "" };

function CustomPositionForm({ existing, onClose, onDone }: { existing: string[]; onClose: () => void; onDone: (m: string) => void }) {
  const router = useRouter();
  const create = useServerFn(createCustomPosition);
  const [d, setD] = useState<CustomPositionDraft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const check = validateCustomDraft(d, existing);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!check.ok) {
      setError(DRAFT_MESSAGES[check.code]);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const out = await create({
        data: { label: check.value.label, group: check.value.group, roleKind: check.value.roleKind, description: check.value.description },
      });
      if (out.ok) {
        onDone(out.message);
        void router.invalidate();
      } else setError(out.message);
    } catch {
      setError("Salvataggio non riuscito, riprova più tardi.");
    } finally {
      setBusy(false);
    }
  };

  const field = "scd-focus h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px]";
  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3" aria-labelledby="org-catalogo-new">
      <div className="flex items-center justify-between gap-2">
        <b id="org-catalogo-new" className="text-[16px]">
          Crea ruolo nuovo
        </b>
        <button type="button" onClick={onClose} className="scd-focus inline-flex size-11 items-center justify-center rounded-[10px]" aria-label="Chiudi">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <p className="m-0 text-[14px] leading-snug text-[var(--in-sub)]">
        Il ruolo nasce «da approvare»: si assegna a un tesserato solo dopo l'approvazione del Presidente o del Direttore generale.
      </p>
      <label className="flex flex-col gap-1 text-[14.5px] font-semibold">
        Nome del ruolo
        <input
          className={field}
          value={d.label}
          maxLength={80}
          onChange={(e) => setD({ ...d, label: e.target.value })}
          placeholder="Es. Responsabile lotteria"
          required
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[14.5px] font-semibold">
          Area
          <select className={field} value={d.group} onChange={(e) => setD({ ...d, group: e.target.value })}>
            {POSITION_GROUPS.map((g) => (
              <option key={g} value={g}>
                {POSITION_GROUP_LABEL[g]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[14.5px] font-semibold">
          Tipo di ruolo
          <select className={field} value={d.roleKind} onChange={(e) => setD({ ...d, roleKind: e.target.value })}>
            {ROLE_KINDS.map((k) => (
              <option key={k} value={k}>
                {ROLE_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-[14.5px] font-semibold">
        Cosa fa (facoltativo)
        <textarea
          className="scd-focus min-h-[72px] w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 py-2 text-[15px]"
          value={d.description}
          maxLength={300}
          onChange={(e) => setD({ ...d, description: e.target.value })}
        />
      </label>
      {check.ok && <span className="text-[13px] text-[var(--in-sub)]">Codice: {check.value.code}</span>}
      {error && (
        <p role="alert" className="m-0 text-[14px] font-semibold text-[var(--in-crit)]">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-3.5 text-[15px] font-bold text-white disabled:opacity-60"
        >
          {busy ? "Salvo…" : "Crea ruolo"}
        </button>
        <button type="button" onClick={onClose} className="scd-focus min-h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3.5 text-[15px] font-semibold">
          Annulla
        </button>
      </div>
    </form>
  );
}

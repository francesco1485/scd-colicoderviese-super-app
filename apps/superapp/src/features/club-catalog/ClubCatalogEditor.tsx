/**
 * Data entry of Club House, Convenzioni and Tessere (register r115, STAGED until "applica r115"). One editor per
 * platform, inside the existing gestionale pages: /tesoreria/club-house and /gestionale/piattaforme/convenzioni.
 * Fail closed: the form opens only when the database said the caller writes that platform ("on"); writers by session
 * read why it is not open yet; everyone else reads who enters the data. Not optimistic: the page reloads after a save.
 * Server calls are props, so the states render and test without a router.
 */
import { Link } from "@tanstack/react-router";
import { CircleAlert, Info, Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import {
  CARD_LABEL,
  CATALOG_FAILED,
  CATALOG_NOT_APPLIED,
  CATALOG_UNAVAILABLE,
  CATALOG_WRITE_MESSAGES,
  CATEGORY_LABEL,
  CATALOG_SITES,
  CONVENZIONE_CATEGORIES,
  FIRST_STEPS,
  KIND_LABEL,
  LISTINO_CATEGORIES,
  PLATFORM_KINDS,
  PLATFORM_LABEL,
  SITE_LABEL,
  STATUS_LABEL,
  WRITER_TEXT,
  catalogCounts,
  draftFromEntry,
  emptyCatalogDraft,
  priceText,
  validateCatalogDraft,
  validityText,
  type CatalogDraft,
  type CatalogEntry,
  type CatalogKind,
  type CatalogPlatform,
  type CatalogSite,
  type CatalogStatus,
  type CatalogWriteOutcome,
  type CatalogWriteState,
} from "@/lib/club-catalog";
import { CLUB_CARD_IDS, type ClubCardId } from "@/lib/club-cards";

const field =
  "scd-focus h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] text-[var(--in-ink)] focus:border-[var(--in-focus)]";
const area =
  "scd-focus min-h-[88px] w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 py-2 text-[15px] text-[var(--in-ink)] focus:border-[var(--in-focus)]";
const label = "grid content-start gap-1 text-[14px] font-semibold text-[var(--in-sub)]";
const btn = "scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-3.5 text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-60";
const btnPrimary = `${btn} bg-[var(--in-info)] text-white`;
const btnGhost = `${btn} border border-[#b9d5ef] bg-white text-[var(--in-info)] hover:bg-[var(--in-info-bg)]`;

const STATUS_TONE: Readonly<Record<CatalogStatus, ChipTone>> = { BOZZA: "warn", PUBBLICATA: "ok", ARCHIVIATA: "mute" };

export interface ClubCatalogEditorProps {
  platform: CatalogPlatform;
  state: CatalogWriteState;
  /** Null when not read (state other than "on"). */
  entries: CatalogEntry[] | null;
  onSave: (input: { platform: CatalogPlatform; id: string | null; draft: CatalogDraft }) => Promise<CatalogWriteOutcome>;
  /** Called after a successful save; the page reloads the rows. */
  onDone: (message: string) => void;
  /** Extra content under the header (e.g. the three cards of the Direzione policy). */
  children?: ReactNode;
  id?: string;
}

function Field({ id, text, hint, children }: { id: string; text: string; hint?: string | undefined; children: ReactNode }) {
  return (
    <div className={label}>
      <label htmlFor={id}>{text}</label>
      {children}
      {hint && <span className="text-[13px] font-normal">{hint}</span>}
    </div>
  );
}

function Notice({ tone, title, children }: { tone: "info" | "warn"; title: string; children?: ReactNode }) {
  const Icon = tone === "info" ? Info : CircleAlert;
  return (
    <div role="status" className="mx-4 mb-3 flex items-start gap-3 rounded-2xl border border-[#b9d5ef] bg-[var(--in-info-bg)] px-4 py-3 sm:mx-[18px]">
      <Icon className="mt-0.5 size-5 flex-none text-[var(--in-info)]" strokeWidth={2} aria-hidden="true" />
      <p className="m-0 text-[14.5px] leading-snug">
        <b className="block text-[15.5px]">{title}</b>
        {children}
      </p>
    </div>
  );
}

/** One line of a row in the list: what the public will read. */
export function entrySummary(e: CatalogEntry): string {
  switch (e.kind) {
    case "ORARIO":
      return `${e.site ? SITE_LABEL[e.site] : ""} · ${e.days ?? ""} ${e.opens ?? ""}–${e.closes ?? ""}`.trim();
    case "LISTINO":
      return `${CATEGORY_LABEL[e.category ?? ""] ?? "Listino"}${e.site ? ` · solo ${SITE_LABEL[e.site]}` : ""} · ${priceText(e.priceCents)}`;
    case "MENU_GRUPPI":
      return `${e.site ? `${SITE_LABEL[e.site]} · ` : ""}${priceText(e.priceCents)}${e.priceCents !== null ? " a persona" : ""}`;
    case "CONVENZIONE":
      return `${CATEGORY_LABEL[e.category ?? ""] ?? ""} · ${e.cards.length ? `card ${e.cards.map((c) => CARD_LABEL[c]).join(", ")}` : "nessuna card richiesta"} · ${validityText(e)}`;
    case "CARD_VANTAGGIO":
      return `card ${e.cards.map((c) => CARD_LABEL[c]).join(", ")}`;
    case "CARD_REGOLA":
      return e.cards.length ? `card ${e.cards.map((c) => CARD_LABEL[c]).join(", ")}` : "tutte le card";
    case "CARD_TIPO":
      return e.priceCents === null ? "costo da confermare" : `costo ${priceText(e.priceCents)}`;
  }
}

export function ClubCatalogEditor(props: ClubCatalogEditorProps) {
  const { platform, state, entries, onSave, onDone, children } = props;
  const cardId = props.id ?? `catalogo-${platform.toLowerCase().replace("_", "-")}`;
  const [editing, setEditing] = useState<{ id: string | null; draft: CatalogDraft } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const counts = entries ? catalogCounts(entries) : null;
  const kinds = PLATFORM_KINDS[platform];

  return (
    <Card
      id={cardId}
      title={`Inserisci: ${PLATFORM_LABEL[platform]}`}
      sub={`Chi inserisce: ${WRITER_TEXT[platform]}. In pubblico compare solo ciò che è «Pubblicata»; il resto resta «da confermare».`}
      aside={state === "on" ? <Chip tone="ok">Inserimento attivo</Chip> : <Chip tone="mute">Sola lettura</Chip>}
    >
      <div data-testid={`catalog-editor-${platform}`}>
        {state === "not-applied" && (
          <Notice tone="info" title={CATALOG_NOT_APPLIED}>
            Il modulo è pronto e si apre qui appena il registro è attivo. Intanto raccogli i dati dell'elenco «Da inserire per primo».
          </Notice>
        )}
        {state === "unavailable" && <Notice tone="warn" title={CATALOG_UNAVAILABLE} />}
        {state === "off" && (
          <Notice tone="info" title={`Inseriscono: ${WRITER_TEXT[platform]}.`}>
            Se devi aggiungere qualcosa, scrivilo a chi ha il ruolo: i permessi li assegna la Direzione.
          </Notice>
        )}
        {flash && (
          <p role="status" className="mx-4 mb-3 rounded-xl bg-[var(--in-ok-bg)] px-3 py-2 text-[14.5px] font-semibold text-[var(--in-ok)] sm:mx-[18px]">
            {flash}
          </p>
        )}
        {children}
        <div className="px-4 pb-3 sm:px-[18px]">
          <h3 className="m-0 text-[15px] font-bold">Da inserire per primo</h3>
          <ol className="m-0 mt-1 grid list-decimal gap-1 pl-5 text-[14.5px] leading-snug">
            {FIRST_STEPS[platform].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {platform === "CLUB_HOUSE" && (
            <Link to="/gestionale/struttura" className={`${btnGhost} mt-2`}>
              Serate ed eventi: apri Attività in struttura
            </Link>
          )}
        </div>
        {kinds.map((kind) => {
          const rows = (entries ?? []).filter((e) => e.kind === kind);
          return (
            <section key={kind} aria-label={KIND_LABEL[kind]} className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="m-0 text-[15.5px] font-bold">
                  {KIND_LABEL[kind]}
                  {counts && (
                    <span className="ml-2 text-[13px] font-semibold text-[var(--in-sub)]">
                      {counts[kind].published} pubblicate su {counts[kind].total}
                    </span>
                  )}
                </h3>
                {state === "on" && (
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => {
                      setFlash(null);
                      setEditing({ id: null, draft: emptyCatalogDraft(kind) });
                    }}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Aggiungi
                  </button>
                )}
              </div>
              {editing && editing.draft.kind === kind && (
                <div className="mt-3 rounded-xl border border-[#b9d5ef] bg-[#f7fbff] p-3">
                  <CatalogForm
                    key={editing.id ?? "new"}
                    platform={platform}
                    editing={editing}
                    onSave={onSave}
                    onDone={(m) => {
                      setEditing(null);
                      setFlash(m);
                      onDone(m);
                    }}
                    onClose={() => setEditing(null)}
                  />
                </div>
              )}
              {entries === null ? (
                <p className="m-0 mt-2 text-[14px] text-[var(--in-sub)]">Elenco non letto: {state === "on" ? "riprova" : "si vede quando il registro è attivo"}.</p>
              ) : rows.length === 0 ? (
                <div className="mt-2">
                  <EmptyState title="Ancora niente di inserito">In pubblico si legge «da confermare».</EmptyState>
                </div>
              ) : (
                <ul className="m-0 mt-2 list-none p-0">
                  {rows.map((e) => (
                    <li key={e.id} className="flex items-start justify-between gap-2 border-t border-[var(--in-line)] py-2 first:border-t-0">
                      <span className="min-w-0">
                        <b className="block text-[14.5px] leading-snug">{e.title}</b>
                        <span className="block text-[13px] text-[var(--in-sub)]">{entrySummary(e)}</span>
                      </span>
                      <span className="flex flex-none flex-col items-end gap-1.5">
                        <Chip tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Chip>
                        {state === "on" && (
                          <button
                            type="button"
                            onClick={() => {
                              setFlash(null);
                              setEditing({ id: e.id, draft: draftFromEntry(e) });
                            }}
                            aria-label={`Modifica ${e.title}`}
                            className="scd-focus min-h-9 rounded-[9px] border border-[#b9d5ef] bg-white px-2.5 text-[13.5px] font-semibold text-[var(--in-info)] hover:bg-[var(--in-info-bg)]"
                          >
                            Modifica
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </Card>
  );
}

const TITLE_TEXT: Readonly<Record<CatalogKind, { title: string; body?: string; hint?: string }>> = {
  ORARIO: { title: "Nome della fascia (es. «Apertura serale»)" },
  LISTINO: { title: "Prodotto", body: "Descrizione (facoltativa)" },
  MENU_GRUPPI: { title: "Nome del menu", body: "Cosa comprende" },
  CONVENZIONE: { title: "Partner (nome dell'attività)", body: "Offerta", hint: "Scrivi solo ciò che il partner ha confermato." },
  CARD_TIPO: { title: "Nome della tessera", body: "Chi la riceve" },
  CARD_VANTAGGIO: { title: "Vantaggio", body: "Dettagli (facoltativi)" },
  CARD_REGOLA: { title: "Regola (titolo breve)", body: "Testo della regola" },
};

function CatalogForm({
  platform,
  editing,
  onSave,
  onDone,
  onClose,
}: {
  platform: CatalogPlatform;
  editing: { id: string | null; draft: CatalogDraft };
  onSave: ClubCatalogEditorProps["onSave"];
  onDone: (message: string) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<CatalogDraft>(editing.draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const k = draft.kind;
  const t = TITLE_TEXT[k];
  const set = <K extends keyof CatalogDraft>(key: K) => (v: CatalogDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: v }));
    setError(null);
  };
  const toggleCard = (c: ClubCardId) => set("cards")(draft.cards.includes(c) ? draft.cards.filter((x) => x !== c) : [...draft.cards, c]);

  const save = async () => {
    const v = validateCatalogDraft(platform, draft);
    if (!v.ok) {
      setError(CATALOG_WRITE_MESSAGES[v.code]);
      return;
    }
    setBusy(true);
    try {
      const out = await onSave({ platform, id: editing.id, draft });
      if (out.ok) onDone(out.message);
      else setError(out.message);
    } catch {
      setError(CATALOG_FAILED);
    } finally {
      setBusy(false);
    }
  };

  const hasSite = k === "ORARIO" || k === "LISTINO" || k === "MENU_GRUPPI";
  const hasPrice = k === "LISTINO" || k === "MENU_GRUPPI" || k === "CARD_TIPO";
  const hasCards = k === "CONVENZIONE" || k === "CARD_VANTAGGIO" || k === "CARD_REGOLA";
  const categories = k === "LISTINO" ? LISTINO_CATEGORIES : k === "CONVENZIONE" ? CONVENZIONE_CATEGORIES : null;

  return (
    <form
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="flex flex-col gap-3"
      data-testid="catalog-form"
    >
      <h4 id={`${id}-title`} className="m-0 text-[15.5px] font-bold">
        {editing.id ? "Modifica" : "Nuova voce"}: {KIND_LABEL[k]}
      </h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id={`${id}-title-in`} text={t.title} hint={t.hint}>
          <input id={`${id}-title-in`} className={field} maxLength={80} value={draft.title} onChange={(e) => set("title")(e.target.value)} />
        </Field>
        {hasSite && (
          <Field id={`${id}-site`} text="Sede">
            <select
              id={`${id}-site`}
              className={field}
              value={draft.site ?? ""}
              onChange={(e) => set("site")((e.target.value || null) as CatalogSite | null)}
            >
              {k !== "ORARIO" && <option value="">Colico e Dervio</option>}
              {CATALOG_SITES.map((s) => (
                <option key={s} value={s}>
                  {SITE_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
        )}
        {categories && (
          <Field id={`${id}-cat`} text="Categoria">
            <select id={`${id}-cat`} className={field} value={draft.category ?? ""} onChange={(e) => set("category")(e.target.value || null)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>
        )}
        {k === "ORARIO" && (
          <>
            <Field id={`${id}-days`} text="Giorni" hint="Es. «Lunedì–venerdì» o «Sabato e domenica».">
              <input id={`${id}-days`} className={field} maxLength={60} value={draft.days} onChange={(e) => set("days")(e.target.value)} />
            </Field>
            <Field id={`${id}-opens`} text="Apre alle">
              <input id={`${id}-opens`} type="time" className={field} value={draft.opens} onChange={(e) => set("opens")(e.target.value)} />
            </Field>
            <Field id={`${id}-closes`} text="Chiude alle">
              <input id={`${id}-closes`} type="time" className={field} value={draft.closes} onChange={(e) => set("closes")(e.target.value)} />
            </Field>
          </>
        )}
        {hasPrice && (
          <Field
            id={`${id}-price`}
            text={k === "MENU_GRUPPI" ? "Prezzo a persona (€)" : k === "CARD_TIPO" ? "Costo (€)" : "Prezzo (€)"}
            hint="Solo il prezzo deciso. Vuoto = «prezzo da confermare»."
          >
            <input id={`${id}-price`} inputMode="decimal" className={field} maxLength={10} value={draft.price} onChange={(e) => set("price")(e.target.value)} />
          </Field>
        )}
        {k === "CONVENZIONE" && (
          <>
            <Field id={`${id}-from`} text="Valida dal" hint="Vuoto = da subito.">
              <input id={`${id}-from`} type="date" className={field} value={draft.validFrom} onChange={(e) => set("validFrom")(e.target.value)} />
            </Field>
            <Field id={`${id}-until`} text="Valida fino al" hint="Vuoto = scadenza da confermare.">
              <input id={`${id}-until`} type="date" className={field} value={draft.validUntil} onChange={(e) => set("validUntil")(e.target.value)} />
            </Field>
            <Field id={`${id}-link`} text="Link del partner (https)">
              <input id={`${id}-link`} type="url" className={field} maxLength={300} value={draft.linkUrl} onChange={(e) => set("linkUrl")(e.target.value)} />
            </Field>
          </>
        )}
      </div>
      {t.body && (
        <Field id={`${id}-body`} text={t.body}>
          <textarea id={`${id}-body`} className={area} maxLength={600} value={draft.body} onChange={(e) => set("body")(e.target.value)} />
        </Field>
      )}
      {(k === "CONVENZIONE" || k === "CARD_TIPO") && (
        <Field id={`${id}-how`} text={k === "CONVENZIONE" ? "Come usarla" : "Come si ottiene"}>
          <textarea id={`${id}-how`} className={area} maxLength={300} value={draft.howTo} onChange={(e) => set("howTo")(e.target.value)} />
        </Field>
      )}
      {hasCards && (
        <fieldset className="m-0 grid gap-1 border-0 p-0">
          <legend className="text-[14px] font-semibold text-[var(--in-sub)]">
            {k === "CONVENZIONE" ? "Card che danno accesso (nessuna = vale per tutti)" : k === "CARD_REGOLA" ? "Vale per (nessuna = tutte le card)" : "Per quali card"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {CLUB_CARD_IDS.map((c) => (
              <label key={c} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px]">
                <input type="checkbox" checked={draft.cards.includes(c)} onChange={() => toggleCard(c)} />
                {CARD_LABEL[c]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id={`${id}-status`} text="Stato" hint="«Pubblicata» compare subito nelle pagine pubbliche.">
          <select id={`${id}-status`} className={field} value={draft.status} onChange={(e) => set("status")(e.target.value as CatalogStatus)}>
            <option value="BOZZA">Bozza (solo qui)</option>
            <option value="PUBBLICATA">Pubblicata</option>
            {editing.id && <option value="ARCHIVIATA">Archiviata (tolta dal pubblico)</option>}
          </select>
        </Field>
        <Field id={`${id}-sort`} text="Ordine" hint="Numero più basso = più in alto.">
          <input
            id={`${id}-sort`}
            type="number"
            min={0}
            max={9999}
            className={field}
            value={draft.sort}
            onChange={(e) => set("sort")(Math.max(0, Math.min(9999, Math.trunc(Number(e.target.value) || 0))))}
          />
        </Field>
      </div>
      {error && (
        <p role="alert" className="m-0 rounded-xl bg-[var(--in-crit-bg)] px-3 py-2 text-[14.5px] font-semibold text-[var(--in-crit)]">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "Salvataggio…" : "Salva"}
        </button>
        <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>
          Chiudi
        </button>
      </div>
    </form>
  );
}

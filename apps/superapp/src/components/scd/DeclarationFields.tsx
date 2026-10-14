import { Plus, Trash2 } from "lucide-react";

import {
  ACCESS_PATH_TEXT,
  DECLARATION_KINDS,
  MAX_CHILDREN,
  accessPaths,
  type Declaration,
  type DeclarationKind,
} from "@/lib/signup";

/**
 * "Chi sei nel club?" (UD-117): several choices at once (a parent can also be a club official and a member).
 * Nothing here opens an area by itself: the summary below says what happens next, in plain words.
 */
export function DeclarationFields({
  value,
  onChange,
  error,
  idPrefix,
}: {
  value: Declaration;
  onChange: (d: Declaration) => void;
  error?: string | undefined;
  idPrefix: string;
}) {
  const toggle = (k: DeclarationKind) => {
    const has = value.kinds.includes(k);
    const kinds = has
      ? value.kinds.filter((x) => x !== k)
      : [...value.kinds, k];
    const children =
      k === "GENITORE" && !has && value.children.length === 0
        ? [{ firstName: "", lastName: "", birthYear: "" }]
        : value.children;
    onChange({ ...value, kinds, children });
  };
  const setChild = (
    i: number,
    key: "firstName" | "lastName" | "birthYear",
    v: string,
  ) =>
    onChange({
      ...value,
      children: value.children.map((c, j) =>
        j === i ? { ...c, [key]: v } : c,
      ),
    });
  const addChild = () =>
    onChange({
      ...value,
      children: [
        ...value.children,
        { firstName: "", lastName: "", birthYear: "" },
      ],
    });
  const removeChild = (i: number) =>
    onChange({ ...value, children: value.children.filter((_, j) => j !== i) });
  const parent = value.kinds.includes("GENITORE");
  const box =
    "h-12 w-full rounded-[12px] border-2 border-[var(--scd-line)] bg-white px-3 text-[17px] text-[var(--scd-ink)] outline-none focus:border-[var(--scd-blue)]";

  return (
    <fieldset
      className="grid gap-3 rounded-[14px] border-2 border-[var(--scd-line)] bg-[#f8fbff] p-4"
      data-testid="declaration"
    >
      <legend className="px-1 text-[17px] font-bold text-[var(--scd-ink)]">
        Chi sei nel club?
      </legend>
      <p className="-mt-1 text-[14px] leading-snug text-[var(--scd-sub)]">
        Puoi scegliere più voci. Se non scegli nulla entri come tifoso.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {DECLARATION_KINDS.map((k) => {
          const on = value.kinds.includes(k.id);
          return (
            <label
              key={k.id}
              className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-[12px] border-2 px-3 py-2 text-[15px] ${on ? "border-[var(--scd-blue)] bg-white" : "border-[var(--scd-line)] bg-white"}`}
              data-testid={`declare-${k.id}`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(k.id)}
                className="mt-1 size-5 shrink-0 accent-[var(--scd-blue)]"
              />
              <span>
                <b className="block text-[var(--scd-ink)]">{k.label}</b>
                <span className="text-[13px] leading-snug text-[var(--scd-sub)]">
                  {k.hint}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {parent && (
        <div className="grid gap-2" data-testid="declare-children">
          <p className="text-[15px] font-bold text-[var(--scd-ink)]">
            I tuoi figli che giocano con noi
          </p>
          {value.children.map((c, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr] gap-2 rounded-[12px] bg-white p-2 sm:grid-cols-[1fr_1fr_110px_auto]"
            >
              <label className="sr-only" htmlFor={`${idPrefix}-c${i}-f`}>
                Nome del figlio {i + 1}
              </label>
              <input
                id={`${idPrefix}-c${i}-f`}
                placeholder="Nome"
                autoComplete="off"
                value={c.firstName}
                onChange={(e) => setChild(i, "firstName", e.target.value)}
                className={box}
              />
              <label className="sr-only" htmlFor={`${idPrefix}-c${i}-l`}>
                Cognome del figlio {i + 1}
              </label>
              <input
                id={`${idPrefix}-c${i}-l`}
                placeholder="Cognome"
                autoComplete="off"
                value={c.lastName}
                onChange={(e) => setChild(i, "lastName", e.target.value)}
                className={box}
              />
              <label className="sr-only" htmlFor={`${idPrefix}-c${i}-y`}>
                Anno di nascita del figlio {i + 1}
              </label>
              <input
                id={`${idPrefix}-c${i}-y`}
                placeholder="Anno"
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                value={c.birthYear}
                onChange={(e) =>
                  setChild(i, "birthYear", e.target.value.replace(/\D/g, ""))
                }
                className={box}
              />
              <button
                type="button"
                onClick={() => removeChild(i)}
                className="scd-focus inline-flex h-12 items-center justify-center gap-1 rounded-[12px] px-3 text-[14px] font-semibold text-[var(--scd-sub)]"
                aria-label={`Togli il figlio ${i + 1}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {value.children.length < MAX_CHILDREN && (
            <button
              type="button"
              onClick={addChild}
              className="scd-focus inline-flex min-h-11 items-center gap-2 justify-self-start text-[15px] font-semibold text-[var(--scd-blue)]"
            >
              <Plus className="size-4" aria-hidden="true" />
              Aggiungi un altro figlio
            </button>
          )}
        </div>
      )}

      {error && (
        <b className="text-[14px] text-[#9a3412]" role="alert">
          {error}
        </b>
      )}

      <label
        htmlFor={`${idPrefix}-note`}
        className="text-[14px] font-bold text-[var(--scd-sub)]"
      >
        Vuoi aggiungere qualcosa? (facoltativo)
      </label>
      <input
        id={`${idPrefix}-note`}
        maxLength={200}
        value={value.note}
        onChange={(e) => onChange({ ...value, note: e.target.value })}
        className={box}
        placeholder="Es. dirigente Under 15, azienda Rossi Srl"
      />

      <ul
        className="grid gap-1.5 text-[14px] leading-snug text-[var(--scd-ink)]"
        data-testid="declare-summary"
      >
        {accessPaths(value).map((p) => (
          <li key={p} className="rounded-[10px] bg-white px-3 py-2">
            {ACCESS_PATH_TEXT[p]}
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

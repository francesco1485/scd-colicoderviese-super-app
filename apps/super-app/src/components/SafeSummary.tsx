// Renders the R20 dashboard summary without dumping raw JSON to the screen.
// Only top-level scalar values are shown; nested structures are summarised by size;
// anything that looks like a credential or personal identifier is never displayed.

const HIDDEN_KEY = /(token|pin|password|secret|iban|codice|fiscal|\bcf\b|email|mail|phone|telefono|cell|isee|session)/i;
const MAX_FIELDS = 12;

type Field = { key: string; label: string; value: string };

function humanize(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function describe(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return "NON VERIFICATO";
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 77)}…` : value;
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("it-IT") : "NON VERIFICATO";
  if (typeof value === "boolean") return value ? "Sì" : "No";
  if (Array.isArray(value)) return `${value.length} elementi`;
  if (typeof value === "object") return `${Object.keys(value as object).length} voci`;
  return null;
}

export function summaryFields(summary: unknown): Field[] {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return [];
  const source = summary as Record<string, unknown>;
  // R20 responses are often wrapped as { ok, data: {...} }
  const body =
    source["data"] && typeof source["data"] === "object" && !Array.isArray(source["data"])
      ? (source["data"] as Record<string, unknown>)
      : source;
  const fields: Field[] = [];
  for (const [key, value] of Object.entries(body)) {
    if (key === "ok" || HIDDEN_KEY.test(key)) continue;
    const text = describe(value);
    if (text === null) continue;
    fields.push({ key, label: humanize(key), value: text });
    if (fields.length >= MAX_FIELDS) break;
  }
  return fields;
}

export function SafeSummary({ summary }: { summary: unknown }) {
  if (summary === null || summary === undefined) {
    return (
      <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Dati in sincronizzazione…
      </p>
    );
  }
  const fields = summaryFields(summary);
  if (fields.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        DA SINCRONIZZARE: il gestionale non ha ancora restituito indicatori per quest'area.
      </p>
    );
  }
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((f) => (
        <div key={f.key} className="rounded-xl border border-border bg-card p-4">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</dt>
          <dd className="mt-1 text-lg font-semibold">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

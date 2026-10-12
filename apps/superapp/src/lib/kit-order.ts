/**
 * Magazzino · ordine kit (r83). Pure helpers for the copy of "SCD_ORDINE_KIT_SEMPLICE_TAGLIA_UNICA_2026-27":
 * counts per group and size, people still without a size, and deliveries recorded in the app per group and size.
 * No names are ever stored or shown (most groups are minors).
 */

export const KIT_SIZES = ["3XS", "2XS", "XS", "S", "M", "L", "XL", "2XL"] as const;
export type KitSize = (typeof KIT_SIZES)[number];

export const COMPONENT_LABEL: Readonly<Record<string, string>> = {
  tshirt: "T-shirt",
  shorts: "Pantaloncini",
  socks: "Calze",
  bag: "Borsone",
};

export type SizeCounts = Partial<Record<KitSize, number>>;

export interface KitGroup {
  key: string;
  label: string;
  athletes: number;
  staff: number;
  sizes: SizeCounts;
  undefined: number;
  delivered: SizeCounts;
}

export interface KitOrder {
  key: string;
  season: string;
  title: string;
  components: Record<string, number>;
  sourceModifiedAt: string | null;
  syncedAt: string | null;
  groups: KitGroup[];
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const int = (v: unknown): number => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : 0);
const isSize = (k: string): k is KitSize => (KIT_SIZES as readonly string[]).includes(k);

function sizeCounts(v: unknown): SizeCounts {
  const r = obj(v);
  const out: SizeCounts = {};
  if (!r) return out;
  for (const [k, n] of Object.entries(r)) if (isSize(k) && int(n) > 0) out[k] = int(n);
  return out;
}

export function parseKitBoard(v: unknown): KitOrder[] | null {
  const r = obj(v);
  if (!r || !Array.isArray(r["orders"])) return null;
  return (r["orders"] as unknown[]).map(obj).filter((o): o is Raw => o !== null && str(o["key"]) !== null).map((o) => {
    const comps = obj(o["components"]) ?? {};
    return {
      key: str(o["key"]) as string,
      season: str(o["season"]) ?? "2026/27",
      title: str(o["title"]) ?? "Ordine kit",
      components: Object.fromEntries(Object.entries(comps).filter(([, n]) => int(n) > 0).map(([k, n]) => [k, int(n)])),
      sourceModifiedAt: str(o["sourceModifiedAt"]),
      syncedAt: str(o["syncedAt"]),
      groups: (Array.isArray(o["groups"]) ? (o["groups"] as unknown[]) : []).map(obj)
        .filter((g): g is Raw => g !== null && str(g["key"]) !== null && str(g["label"]) !== null)
        .map((g) => {
          const sizes = sizeCounts(g["sizes"]);
          const delivered = sizeCounts(g["delivered"]);
          // A delivery can never exceed what was ordered for that size.
          for (const s of KIT_SIZES) if (delivered[s] !== undefined) delivered[s] = Math.min(delivered[s] as number, sizes[s] ?? 0);
          return {
            key: str(g["key"]) as string,
            label: str(g["label"]) as string,
            athletes: int(g["athletes"]),
            staff: int(g["staff"]),
            sizes,
            undefined: int(g["undefined"]),
            delivered,
          };
        }),
    };
  });
}

export const sumSizes = (c: SizeCounts): number => KIT_SIZES.reduce((t, s) => t + (c[s] ?? 0), 0);

export interface KitTotals {
  people: number;
  sized: number;
  undefinedCount: number;
  kitsDelivered: number;
  bySize: Record<KitSize, number>;
  /** Pieces to order per component (people with a size x pieces per kit). */
  pieces: Record<string, number>;
  groupsToComplete: number;
}

export function kitTotals(order: KitOrder): KitTotals {
  const bySize = Object.fromEntries(KIT_SIZES.map((s) => [s, 0])) as Record<KitSize, number>;
  let people = 0;
  let undef = 0;
  let delivered = 0;
  let toComplete = 0;
  for (const g of order.groups) {
    people += g.athletes + g.staff;
    undef += g.undefined;
    delivered += sumSizes(g.delivered);
    for (const s of KIT_SIZES) bySize[s] += g.sizes[s] ?? 0;
    if (g.undefined > 0) toComplete += 1;
  }
  const sized = KIT_SIZES.reduce((t, s) => t + bySize[s], 0);
  const pieces = Object.fromEntries(Object.entries(order.components).map(([k, n]) => [k, sized * n]));
  return { people, sized, undefinedCount: undef, kitsDelivered: delivered, bySize, pieces, groupsToComplete: toComplete };
}

export type GroupState = "vuoto" | "taglie-mancanti" | "da-consegnare" | "in-consegna" | "consegnato";

export function groupState(g: KitGroup): GroupState {
  const ordered = sumSizes(g.sizes);
  if (ordered === 0 && g.undefined === 0) return "vuoto";
  if (g.undefined > 0) return "taglie-mancanti";
  const done = sumSizes(g.delivered);
  if (done === 0) return "da-consegnare";
  return done >= ordered ? "consegnato" : "in-consegna";
}

export const GROUP_STATE_LABEL: Readonly<Record<GroupState, string>> = {
  vuoto: "Nessuno in elenco",
  "taglie-mancanti": "Taglie da scegliere",
  "da-consegnare": "Da consegnare",
  "in-consegna": "Consegna in corso",
  consegnato: "Consegnato",
};

/** Validates a delivery count before sending it to the server. */
export function deliveryError(g: KitGroup, size: string, value: number): string | null {
  if (!isSize(size)) return "Taglia non valida.";
  const ordered = g.sizes[size] ?? 0;
  if (!Number.isInteger(value) || value < 0) return "Scrivi un numero intero.";
  if (value > ordered) return `Al massimo ${ordered}: è quanto ordinato per la taglia ${size}.`;
  return null;
}

const ERRORS: Readonly<Record<string, string>> = {
  forbidden: "Solo magazzino, Segreteria, Tesoreria e Direzione possono segnare le consegne.",
  not_found: "Squadra o taglia non trovata: ricarica la pagina.",
  out_of_range: "Il numero supera quanto ordinato per questa taglia.",
};
export function kitError(code: string | null | undefined): string {
  return (code && ERRORS[code]) || "Operazione non riuscita. Riprova tra poco.";
}

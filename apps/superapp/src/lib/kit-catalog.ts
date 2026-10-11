/** Official kits 2026/27 from the supplier boards (config/scd-kit-catalog.v1.json). Prices as printed, never invented. */
import raw from "../../../../config/scd-kit-catalog.v1.json";

export interface KitItem { name: string; price: number }
export interface Kit {
  id: string;
  title: string;
  audience: string;
  supplier: string;
  total: number;
  mandatory: boolean;
  board: string;
  items: KitItem[];
}
export interface Supplier { id: string; name: string; brand: string; phone: string | null; mobile: string | null; email: string | null; address: string | null }

const R = raw as unknown as { season: string; asOf: string; suppliers: Supplier[]; kits: Kit[] };
export const KIT_SEASON = R.season;
export const KIT_AS_OF = R.asOf;
export const KITS: Kit[] = R.kits;
export const SUPPLIERS: Supplier[] = R.suppliers;

export function supplierOf(kit: Kit): Supplier | undefined {
  return SUPPLIERS.find((s) => s.id === kit.supplier);
}

/** Sum of the items, used to check the printed total. */
export function itemsTotal(kit: Kit): number {
  return Math.round(kit.items.reduce((a, i) => a + i.price, 0) * 100) / 100;
}

export function euro(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

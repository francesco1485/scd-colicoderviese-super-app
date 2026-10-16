/**
 * Repo copy of the position catalogue (config/scd-position-catalog.v1.json), loaded only on the server (dynamic
 * import inside the server functions) so the route loader of the main client bundle never carries it. Used while
 * r138 is not applied or not readable: statuses ACTIVE, holders unknown (null), never zero.
 */
import catalogJson from "../../../../config/scd-position-catalog.v1.json";

import { parsePosition, type CatalogPosition } from "./position-catalog";

export const POSITION_CATALOG_CONFIG = catalogJson;

export function repoCatalog(): CatalogPosition[] {
  return catalogJson.positions.map((p) => parsePosition(p, false)).filter((p): p is CatalogPosition => p !== null);
}

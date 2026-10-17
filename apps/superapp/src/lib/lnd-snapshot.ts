/**
 * Committed copy of the official LND standings and results (UD-181), read by /classifiche and the team pages until
 * migration r116 is applied. Built by scripts/ingest-lnd-standings.mjs from gare.lnd.it; every competition carries
 * its source_url and fetched_at. Public data only: club names, positions, points and scores. No people.
 */
import raw from "@/data/classifiche-lnd-snapshot.json";

import { loadLndSnapshot } from "./lnd-standings";

export const LND_SNAPSHOT = loadLndSnapshot(raw);

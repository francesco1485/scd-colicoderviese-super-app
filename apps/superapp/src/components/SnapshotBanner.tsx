import { AlertTriangle } from "lucide-react";
import { SNAPSHOT_BANNER } from "@/lib/public-snapshots";

export function SnapshotBanner() {
  return (
    <div role="note" className="surface-sun flex items-center justify-center gap-2 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide">
      <AlertTriangle className="size-4 shrink-0" /> {SNAPSHOT_BANNER}
    </div>
  );
}

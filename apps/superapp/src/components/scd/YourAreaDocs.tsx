import { ExternalLink, FileText } from "lucide-react";
import { useState } from "react";

import { Card } from "@/components/scd/interior-ui";
import { AUDIENCE_LABEL, yourAreaDocs } from "@/lib/documents";
import type { LibraryData } from "@/lib/documents.functions";
import { itDay } from "@/lib/fees";

const btnGhost =
  "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold disabled:opacity-50";

/** The r81 documents of the person's audience (family, athlete, staff, mister): a short list, never hidden. */
export function YourAreaDocs({ library, today }: { library: LibraryData | null; today: string }) {
  const [all, setAll] = useState(false);
  const docs = yourAreaDocs(library?.library ?? null);
  if (!library || !library.connected || library.error || docs.length === 0) return null;
  const shown = all ? docs : docs.slice(0, 6);
  return (
    <Card id="documenti-tua-area" title="Documenti della tua area"
      sub={<>Regolamenti e moduli per: <b>{(library.library?.audiences ?? []).map((a) => AUDIENCE_LABEL[a]).join(", ")}</b>. Il resto lo trovi dentro le app e le piattaforme del club.</>}>
      <ul className="m-0 list-none p-0" data-testid="documenti-tua-area">
        {shown.map((d) => (
          <li key={d.ref} className="flex items-center gap-3 border-t border-[var(--in-line)] px-4 py-2.5 first:border-t-0 sm:px-[18px]">
            <FileText className="size-5 flex-none text-[var(--in-info)]" strokeWidth={1.8} aria-hidden="true" />
            <span className="min-w-0 flex-1 text-[15px] leading-snug">
              {d.title}
              {d.due && <span className="ml-2 text-[13px] text-[var(--in-sub)]">{d.due < today ? "scaduto il" : "scade il"} {itDay(d.due)}</span>}
            </span>
            {d.href ? (
              <a href={d.href} target="_blank" rel="noopener noreferrer" className="scd-focus inline-flex h-10 flex-none items-center gap-1.5 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14px] font-semibold">
                <ExternalLink className="size-4" aria-hidden="true" />Apri
              </a>
            ) : (
              <span className="flex-none text-[12.5px] text-[var(--in-sub)]">in archivio, chiedi in Segreteria</span>
            )}
          </li>
        ))}
      </ul>
      {docs.length > 6 && (
        <div className="px-4 pb-4 pt-1 sm:px-[18px]">
          <button type="button" aria-expanded={all} onClick={() => setAll((v) => !v)} className={btnGhost}>
            {all ? "Mostra meno" : `Mostra tutti (${docs.length})`}
          </button>
        </div>
      )}
    </Card>
  );
}

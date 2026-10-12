import { Check, Link2 } from "lucide-react";
import { useState } from "react";

/**
 * "Copia link": every work area has its own address to send to the people who use it (UD-080).
 * The link opens the same Super App; what the person sees still depends on their role.
 */
export function ShareLink({ path, label = "Copia link" }: { path: string; label?: string }) {
  const [state, setState] = useState<"idle" | "done" | "manual">("idle");
  const [url, setUrl] = useState(path);
  async function copy() {
    const full = `${window.location.origin}${path}`;
    setUrl(full);
    try {
      await navigator.clipboard.writeText(full);
      setState("done");
      window.setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("manual");
    }
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void copy()}
        className="scd-focus inline-flex h-11 items-center gap-1.5 rounded-full border border-[var(--in-line)] bg-white px-3.5 text-[14px] font-semibold text-[var(--in-ink)]"
        aria-label={`${label}: ${path}`}
        data-testid="share-link"
      >
        {state === "done" ? <Check className="size-4 text-[var(--in-ok)]" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
        {state === "done" ? "Link copiato" : label}
      </button>
      {state === "manual" && (
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 max-w-[260px] rounded-lg border border-[var(--in-line)] px-2 text-[13px]" aria-label="Link della pagina da copiare" />
      )}
      <span className="sr-only" role="status">{state === "done" ? "Link copiato negli appunti" : ""}</span>
    </span>
  );
}

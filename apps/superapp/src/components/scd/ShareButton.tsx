import { Check, Link2, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { shareData, whatsappUrl, type SharePage } from "@/lib/share";

/**
 * "Condividi" + "Copia link" for public pages (C3). "Condividi" opens the system share sheet when the device has one
 * (navigator.share), otherwise WhatsApp with text and link ready; it is a real link to wa.me, so it works even before
 * the page is interactive. "Copia link" copies the absolute official address; if the clipboard is blocked the address
 * appears selected in a field so it can be copied by hand. No SDK, no tracking.
 */
export function ShareButton({
  page,
  tone = "dark",
  className = "",
}: {
  page: SharePage;
  /** "dark" on navy heroes (white outline), "light" on white or light backgrounds. */
  tone?: "dark" | "light";
  className?: string;
}) {
  const data = shareData(page);
  const wa = whatsappUrl(data);
  const [state, setState] = useState<"idle" | "done" | "manual">("idle");
  const field = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (state === "manual") field.current?.select();
  }, [state]);

  async function onShare(e: React.MouseEvent<HTMLAnchorElement>) {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return; // follow the wa.me link
    e.preventDefault();
    try {
      await navigator.share(data);
    } catch (err) {
      // The person closed the sheet: nothing to do. Any other failure: fall back to WhatsApp.
      if (err instanceof DOMException && err.name === "AbortError") return;
      window.open(wa, "_blank", "noopener,noreferrer");
    }
  }

  async function onCopy() {
    window.clearTimeout(timer.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(data.url);
      setState("done");
      timer.current = window.setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("manual");
    }
  }

  const base =
    "scd-focus inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[12px] px-4 text-[15px] font-bold transition-colors";
  const primary =
    tone === "dark"
      ? `${base} bg-white text-[#0b2a5b] hover:bg-[#e6eefa]`
      : `${base} bg-[#0b2a5b] text-white hover:bg-[#123a78]`;
  const secondary =
    tone === "dark"
      ? `${base} bg-white/10 text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.45)] hover:bg-white/20`
      : `${base} border border-[#b9d5ef] bg-white text-[#0b2a5b] hover:bg-[#f2f7fd]`;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} data-testid="share-button">
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => void onShare(e)}
        className={primary}
        aria-label="Condividi questa pagina su WhatsApp o con un'altra app"
        data-testid="share-open"
      >
        <Share2 className="size-5" aria-hidden="true" />
        Condividi
      </a>
      <button type="button" onClick={() => void onCopy()} className={secondary} data-testid="share-copy">
        {state === "done" ? <Check className="size-5" aria-hidden="true" /> : <Link2 className="size-5" aria-hidden="true" />}
        {state === "done" ? "Link copiato" : "Copia link"}
      </button>
      {state === "manual" && (
        <input
          ref={field}
          readOnly
          value={data.url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Link della pagina: selezionato, copialo a mano"
          className="h-11 min-w-0 max-w-full flex-1 basis-[240px] rounded-[12px] border border-[#b9d5ef] bg-white px-3 text-[14px] text-[#0b1e3a]"
          data-testid="share-manual"
        />
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {state === "done" ? "Link copiato" : state === "manual" ? "Copia non riuscita: il link è selezionato, copialo a mano" : ""}
      </span>
    </div>
  );
}

/**
 * One-tap "Condividi su WhatsApp" for a game or an event (study 15/10/2026, block A). System share sheet when the
 * device has one, otherwise the plain wa.me link with text and link ready (no SDK, no tracking). The text is built
 * by lib/share-match.ts from facts already on the page: never a person's name.
 */
import { Share2 } from "lucide-react";

import { whatsappUrl, type ShareData } from "@/lib/share";

export function ShareWhatsApp({
  data,
  label = "Condividi",
  compact = false,
  className = "",
}: {
  data: ShareData;
  label?: string;
  /** Icon-only round button (rows); the label stays for assistive tech. */
  compact?: boolean;
  className?: string;
}) {
  const wa = whatsappUrl(data);
  async function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return;
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.share(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      window.open(wa, "_blank", "noopener,noreferrer");
    }
  }
  return (
    <a
      href={wa}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label={`${label} su WhatsApp: ${data.title}`}
      data-testid="share-whatsapp"
      className={`scd-focus inline-flex items-center justify-center gap-1.5 rounded-full text-[#1556c4] transition-colors duration-150 hover:bg-[#eef3f9] ${compact ? "size-11" : "h-11 px-3 text-[13.5px] font-bold"} ${className}`}
    >
      <Share2 className="size-[18px]" aria-hidden="true" />
      {!compact && label}
    </a>
  );
}

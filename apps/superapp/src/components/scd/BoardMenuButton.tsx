import { useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";

import { isBoardRoute } from "@/components/SiteChrome";

/**
 * "Tutte le pagine" on the board pages (phones): those pages hide the site header to follow Francesco's boards, so
 * without this button the full menu and "Le tue aree" could not be opened (scd-revisore on 12cdfab, note 5).
 * Shown only on board routes (isBoardRoute). Opens the same drawer as the header icon (SiteChrome listens to "scd:menu"). Desktop keeps the top bar.
 */
export function BoardMenuButton({ className = "" }: { className?: string }) {
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  // Only where the site header is hidden: elsewhere the header already has the menu icon.
  if (!isBoardRoute(pathname)) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("scd:menu"))}
      aria-label="Tutte le pagine: apri il menu completo"
      data-testid="board-menu"
      className={`scd-focus grid size-11 shrink-0 place-items-center rounded-full bg-white/12 text-white backdrop-blur-sm hover:bg-white/20 lg:hidden ${className}`}
    >
      <Menu className="size-[22px]" strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}

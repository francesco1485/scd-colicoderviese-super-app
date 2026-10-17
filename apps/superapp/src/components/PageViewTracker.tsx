import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

import {
  deviceFromWidth,
  normalisePagePath,
  pageSourceFrom,
  trackingRefused,
  type PageSource,
} from "@/lib/page-views";
import { trackPageView } from "@/lib/page-views.functions";

/**
 * "Numeri dell'app" (UD-169): +1 for every public page opened, as anonymous daily totals (migration r143, STAGED).
 * Rendered only in the public shell of __root.tsx (never in work areas or bare pages). Browser only, fire-and-forget:
 * it never blocks the page, swallows every error, sends nothing with Do Not Track or Global Privacy Control on, and
 * stores nothing on the device (no cookie, no localStorage, no identifier). The source of the visit is computed once
 * per page load and kept only in memory, so the pages opened after arriving from Instagram count as Instagram.
 */
let landingSource: PageSource | null = null;

function send(pathname: string) {
  try {
    if (typeof window === "undefined") return;
    if (
      trackingRefused(
        navigator as Navigator & { globalPrivacyControl?: boolean },
      )
    )
      return;
    const path = normalisePagePath(pathname);
    if (!path) return;
    landingSource ??= pageSourceFrom({
      search: window.location.search,
      referrer: document.referrer,
      host: window.location.hostname,
    });
    const data = {
      path,
      source: landingSource,
      device: deviceFromWidth(window.innerWidth),
    };
    const fire = () => {
      try {
        void trackPageView({ data }).catch(() => undefined);
      } catch {
        /* never breaks the page */
      }
    };
    if ("requestIdleCallback" in window)
      window.requestIdleCallback(fire, { timeout: 4000 });
    else setTimeout(fire, 1500);
  } catch {
    /* never breaks the page */
  }
}

export function PageViewTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    send(pathname);
  }, [pathname]);
  return null;
}

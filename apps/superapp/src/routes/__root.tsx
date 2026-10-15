import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useMatches,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { BottomNav, MenuDrawer, SiteFooter, SiteHeader } from "../components/SiteChrome";
import { SkyChat } from "../components/SkyChat";
import { PwaManager } from "../components/PwaManager";
import { SponsorBand } from "../components/SponsorBand";
import { CookieConsent } from "../components/CookieConsent";
import { NextUpBar } from "../components/scd/NextUpBar";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Pagina non trovata</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La pagina che cerchi non esiste o è stata spostata.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Torna alla Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Questa pagina non si è caricata
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Qualcosa è andato storto. Puoi riprovare o tornare alla Home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Riprova
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "S.C.D. ColicoDerviese — Super App" },
      {
        name: "description",
        content:
          "Super App ufficiale della S.C.D. ColicoDerviese: il club (ONE), l'area club (CORE) e sponsor & partner (GROW) in un'unica app.",
      },
      { name: "author", content: "Francesco Coppola" },
      { name: "copyright", content: "© 2026 Francesco Coppola · concesso in uso gratuito alla S.C.D. ColicoDerviese" },
      { name: "theme-color", content: "#062a52" },
      { property: "og:title", content: "S.C.D. ColicoDerviese — Super App" },
      {
        property: "og:description",
        content: "Gare, allenamenti, eventi, area club e sponsor della S.C.D. ColicoDerviese.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Work areas (staticData.interior, or a gated work area whose loader opened the page) bring
  // their own shell: no public chrome around them. A gated area showing its access screen keeps it.
  const interior = useMatches({
    select: (ms) => ms.some((m) => m.staticData?.interior === true || (m.loaderData as { interior?: unknown } | undefined)?.interior === true),
  });

  // Bare pages (staticData.bare, e.g. the LED wall player): only the page itself, nothing drawn over it.
  const bare = useMatches({ select: (ms) => ms.some((m) => m.staticData?.bare === true) });
  if (bare) {
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    );
  }

  if (interior) {
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
        {/* r99: the same chat, opened only from in-page entry points ("Chiedi a Vera"), no floating launcher. */}
        <SkyChat interior />
        <CookieConsent interior />
        <PwaManager />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* Room for the bottom tab bar and the fixed sponsor bar, on every public page (UD-134). */}
      <div className="sa-shell min-h-dvh overflow-x-clip pb-[calc(4rem+46px+env(safe-area-inset-bottom))] lg:pb-[46px]">
        <SiteHeader />
        {/* Technical-cookie notice in the page flow, under the header: nothing floats over the content (UD-135). */}
        <CookieConsent />
        {/* "Prossimo appuntamento" strip (not on the home or the calendar, which show it themselves). */}
        <NextUpBar />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <SiteFooter />
      </div>
      <SponsorBand />
      <BottomNav />
      <MenuDrawer />
      <SkyChat />
      <PwaManager />
    </QueryClientProvider>
  );
}

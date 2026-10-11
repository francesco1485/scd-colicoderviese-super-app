import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /**
     * Work-area route rendered inside <InteriorShell>: the public chrome
     * (top bar, footer, sponsor band, bottom nav, Sky chat) is not shown.
     */
    interior?: boolean;
  }
}

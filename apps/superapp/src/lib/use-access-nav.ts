/**
 * What the navigation adds for the signed-in person (client): areas opened by the Direzione's section grants and the
 * family / team entries of a verified identity, answered by the server (getAccessNav). Signed out, loading or on any
 * error the answer is empty: nobody sees a reserved link before the server has confirmed it. Navigation only, every
 * page keeps its own server gate.
 */
import { useQuery } from "@tanstack/react-query";

import { EMPTY_NAV, type AccessNav } from "./access-resolver";
import { getAccessNav } from "./work-areas.functions";

export const ACCESS_NAV_QUERY_KEY = ["scd", "access-nav"] as const;

export function useAccessNav(signedIn: boolean): AccessNav {
  const q = useQuery({
    queryKey: ACCESS_NAV_QUERY_KEY,
    queryFn: async (): Promise<AccessNav> => {
      try {
        const r = await getAccessNav();
        return { grantAreas: r.grantAreas, auto: r.auto };
      } catch {
        return EMPTY_NAV;
      }
    },
    enabled: signedIn,
    staleTime: 30_000,
    retry: false,
  });
  return signedIn && q.data ? q.data : EMPTY_NAV;
}

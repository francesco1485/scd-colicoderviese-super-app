/**
 * The verified session for the public chrome (client). One shared query: the bottom bar, the top
 * bar and the "Accesso aree" menu read the same answer instead of each calling the server.
 * Until the answer arrives (and during SSR) the chrome renders the anonymous state, so nobody
 * ever sees a reserved control before the server has confirmed who they are.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { getSession, type SessionView } from "./auth.functions";

export const SESSION_QUERY_KEY = ["scd", "session"] as const;

export function useSession(): {
  /** undefined while loading, null when the server could not answer. */
  session: SessionView | null | undefined;
  loading: boolean;
  refresh: () => void;
} {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        return await getSession();
      } catch {
        return null;
      }
    },
    staleTime: 15_000,
    retry: false,
  });
  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
  }, [qc]);
  return { session: q.data, loading: q.isPending, refresh };
}

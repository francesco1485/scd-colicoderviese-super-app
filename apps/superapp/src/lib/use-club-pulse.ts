/** One shared query for the pulse strip and the LIVE badge (react-query dedupes); refreshed every 2 minutes. */
import { useQuery } from "@tanstack/react-query";

import type { ClubPulse } from "./club-pulse";
import { getClubPulse } from "./club-pulse.functions";

export const CLUB_PULSE_QUERY_KEY = ["scd", "club-pulse"] as const;

export function useClubPulse(): {
  pulse: (ClubPulse & { receivedAt: number }) | null;
  pending: boolean;
} {
  const q = useQuery({
    queryKey: CLUB_PULSE_QUERY_KEY,
    queryFn: async () => {
      try {
        const p = await getClubPulse();
        return { ...p, receivedAt: Date.now() };
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[club-pulse]", err);
        return null;
      }
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: false,
  });
  return { pulse: q.data ?? null, pending: q.isPending };
}

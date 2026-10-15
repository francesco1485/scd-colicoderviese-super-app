/** One shared query for the pulse strip and the LIVE badge (react-query dedupes); refreshed every 2 minutes. */
import { useQuery } from "@tanstack/react-query";

import type { ClubPulse } from "./club-pulse";
import { getClubPulse } from "./club-pulse.functions";

export const CLUB_PULSE_QUERY_KEY = ["scd", "club-pulse"] as const;

export function useClubPulse(): ClubPulse | null {
  const q = useQuery({
    queryKey: CLUB_PULSE_QUERY_KEY,
    queryFn: async () => {
      try {
        return await getClubPulse();
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: false,
  });
  return q.data ?? null;
}

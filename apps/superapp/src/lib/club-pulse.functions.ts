/**
 * Server function behind the public pulse strip and the LIVE badge: reads the cached calendar (public view only,
 * no session needed, nothing reserved leaves the server) and returns a few bytes. Cheap enough to poll every
 * couple of minutes from the chrome.
 */
import { createServerFn } from "@tanstack/react-start";

import { clubPulse, type ClubPulse } from "./club-pulse";
import { publicFixturesOnly } from "./public-access";

export const getClubPulse = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClubPulse> => {
    const { getCalendar } = await import("./calendar-bridge.server");
    const r = await getCalendar();
    const pub = publicFixturesOnly({
      season: r.season,
      sourceModifiedAt: r.sourceModifiedAt,
      groups: r.groups,
      events: r.events,
      origin: r.origin,
      throttled: r.throttled === true,
    });
    return clubPulse(pub.events, pub.groups, Date.now());
  },
);

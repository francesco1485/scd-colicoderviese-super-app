/**
 * Server function of the home club communication (UD-116): the window is decided on the server's Rome day
 * (serverRomeDay), and the list module is imported inside the handler only.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { pickClubNotice, type ClubNotice } from "./club-notice";
import { serverRomeDay } from "./public-window";

export const getClubNotice = createServerFn({ method: "GET" })
  .inputValidator((d: { signedIn?: boolean } | undefined) =>
    z.object({ signedIn: z.boolean().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<ClubNotice | null> => {
    const { CLUB_NOTICES } = await import("./club-notice.server");
    const { sessionView } = await import("./auth.functions");
    // The "soci" audience is decided by the verified session, never by the caller's flag alone.
    const signedIn =
      data.signedIn === true ? !!(await sessionView()).user : false;
    return pickClubNotice(
      CLUB_NOTICES,
      serverRomeDay(process.env, Date.now()),
      signedIn,
    );
  });

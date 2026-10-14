/**
 * Personal scope of the signed-in home (UD-116): which teams and which children the "Oggi e questa settimana" block
 * is about, plus the week's trainings of those teams. Everything is read with the caller's own session through the
 * existing scoped reads (getMyFamily, getMyRoster, getTrainingQuadro), and only the minimum leaves the server: team
 * group ids, children's FIRST names and the training slots of those teams. No roster, no contact, no birth date.
 *
 * Staging only (stagingPreviewEnabled): `preview` shows the family or staff composition without a session — staff
 * preview covers every team, family preview has no child linked (empty states), and the page says it is a preview.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { audienceFor, type HomeAudience } from "./home-actions";
import {
  familyChildren,
  rosterGroups,
  weekTrainings,
  type HomeChild,
  type TodayEntry,
} from "./home-today";
import { stagingPreviewEnabled } from "./impianti-access";
import { loadCalendar } from "./public-snapshots";
import { serverRomeDay } from "./public-window";

export type HomePreview = "famiglia" | "staff";

export interface HomeScope {
  audience: HomeAudience;
  /** Set only on staging when a preview was asked and allowed. */
  preview: HomePreview | null;
  /** "ok" when the scoped reads answered; "error" when the database could not be read; "none" without a session. */
  state: "ok" | "error" | "none";
  /** Calendar groups of the person's teams (staff) or children's teams (families). */
  groups: string[];
  children: HomeChild[];
  trainings: TodayEntry[];
  today: string;
}

export const getMyHomeScope = createServerFn({ method: "GET" })
  .inputValidator((d: { preview?: string } | undefined) =>
    z
      .object({ preview: z.enum(["famiglia", "staff"]).optional() })
      .parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<HomeScope> => {
    const today = serverRomeDay(process.env, Date.now());
    const labels = new Map(loadCalendar().groups.map((g) => [g.id, g.label]));
    const label = (id: string) => labels.get(id) ?? id;
    const session = await sessionView();
    const preview =
      !session.user &&
      data.preview &&
      stagingPreviewEnabled(process.env, import.meta.env.PROD)
        ? data.preview
        : null;

    if (preview) {
      const groups =
        preview === "staff"
          ? loadCalendar()
              .groups.filter((g) => g.count > 0 && g.id !== "other")
              .map((g) => g.id)
          : [];
      const { loadQuadro } = await import("./quadro-data.server");
      return {
        audience: preview,
        preview,
        state: "ok",
        groups,
        children: [],
        trainings: weekTrainings(
          loadQuadro().slots,
          today,
          new Set(groups),
          label,
        ),
        today,
      };
    }
    if (!session.user)
      return {
        audience: "visitatore",
        preview: null,
        state: "none",
        groups: [],
        children: [],
        trainings: [],
        today,
      };

    const audience = audienceFor(session.roles, true);
    const { getMyFamily, getMyRoster } = await import("./roster.functions");
    const { getTrainingQuadro } = await import("./quadro.functions");
    const [family, roster, quadro] = await Promise.all([
      getMyFamily(),
      audience === "staff"
        ? getMyRoster()
        : Promise.resolve({ state: "ok" as const, rows: [] }),
      getTrainingQuadro(),
    ]);
    const children =
      family.state === "ok" ? familyChildren(family.members) : [];
    const staffGroups =
      roster.state === "ok"
        ? rosterGroups(roster.rows.map((r) => r.teamCode))
        : [];
    const groups = [
      ...new Set([...staffGroups, ...children.flatMap((c) => c.groups)]),
    ];
    const failed = family.state === "error" || roster.state === "error";
    const slots = quadro.authorized ? quadro.quadro.slots : [];
    return {
      audience,
      preview: null,
      state: failed ? "error" : "ok",
      groups,
      children,
      trainings: weekTrainings(slots, today, new Set(groups), label),
      today,
    };
  });

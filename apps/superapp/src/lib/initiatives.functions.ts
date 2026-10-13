/**
 * Server functions of the time-limited initiatives. The window is decided here, on the server's Rome day
 * (serverRomeDay), never by the visitor's clock; the list module is imported inside the handlers only, so no
 * initiative reaches the browser bundle before it is public.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { initiativesOn, type Initiative } from "./initiatives";
import { serverRomeDay } from "./public-window";

export interface ActiveInitiatives {
  today: string;
  items: Initiative[];
}

export const getActiveInitiatives = createServerFn({ method: "GET" }).handler(
  async (): Promise<ActiveInitiatives> => {
    const { INITIATIVES } = await import("./initiatives.server");
    const today = serverRomeDay(process.env, Date.now());
    return { today, items: initiativesOn(INITIATIVES, today) };
  },
);

export const getInitiative = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().regex(/^[a-z0-9-]{1,80}$/) }).parse(d),
  )
  .handler(async ({ data }): Promise<Initiative | null> => {
    const { INITIATIVES } = await import("./initiatives.server");
    const today = serverRomeDay(process.env, Date.now());
    return initiativesOn(INITIATIVES, today).find((i) => i.id === data.id) ?? null;
  });

/**
 * Server functions of the AI assistants (r99, UD-104): askAssistant (public pages, Crovi) and askStaffAssistant
 * (signed-in, Era / Sky). Real data loaders are wired here; the logic and its tests live in assistant.server.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { MAX_INPUT_CHARS, type AssistantReply, type PublicContextInput } from "./assistant";
import { answerPublic, answerStaff, romeToday } from "./assistant.server";
import { sessionView } from "./auth.functions";
import { AFFILIAZIONI, CLUB_CONTACTS, INTERESSI_ATLETA, SPONSOR_PACKAGES } from "./catalog";
import { clubEventsOn } from "./club-events";
import { CLUB_PROFILE } from "./club-profile";
import { FACILITIES } from "./facilities";
import { dayMonth, initiativesOn } from "./initiatives";
import { parseKb } from "./knowledge";
import { TICKETING } from "./match-extras";
import { OFFICIAL_RESULT_LINKS } from "./official-links";
import { serverRomeDay } from "./public-window";
import { skyRulesAnswer } from "./sky.functions";
import { SPONSORS } from "./sponsors";
import { serverSupabase } from "./supabase.server";

const message = z.string().trim().min(1).max(MAX_INPUT_CHARS);

async function loadPublicContext(): Promise<PublicContextInput> {
  const { getCalendar } = await import("./calendar-bridge.server");
  let calendar: PublicContextInput["calendar"] = null;
  try {
    const r = await getCalendar();
    calendar = { groups: r.groups, events: r.events };
  } catch {
    calendar = null;
  }
  // Events and time-limited initiatives: only those public today (server Rome day), never before showFrom.
  const day = serverRomeDay(process.env, Date.now());
  const { INITIATIVES } = await import("./initiatives.server");
  return {
    today: romeToday(),
    calendar,
    clubEvents: [
      ...clubEventsOn(day).map((e) => ({ title: e.title, when: e.when, text: e.text, href: e.href })),
      ...initiativesOn(INITIATIVES, day).map((i) => ({
        title: `${i.title} ${i.subtitle}`,
        when: `iniziativa fino al ${dayMonth(i.showUntil)}`,
        text: `${i.text} ${i.contact.label}: ${i.contact.display}.`,
        href: i.href,
      })),
    ],
    contacts: { email: CLUB_PROFILE.contacts.email, pec: CLUB_PROFILE.contacts.pec, site: CLUB_PROFILE.contacts.site, address: CLUB_PROFILE.contacts.address },
    sites: FACILITIES.sites.map((s) => ({ name: s.name, address: s.address, municipality: s.municipality, status: s.status })),
    ticketing: TICKETING,
    registration: { interests: INTERESSI_ATLETA, affiliations: AFFILIAZIONI },
    sponsorPackages: SPONSOR_PACKAGES,
    // Only names confirmed by the Direzione (sponsors.ts nameVerified): never a guessed name.
    sponsorNames: SPONSORS.filter((s) => s.name && s.nameVerified).map((s) => s.name as string),
    resultLinks: OFFICIAL_RESULT_LINKS.map((l) => ({ label: l.label, detail: l.detail, url: l.url })),
    safeguardingSubject: CLUB_CONTACTS.safeguardingSubject,
  };
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((d: { message: string; persona?: "crovi" | "sky" | undefined }) =>
    z.object({ message, persona: z.enum(["crovi", "sky"]).optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<AssistantReply> => {
    const { clientIp } = await import("./request-ip.server");
    return answerPublic(
      { message: data.message, persona: data.persona ?? "crovi", ip: clientIp() },
      { rules: skyRulesAnswer, loadContext: loadPublicContext },
    );
  });

export const askStaffAssistant = createServerFn({ method: "POST" })
  .inputValidator((d: { message: string }) => z.object({ message }).parse(d))
  .handler(async ({ data }): Promise<AssistantReply> => {
    // One verified session for the whole answer: roles for the persona, organization for the Cervellone.
    const view = await sessionView();
    const org = view.memberships[0] ?? null;
    return answerStaff(data.message, {
      rules: skyRulesAnswer,
      loadPublicContext,
      session: async () => ({ user: view.user, roles: view.roles }),
      kbSearch: async ({ query, onlyDue, limit }) => {
        // The caller's own session (publishable key + cookies): scd_kb_search enforces INTERNO / RISERVATO.
        // Never a service key here.
        const sb = serverSupabase();
        if (!sb || !org) return null;
        const { data: out, error } = await sb.rpc("scd_kb_search", {
          p_organization_id: org.organizationId,
          p_query: query,
          p_area: null,
          p_stagione: null,
          p_kind: null,
          p_only_due: onlyDue,
          p_limit: limit,
        });
        return error ? null : parseKb(out);
      },
    });
  });

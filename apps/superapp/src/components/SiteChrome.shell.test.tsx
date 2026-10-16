/**
 * App shell from Francesco's boards (approved 15/10/2026 14:40; Eurobet as desktop structure reference only):
 * the phone bottom bar has exactly the five board items, the desktop sidebar lists the public club sections, and a
 * guest never gets a direct link to a members-only page (UD-100: those pass through the sign-in).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  pathname: "/",
  session: null as null | { user: { email: string } | null; roles: string[]; memberships: { organizationId: string; organization: string; role: string }[] },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    search,
    className,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
    search?: Record<string, string | undefined>;
    className?: string;
    [k: string]: unknown;
  }) => {
    const q = search ? new URLSearchParams(Object.entries(search).filter(([, v]) => v !== undefined) as [string, string][]).toString() : "";
    const attrs: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) if (k.startsWith("aria-") || k.startsWith("data-")) attrs[k] = v;
    return (
      <a href={q ? `${to}?${q}` : to} className={className} {...attrs}>
        {children}
      </a>
    );
  },
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: state.pathname } }),
  useNavigate: () => () => undefined,
}));
vi.mock("@/lib/use-session", () => ({
  useSession: () => ({ session: state.session, loading: false, refresh: () => undefined }),
}));
vi.mock("@/lib/use-club-pulse", () => ({ useClubPulse: () => ({ pulse: null, pending: false }) }));

import { MEMBERS_ONLY_PREFIXES, isPublicPath } from "@/lib/http-policy";
import { sessionRolesFrom, type Membership } from "@/lib/session";

import {
  BottomNav,
  SIDEBAR_SECTIONS,
  SideNav,
  SiteHeader,
  publicTabsFor,
  sectionTarget,
  tabsFor,
  workAreasFor,
} from "./SiteChrome";

const BOARD_TABS = ["Home", "Calendario", "Squadre", "Eventi", "Profilo"];
const membersOnly = (href: string) => {
  const path = href.split("?")[0] ?? "";
  return MEMBERS_ONLY_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
};
const hrefs = (html: string) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => (m[1] ?? "").replace(/&amp;/g, "&"));
const session = (role: string) => {
  const m: Membership = { organization_id: "org", organization_slug: "scd", role, scope: null, active: true };
  return {
    user: { email: "persona@example.org" },
    roles: [...sessionRolesFrom([m])],
    memberships: [{ organizationId: "org", organization: "scd", role }],
  };
};
const routes = (() => {
  const tree = readFileSync(resolve(__dirname, "../routeTree.gen.ts"), "utf8");
  return new Set([...tree.matchAll(/fullPath: '([^']+)'/g)].map((m) => (m[1] ?? "").replace(/\/$/, "") || "/"));
})();

beforeEach(() => {
  state.pathname = "/";
  state.session = null;
});

describe("phone bottom bar (boards)", () => {
  it("has exactly the five board items, for guests and members", () => {
    expect(publicTabsFor(false).map((t) => t.label)).toEqual(BOARD_TABS);
    expect(publicTabsFor(true).map((t) => t.label)).toEqual(BOARD_TABS);
    expect(tabsFor("/", false).map((t) => t.label)).toEqual(BOARD_TABS);
    expect(tabsFor("/eventi", true).map((t) => t.label)).toEqual(BOARD_TABS);
  });

  it("renders five links with the board labels and the active one marked", () => {
    state.pathname = "/calendario";
    const html = renderToStaticMarkup(<BottomNav />);
    const labels = [...html.matchAll(/data-tab="([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual(BOARD_TABS);
    expect(html).toMatch(/aria-current="page"[^>]*data-tab="Calendario"/);
    expect(html).not.toMatch(/Partner|Aree|Crea|La mia</);
  });

  it("a guest reaches Squadre and Profilo through the sign-in, never a members-only page directly", () => {
    const html = renderToStaticMarkup(<BottomNav />);
    for (const h of hrefs(html)) expect(membersOnly(h), h).toBe(false);
    expect(hrefs(html)).toContain("/accedi?next=%2Fsquadre");
    const profile = publicTabsFor(false).find((t) => t.label === "Profilo")!;
    expect(profile.to).toBe("/accedi");
  });

  it("a member gets the teams and La mia SCD as Profilo", () => {
    state.session = session("FAMILY");
    const html = renderToStaticMarkup(<BottomNav />);
    expect(hrefs(html)).toEqual(["/", "/calendario", "/squadre", "/eventi", "/la-mia-scd"]);
  });

  it("keeps the staff and Comunicazioni board bars", () => {
    expect(tabsFor("/core/staff").map((t) => t.label)).toEqual(["Dashboard", "Squadre", "Atleti", "Comunicazioni", "Altro"]);
    expect(tabsFor("/comunicazioni").map((t) => t.label)).toEqual(["Home", "Calendario", "Comunicazioni", "Squadre", "Altro"]);
    expect(tabsFor("/comunicazioni", false).find((t) => t.label === "Squadre")!.to).toBe("/accedi");
  });
});

describe("desktop sidebar (Eurobet structure, SCD colours)", () => {
  const PUBLIC_SECTIONS = [
    "Home",
    "Calendario",
    "Squadre",
    "Allenamenti",
    "Eventi e tornei",
    "News",
    "Comunità",
    "Sponsor",
    "Sostieni",
    "Impianti",
    "Contatti",
  ];

  it("renders every public section for a guest, members-only ones through the sign-in", () => {
    const html = renderToStaticMarkup(<SideNav />);
    for (const l of PUBLIC_SECTIONS) expect(html, l).toContain(`>${l}</span>`);
    expect(SIDEBAR_SECTIONS.map((s) => s.label)).toEqual(PUBLIC_SECTIONS);
    for (const h of hrefs(html)) expect(membersOnly(h), h).toBe(false);
    expect(hrefs(html)).toContain("/accedi?next=%2Fallenamenti");
    expect(html).not.toContain('data-testid="side-work-areas"');
    expect(html).toContain("Tutte le pagine");
  });

  it("every section is a real route; non-member sections need no sign-in", () => {
    for (const s of SIDEBAR_SECTIONS) {
      expect(routes.has(s.to), s.to).toBe(true);
      if (!s.members) expect(membersOnly(s.to), s.to).toBe(false);
      else expect(sectionTarget(s, false).to).toBe("/accedi");
    }
    for (const s of SIDEBAR_SECTIONS.filter((x) => !x.members && x.to !== "/sostieni"))
      expect(isPublicPath(s.to), s.to).toBe(true);
  });

  it("marks the active section and shows work areas only from the session positions", () => {
    state.pathname = "/eventi/christmas-lario-cup";
    expect(renderToStaticMarkup(<SideNav />)).toMatch(/aria-current="page"[^>]*data-side="\/eventi"/);
    expect(workAreasFor(null)).toEqual([]);
    const family = workAreasFor(session("FAMILY")).map((a) => a.entry.id);
    expect(family).not.toContain("gestionale");
    expect(family).not.toContain("tesoreria");
    const direction = workAreasFor(session("DIRECTION"));
    expect(direction.map((a) => a.entry.id)).toEqual(expect.arrayContaining(["gestionale", "segreteria", "tesoreria", "direzione"]));
    for (const a of direction) expect(a.entry.reserved).toBe(true);
    state.session = session("DIRECTION");
    expect(renderToStaticMarkup(<SideNav />)).toContain('data-testid="side-work-areas"');
  });
});

describe("header (boards)", () => {
  it("official crest, two-line wordmark, bell to the club notices and the full menu", () => {
    const html = renderToStaticMarkup(<SiteHeader />);
    expect(html).toMatch(/src="[^"]*logo-scd[^"]*"/);
    expect(html).toMatch(/>S\.C\.D\.<\/span>/);
    expect(html).toMatch(/text-\[#ffd600\]">COLICO<\/span><span class="text-white">DERVIESE/);
    expect(html).toMatch(/href="\/comunicazioni"[^>]*data-testid="header-bell"/);
    expect(html).toContain('data-testid="header-menu"');
    expect(html).toContain('placeholder="Cerca squadra, gara, pagina"');
  });
});

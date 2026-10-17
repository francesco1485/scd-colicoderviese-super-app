// @vitest-environment jsdom
/**
 * scd-revisore PR #178 [BLOCK]: an anonymous visitor on /famiglia sees the access screen, never the tour. The real
 * route component is rendered with the loader data of a signed-out caller; a signed-in family gets the tour once.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ loader: null as unknown }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useLoaderData: () => state.loader,
    useSearch: () => ({}),
  }),
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => unknown }) => select({ location: { pathname: "/famiglia" } }),
  useNavigate: () => () => undefined,
  useRouter: () => ({ invalidate: () => undefined }),
}));
vi.mock("@tanstack/react-start", () => {
  const builder = (): Record<string, unknown> => {
    const b: Record<string, unknown> = {};
    for (const k of ["inputValidator", "validator", "middleware"]) b[k] = () => b;
    b["handler"] = (fn: unknown) => fn;
    return b;
  };
  return { createServerFn: builder, useServerFn: (fn: unknown) => fn, createMiddleware: builder };
});
vi.mock("@/components/scd/AccessScreen", () => ({
  AccessScreenPage: ({ id }: { id: string }) => <div data-testid="access-screen">{id}</div>,
  accessHead: () => ({}),
}));
vi.mock("@/components/scd/InteriorShell", () => ({
  InteriorShell: ({ children }: { children: React.ReactNode }) => <div data-testid="interior">{children}</div>,
}));

import { GuideTourHost } from "./GuideTour";
import { resetTourMemory } from "@/lib/guide-tour";
import { Route } from "@/routes/famiglia";

const Page = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component;

beforeEach(() => {
  resetTourMemory();
  window.localStorage.clear();
});
afterEach(cleanup);

describe("first-access tour on /famiglia", () => {
  it("does not open for an anonymous visitor (access screen)", () => {
    state.loader = { roles: [], badge: null, family: { state: "anonymous" }, callups: [], fees: [], transport: { state: "off" }, awayMatches: [], clubHouse: { state: "off" }, live: { state: "unavailable", items: [], checkedAt: "" } };
    render(
      <>
        <Page />
        <GuideTourHost />
      </>,
    );
    expect(screen.getByTestId("access-screen")).toBeTruthy();
    expect(screen.queryByTestId("guide-tour")).toBeNull();
  });

  it("opens once for a signed-in family", () => {
    const qc = new QueryClient();
    state.loader = { roles: ["famiglia"], badge: null, family: { state: "ok", members: [] }, callups: [], fees: [], transport: { state: "off" }, awayMatches: [], clubHouse: { state: "off" }, live: { state: "unavailable", items: [], checkedAt: "" } };
    render(
      <QueryClientProvider client={qc}>
        <Page />
        <GuideTourHost />
      </QueryClientProvider>,
    );
    expect(screen.queryByTestId("access-screen")).toBeNull();
    expect(screen.getByTestId("guide-tour").getAttribute("data-role")).toBe("famiglie");
  });
});

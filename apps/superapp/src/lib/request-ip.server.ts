import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

/**
 * Client address for the per-IP limiters (audit 2026-10-12): headers set by the hosting edge first; otherwise the
 * right-most X-Forwarded-For entry (appended by our proxy, not typed by the client). Never the left-most,
 * client-supplied value. Server only: used by public server functions (access requests, account deletion).
 */
export function clientIp(): string {
  const edge =
    getRequestHeader("cf-connecting-ip") ?? getRequestHeader("true-client-ip");
  if (edge && edge.length <= 64) return edge.trim();
  const xff = getRequestHeader("x-forwarded-for");
  const last = xff
    ?.split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .at(-1);
  return last ?? getRequestIP() ?? "unknown";
}

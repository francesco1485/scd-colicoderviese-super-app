/**
 * Small building blocks of the interior work areas (inside palette `--in-*`), ported from the
 * Visual Master boards Quadro-settimanale and Gestionale: card, chip, team tag, source line,
 * snapshot notice and a link that turns itself on only when its route exists.
 */
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Database } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { romeParts } from "@/lib/home-week";

export function Card({
  title,
  sub,
  aside,
  children,
  className = "",
  id,
  as: Tag = "section",
}: {
  title?: ReactNode;
  sub?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  as?: "section" | "div" | "aside";
}) {
  return (
    <Tag
      aria-labelledby={id && title ? `${id}-title` : undefined}
      className={`in-card relative min-w-0 overflow-hidden rounded-[var(--in-radius,16px)] border border-[var(--in-line)] bg-[var(--in-surface,#fff)] shadow-[var(--in-card-shadow)] ${className}`}
    >
      {(title || aside) && (
        <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-4 pb-2.5 pt-4 sm:px-[18px]">
          <div className="min-w-0">
            {title && (
              <h2
                id={id ? `${id}-title` : undefined}
                className="in-card-title m-0 text-[19px] font-bold leading-tight"
              >
                {title}
              </h2>
            )}
            {sub && (
              <p className="mt-0.5 text-[14px] leading-snug text-[var(--in-sub)]">
                {sub}
              </p>
            )}
          </div>
          {aside && (
            <div className="flex flex-wrap items-center gap-2">{aside}</div>
          )}
        </header>
      )}
      {children}
    </Tag>
  );
}

export type ChipTone = "ok" | "warn" | "crit" | "info" | "mute";
const CHIP: Record<ChipTone, string> = {
  ok: "bg-[var(--in-ok-bg)] text-[var(--in-ok)]",
  warn: "bg-[var(--in-warn-bg)] text-[var(--in-warn)]",
  crit: "bg-[var(--in-crit-bg)] text-[var(--in-crit)]",
  info: "bg-[var(--in-info-bg)] text-[var(--in-info)]",
  mute: "bg-[#eef3f9] text-[var(--in-sub)]",
};

export function Chip({
  tone = "mute",
  children,
  className = "",
}: {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex min-h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13px] font-semibold ${CHIP[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Skewed team tag of the boards (white text on a team colour already darkened to AA). */
export function TeamTag({
  tag,
  color,
  title,
}: {
  tag: string;
  color: string;
  title: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex h-[26px] min-w-[40px] flex-none -skew-x-[8deg] items-center justify-center rounded-[7px] px-[7px] font-title text-[14px] font-black text-white"
      style={{ background: color }}
    >
      <span className="skew-x-[8deg]" aria-hidden="true">
        {tag}
      </span>
      <span className="sr-only">{title}</span>
    </span>
  );
}

/** Colour dot of a team (decorative; the team is always written next to it). */
export function TeamDot({ color }: { color: string | null }) {
  return (
    <span
      aria-hidden="true"
      className="block size-2 flex-none rounded-full"
      style={{ background: color ?? "var(--in-line)" }}
    />
  );
}

/** Source line at the bottom of a card (board: ".row.src"). */
export function SourceLine({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 flex items-start gap-1.5 border-t border-[var(--in-line)] px-4 py-3 text-[13px] leading-snug text-[var(--in-sub)] sm:px-[18px]">
      <Database
        className="mt-0.5 size-[15px] flex-none"
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <span>{children}</span>
    </p>
  );
}

/** "Anteprima, non live" notice with the snapshot dates. */
export function SnapshotNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="note"
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-[#f1dc7a] bg-[#fffbe6] px-4 py-2.5 text-[14px] leading-snug text-[var(--in-ink)]"
    >
      <Chip tone="warn">Anteprima, non live</Chip>
      <span>{children}</span>
    </div>
  );
}

/** True when the app has a route for `path` (index routes are registered with a trailing slash). */
export function useRouteExists(path: string): boolean {
  const router = useRouter();
  const byPath =
    (router as unknown as { routesByPath?: Record<string, unknown> })
      .routesByPath ?? {};
  return Boolean(byPath[path] ?? byPath[`${path}/`]);
}

/**
 * Link to a sub-area that may be built in a parallel branch: a real link when the route exists,
 * otherwise the label with a "presto" badge (never a link that ends on a 404).
 */
export function FutureLink({
  path,
  children,
  className = "",
  badgeClassName = "",
}: {
  path: string;
  children: ReactNode;
  className?: string;
  badgeClassName?: string;
}) {
  const exists = useRouteExists(path);
  if (exists) {
    return (
      <Link
        to={path as never}
        className={`scd-focus inline-flex items-center gap-1.5 font-semibold text-[var(--in-info)] underline-offset-4 hover:underline ${className}`}
      >
        {children}
        <ArrowRight
          className="size-4 flex-none"
          strokeWidth={2}
          aria-hidden="true"
        />
      </Link>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-2 font-semibold text-[var(--in-sub)] ${className}`}
      data-future-path={path}
    >
      {children}
      <span
        className={`rounded-full bg-[#eef3f9] px-2 py-0.5 text-[12px] font-semibold text-[var(--in-sub)] ${badgeClassName}`}
      >
        presto
      </span>
    </span>
  );
}

/** Club date and time (Europe/Rome), refreshed every minute. */
export function useRomeNow(): { date: string; time: string } {
  const read = () =>
    romeParts(new Date().toISOString()) ?? {
      date: new Date().toISOString().slice(0, 10),
      time: "00:00",
    };
  const [now, setNow] = useState(read);
  useEffect(() => {
    const t = window.setInterval(() => setNow(read()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/** Wide content (tables, 7-day grids) scrolls inside its own region, never the page. */
export function ScrollRegion({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={`scd-focus relative overflow-x-auto overscroll-x-contain ${className}`}
    >
      {children}
    </div>
  );
}

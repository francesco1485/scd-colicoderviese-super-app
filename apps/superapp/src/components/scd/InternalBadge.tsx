import type { InternalBadge } from "@/lib/internal-badges";

/**
 * A club-made internal badge (src/lib/internal-badges.ts). Reserved areas only, never public pages,
 * never in place of the official crest. Decorative by default: it always sits next to a visible
 * label (page title, line name), so screen readers skip it; pass `decorative={false}` when alone.
 */
export function InternalBadgeImage({
  badge,
  size,
  decorative = true,
  className = "",
}: {
  badge: InternalBadge;
  /** Rendered size in CSS px (intrinsic width/height reserve the space, no layout shift). */
  size: number;
  decorative?: boolean;
  className?: string;
}) {
  return (
    <img
      src={badge.src}
      srcSet={`${badge.src} 192w, ${badge.src2x} 384w`}
      sizes={`${size}px`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      alt={decorative ? "" : badge.alt}
      draggable={false}
      data-badge={badge.id}
      className={`scd-internal-badge flex-none select-none rounded-full object-contain ${className}`}
    />
  );
}

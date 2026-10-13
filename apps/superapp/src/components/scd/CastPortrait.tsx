import { CAST, castPortraitSrc, castReady, type CastId } from "@/lib/assistant-cast";

/**
 * Cut-out portrait of a cast character (Era, Genny, Dottor Acanfora) with the same subtle life as Crovi:
 * the figure breathes from the feet (styles.css .crovi-actor), and stands still with "reduce
 * motion". Renders nothing until the approved picture is in the app: no drawing ever replaces it.
 * Sized by the caller with a height class; the width follows the portrait frame (1136 x 1408).
 */
export const CAST_FRAME_RATIO = 1136 / 1408;

export function CastPortrait({
  id,
  className = "h-[150px]",
  size = 440,
  ready,
}: {
  id: CastId;
  /** Sizing classes: give the figure a height; the width follows the frame ratio. */
  className?: string;
  size?: 440 | 900;
  /** Readiness override for previews and tests; defaults to the cast registry. */
  ready?: boolean | undefined;
}) {
  if (!(ready ?? castReady(id))) return null;
  const member = CAST[id];
  return (
    <div
      className={`crovi-actor relative flex-none select-none ${className}`}
      // the photos end at the waist: a soft fade hides the hard crop line
      style={{
        aspectRatio: `${CAST_FRAME_RATIO}`,
        maskImage: "linear-gradient(to bottom, #000 82%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 82%, transparent 100%)",
      }}
      data-cast={id}
    >
      <img
        src={castPortraitSrc(id, size)}
        srcSet={`${castPortraitSrc(id, 440)} 355w, ${castPortraitSrc(id, 900)} 726w`}
        sizes="(min-width: 1024px) 178px, 122px"
        alt={member.alt}
        draggable={false}
        decoding="async"
        loading="lazy"
        className="absolute inset-0 size-full object-contain object-bottom"
      />
    </div>
  );
}

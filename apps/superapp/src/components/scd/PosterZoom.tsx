import { Expand, X } from "lucide-react";
import { useRef } from "react";

/**
 * An official poster shown once as a thumbnail; a tap opens it full size in a native modal <dialog> (Esc, the close
 * button or a tap on the backdrop close it; focus returns to the thumbnail). The file is the club's original, never
 * cropped or redrawn: the thumbnail only frames its top.
 */
export function PosterZoom({
  src,
  alt,
  caption,
  className = "",
}: {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
}) {
  const dlg = useRef<HTMLDialogElement>(null);
  const open = () => {
    const d = dlg.current;
    if (d && typeof d.showModal === "function") d.showModal();
    else window.open(src, "_blank", "noopener,noreferrer");
  };
  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`scd-focus group relative block overflow-hidden rounded-[10px] bg-[#13254d] ring-1 ring-[#d6deeb] ${className}`}
        aria-label={`Ingrandisci: ${alt}`}
        data-testid="poster-zoom"
      >
        <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
        <span aria-hidden="true" className="absolute bottom-1.5 right-1.5 inline-flex size-8 items-center justify-center rounded-full bg-[#13254d]/85 text-white">
          <Expand className="size-4" />
        </span>
      </button>
      <dialog
        ref={dlg}
        aria-label={alt}
        onClick={(e) => {
          if (e.target === dlg.current) dlg.current?.close();
        }}
        className="m-auto max-h-[92dvh] w-[min(92vw,720px)] overflow-visible rounded-[14px] bg-transparent p-0 backdrop:bg-[#0f1d3d]/85"
      >
        <figure className="m-0 grid gap-2">
          <img src={src} alt={alt} className="mx-auto block max-h-[82dvh] w-auto max-w-full rounded-[12px] object-contain" />
          <figcaption className="flex items-center justify-between gap-3 text-[14px] font-semibold text-white">
            <span>{caption ?? alt}</span>
            <button
              type="button"
              onClick={() => dlg.current?.close()}
              className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-white px-3 text-[14.5px] font-bold text-[#13254d]"
              data-testid="poster-close"
            >
              <X className="size-4" aria-hidden="true" />
              Chiudi
            </button>
          </figcaption>
        </figure>
      </dialog>
    </>
  );
}

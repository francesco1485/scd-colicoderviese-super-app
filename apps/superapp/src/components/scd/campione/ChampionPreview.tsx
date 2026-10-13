/**
 * Preview of the member's champion ("Crea il tuo campione", UD-102). The picture is an AI-generated original (a base
 * or a text generation), never a photo: the label says so on the image. The official club crest is overlaid as the
 * official file (ClubCrestOfficial), never generated. Nickname and number are drawn by the app on the nameplate.
 */
import { Sparkles } from "lucide-react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { AI_LABEL } from "@/lib/avatar-studio";

export function ChampionPreview({
  src,
  alt,
  nickname,
  number,
  caption,
  prototype = true,
}: {
  src: string | null;
  alt: string;
  nickname: string;
  number: number | null;
  caption: string;
  prototype?: boolean;
}) {
  return (
    <figure
      className="relative m-0 aspect-[4/5] w-full overflow-hidden rounded-[22px] bg-[#0b2a5b] shadow-[0_18px_40px_-18px_rgb(11_42_91/0.55)]"
      data-testid="champion-preview"
    >
      {src ? (
        <img src={src} alt={alt} width={640} height={794} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center px-8 text-center text-[15px] text-[#c8d8ee]">
          Scegli una base o crea il tuo campione: l'anteprima compare qui.
        </div>
      )}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[52%] bg-[linear-gradient(180deg,transparent,rgb(6_22_50/0.92)_72%)]"
      />
      {src && (
        <span className="absolute left-3 top-3 inline-flex max-w-[calc(100%-80px)] items-center gap-1.5 rounded-full bg-[#0b2a5b]/90 px-3 py-1.5 text-[13px] font-semibold leading-tight text-white">
          <Sparkles className="size-4 shrink-0 text-[#ffd600]" aria-hidden="true" />
          {AI_LABEL}
        </span>
      )}
      <span className="absolute right-3 top-3 grid place-items-center rounded-[14px] bg-white/92 p-1.5 shadow-[0_2px_8px_rgb(0_0_0/0.25)]">
        <ClubCrestOfficial size={44} />
      </span>
      <figcaption className="absolute inset-x-0 bottom-0 grid gap-1 p-4 text-white">
        <span className="flex items-end gap-3">
          <span className="min-w-0 flex-1 truncate font-uv text-[clamp(30px,8vw,44px)] uppercase leading-[0.9]">
            {nickname || "Nickname"}
          </span>
          <span
            className="grid size-[54px] shrink-0 place-items-center rounded-[14px] bg-[#ffd600] font-uv text-[30px] leading-none text-[#0b2a5b]"
            aria-label={number ? `Numero ${number}` : "Numero non scelto"}
          >
            {number ?? "–"}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2 text-[13px] text-[#dbe6f5]">
          {caption}
          {prototype && src && (
            <span className="rounded-md border border-dashed border-white/50 px-1.5 py-0.5 text-[12px] font-semibold">
              prototipo
            </span>
          )}
        </span>
      </figcaption>
    </figure>
  );
}

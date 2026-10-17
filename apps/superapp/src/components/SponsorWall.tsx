import { ChevronDown, ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SponsorLogo } from "@/components/scd/Logos";
import { MetalHeading } from "@/components/scd/MetalPageHeader";
import { NAME_TO_CONFIRM, PROFILE_UNKNOWN, sponsorProfile, thanksLine, websiteLabel, type SponsorProfile } from "@/lib/sponsor-profiles";
import { SPONSORS, sponsorLabel, type Sponsor } from "@/lib/sponsors";

/**
 * «Già con noi» on /sponsor: the official logos of the 2026/27 partners (lib/sponsors.ts, full colour). Tapping a logo
 * opens a small card (bottom sheet on the phone, corner card on desktop) with the official name, sector and town
 * («da confermare» until recorded), the official link or handle when documented and «Grazie a [nome] per …» only for a
 * documented support item (lib/sponsor-profiles.ts). Engine: SOLDI (a partner shown well is the best pitch to the next).
 * Measured by: card opens and presses on the official link. Escape or «Chiudi» closes and gives focus back to the logo.
 */

/** Logos shown before «Vedi tutte»: progressive disclosure, no wall of 37 tiles on a phone. */
export const WALL_FIRST = 12;

export function SponsorCard({ profile, onClose, closeRef }: { profile: SponsorProfile; onClose: () => void; closeRef?: React.Ref<HTMLButtonElement> }) {
  const thanks = thanksLine(profile);
  const detail = profile.sector || profile.town
    ? [profile.sector ? `Settore: ${profile.sector}` : `Settore: ${PROFILE_UNKNOWN}`, profile.town ? `Paese: ${profile.town}` : `Paese: ${PROFILE_UNKNOWN}`].join(" · ")
    : `Settore e paese: ${PROFILE_UNKNOWN}`;
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="sponsor-card-title"
      id="sponsor-card"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+104px)] z-40 rounded-[14px] border border-[#d6deeb] bg-white p-4 text-[#14264d] shadow-[0_24px_48px_-20px_rgb(20_38_77/0.75)] lg:inset-x-auto lg:right-28 lg:bottom-16 lg:w-[380px]"
      data-testid="sponsor-card"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] rounded-t-[14px] bg-[linear-gradient(90deg,#0457af,#7fd0ff_50%,#ffd84a)]" />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="m-0 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[#0457af]">Partner 2026/27</p>
          <h3 id="sponsor-card-title" className="m-0 mt-0.5 font-display text-[21px] font-bold leading-tight">{profile.name ?? NAME_TO_CONFIRM}</h3>
          <p className="m-0 mt-1 text-[13px] text-[#52627f]" data-testid="sponsor-card-detail">{detail}</p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="scd-focus inline-flex size-11 flex-none items-center justify-center rounded-full bg-[#eaf3fd] text-[#13254d]"
          aria-label="Chiudi la scheda"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      {thanks && <p className="m-0 mt-3 rounded-[10px] bg-[#fff6d6] px-3 py-2 text-[14px] font-semibold leading-snug" data-testid="sponsor-card-thanks">{thanks}</p>}
      {(profile.website || profile.socialHandle) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-[#0457af] px-3 font-display text-[14.5px] font-semibold text-[#0457af]"
              data-testid="sponsor-card-site"
            >
              {websiteLabel(profile.website)}
              <ExternalLink className="size-4" aria-hidden="true" />
              <span className="sr-only">(si apre in una nuova scheda)</span>
            </a>
          )}
          {profile.socialHandle && <span className="inline-flex min-h-11 items-center rounded-[10px] bg-[#eaf3fd] px-3 text-[14px] font-semibold text-[#0457af]">{profile.socialHandle}</span>}
        </div>
      )}
    </div>
  );
}

export function SponsorWall({ sponsors = SPONSORS, initialOpen = null }: { sponsors?: readonly Sponsor[]; initialOpen?: string | null }) {
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<string | null>(initialOpen);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTile = useRef<HTMLButtonElement | null>(null);
  const shown = all ? sponsors : sponsors.slice(0, WALL_FIRST);
  const current = open ? sponsors.find((s) => s.slug === open) : undefined;

  const close = () => {
    setOpen(null);
    lastTile.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(null);
      lastTile.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section aria-labelledby="con-noi-t" data-testid="sponsor-wall">
      <MetalHeading id="con-noi-t" sub={`${sponsors.length} aziende del territorio nella stagione 2026/27, loghi originali. Tocca un logo per conoscerla.`}>
        Già con noi
      </MetalHeading>
      <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4 lg:grid-cols-6" id="sponsor-wall-list">
        {shown.map((s) => (
          <li key={s.slug}>
            <button
              type="button"
              onClick={(e) => {
                lastTile.current = e.currentTarget;
                setOpen((v) => (v === s.slug ? null : s.slug));
              }}
              aria-expanded={open === s.slug}
              aria-controls="sponsor-card"
              aria-label={`${sponsorLabel(s)}: apri la scheda`}
              className={`scd-focus flex h-[64px] w-full items-center justify-center rounded-[10px] border bg-white px-2 lg:h-[76px] ${open === s.slug ? "border-[#0457af] shadow-[0_0_0_2px_#0457af]" : "border-[#e3eaf4] hover:border-[#9fb4d4]"}`}
              data-sponsor={s.slug}
            >
              <SponsorLogo sponsor={s} box={{ w: 96, h: 40 }} decorative />
            </button>
          </li>
        ))}
      </ul>
      {sponsors.length > WALL_FIRST && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          aria-controls="sponsor-wall-list"
          className="scd-focus mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md font-display text-[15px] font-semibold text-[#0457af]"
          data-testid="sponsor-wall-toggle"
        >
          {all ? "Mostra meno" : `Vedi tutte le ${sponsors.length} aziende`}
          <ChevronDown className={`size-4 transition-transform motion-reduce:transition-none ${all ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      )}
      {current && <SponsorCard profile={sponsorProfile(current)} onClose={close} closeRef={closeRef} />}
    </section>
  );
}

import { useRouterState } from "@tanstack/react-router";

/**
 * Fascia sponsor sempre visibile sopra la barra di navigazione (su desktop in fondo alla pagina).
 * Loghi dalla libreria asset ufficiale caricata dalla società (scontornati, colori originali).
 * Solo sponsor con rapporto in corso: HDI/Maglia tolto il 12/10/2026 (contratto scaduto, mappa A-Z §7).
 */
const SPONSORS = [
  { name: "ATV", src: null },
  { name: "Saglio Sport Cantù", src: "/media/sponsor/saglio-sport.webp" },
  { name: "Legea", src: "/media/sponsor/legea.webp" },
] as const;

function Plates({ hidden = false }: { hidden?: boolean }) {
  return (
    <>
      {SPONSORS.map((s) => (
        <span
          key={s.name + String(hidden)}
          className="flex h-7 shrink-0 items-center lg:h-8"
          aria-hidden={hidden || undefined}
        >
          {s.src ? (
            <img
              src={s.src}
              alt={hidden ? "" : s.name}
              className="h-[22px] w-auto lg:h-[30px]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="font-uv text-[19px] uppercase tracking-[0.06em] text-[var(--uv-night)] lg:text-[24px]">
              {hidden ? s.name : <span aria-label={s.name}>{s.name}</span>}
            </span>
          )}
        </span>
      ))}
    </>
  );
}

export function SponsorBand() {
  // The phone home shows the sponsors as a section (board VR-010): no duplicate fixed band there.
  const home = useRouterState({ select: (st) => st.location.pathname === "/" });
  return (
    <aside
      aria-label="I nostri sponsor"
      data-testid="sponsor-band"
      className={`fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-[39] ${home ? "hidden lg:flex" : "flex"} h-[34px] items-center overflow-hidden border-t-[2px] lg:h-[46px] lg:border-t-[3px] border-[var(--uv-gold)] bg-white lg:bottom-0`}
    >
      <span className="uv-notch relative z-[1] flex h-full shrink-0 items-center bg-[var(--uv-night)] pl-[12px] pr-[20px] font-uv text-[12px] lg:pl-[14px] lg:pr-[24px] lg:text-[14px] uppercase tracking-[0.12em] text-[var(--uv-gold)]">
        Sponsor
      </span>
      <div className="uv-marquee flex w-max items-center gap-9 pl-6">
        <Plates />
        <Plates hidden />
        <Plates hidden />
        <Plates hidden />
      </div>
    </aside>
  );
}

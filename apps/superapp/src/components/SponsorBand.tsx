/**
 * Fascia sponsor sempre visibile sopra la barra di navigazione (su desktop in fondo alla pagina).
 * Loghi dalla libreria asset ufficiale caricata dalla società (scontornati, colori originali).
 */
const SPONSORS = [
  {
    name: "HDI Assicurazioni, Maglia Assicurazioni",
    src: "/media/sponsor/hdi-maglia-assicurazioni.webp",
  },
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
          className="flex h-8 shrink-0 items-center"
          aria-hidden={hidden || undefined}
        >
          {s.src ? (
            <img
              src={s.src}
              alt={hidden ? "" : s.name}
              className="h-[30px] w-auto"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="font-uv text-[24px] uppercase tracking-[0.06em] text-[var(--uv-night)]">
              {hidden ? s.name : <span aria-label={s.name}>{s.name}</span>}
            </span>
          )}
        </span>
      ))}
    </>
  );
}

export function SponsorBand() {
  return (
    <aside
      aria-label="I nostri sponsor"
      data-testid="sponsor-band"
      className="fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-[39] flex h-[46px] items-center overflow-hidden border-t-[3px] border-[var(--uv-gold)] bg-white lg:bottom-0"
    >
      <span className="uv-notch relative z-[1] flex h-full shrink-0 items-center bg-[var(--uv-night)] pl-[14px] pr-[24px] font-uv text-[14px] uppercase tracking-[0.12em] text-[var(--uv-gold)]">
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

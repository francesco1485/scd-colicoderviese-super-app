/**
 * Glifi pieni delle tavole SCD (pallone, cono, gruppo persone). Disegni originali semplici
 * (GENERATE_ORIGINAL): non sostituiscono alcun asset ufficiale.
 */
type IconProps = { className?: string; size?: number; title?: string };

function a11y(title?: string) {
  return title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
}

/** Pallone classico (pannelli scuri), come nelle tessere "Gare" e nelle righe partita. */
export function BallIcon({ className, size = 28, title }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} {...a11y(title)}>
      <circle cx="16" cy="16" r="14.2" fill="#fff" stroke="currentColor" strokeWidth="2.2" />
      <path fill="currentColor" d="M16 9.6l5.1 3.7-1.95 6h-6.3l-1.95-6z" />
      <path fill="currentColor" d="M16 1.9l3.2 2.3-.4 2.9L16 8.6l-2.8-1.5-.4-2.9zM28.6 11.2l.9 3.8-2.2 2.1-2.9-.8-1-3.1 1.6-2.4zM24.9 25.6l-3.6 2.1-2.6-1.6.3-3.1 2.8-1.6 2.9.9zM7.1 25.6l-.2-3.3 2.9-.9 2.8 1.6.3 3.1-2.6 1.6zM3.4 11.2l3.6-.4 1.6 2.4-1 3.1-2.9.8-2.2-2.1z" />
      <path fill="none" stroke="currentColor" strokeWidth="1.3" d="M16 9.6V7.6M21.1 13.3l2.8-.9M19.15 19.3l1.7 2.4M12.85 19.3l-1.7 2.4M10.9 13.3l-2.8-.9" />
    </svg>
  );
}

/** Cono da allenamento arancio con fasce bianche. */
export function ConeIcon({ className, size = 28, title }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} {...a11y(title)}>
      <path fill="currentColor" d="M13.4 3.5h5.2l7 21.5H6.4z" />
      <path fill="#fff" d="M11.9 9.6h8.2l1.15 3.6H10.75zM9.85 16h12.3l1.2 3.7H8.65z" />
      <rect x="3" y="24.6" width="26" height="4.2" rx="1.6" fill="currentColor" />
    </svg>
  );
}

/** Gruppo di tre persone, pieno (tessera "Iniziative", "Persone e staff"). */
export function PeopleIcon({ className, size = 28, title }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} {...a11y(title)}>
      <circle cx="16" cy="9" r="4.6" fill="currentColor" />
      <circle cx="7" cy="11.4" r="3.6" fill="currentColor" />
      <circle cx="25" cy="11.4" r="3.6" fill="currentColor" />
      <path fill="currentColor" d="M8.6 27c0-5.6 3.3-9.6 7.4-9.6s7.4 4 7.4 9.6z" />
      <path fill="currentColor" d="M1.2 25.6c0-4.5 2.6-7.6 5.8-7.6 1.3 0 2.5.5 3.4 1.4-1.6 1.6-2.6 3.8-2.9 6.2zM30.8 25.6c0-4.5-2.6-7.6-5.8-7.6-1.3 0-2.5.5-3.4 1.4 1.6 1.6 2.6 3.8 2.9 6.2z" />
    </svg>
  );
}

/** Calendario con griglia (tessera "Eventi"). */
export function CalendarGridIcon({ className, size = 28, title }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} {...a11y(title)}>
      <rect x="3.5" y="6" width="25" height="22.5" rx="3" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <path fill="currentColor" d="M3.5 9a3 3 0 013-3h19a3 3 0 013 3v3.6h-25z" />
      <rect x="9" y="2.5" width="2.8" height="6.5" rx="1.2" fill="currentColor" />
      <rect x="20.2" y="2.5" width="2.8" height="6.5" rx="1.2" fill="currentColor" />
      {[0, 1, 2, 3].map((c) => [0, 1, 2].map((r) => (
        <rect key={`${c}-${r}`} x={7.4 + c * 4.6} y={15.2 + r * 4.1} width="3" height="2.6" rx=".5" fill="currentColor" />
      )))}
    </svg>
  );
}

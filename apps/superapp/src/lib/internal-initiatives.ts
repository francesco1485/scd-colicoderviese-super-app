/**
 * Initiatives kept INTERNAL (UD-132, Francesco 14/10/2026 23:20: "Adotta un seggiolino e lotteria al momento teniamoli
 * interni senza pubblicazione. Concentriamoci su quello che spinge i ragazzi e le famiglie a starci sopra e viverla").
 *
 * While a flag is true the initiative never appears on public pages or the public home strip: no link, no package,
 * no public page content (the lottery page answers "in preparazione" and stays noindex). The Direzione and Tesoreria
 * pages keep working. Turning a flag to false is a new decision of Francesco, recorded as a directive.
 */
export const INTERNAL_ONLY = {
  /** "Adotta un seggiolino" (tribune seat map, sponsor package "Seggiolino in tribuna"). */
  seatAdoption: true,
  /** "Lotteria dello sport" (UD-115). */
  lottery: true,
} as const;

/** Zone del Navigatore Dervio V01 (Drive 1nfybIxk5ZZIvs2rAaMdMjurR8tcCrkhc). Solo fatti presenti nel testo della fonte. */
export const DERVIO_ZONES = [
  { id: 'AT1', label: 'Anello atletica', facts: ['Ovale pista', '4 corsie, interno 320 m'] },
  { id: 'C1', label: 'Campo A 11', facts: ['96 x 48 m (fonte 2025)', 'Erba naturale'] },
  { id: 'AT2', label: 'Rettilineo 100 m', facts: ['Lato tribuna'] },
  { id: 'TR', label: 'Tribuna coperta', facts: ['Capienza 190: dato 2024'] },
  { id: 'C2', label: 'Zona allenamento', facts: ['Area di allenamento'] },
  { id: 'BV1', label: 'Beach volley 1', facts: ['Area in sabbia', '2 campi documentati'] },
  { id: 'BV2', label: 'Beach volley 2', facts: ['Area in sabbia', '2 campi documentati'] },
  { id: 'SP1', label: 'Blocco spogliatoi e servizi', facts: ['Testo fonte: «4 squadre + 1 arbitri; porte da rilevare»', 'Non è uno stato di occupazione'] },
] as const;
export type DervioZoneId = (typeof DERVIO_ZONES)[number]['id'];
export const DERVIO_STATUS = 'Assegnazione non sincronizzata';
export const DERVIO_CAPTION = 'Schema funzionale non in scala e non georeferenziato · Fonte: Navigatore Dervio V01';

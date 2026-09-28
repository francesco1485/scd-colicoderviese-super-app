# SCD MEDIA ASSET POLICY — PERMANENTE

## Principio
Nessun logo, stemma, mascotte, avatar, icona o cutout deve apparire come un'immagine rettangolare con fondo estraneo.

## Formato
Formato canonico: PNG RGBA con trasparenza.

## Pipeline
1. Ricevi asset.
2. Distingui fotografia di sfondo da asset grafico/cutout.
3. Se asset grafico: controlla canale alpha.
4. Se manca alpha: rileva lo sfondo uniforme/di bordo.
5. Rimuovi lo sfondo con bordo morbido.
6. Taglia margini trasparenti.
7. Esporta PNG.
8. Controlla proporzioni e colori.
9. Solo dopo pubblica.

## Fotografie persone
- Default: elaborazione locale.
- Foto profilo: ritaglio con trasparenza esterna o avatar.
- Nessun riconoscimento facciale o inferenza sensibile.
- Nessun upload automatico verso servizi esterni.

## Avatar SCD
Il generatore base deve poter funzionare gratis sul dispositivo. Parametri: ruolo, numero, carnagione, capelli, espressione, divisa. Export PNG trasparente.

## Eccezione
Fotografie hero, territorio e reportage possono essere JPEG/WebP/AVIF perché sono sfondi fotografici, non cutout grafici.

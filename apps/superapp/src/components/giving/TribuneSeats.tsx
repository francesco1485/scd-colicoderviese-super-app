/**
 * "Adotta un seggiolino" (C2, UD-113) — kept INTERNAL by UD-132: /sostieni renders it only when
 * INTERNAL_ONLY.seatAdoption is false. The story, the seat map of the new tribune and the CTA that opens the
 * existing pledge dialog. Seat states come only from the catalogue item's units (real pledge data via getGivingPublic);
 * with no data every seat is free and the count says "0 di 60". No amount while TRIBUNE_SEAT_AMOUNT is null.
 */
import { Link } from "@tanstack/react-router";
import { Armchair, Building2, HeartHandshake, Receipt, Users } from "lucide-react";
import { useMemo, useState } from "react";

import type { PublicItem } from "@/lib/giving";
import {
  ANONYMOUS_PLATE,
  CO_ADOPTION_LIVE,
  LAYOUT_NOTE,
  MAX_CO_ADOPTERS,
  SEAT_STATE_LABEL,
  TRIBUNE_LAYOUT,
  TRIBUNE_SEATS_TOTAL,
  TRIBUNE_SEAT_AMOUNT,
  plateLabel,
  seatAmountText,
  seatAriaLabel,
  seatLayout,
  seatPlace,
  seatRoom,
  seatSelectable,
  seatState,
  seatsFromUnits,
  tribuneProgress,
  type Seat,
  type SeatState,
} from "@/lib/tribune-seats";

import { btnSun } from "./buttons";

const SEAT_TONE: Record<SeatState, string> = {
  LIBERO: "border border-border bg-card text-foreground hover:border-primary",
  PROMESSO: "border-2 border-dashed border-primary/60 bg-accent/35 text-foreground",
  ADOTTATO: "bg-primary text-primary-foreground",
};

function Legend() {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-xs" aria-label="Legenda dei posti">
      {(["LIBERO", "PROMESSO", "ADOTTATO"] as const).map((s) => (
        <li key={s} className="flex items-center gap-2">
          <span aria-hidden="true" className={`inline-block size-4 rounded ${SEAT_TONE[s]}`} />
          <span className="capitalize">{SEAT_STATE_LABEL[s]}</span>
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="inline-block size-4 rounded bg-accent ring-2 ring-primary" />
        Scelto da te
      </li>
    </ul>
  );
}

/** The seat map: sectors side by side on desktop, stacked on phone (5 seats per line, 44 px buttons). */
export function SeatMap({ seats, picked, onPick }: { seats: readonly Seat[]; picked: number | null; onPick: (n: number) => void }) {
  const rows = useMemo(() => seatLayout(), []);
  const byN = useMemo(() => new Map(seats.map((s) => [s.n, s])), [seats]);
  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="seat-map">
      {TRIBUNE_LAYOUT.sectors.map((sector) => (
        <section key={sector.id} aria-label={sector.label} className="min-w-0">
          <h4 className="m-0 font-display text-sm font-bold uppercase tracking-wide">{sector.label}</h4>
          <div className="mt-2 space-y-2">
            {rows
              .filter((r) => r.sector === sector.id)
              .slice()
              .reverse()
              .map((r) => (
                <div key={r.row} className="flex items-start gap-2">
                  <span className="w-11 flex-none pt-3 text-xs font-semibold text-muted-foreground">Fila {r.row}</span>
                  <ul className="m-0 grid min-w-0 flex-1 list-none grid-cols-5 gap-1 p-0 sm:grid-cols-10" aria-label={`${sector.label}, fila ${r.row}`}>
                    {r.seats.map((n) => {
                      const seat = byN.get(n) ?? { n, holders: [] };
                      const st = seatState(seat.holders);
                      const can = seatSelectable(seat);
                      const isPicked = picked === n;
                      return (
                        <li key={n}>
                          <button
                            type="button"
                            aria-label={seatAriaLabel(seat)}
                            aria-pressed={isPicked}
                            aria-disabled={!can || undefined}
                            data-state={st.toLowerCase()}
                            onClick={() => onPick(n)}
                            className={`scd-focus h-11 w-full min-w-11 rounded-md text-sm font-bold tabular-nums transition-colors ${isPicked ? "bg-accent text-accent-foreground ring-2 ring-primary" : SEAT_TONE[st]}`}
                          >
                            {n}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
          </div>
        </section>
      ))}
      <p className="m-0 rounded-md bg-muted py-1.5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground lg:col-span-2" aria-hidden="true">
        Lato campo
      </p>
    </div>
  );
}

/** Details of the chosen seat (or how it works when none is chosen). */
function SeatDetail({ seat }: { seat: Seat | null }) {
  if (!seat) {
    return <p className="m-0 text-sm text-muted-foreground">Tocca un posto per vedere numero, fila e targhetta.</p>;
  }
  const st = seatState(seat.holders);
  const place = seatPlace(seat.n);
  const plate = plateLabel(seat.holders);
  const room = seatRoom(seat.holders);
  return (
    <div aria-live="polite" data-testid="seat-detail">
      <p className="m-0 text-lg font-bold">
        Posto {seat.n}
        {place && <span className="font-normal text-muted-foreground"> · {place.sectorLabel}, fila {place.row}</span>}
      </p>
      <dl className="m-0 mt-2 space-y-1 text-sm">
        <div className="flex flex-wrap gap-x-2"><dt className="font-semibold">Stato</dt><dd className="m-0 capitalize">{SEAT_STATE_LABEL[st]}</dd></div>
        <div className="flex flex-wrap gap-x-2"><dt className="font-semibold">Importo</dt><dd className="m-0">{seatAmountText(TRIBUNE_SEAT_AMOUNT)}</dd></div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-semibold">Targhetta</dt>
          <dd className="m-0">{plate ?? (st === "PROMESSO" ? "in attesa della conferma della Tesoreria" : `il nome che scegli, oppure «${ANONYMOUS_PLATE}»`)}</dd>
        </div>
        {st !== "LIBERO" && CO_ADOPTION_LIVE && room > 0 && (
          <div className="flex flex-wrap gap-x-2"><dt className="font-semibold">Insieme</dt><dd className="m-0">c'è posto ancora per {room} {room === 1 ? "persona" : "persone"}</dd></div>
        )}
      </dl>
    </div>
  );
}

export function TribuneSeatsSection({ item, active, onAdopt }: {
  /** The tribune item of the existing catalogue (findTribuneItem), null when not published / r101 not applied. */
  item: PublicItem | null;
  active: boolean;
  onAdopt: (unit: number | null) => void;
}) {
  const seats = useMemo(() => seatsFromUnits(item?.units ?? null, TRIBUNE_SEATS_TOTAL), [item]);
  const progress = useMemo(() => tribuneProgress(seats), [seats]);
  const [picked, setPicked] = useState<number | null>(null);
  const pickedSeat = picked !== null ? (seats.find((s) => s.n === picked) ?? null) : null;
  const pickable = pickedSeat ? seatSelectable(pickedSeat) : true;
  // Active database but the Direzione has not published the tribune in the catalogue: nothing to pledge on yet.
  const waitingCatalogue = active && item === null;

  return (
    <section className="mx-auto mt-14 max-w-6xl px-4" aria-labelledby="seggiolino-title" data-testid="tribune-seats">
      <div className="surface-deep overflow-hidden rounded-2xl p-5 shadow-premium sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
          <div className="min-w-0">
            <p className="eyebrow">Adotta un seggiolino</p>
            <h2 id="seggiolino-title" className="mt-1 text-3xl font-bold sm:text-4xl">Un posto, una <span className="text-accent">targhetta</span>.</h2>
            <p className="mt-3 max-w-xl text-sm opacity-90 sm:text-base">
              La nuova tribuna del centro sportivo di Colico avrà {TRIBUNE_SEATS_TOTAL} posti numerati. Adotta il tuo: sul seggiolino mettiamo una
              targhetta con il nome che scegli tu.
            </p>
            <div className="mt-5 max-w-md" data-testid="tribune-progress">
              <div role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.adopted} aria-label={progress.label} className="h-3 w-full overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-accent" style={{ width: `${progress.pct}%` }} />
              </div>
              <p className="m-0 mt-1.5 text-sm font-semibold">{progress.label}</p>
            </div>
          </div>
          <dl className="m-0 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-white/10 p-3">
              <dt className="flex items-center gap-2 font-semibold"><Armchair className="size-4 text-accent" aria-hidden="true" />Posti</dt>
              <dd className="m-0 mt-1 opacity-90">{TRIBUNE_SEATS_TOTAL}, numerati</dd>
            </div>
            <div className="rounded-xl bg-white/10 p-3" data-testid="seat-amount">
              <dt className="flex items-center gap-2 font-semibold"><Receipt className="size-4 text-accent" aria-hidden="true" />Importo per posto</dt>
              <dd className="m-0 mt-1 opacity-90">
                {seatAmountText(TRIBUNE_SEAT_AMOUNT)}
                {TRIBUNE_SEAT_AMOUNT === null && <span className="block text-xs opacity-80">Il preventivo precedente è scaduto: la Direzione sta aggiornando la cifra.</span>}
              </dd>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <dt className="flex items-center gap-2 font-semibold"><Users className="size-4 text-accent" aria-hidden="true" />Insieme</dt>
              <dd className="m-0 mt-1 opacity-90">
                Fino a {MAX_CO_ADOPTERS} persone sullo stesso posto, ognuna sceglie come comparire.
                {!CO_ADOPTION_LIVE && <span className="block text-xs opacity-80">In arrivo: per ora si sceglie un posto libero.</span>}
              </dd>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <dt className="flex items-center gap-2 font-semibold"><HeartHandshake className="size-4 text-accent" aria-hidden="true" />Targhetta</dt>
              <dd className="m-0 mt-1 opacity-90">Il tuo nome solo se lo autorizzi. Altrimenti: «{ANONYMOUS_PLATE}».</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="card-premium mt-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="m-0 text-xl font-bold">Scegli il tuo posto</h3>
          <Legend />
        </div>
        <p className="m-0 mt-1 text-xs text-muted-foreground" data-testid="layout-note">{LAYOUT_NOTE}</p>
        <div className="mt-4">
          <SeatMap seats={seats} picked={picked} onPick={setPicked} />
        </div>
        <div className="mt-5 grid gap-4 border-t border-border pt-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <SeatDetail seat={pickedSeat} />
          {waitingCatalogue ? (
            <p className="m-0 max-w-xs text-sm font-semibold" data-testid="tribune-waiting">Si apre quando la Direzione pubblica la tribuna nel catalogo.</p>
          ) : (
            <button
              type="button"
              className={btnSun}
              disabled={!pickable}
              onClick={() => onAdopt(pickedSeat && pickable ? pickedSeat.n : null)}
              data-testid="tribune-adopt"
            >
              <HeartHandshake className="size-4" aria-hidden="true" />
              {pickedSeat && pickable ? `Adotta il posto ${pickedSeat.n}` : "Adotta un seggiolino"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="card-premium p-5" data-testid="tribune-donation">
          <p className="eyebrow">Privati e famiglie</p>
          <h3 className="mt-1 text-lg font-bold">È una donazione</h3>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Un'erogazione liberale al club. Registri l'adozione qui (l'app non incassa nulla), versi dai canali ufficiali e la Tesoreria
            conferma e ti rilascia la ricevuta. Se scegli di restare completamente anonimo, la ricevuta non si può fare.
          </p>
        </div>
        <div className="card-premium p-5" data-testid="tribune-company">
          <p className="eyebrow">Aziende</p>
          <h3 className="mt-1 flex items-center gap-2 text-lg font-bold"><Building2 className="size-5 text-primary" aria-hidden="true" />Visibilità con fattura? È una sponsorizzazione</h3>
          <p className="m-0 mt-1 text-sm text-muted-foreground">Una sponsorizzazione è un accordo commerciale con fattura, diverso da una donazione. Passa dall'area sponsor.</p>
          <Link to="/sponsor" hash="proposta" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">Vai all'area sponsor</Link>
        </div>
      </div>
    </section>
  );
}

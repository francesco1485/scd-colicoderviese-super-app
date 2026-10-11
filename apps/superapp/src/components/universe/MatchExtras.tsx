import { Cloud, CloudFog, CloudLightning, CloudRain, MapPin, Snowflake, Sun, Ticket, Wind, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import type { WeekItem } from "@/lib/home-week";
import { TICKETING, euro, mapsUrl, ticketingFor, type MatchWeather, type WeatherKind } from "@/lib/match-extras";
import { getColicoNow, getMatchWeather } from "@/lib/match-extras.functions";

/* ------------------------------------------------------------- weather chip */

const ICON: Record<WeatherKind, typeof Sun> = { sun: Sun, cloud: Cloud, rain: CloudRain, snow: Snowflake, fog: CloudFog, storm: CloudLightning };

function WeatherBody({ w, dark }: { w: MatchWeather; dark: boolean }) {
  const Icon = ICON[w.kind];
  const cold = w.feelsLike !== null && w.feelsLike <= 5;
  const windy = w.wind !== null && w.wind >= 25;
  return (
    <>
      <Icon className={`size-4 shrink-0 ${w.kind === "sun" ? "text-[#e0a300]" : w.kind === "rain" || w.kind === "storm" ? "text-[#1f74d1]" : w.kind === "snow" ? "text-[#5aaef2]" : ""}`} strokeWidth={2.2} aria-hidden="true" />
      <span className="tabular-nums">{w.temp}°</span>
      <span>{w.label}</span>
      {cold && <span className={`rounded-full px-1.5 text-[11px] font-extrabold ${dark ? "bg-white/20" : "bg-[#dbeafe] text-[#1e3a8a]"}`}>percepiti {w.feelsLike}°</span>}
      {windy && (
        <span className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold opacity-90">
          <Wind className="size-3.5" aria-hidden="true" />
          {w.wind} km/h
        </span>
      )}
      {w.mode === "forecast" && w.rain !== null && w.rain >= 30 && <span className="text-[11.5px] font-semibold opacity-80">{w.rain}% pioggia</span>}
    </>
  );
}

/**
 * Weather for a match. During the week it is the forecast at kick-off for the venue; from 3 hours
 * before kick-off until the end it switches to the live conditions at the venue and refreshes every
 * 5 minutes. Says nothing when there is no forecast (beyond 16 days) or the venue is unknown.
 */
export function WeatherChip({ item, dark = false }: { item: WeekItem; dark?: boolean }) {
  const [w, setW] = useState<MatchWeather | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    setW(undefined);
    if (!item.time || !item.venue) {
      setW(null);
      return;
    }
    const load = () =>
      getMatchWeather({ data: { date: item.date, time: item.time, venue: item.venue } })
        .then((r) => {
          if (!alive) return;
          setW(r);
          if (r?.mode === "now") timer = window.setTimeout(load, 5 * 60_000);
        })
        .catch(() => alive && setW(null));
    load();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [item.date, item.time, item.venue]);
  if (!w) return null;
  const live = w.mode === "now";
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-bold ${dark ? "bg-white/15 text-white" : live ? "bg-[#e3f3e9] text-[#14532d]" : "bg-[#eaf2fc] text-[var(--scd-ink)]"}`}
      title={live ? `Condizioni attuali a ${w.place}` : `Previsione per ${w.place} alle ${w.at.slice(11)}`}
      data-testid="match-weather"
      data-mode={w.mode}
    >
      <span className={`text-[10.5px] font-extrabold uppercase tracking-[0.06em] ${live ? "text-[#0b8a43]" : "opacity-70"}`}>{live ? `Adesso a ${w.place}` : `Previsto a ${w.place}`}</span>
      <WeatherBody w={w} dark={dark} />
    </span>
  );
}

/** "Colico adesso": the week-day weather of the club's home, refreshed every 10 minutes. */
export function ColicoNowChip({ dark = true }: { dark?: boolean }) {
  const [w, setW] = useState<MatchWeather | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => getColicoNow().then((r) => alive && setW(r)).catch(() => alive && setW(null));
    load();
    const t = window.setInterval(load, 10 * 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);
  if (!w) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-bold ${dark ? "bg-white/15 text-white" : "bg-[#eaf2fc] text-[var(--scd-ink)]"}`} data-testid="colico-now">
      <span className="text-[10.5px] font-extrabold uppercase tracking-[0.06em] opacity-70">Colico adesso</span>
      <WeatherBody w={w} dark={dark} />
    </span>
  );
}

/* ------------------------------------------------------------- map button */

export function MapButton({ venue, compact = false }: { venue: string; compact?: boolean }) {
  const url = mapsUrl(venue);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--scd-line)] font-extrabold text-[var(--scd-ink)] ${compact ? "min-h-[36px] px-2.5 text-[13px]" : "min-h-[44px] px-3 text-[14.5px]"}`}
      aria-label={`Apri la mappa: ${venue}`}
    >
      <MapPin className={compact ? "size-4" : "size-5"} aria-hidden="true" />
      Mappa
    </a>
  );
}

/* ------------------------------------------------------------- ticket office */

/** One line under the buttons: real prices for paid home matches, free entry for the youth. */
export function TicketLine({ item }: { item: WeekItem }) {
  const t = ticketingFor(item);
  if (!t) return null;
  return (
    <p className="m-0 flex items-start gap-1.5 text-[13.5px] leading-snug text-[var(--scd-sub)]" data-testid="ticket-line">
      <Ticket className="mt-[2px] size-4 shrink-0" aria-hidden="true" />
      {t.kind === "free" ? (
        <span>Ingresso gratuito per tutti.</span>
      ) : (
        <span>
          <b className="text-[var(--scd-ink)]">Biglietteria</b> ingresso visitatori, Via Lido · intero {euro(t.tariff.intero)} · ridotto {euro(t.tariff.ridotto)} · bambini fino a 12 anni gratis · tesserati gratis
          {t.cup ? " (in coppa pagano gli accompagnatori)" : " con 1 accompagnatore"}
        </span>
      )}
    </p>
  );
}

function Row({ label, note, value, tone = "red" }: { label: string; note?: string; value: string; tone?: "red" | "green" }) {
  return (
    <tr className="border-t border-[var(--scd-line)]">
      <td className="py-2 pr-2 font-semibold">
        {label}
        {note && <span className="block text-[12.5px] font-medium text-[var(--scd-sub)]">{note}</span>}
      </td>
      <td className="py-2 text-right">
        <span className={`inline-block min-w-[64px] rounded-[8px] px-2 py-[2px] text-center font-uv text-[22px] text-white ${tone === "red" ? "bg-[#c8102e]" : "bg-[#0b8a43]"}`}>{value}</span>
      </td>
    </tr>
  );
}

/** "Biglietteria" opens a sheet with the board's prices and rules; "Ingresso gratuito" for the free categories. */
export function TicketButton({ item }: { item: WeekItem }) {
  const t = ticketingFor(item);
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!t) return null;
  const free = t.kind === "free";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-[12px] px-3 text-[14.5px] font-extrabold ${free ? "border-2 border-[#0b8a43] text-[#0b8a43]" : "bg-[var(--uv-gold)] text-[var(--uv-night)] shadow-[0_3px_0_#b38f00]"}`}
        data-testid="ticket-button"
      >
        <Ticket className="size-5" aria-hidden="true" />
        {free ? "Ingresso gratuito" : "Biglietteria"}
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgb(2_15_40/0.6)] p-3 pb-[calc(74px+env(safe-area-inset-bottom))] sm:items-center lg:pb-3" onClick={() => setOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-t`}
            onClick={(e) => e.stopPropagation()}
            className="sky-panel max-h-[calc(100dvh-110px)] w-full max-w-[460px] overflow-y-auto rounded-[20px] bg-white p-5 text-[var(--scd-ink)] shadow-[0_24px_48px_rgb(0_8_30/0.5)]"
            data-testid="ticket-sheet"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id={`${id}-t`} className="m-0 font-uv text-[30px] uppercase leading-[0.92]">
                {free ? "Ingresso gratuito" : "Biglietteria"}
              </h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Chiudi" className="grid size-10 place-items-center rounded-full bg-[#eef4ff]">
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-2 text-[15px] leading-snug text-[var(--scd-sub)]">{item.groupLabel.replace(/\s·\s/g, " ")}: {item.title}</p>
            {free ? (
              <>
                <p className="mt-3 rounded-[12px] bg-[#e3f3e9] px-3 py-2 text-[15px] font-semibold text-[#1f7a45]">{TICKETING.freeCompetitions}.</p>
                <p className="mt-3 text-[14px] leading-snug text-[var(--scd-sub)]">{TICKETING.members}.</p>
              </>
            ) : (
              <>
                <p className="mt-3 rounded-[12px] bg-[#eaf2fc] px-3 py-2 text-[14.5px] leading-snug">
                  <b className="block text-[12px] font-extrabold uppercase tracking-[0.06em] text-[var(--scd-sub)]">{t.tariff.label}</b>
                  {TICKETING.where} {TICKETING.howToPay.join(", ")}. {TICKETING.opensBefore}
                </p>
                <table className="mt-3 w-full border-collapse text-[15px]">
                  <tbody>
                    <Row label="Intero" value={euro(t.tariff.intero)} />
                    <Row label="Ridotto" note={TICKETING.ridottoNote} value={euro(t.tariff.ridotto)} />
                    <Row label="Bambini" note="fino a 12 anni" value="Gratis" tone="green" />
                  </tbody>
                </table>
                <p className="mt-3 rounded-[12px] bg-[#fff3c4] px-3 py-2 text-[14px] leading-snug text-[#5a4500]">
                  <b>Tesserati S.C.D.</b> {t.cup ? TICKETING.cup.replace(/^Coppa Italia, play off e play out: /, "In coppa, play off e play out ") : "ingresso gratuito per il tesserato e 1 familiare accompagnatore (campionato ufficiale, tutte le squadre)"}.
                </p>
                <ul className="m-0 mt-3 grid list-none gap-1.5 p-0 text-[14px] text-[var(--scd-sub)]">
                  {TICKETING.info.slice(2).map((i) => (
                    <li key={i}>• {i}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

/**
 * Public body of the Lotteria dello sport (UD-115). Shown on /eventi/lotteria-dello-sport once the Direzione publishes
 * it, and as a preview inside the back office. Rules: no online sale, no payment, no gambling mechanic; tickets are
 * bought in person. No minors' names or faces (no photos at all). Partner logos only for current sponsors whose logo
 * is in the asset registry (src/lib/sponsors.ts, name certain). Unknown values are written "da definire".
 */
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  Gift,
  HandHeart,
  MapPin,
  ScrollText,
  Store,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  countdown,
  formatEuro,
  KIND_LABEL,
  longDay,
  SALE_PROVINCE,
  type PublicLottery,
} from "@/lib/lottery";
import { sponsorLogo } from "@/lib/partner-kit";
import { SPONSORS } from "@/lib/sponsors";

const TBD = "da definire";

function logoFor(slug: string | null): { src: string; name: string } | null {
  if (!slug) return null;
  const s = SPONSORS.find((x) => x.slug === slug);
  if (!s || !s.name || !s.nameVerified) return null;
  return { src: sponsorLogo(s).src, name: s.name };
}

export function PublicLotteryView({
  lottery,
  today,
  preview = false,
}: {
  lottery: PublicLottery;
  today: string;
  preview?: boolean;
}) {
  const cd = countdown(today, lottery.sportDay);
  const kind = KIND_LABEL[lottery.kind];
  const title = lottery.title.trim() || `${kind} dello sport`;
  return (
    <div className="grid gap-5" data-testid="lottery-public">
      <section className="grid gap-5 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-start">
        <article className="card-premium grid gap-4 p-5 md:p-7">
          <div className="flex items-start gap-3">
            <span
              className="flex size-11 flex-none items-center justify-center rounded-full bg-[#ffd21f] text-[#0b1e3a]"
              aria-hidden="true"
            >
              <HandHeart className="size-6" />
            </span>
            <div>
              <p className="m-0 text-[12px] font-bold uppercase tracking-[0.12em] text-[#1556c4]">
                Perché
              </p>
              <h2 className="mt-1 text-2xl font-bold leading-tight">
                {lottery.beneficiary || TBD}
              </h2>
            </div>
          </div>
          <p className="m-0 text-[16px] leading-relaxed">
            {title} della S.C.D. ColicoDerviese: un'iniziativa breve che si
            chiude con una giornata dedicata a tutti gli sport.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info
              icon={<CalendarDays className="size-5" />}
              label="Giornata dello sport"
              value={lottery.sportDay ? longDay(lottery.sportDay) : TBD}
              sub={lottery.sportDayPlace || undefined}
            />
            <Info
              icon={<Trophy className="size-5" />}
              label="Estrazione"
              value={
                lottery.drawDate
                  ? `${longDay(lottery.drawDate)}${lottery.drawTime ? `, ore ${lottery.drawTime}` : ""}`
                  : TBD
              }
              sub={lottery.drawPlace || undefined}
            />
          </div>
        </article>
        <aside className="grid gap-4">
          <div
            className="surface-deep relative overflow-hidden rounded-[20px] p-5 text-white shadow-premium"
            data-testid="lottery-countdown"
          >
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.12em] text-[#ffd21f]">
              Giornata dello sport
            </p>
            <p className="m-0 mt-1 font-uv text-[44px] leading-none">
              {cd
                ? cd.days > 1
                  ? cd.days
                  : cd.label
                : lottery.sportDay
                  ? "Fatto!"
                  : "—"}
            </p>
            <p className="m-0 mt-1 text-[15px] text-white/90">
              {cd
                ? cd.days > 1
                  ? "giorni alla giornata dello sport"
                  : ""
                : lottery.sportDay
                  ? "Grazie a tutti!"
                  : "Data da definire"}
            </p>
          </div>
          <Funds lottery={lottery} />
        </aside>
      </section>

      <section
        className="card-premium grid gap-3 p-5 md:p-7"
        aria-labelledby="lot-buy"
      >
        <h2
          id="lot-buy"
          className="m-0 flex items-center gap-2 text-xl font-bold"
        >
          <Store className="size-5 text-[#1556c4]" aria-hidden="true" /> Dove si
          comprano i biglietti
        </h2>
        <p className="m-0 whitespace-pre-line text-[16px] leading-relaxed">
          {lottery.salePoints || TBD}
        </p>
        <ul className="m-0 grid list-none gap-1.5 p-0 text-[15px] text-muted-foreground">
          <li>
            Prezzo:{" "}
            <b className="text-foreground">
              {lottery.ticketPriceCents !== null
                ? formatEuro(lottery.ticketPriceCents)
                : TBD}
            </b>
          </li>
          <li>
            Vendita:{" "}
            {lottery.saleFrom && lottery.saleUntil
              ? `dal ${longDay(lottery.saleFrom)} al ${longDay(lottery.saleUntil)}`
              : TBD}
          </li>
          <li>
            Solo di persona
            {lottery.kind !== "TOMBOLA"
              ? `, nella provincia di ${SALE_PROVINCE}`
              : ""}
            : niente vendita online, l'app non vende e non incassa.
          </li>
        </ul>
      </section>

      <section
        className="card-premium grid gap-3 p-5 md:p-7"
        aria-labelledby="lot-prizes-h"
      >
        <h2
          id="lot-prizes-h"
          className="m-0 flex items-center gap-2 text-xl font-bold"
        >
          <Gift className="size-5 text-[#1556c4]" aria-hidden="true" /> Premi
        </h2>
        {lottery.prizes.length === 0 ? (
          <p className="m-0 text-[15px] text-muted-foreground">
            I premi saranno pubblicati qui appena confermati.
          </p>
        ) : (
          <ol
            className="m-0 grid list-none gap-2 p-0"
            data-testid="lottery-prizes"
          >
            {lottery.prizes.map((p) => {
              const logo = logoFor(p.sponsorSlug);
              return (
                <li
                  key={p.rank}
                  className="flex items-center gap-3 rounded-[14px] bg-[#f4f8fd] px-3 py-2.5"
                >
                  <span className="w-10 flex-none font-uv text-[24px] leading-none text-[#0b2a5b]">
                    {p.rank}°
                  </span>
                  <span className="min-w-0 flex-1 text-[15.5px] font-semibold">
                    {p.description}
                  </span>
                  {logo && (
                    <img
                      src={logo.src}
                      alt={`Offerto da ${logo.name}`}
                      className="h-9 w-20 flex-none object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <p className="m-0 flex items-center gap-1.5 text-[14px] text-muted-foreground">
          <MapPin className="size-4" aria-hidden="true" /> Premi esposti:{" "}
          {lottery.prizesDisplayPlace || TBD}
        </p>
      </section>

      {lottery.winners && (
        <section
          className="card-premium grid gap-3 p-5 md:p-7"
          aria-labelledby="lot-win-h"
          data-testid="lottery-winners"
        >
          <h2
            id="lot-win-h"
            className="m-0 flex items-center gap-2 text-xl font-bold"
          >
            <Trophy className="size-5 text-[#1556c4]" aria-hidden="true" />{" "}
            Numeri vincenti
          </h2>
          <ol className="m-0 grid list-none gap-1.5 p-0">
            {lottery.winners.map((w) => (
              <li
                key={`${w.series}-${w.number}`}
                className="flex flex-wrap items-baseline gap-x-3"
              >
                <b className="w-10">{w.rank}°</b>
                <span className="font-uv text-[24px] leading-none text-[#0b2a5b]">
                  {w.series} {w.number}
                </span>
                <span className="text-[14.5px] text-muted-foreground">
                  {w.prize}
                </span>
              </li>
            ))}
          </ol>
          <p className="m-0 text-[14px] text-muted-foreground">
            Premi da ritirare presso {lottery.prizeDeliveryPlace || TBD} entro
            il{" "}
            {lottery.prizeDeliveryUntil
              ? longDay(lottery.prizeDeliveryUntil)
              : TBD}
            , con il biglietto integro.
          </p>
        </section>
      )}

      <section
        id="regole"
        className="card-premium grid gap-2 p-5 md:p-7"
        aria-labelledby="lot-rules-h"
      >
        <h2
          id="lot-rules-h"
          className="m-0 flex items-center gap-2 text-xl font-bold"
        >
          <ScrollText className="size-5 text-[#1556c4]" aria-hidden="true" />{" "}
          Regole in breve
        </h2>
        <ul className="m-0 grid list-disc gap-1 pl-5 text-[15px] leading-relaxed">
          <li>
            {kind} ai sensi del D.P.R. 430/2001, comunicata alla Prefettura e al
            Comune.
          </li>
          <li>
            L'estrazione è pubblica, alla presenza di un incaricato del Sindaco.
          </li>
          <li>
            I biglietti non restituiti dai venditori prima dell'estrazione sono
            nulli e vengono annunciati prima di estrarre.
          </li>
          <li>
            Premi: solo beni e servizi. Ritiro presso{" "}
            {lottery.prizeDeliveryPlace || TBD} entro il{" "}
            {lottery.prizeDeliveryUntil
              ? longDay(lottery.prizeDeliveryUntil)
              : TBD}
            .
          </li>
          <li>
            I numeri vincenti si pubblicano qui dopo la conferma della
            Direzione.
          </li>
        </ul>
        {preview && (
          <p className="m-0 text-[13px] text-muted-foreground">
            Anteprima: il regolamento completo è la bozza della scheda
            Regolamento, dopo l'approvazione.
          </p>
        )}
      </section>

      <Link
        to="/eventi"
        className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-semibold text-[#1556c4]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Tutti gli eventi
      </Link>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string | undefined;
}) {
  return (
    <div className="flex gap-3 rounded-[16px] bg-[#eef3f9] p-4">
      <span className="text-[#1556c4]" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="m-0 text-[12.5px] font-bold uppercase tracking-[0.06em] text-[#1556c4]">
          {label}
        </p>
        <p className="m-0 mt-0.5 text-[16px] font-semibold first-letter:uppercase">
          {value}
        </p>
        {sub && <p className="m-0 text-[14px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function Funds({ lottery }: { lottery: PublicLottery }) {
  const f = lottery.funds;
  return (
    <div className="card-premium grid gap-2 p-5" data-testid="lottery-funds">
      <p className="m-0 text-[12px] font-bold uppercase tracking-[0.12em] text-[#1556c4]">
        Raccolti finora per il campo
      </p>
      <p className="m-0 font-uv text-[38px] leading-none text-[#0b2a5b]">
        {formatEuro(f.netCents)}
      </p>
      {f.goalCents !== null && f.goalPercent !== null && (
        <>
          <div
            className="h-3 overflow-hidden rounded-full bg-[#dfe9f5]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={f.goalPercent}
            aria-label="Raccolta rispetto all'obiettivo"
          >
            <div
              className="h-full rounded-full bg-[#ffd21f]"
              style={{ width: `${f.goalPercent}%` }}
            />
          </div>
          <p className="m-0 text-[14px] text-muted-foreground">
            {f.goalPercent}% dell'obiettivo di {formatEuro(f.goalCents)}
          </p>
        </>
      )}
      <p className="m-0 text-[13px] text-muted-foreground">
        Netto dopo le spese, aggiornato a mano dalla tesoreria della società.
      </p>
    </div>
  );
}

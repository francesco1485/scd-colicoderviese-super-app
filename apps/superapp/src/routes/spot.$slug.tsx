import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check, ChevronLeft, MonitorPlay, Pause, Pencil, Play, Smartphone } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { PartnerForm, type PartnerFormPreset } from "@/components/PartnerForm";
import { SpotStage, SpotStatusBadge } from "@/components/SponsorSpots";
import { LED_MASTER, isShowable, spotsForLedwall, type SponsorSpot } from "@/lib/sponsor-spots";
import { SPOT_SLOT_MS, ledAirings, ledOnAir, passesPerHour, romeClock, spotVideoFile } from "@/lib/spot-schedule";
import { useNow, useVideoFormat } from "@/lib/use-spot-clock";
import {
  MODIFICHE_MAX,
  SPOT_ANSWER_AFTER_MAIL,
  SPOT_ANSWER_LABEL,
  SPOT_ANSWER_RECEIVED,
  SPOT_STANDARD_TEXT,
  SPOT_WHERE,
  findSpot,
  spotAirNote,
  spotAnswerMessage,
  spotAnswerTopic,
  spotReviewMeta,
  sponsorLogoSrc,
  validateSpotAnswer,
  type SpotAnswerKind,
} from "@/lib/spot-review";

/**
 * /spot/$slug — review page of one sponsor LED spot (backlog B1, UD-119). The Presidente or the commerciale sends the
 * link to the company; the company watches the spot and answers "Approvo lo spot" or "Chiedo modifiche". The answer
 * goes through the same sponsor proposal path as /sponsor#proposta (PartnerForm → submitPartnerLead; the official
 * e-mail while public forms are paused). Nothing changes automatically: the club updates the status after reading.
 * Not secret (the spots are public on the home), but noindex and out of the navigation. Logic: src/lib/spot-review.ts.
 */
export const Route = createFileRoute("/spot/$slug")({
  loader: ({ params }) => {
    const spot = findSpot(params.slug);
    if (!spot) throw notFound();
    return { slug: spot.slug };
  },
  head: ({ loaderData }) => ({ meta: spotReviewMeta(loaderData ? findSpot(loaderData.slug) : undefined) }),
  notFoundComponent: SpotNotFound,
  component: SpotReviewPage,
});

function SpotNotFound() {
  return (
    <main className="min-h-[70dvh] bg-[var(--in-ground)] px-4 py-14 text-center text-[#0b1e3a]" data-testid="spot-not-found">
      <div className="scd-card mx-auto grid max-w-md gap-3 p-6">
        <h1 className="m-0 text-[24px] font-bold">Spot non trovato</h1>
        <p className="m-0 text-[15.5px] leading-snug text-[#4a5d7a]">
          Il link non corrisponde a uno spot dei nostri partner. Controlla l'indirizzo ricevuto oppure guarda la pagina dei partner del club.
        </p>
        <Link
          to="/sponsor"
          className="scd-focus mx-auto inline-flex min-h-11 items-center rounded-[12px] bg-[#ffd600] px-5 text-[15px] font-bold text-[#0b1e3a]"
        >
          Vai alla pagina sponsor
        </Link>
      </div>
    </main>
  );
}

function SpotReviewPage() {
  const { slug } = Route.useLoaderData();
  const spot = findSpot(slug)!;
  const logo = sponsorLogoSrc(spot.slug);
  return (
    <main className="min-h-screen bg-[var(--in-ground)] pb-24 text-[#0b1e3a] lg:pb-16" data-testid="spot-review">
      <section className="relative isolate overflow-hidden bg-[var(--scd-navy)] text-white">
        <div aria-hidden="true" data-motif="forte" className="scd-kit-stripes absolute inset-0 -z-10" />
        <div className="mx-auto max-w-[1280px] px-4 pb-12 pt-5 sm:px-6 lg:pb-14 lg:pt-9">
          <Link to="/sponsor" className="scd-focus inline-flex min-h-11 items-center gap-1 rounded-md text-[15px] font-semibold text-[#cfe3f7] hover:text-white">
            <ChevronLeft className="size-5" aria-hidden="true" />
            Partner del club
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-3">
            {logo && (
              <span className="grid h-16 w-28 flex-none place-items-center rounded-[14px] bg-white p-2 shadow-[0_6px_20px_-8px_rgb(0_0_0/0.45)]">
                <img src={logo} alt={`Logo di ${spot.sponsorName}`} width={112} height={64} className="max-h-full max-w-full object-contain" decoding="async" />
              </span>
            )}
            <div className="min-w-0">
              <p className="m-0 text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-[#ffd600]">Spot LED · stagione 2026/27</p>
              <h1 className="m-0 mt-1 text-[clamp(26px,7.4vw,34px)] font-bold leading-[1.06] sm:text-[40px] lg:text-[48px]" data-testid="spot-review-name">
                Lo spot di {spot.sponsorName}
              </h1>
            </div>
          </div>
          <p className="m-0 mt-3 max-w-[62ch] text-[15.5px] leading-snug text-[#e6f3fc]">
            Il club ha preparato questo spot per il LED wall del campo. Guardalo e dicci se va bene così o cosa vuoi cambiare.
          </p>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-6 grid max-w-[1280px] gap-5 px-4 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <SpotMedia spot={spot} />
        <SpotFacts spot={spot} />
      </div>

      <SpotAnswer spot={spot} />
    </main>
  );
}

/** Field preview (16:9, native controls) and, when the preview exists, the LED board master strip. */
function SpotMedia({ spot }: { spot: SponsorSpot }) {
  return (
    <section aria-labelledby="spot-media-t" className="scd-card grid min-w-0 gap-3 p-3 sm:p-4">
      <h2 id="spot-media-t" className="sr-only">
        Lo spot
      </h2>
      <div className="grid gap-1.5">
        <SpotStage spot={spot} play={false} mountVideo controls priority />
        <p className="m-0 text-[13.5px] text-[#4a5d7a]">{spot.preview ? "Anteprima: come si vede dal campo." : "Il formato del tabellone LED del campo."}</p>
      </div>
      {spot.preview && <LedStrip spot={spot} />}
    </section>
  );
}

/** The 1920x164 master as it runs on the board. Muted, plays only when the visitor starts it. */
function LedStrip({ spot }: { spot: SponsorSpot }) {
  const ref = useRef<HTMLVideoElement>(null);
  const format = useVideoFormat();
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    if (playing) v.play().catch(() => setPlaying(false));
    else v.pause();
  }, [playing]);
  return (
    <div className="grid gap-2 rounded-[14px] bg-[#06142b] p-3" data-testid="spot-review-strip">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-white/85">
          <MonitorPlay className="size-4" aria-hidden="true" />
          Sul tabellone LED
        </span>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
          className="scd-focus inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#ffd600] px-3.5 text-[13.5px] font-bold text-[#0b1e3a]"
          data-testid="spot-review-strip-toggle"
        >
          {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" fill="currentColor" aria-hidden="true" />}
          {playing ? "Metti in pausa" : "Guarda sul tabellone"}
        </button>
      </div>
      <div className="w-full overflow-hidden rounded-[4px] ring-1 ring-white/15" style={{ aspectRatio: `${LED_MASTER.width} / ${LED_MASTER.height}` }}>
        <video
          ref={ref}
          key={format}
          src={`${spotVideoFile(spot.master, format)}#t=0.1`}
          muted
          playsInline
          loop
          preload="metadata"
          width={LED_MASTER.width}
          height={LED_MASTER.height}
          onEnded={() => setPlaying(false)}
          className="block size-full bg-black object-cover"
          aria-label={`Spot LED di ${spot.sponsorName} nel formato del tabellone`}
        />
      </div>
    </div>
  );
}

function SpotFacts({ spot }: { spot: SponsorSpot }) {
  return (
    <aside aria-label="Stato e uscite dello spot" className="grid min-w-0 gap-3">
      <section aria-labelledby="spot-state-t" className="scd-card grid gap-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="spot-state-t" className="m-0 text-[17px] font-bold">
            Stato dello spot
          </h2>
          <SpotStatusBadge status={spot.status} />
        </div>
        <p className="m-0 text-[14.5px] leading-snug text-[#4a5d7a]" data-testid="spot-review-air">
          {spotAirNote(spot)}
        </p>
      </section>
      {isShowable(spot) && <SpotOnAir spot={spot} />}
      <section aria-labelledby="spot-where-t" className="scd-card grid gap-2.5 p-4">
        <h2 id="spot-where-t" className="m-0 text-[17px] font-bold">
          Dove si vede
        </h2>
        <ul className="m-0 grid list-none gap-2 p-0" data-testid="spot-review-where">
          {SPOT_WHERE.map((w) => (
            <li key={w.id} className="flex gap-2.5 rounded-xl bg-[#e9f2fb] p-3">
              <span className="grid size-8 flex-none place-items-center rounded-full bg-white text-[#1556c4]" aria-hidden="true">
                {w.id === "ledwall" ? <MonitorPlay className="size-4" /> : <Smartphone className="size-4" />}
              </span>
              <span className="grid gap-0.5">
                <b className="text-[14.5px] leading-tight">{w.title}</b>
                <span className="text-[13.5px] leading-snug text-[#4a5d7a]">{w.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="m-0 text-[13.5px] text-[#4a5d7a]" data-testid="spot-review-standard">
          Standard del tabellone: <b className="text-[#0b1e3a]">{SPOT_STANDARD_TEXT}</b>.
        </p>
      </section>
    </aside>
  );
}

type Prepared = { kind: SpotAnswerKind; text: string };

/** The two answers. The message is built by spot-review.ts and handed to the existing sponsor proposal form. */
function SpotAnswer({ spot }: { spot: SponsorSpot }) {
  const [choice, setChoice] = useState<SpotAnswerKind | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [announce, setAnnounce] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (choice === "modifiche" && !prepared) area.current?.focus();
  }, [choice, prepared]);

  const preset = useMemo<PartnerFormPreset | null>(() => {
    if (!prepared) return null;
    return {
      topic: spotAnswerTopic(spot.slug, prepared.kind),
      message: spotAnswerMessage(spot, prepared.kind, prepared.text),
      azienda: spot.sponsorName,
      interessi: ["ledwall"],
      receivedNote: SPOT_ANSWER_RECEIVED,
      pausedNote: SPOT_ANSWER_AFTER_MAIL,
      pausedCopy: {
        title: "Manda la risposta al club",
        text: "Il modulo online non è ancora attivo: la risposta parte dalla tua posta, già scritta, verso l'indirizzo ufficiale della società.",
      },
    };
  }, [prepared, spot]);

  function pick(kind: SpotAnswerKind) {
    setChoice(kind);
    setError(null);
    if (kind === "approvato") {
      setPrepared({ kind, text: "" });
      setAnnounce("Risposta pronta: approvo lo spot. Completa e invia qui sotto.");
    } else {
      setPrepared(null);
      setAnnounce("Scrivi cosa vuoi cambiare nello spot.");
    }
  }

  function prepare(e: React.FormEvent) {
    e.preventDefault();
    const err = validateSpotAnswer("modifiche", text);
    setError(err);
    if (err) {
      setAnnounce(err);
      area.current?.focus();
      return;
    }
    setPrepared({ kind: "modifiche", text });
    setAnnounce("Risposta pronta: modifiche richieste. Completa e invia qui sotto.");
    window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const choiceBtn = (active: boolean) =>
    `scd-focus inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] px-4 text-[15.5px] font-bold transition-colors sm:w-auto ${
      active ? "bg-[#0b2a5b] text-white" : "border border-[#b9d5ef] bg-white text-[#0b2a5b] hover:bg-[#f2f7fd]"
    }`;

  return (
    <section id="risposta" aria-labelledby="spot-answer-t" className="mx-auto mt-6 max-w-[1280px] scroll-mt-20 px-4 sm:px-6">
      <div className="scd-card grid gap-4 p-4 sm:p-6">
        <div className="grid gap-1">
          <h2 id="spot-answer-t" className="m-0 text-[22px] font-bold">
            La tua risposta
          </h2>
          <p className="m-0 max-w-[68ch] text-[15px] leading-snug text-[#4a5d7a]">
            Lo stato non cambia da solo: il club legge la risposta e aggiorna lo spot. Finché ci sono modifiche richieste, lo spot non va in onda.
          </p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap" role="group" aria-label="Scegli la risposta">
          <button type="button" className={choiceBtn(choice === "approvato")} aria-pressed={choice === "approvato"} onClick={() => pick("approvato")} data-testid="spot-answer-approve">
            <Check className="size-5" aria-hidden="true" />
            {SPOT_ANSWER_LABEL.approvato}
          </button>
          <button type="button" className={choiceBtn(choice === "modifiche")} aria-pressed={choice === "modifiche"} onClick={() => pick("modifiche")} data-testid="spot-answer-changes">
            <Pencil className="size-5" aria-hidden="true" />
            {SPOT_ANSWER_LABEL.modifiche}
          </button>
        </div>

        {choice === "modifiche" && (
          <form onSubmit={prepare} noValidate className="grid gap-2" data-testid="spot-answer-changes-form">
            <label htmlFor="spot-changes" className="text-[14.5px] font-semibold">
              Cosa vuoi cambiare?
            </label>
            <textarea
              id="spot-changes"
              ref={area}
              rows={4}
              maxLength={MODIFICHE_MAX}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (prepared) setPrepared(null);
                if (error) setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "spot-changes-hint spot-changes-err" : "spot-changes-hint"}
              className="w-full rounded-[12px] border border-[#b9d5ef] bg-white px-3 py-2.5 text-[15.5px] leading-snug text-[#0b1e3a] focus:border-[#1556c4] focus:outline-none focus:ring-2 focus:ring-[#1556c4]/30"
              placeholder="Per esempio: il logo più grande, un altro colore di sfondo, un testo da correggere."
              data-testid="spot-changes-text"
            />
            <span id="spot-changes-hint" className="text-[13px] text-[#4a5d7a]">
              {text.trim().length}/{MODIFICHE_MAX} caratteri
            </span>
            {error && (
              <p id="spot-changes-err" className="m-0 text-[14px] font-semibold text-[#a11b1b]">
                {error}
              </p>
            )}
            <button type="submit" className="scd-focus inline-flex min-h-12 w-fit items-center rounded-[12px] bg-[#ffd600] px-5 text-[15px] font-bold text-[#0b1e3a] hover:brightness-95" data-testid="spot-changes-prepare">
              Prepara la risposta
            </button>
          </form>
        )}

        <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="spot-answer-live">
          {announce}
        </p>

        {preset && (
          <div ref={formRef} className="grid scroll-mt-24 gap-2" data-testid="spot-answer-form" data-kind={prepared?.kind}>
            <PartnerForm key={`${preset.topic}\n${preset.message}`} tipo="sponsor" preset={preset} />
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * When this spot is on the LED wall today, from the same clock as the player (lib/spot-schedule.ts). Calculated from
 * the palinsesto only: passes per hour of LED switched on and seconds of visibility. The audience is never estimated.
 */
function SpotOnAir({ spot }: { spot: SponsorSpot }) {
  const now = useNow(1000);
  if (now === 0) return null;
  const spots = spotsForLedwall();
  const air = ledOnAir(now, spots);
  const onAirNow = air.current?.slug === spot.slug;
  const upcoming = ledAirings(spot.slug, now, 4).filter((at) => at > now);
  const later = onAirNow ? upcoming.slice(0, 3) : upcoming.slice(1, 3);
  const perHour = passesPerHour(spots.length);
  const seconds = (perHour * SPOT_SLOT_MS) / 1000;
  return (
    <section aria-labelledby="spot-onair-t" className="scd-card grid gap-2.5 p-4" data-testid="spot-review-onair">
      <h2 id="spot-onair-t" className="m-0 text-[17px] font-bold">
        Quando va in onda
      </h2>
      <p className="m-0 text-[14.5px] font-semibold leading-snug" role="status" aria-live="polite">
        {onAirNow ? "In onda adesso sul LED wall." : upcoming.length > 0 ? `Prossimo passaggio alle ${romeClock(upcoming[0]!)}.` : "Oggi il giro è finito: riparte a mezzanotte."}
      </p>
      {later.length > 0 && (
        <p className="m-0 text-[13.5px] text-[#4a5d7a]">
          {onAirNow ? "Prossimi passaggi" : "Poi"} alle {later.map((at) => romeClock(at)).join(", ")}.
        </p>
      )}
      <dl className="m-0 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[#e9f2fb] p-3">
          <dt className="text-[12.5px] font-semibold text-[#4a5d7a]">Passaggi per ogni ora di LED acceso</dt>
          <dd className="m-0 text-[22px] font-bold tabular-nums">{perHour}</dd>
        </div>
        <div className="rounded-xl bg-[#e9f2fb] p-3">
          <dt className="text-[12.5px] font-semibold text-[#4a5d7a]">Secondi in onda per ogni ora</dt>
          <dd className="m-0 text-[22px] font-bold tabular-nums">{seconds}</dd>
        </div>
      </dl>
      <p className="m-0 text-[12.5px] leading-snug text-[#4a5d7a]">
        Calcolati dal palinsesto: {spots.length} spot da {SPOT_SLOT_MS / 1000} secondi a rotazione. Il pubblico non è stimato.
      </p>
    </section>
  );
}

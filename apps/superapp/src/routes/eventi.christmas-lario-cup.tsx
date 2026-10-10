import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, MapPin, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  CHRISTMAS_LARIO_CUP as E,
  confirmedCount,
  eventCountdown,
  eventPhase,
  type Phase,
} from "@/lib/events";

export const Route = createFileRoute("/eventi/christmas-lario-cup")({
  loader: () => ({ serverNow: Date.now() }),
  head: () => ({
    meta: [
      { title: "Christmas Lario Cup 2026 — 8 dicembre, Colico e Dervio" },
      {
        name: "description",
        content:
          "1ª edizione della Christmas Lario Cup: torneo giovanile maschile (annate 2015 e 2016) a Colico e Female Edition (Esordienti 9v9) a Dervio, martedì 8 dicembre 2026. Iscrizioni aperte.",
      },
      {
        property: "og:title",
        content: "Christmas Lario Cup 2026 — Colico e Dervio",
      },
      {
        property: "og:description",
        content:
          "Il calcio che unisce, anche a Natale. 8 dicembre 2026 sul Lago di Como.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content: "/media/eventi/christmas-lario-cup-2026-maschile.webp",
      },
    ],
  }),
  component: ChristmasLarioCup,
});

const pad = (n: number) => String(n).padStart(2, "0");

function Snow() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const x = c.getContext("2d");
    if (!x) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0,
      W = 0,
      H = 0;
    const size = () => {
      W = c.width = c.offsetWidth * devicePixelRatio;
      H = c.height = c.offsetHeight * devicePixelRatio;
    };
    size();
    addEventListener("resize", size);
    // Fiocchi in posizione deterministica (nessun valore casuale nei dati della pagina).
    let seed = 7;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const fl = Array.from({ length: reduced ? 40 : 140 }, () => ({
      x: rnd(),
      y: rnd(),
      r: rnd() * 2.4 + 0.6,
      s: rnd() * 0.0012 + 0.0005,
      w: rnd() * Math.PI * 2,
    }));
    const draw = () => {
      x.clearRect(0, 0, W, H);
      x.fillStyle = "rgba(255,255,255,.85)";
      for (const f of fl) {
        x.beginPath();
        x.arc(f.x * W, f.y * H, f.r * devicePixelRatio, 0, 7);
        x.fill();
      }
    };
    const step = () => {
      for (const f of fl) {
        f.y += f.s;
        f.w += 0.01;
        f.x += Math.sin(f.w) * 0.0004;
        if (f.y > 1) {
          f.y = -0.02;
          f.x = rnd();
        }
      }
      draw();
      raf = requestAnimationFrame(step);
    };
    if (reduced) draw();
    else step();
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", size);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 size-full"
    />
  );
}

const STATE_TEXT: Record<Phase, string> = {
  pre: "Iscrizioni aperte",
  live: "Si gioca adesso a Colico e Dervio",
  post: "Grazie a tutte le squadre: appuntamento alla 2ª edizione",
};

function ChristmasLarioCup() {
  const { serverNow } = Route.useLoaderData();
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const phase = eventPhase(now);
  const cd = eventCountdown(now);
  const confirmed = confirmedCount();
  const cta =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] px-[18px] font-uv text-[18px] uppercase tracking-[0.06em] transition-transform active:translate-y-[3px]";
  const red = `${cta} bg-gradient-to-b from-[#ff3b44] to-[#d8202a] text-white shadow-[0_4px_0_#a5121b,0_10px_30px_rgb(216_32_42/0.45)]`;
  const gold = `${cta} bg-gradient-to-b from-[#ffe066] to-[var(--uv-gold)] text-[var(--uv-night)] shadow-[0_4px_0_#b38f00]`;
  const ghost = `${cta} bg-white/10 text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.4)]`;
  const share = async () => {
    const d = {
      title: "Christmas Lario Cup 2026",
      text: "8 dicembre 2026, Colico e Dervio: torneo giovanile di Natale sul Lago di Como.",
      url: location.href,
    };
    try {
      if (navigator.share) await navigator.share(d);
      else await navigator.clipboard.writeText(`${d.text} ${d.url}`);
    } catch {
      /* annullato */
    }
  };

  return (
    <main
      data-screen="event-clc"
      data-phase={phase}
      className="bg-[#020d2b] text-white"
    >
      <section
        aria-labelledby="clc-t"
        className="relative isolate flex min-h-[calc(100svh-57px)] items-end overflow-hidden px-4 pb-9 pt-10 lg:px-6 lg:pb-16"
      >
        <div
          aria-hidden="true"
          className="absolute inset-[-6%_0_0] -z-40 bg-cover bg-[center_40%] brightness-[.62] saturate-[1.35]"
          style={{ backgroundImage: "url(/media/scd/lario-header.webp)" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-30 bg-[radial-gradient(70%_45%_at_50%_18%,rgb(255_207_74/0.28),transparent_70%),radial-gradient(60%_50%_at_15%_70%,rgb(216_32_42/0.25),transparent_70%),linear-gradient(180deg,rgb(2_13_43/0.3)_0%,rgb(2_13_43/0.55)_55%,#020d2b_100%)]"
        />
        <Snow />
        <div className="mx-auto grid w-full max-w-[1200px] gap-[22px] lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-x-10">
          <div className="grid gap-4">
            <div className="flex items-center gap-[10px]">
              <img
                src="/media/brand/logo-scd.png"
                alt="S.C.D. ColicoDerviese"
                className="h-[60px] w-auto"
              />
              <span className="text-[13px] font-bold leading-tight text-[#bfe4ff]">
                S.C.D. ColicoDerviese
                <br />
                con {E.coOrganizer}
              </span>
            </div>
            <span className="justify-self-start -rotate-2 rounded-[8px] bg-[#d8202a] px-[14px] py-[6px] font-uv text-[18px] uppercase tracking-[0.12em] shadow-[0_6px_18px_rgb(216_32_42/0.5)]">
              {E.edition}
            </span>
            <h1
              id="clc-t"
              className="font-uv text-[clamp(62px,17vw,180px)] uppercase leading-[0.8]"
            >
              <span className="uv-slam block bg-gradient-to-b from-white via-[#fff6d8] to-[#ffcf4a] bg-clip-text text-transparent [filter:drop-shadow(0_4px_0_#d8202a)_drop-shadow(0_8px_0_#a5121b)_drop-shadow(0_18px_24px_rgb(0_0_0/0.5))]">
                Christmas
              </span>
              <span
                className="uv-slam block text-[var(--uv-gold)] [filter:drop-shadow(0_4px_0_#021f4f)_drop-shadow(0_8px_0_#000a24)_drop-shadow(0_18px_24px_rgb(0_0_0/0.5))]"
                style={{ animationDelay: ".18s" }}
              >
                Lario Cup
              </span>
            </h1>
            <p className="font-uv-script -rotate-3 text-[clamp(22px,5.5vw,34px)] leading-[1.1] text-[#ffcf4a] [text-shadow:0_3px_0_rgb(0_0_0/0.4)]">
              {E.tagline}
            </p>
            <div className="flex flex-wrap gap-[10px]">
              <Pill
                icon={
                  <Calendar
                    className="size-[26px] text-[#ffcf4a]"
                    aria-hidden="true"
                  />
                }
                title={E.dateLabel.replace(" 2026", "")}
                sub="2026 · tutto il giorno"
              />
              <Pill
                icon={
                  <MapPin
                    className="size-[26px] text-[#ffcf4a]"
                    aria-hidden="true"
                  />
                }
                title="Colico e Dervio"
                sub="Lago di Como"
              />
            </div>
          </div>
          <div className="grid gap-4">
            <p
              role="status"
              className="inline-flex items-center gap-2 text-[14.5px] font-extrabold"
            >
              <i
                aria-hidden="true"
                className={`size-[10px] rounded-full ${phase === "live" ? "uv-blink bg-[#ff3b44]" : "bg-[var(--uv-gold)]"}`}
              />
              {STATE_TEXT[phase]}
            </p>
            <div
              className="grid max-w-[520px] grid-cols-4 gap-2"
              aria-label="Conto alla rovescia"
              data-testid="clc-countdown"
            >
              {[
                ["Giorni", cd ? String(cd.d) : "0"],
                ["Ore", cd ? pad(cd.h) : "00"],
                ["Min", cd ? pad(cd.m) : "00"],
                ["Sec", cd ? pad(cd.s) : "00"],
              ].map(([l, v]) => (
                <div
                  key={l}
                  className="rounded-[14px] border-[1.5px] border-[rgb(255_207_74/0.45)] bg-gradient-to-b from-white/15 to-white/5 px-1 pb-2 pt-[10px] text-center"
                >
                  <b className="block font-uv text-[clamp(34px,10vw,58px)] leading-none tabular-nums">
                    {v}
                  </b>
                  <small className="font-uv text-[12px] uppercase tracking-[0.14em] text-[#ffcf4a]">
                    {l}
                  </small>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-[10px]">
              <a href="#iscrizioni" className={red}>
                Iscrivi la tua squadra
              </a>
              <button type="button" onClick={share} className={ghost}>
                <Share2 className="size-5" aria-hidden="true" />
                Condividi
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 pb-14 lg:px-6">
        <Sec id="tornei" kicker="Due tornei, un solo Natale" title="I tornei">
          <div className="grid gap-4 md:grid-cols-2">
            {E.cups.map((c, i) => (
              <article
                key={c.badge}
                className={`relative isolate overflow-hidden rounded-[24px] border-2 border-white/15 px-5 pb-[22px] pt-[26px] ${i === 0 ? "bg-[radial-gradient(90%_70%_at_100%_0%,rgb(255_207_74/0.35),transparent_60%),linear-gradient(150deg,#0d4fb3,#021f4f_70%)]" : "bg-[radial-gradient(90%_70%_at_100%_0%,rgb(255_105_140/0.35),transparent_60%),linear-gradient(150deg,#b3122a,#4a0715_75%)]"}`}
              >
                <span className="rounded-[8px] bg-white/15 px-3 py-[7px] font-uv text-[15px] uppercase tracking-[0.12em]">
                  {c.badge}
                </span>
                <h3 className="mb-1 mt-3 font-uv text-[40px] uppercase leading-[0.9]">
                  {c.title}
                </h3>
                <p className="mb-4 mt-[10px] flex items-start gap-2 font-bold text-[#e3ecff]">
                  <MapPin
                    className="mt-[2px] size-[22px] shrink-0 text-[#ffcf4a]"
                    aria-hidden="true"
                  />
                  {c.city}, {c.venue}
                </p>
                <div className="grid gap-[10px]">
                  {c.categories.map((k) => (
                    <div
                      key={k.big}
                      className="flex items-center gap-[14px] rounded-[16px] border-[1.5px] border-white/20 bg-white/10 px-[14px] py-3"
                    >
                      <b className="font-uv text-[34px] leading-none text-[#ffcf4a]">
                        {k.big}
                      </b>
                      <span className="font-extrabold leading-tight">
                        {k.title}
                        <small className="block text-[13.5px] font-semibold text-[#d5e2ff]">
                          {k.note}
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
                <h4 className="mb-2 mt-[18px] font-uv text-[16px] uppercase tracking-[0.12em] text-[#bfe4ff]">
                  Squadre confermate
                </h4>
                <div className="flex flex-wrap gap-2">
                  {c.confirmed.map((t) => (
                    <span
                      key={t.name}
                      className="rounded-full bg-white px-3 py-2 text-[14.5px] font-extrabold text-[var(--uv-night)]"
                    >
                      {t.name}
                      {"country" in t && t.country && (
                        <span className="font-black text-[#d8202a]">
                          {" "}
                          · {t.country}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                {"note" in c && c.note && (
                  <p className="mt-[14px] text-[14px] text-[#ffe3e8]">
                    {c.note}
                  </p>
                )}
              </article>
            ))}
          </div>
        </Sec>

        <Sec
          id="iscrizioni"
          kicker="Porta la tua squadra sul lago"
          title="Iscrizioni aperte"
        >
          <div className="grid gap-3 rounded-[24px] border-2 border-[rgb(255_207_74/0.5)] bg-gradient-to-br from-[rgb(255_207_74/0.18)] to-white/5 p-5">
            <div className="flex flex-wrap items-baseline gap-[10px]">
              <b className="font-uv text-[72px] leading-[0.85] text-[#ffcf4a]">
                {E.goal.min}–{E.goal.max}
              </b>
              <span className="font-uv text-[26px] uppercase">
                squadre: l'obiettivo
              </span>
            </div>
            <div
              className="relative h-4 overflow-hidden rounded-[8px] bg-white/10"
              role="progressbar"
              aria-label="Squadre confermate pubblicamente rispetto all'obiettivo minimo"
              aria-valuemin={0}
              aria-valuemax={E.goal.min}
              aria-valuenow={confirmed}
            >
              <i
                className="absolute inset-y-0 left-0 rounded-[8px] bg-gradient-to-r from-[var(--uv-gold)] via-[#ff9b2f] to-[#d8202a]"
                style={{
                  width: `${Math.min(100, (confirmed / E.goal.max) * 100)}%`,
                }}
              />
              <u
                className="absolute -bottom-1 -top-1 w-[3px] bg-white/80"
                style={{ left: `${(E.goal.min / E.goal.max) * 100}%` }}
              />
            </div>
            <small className="text-[13.5px] text-[#d5e2ff]">
              {confirmed} squadre confermate pubblicamente dalle locandine
              ufficiali. Il contatore si aggiornerà con il registro iscrizioni
              dell'organizzazione.
            </small>
            <div className="flex flex-wrap gap-[10px]">
              <a
                href={E.infoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={gold}
              >
                Iscrivi la tua squadra
              </a>
              <a
                href={`mailto:${E.infoMail}?subject=${encodeURIComponent("Christmas Lario Cup 2026")}`}
                className={ghost}
              >
                Scrivi all'organizzazione
              </a>
            </div>
          </div>
        </Sec>

        <Sec id="live" kicker="Ogni gol, in tempo reale" title="Il torneo live">
          <div className="overflow-hidden rounded-[24px] bg-white text-[var(--scd-ink)]">
            <div className="flex items-center justify-between gap-[10px] bg-[var(--uv-night)] px-[18px] py-4 text-white">
              <b className="font-uv text-[24px] uppercase">
                {phase === "pre"
                  ? "Si accende l'8 dicembre"
                  : phase === "live"
                    ? "In campo ora"
                    : "Risultati finali"}
              </b>
              <span className="inline-flex items-center gap-2 text-[14px] font-extrabold">
                <i
                  aria-hidden="true"
                  className={`size-[10px] rounded-full ${phase === "live" ? "uv-blink bg-[#ff3b44]" : "bg-[var(--uv-gold)]"}`}
                />
                {phase === "pre"
                  ? "In arrivo"
                  : phase === "live"
                    ? "Live"
                    : "Concluso"}
              </span>
            </div>
            <p className="p-[18px] text-[15px] leading-relaxed text-[var(--scd-sub)]">
              Calendario, gironi, classifiche e tabellone compaiono qui quando
              l'organizzazione li pubblica. I risultati li inserisce lo staff a
              bordo campo; per le annate giovanili niente statistiche
              individuali e nessuna classifica dove il regolamento SGS non la
              prevede.
            </p>
          </div>
        </Sec>

        <Sec
          id="villaggio"
          kicker="Non solo partite"
          title="Il villaggio di Natale"
        >
          <div className="grid grid-cols-2 gap-[10px] md:grid-cols-4">
            {E.village.map((v) => (
              <div
                key={v.title}
                className="rounded-[18px] border-[1.5px] border-white/15 bg-white/5 px-[14px] py-4"
              >
                <b className="block font-uv text-[22px] uppercase leading-none">
                  {v.title}
                </b>
                <span className="mt-1 block text-[14px] text-[#cfdcf5]">
                  {v.text}
                </span>
              </div>
            ))}
          </div>
        </Sec>

        <Sec
          id="partner"
          kicker="Il tuo marchio sotto le luci"
          title="Partner dell'evento"
        >
          <div className="grid gap-[10px] md:grid-cols-2">
            {E.partnerSlots.map((p) => (
              <div
                key={p.title}
                className="grid grid-cols-[auto_1fr] items-center gap-[14px] rounded-[18px] border-[1.5px] border-white/15 bg-white/5 p-4"
              >
                <span
                  aria-hidden="true"
                  className="grid size-[52px] place-items-center rounded-[14px] bg-gradient-to-b from-[#ffe066] to-[var(--uv-gold)] font-uv text-[22px] text-[var(--uv-night)]"
                >
                  {p.mark}
                </span>
                <span>
                  <b className="block font-uv text-[22px] uppercase leading-none">
                    {p.title}
                  </b>
                  <span className="mt-1 block text-[14px] text-[#cfdcf5]">
                    {p.text}
                  </span>
                  <span className="mt-[6px] inline-block rounded-[5px] bg-[#8ff0b5] px-[7px] py-1 font-uv text-[12px] uppercase tracking-[0.1em] text-[var(--uv-night)]">
                    Disponibile
                  </span>
                </span>
              </div>
            ))}
          </div>
          <Link to="/sponsor" className={`${gold} mt-[14px]`}>
            Diventa partner
          </Link>
        </Sec>

        <Sec kicker="Da condividere" title="Locandine ufficiali">
          <div className="grid grid-cols-2 gap-3 md:max-w-[620px]">
            {E.posters.map((p) => (
              <figure key={p.src}>
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  className="aspect-[1122/1402] w-full rounded-[14px] object-cover shadow-[0_14px_30px_rgb(0_0_0/0.45)]"
                />
                <figcaption className="mt-2 text-[13.5px] font-bold text-[#cfdcf5]">
                  {p.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </Sec>

        <Sec
          id="arrivare"
          kicker="Un giorno di festa sul lago"
          title="Come arrivare"
        >
          <div className="grid gap-[10px] md:grid-cols-2">
            {E.cups.map((c) => (
              <div
                key={c.city}
                className="rounded-[18px] bg-white p-4 text-[var(--scd-ink)]"
              >
                <b className="block font-uv text-[24px] uppercase leading-none">
                  {c.city.replace(" (LC)", "")}
                </b>
                <span className="mb-[10px] mt-1 block text-[14.5px] text-[var(--scd-sub)]">
                  {c.venue}.{" "}
                  {c.badge === "Maschile"
                    ? "Torneo maschile."
                    : "Female Edition."}
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.mapsQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-extrabold text-[var(--uv-royal)]"
                >
                  Apri in Maps
                </a>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[14.5px] text-[#cfdcf5]">
            L'8 dicembre è festivo: ponte dell'Immacolata sul Lago di Como.
            Parcheggi e navette verranno indicati qui prima del torneo.
          </p>
        </Sec>

        <Sec title="Organizzazione">
          <div className="rounded-[24px] border-[1.5px] border-white/15 bg-white/5 p-5 text-[#dbe7ff]">
            <p>
              Organizza la S.C.D. ColicoDerviese con {E.coOrganizer},
              co-organizzatore. Informazioni e adesioni:{" "}
              <a
                href={E.infoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                sportproexperience.com
              </a>
              .
            </p>
            <p className="mt-3 text-[13.5px] text-[#b9c9e8]">
              Foto e video solo con il consenso delle famiglie, area media
              dedicata. Nessun nome o statistica individuale di atleti minorenni
              viene pubblicato. Dati da: {E.source}.
            </p>
          </div>
        </Sec>
        <p className="font-uv-script mt-10 text-center text-[30px] text-[#ffcf4a]">
          {E.claim}
        </p>
      </div>
    </main>
  );
}

function Pill({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-[10px] rounded-[14px] border-[1.5px] border-white/25 bg-white/10 px-[14px] py-[10px] backdrop-blur-md">
      {icon}
      <span>
        <b className="block font-uv text-[22px] uppercase leading-none">
          {title}
        </b>
        <small className="block text-[13px] font-bold text-[#bfe4ff]">
          {sub}
        </small>
      </span>
    </div>
  );
}

function Sec({
  id,
  kicker,
  title,
  children,
}: {
  id?: string;
  kicker?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id ?? title}-h`}
      className="scroll-mt-20 pt-14"
    >
      {kicker && (
        <span className="font-uv-script inline-block -rotate-2 text-[26px] text-[#ffcf4a]">
          {kicker}
        </span>
      )}
      <h2
        id={`${id ?? title}-h`}
        className="mb-[18px] mt-[6px] font-uv text-[clamp(38px,9vw,64px)] uppercase leading-[0.9]"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

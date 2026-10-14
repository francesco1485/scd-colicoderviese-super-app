import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { KitTexture } from "@/components/scd/kit-texture";
import { ShareButton } from "@/components/scd/ShareButton";
import { SHARE_PAGES, absoluteUrl, pageMeta } from "@/lib/share";

import {
  LARIO_LANGS,
  LARIO_LANG_LABEL,
  LARIO_TEXT,
  parseLarioLang,
  type LarioLang,
} from "@/lib/lario-cup-i18n";
import {
  CHRISTMAS_LARIO_CUP as E,
  confirmedCount,
  eventCountdown,
  eventPhase,
} from "@/lib/events";

export const Route = createFileRoute("/eventi/christmas-lario-cup")({
  validateSearch: (s: Record<string, unknown>): { lang?: "de" | "en" | undefined } =>
    s["lang"] === "de" || s["lang"] === "en" ? { lang: s["lang"] } : {},
  loader: () => ({ serverNow: Date.now() }),
  head: () => ({
    meta: pageMeta(SHARE_PAGES.christmasLarioCup),
    links: [
      { rel: "alternate", hrefLang: "it", href: absoluteUrl("/eventi/christmas-lario-cup") },
      { rel: "alternate", hrefLang: "de", href: absoluteUrl("/eventi/christmas-lario-cup?lang=de") },
      { rel: "alternate", hrefLang: "en", href: absoluteUrl("/eventi/christmas-lario-cup?lang=en") },
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

function ChristmasLarioCup() {
  const { serverNow } = Route.useLoaderData();
  const lang: LarioLang = parseLarioLang(Route.useSearch().lang);
  const T = LARIO_TEXT[lang];
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

  return (
    <main
      data-screen="event-clc"
      data-phase={phase}
      lang={lang}
      className="bg-[#020d2b] text-white"
    >
      <section
        aria-labelledby="clc-t"
        className="relative isolate flex items-end overflow-hidden px-4 pb-7 pt-5 sm:pb-8 sm:pt-7 lg:min-h-[calc(100svh-var(--pub-header-h))] lg:px-6 lg:pb-16 lg:pt-10"
        data-hero="event"
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
        <KitTexture motif="mountains-lake" overlay />
        <Snow />
        <div className="mx-auto grid w-full max-w-[1200px] gap-[16px] sm:gap-[22px] xl:grid-cols-[1.25fr_0.75fr] xl:items-end xl:gap-x-10">
          <div className="grid gap-3 sm:gap-4">
            <div className="flex items-center gap-[10px]">
              <img
                src="/media/brand/logo-scd.webp"
                alt="S.C.D. ColicoDerviese"
                className="h-[46px] w-auto sm:h-[60px]"
              />
              <span className="text-[13px] font-bold leading-tight text-[#bfe4ff]">
                S.C.D. ColicoDerviese
                <br />
                {T.coWith} {E.coOrganizer}
              </span>
            </div>
            <span className="justify-self-start -rotate-2 rounded-[8px] bg-[#d8202a] px-[14px] py-[6px] font-uv text-[18px] uppercase tracking-[0.12em] shadow-[0_6px_18px_rgb(216_32_42/0.5)]">
              {T.edition}
            </span>
            <h1
              id="clc-t"
              className="font-uv text-[clamp(50px,14vw,180px)] uppercase leading-[0.8]"
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
            <p className="font-uv-script -rotate-3 text-[clamp(20px,5vw,34px)] leading-[1.1] text-[#ffcf4a] [text-shadow:0_3px_0_rgb(0_0_0/0.4)]">
              {T.tagline}
            </p>
            <div className="flex flex-wrap gap-[10px]">
              <Pill
                icon={
                  <Calendar
                    className="size-[26px] text-[#ffcf4a]"
                    aria-hidden="true"
                  />
                }
                title={T.dateTitle}
                sub={T.dateSub}
              />
              <Pill
                icon={
                  <MapPin
                    className="size-[26px] text-[#ffcf4a]"
                    aria-hidden="true"
                  />
                }
                title="Colico e Dervio"
                sub={T.placeSub}
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
              {T.state[phase]}
            </p>
            <div
              className="grid max-w-[520px] grid-cols-4 gap-2"
              aria-label={T.countdownLabel}
              data-testid="clc-countdown"
            >
              {[
                [T.units[0], cd ? String(cd.d) : "0"],
                [T.units[1], cd ? pad(cd.h) : "00"],
                [T.units[2], cd ? pad(cd.m) : "00"],
                [T.units[3], cd ? pad(cd.s) : "00"],
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
                {T.enter}
              </a>
              <ShareButton page={SHARE_PAGES.christmasLarioCup} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 pb-14 lg:px-6">
        <nav
          aria-label={T.langLabel}
          className="flex flex-wrap items-center gap-2 pt-6"
          data-testid="clc-lang"
        >
          <span className="text-[13px] font-bold text-[#bfe4ff]">
            {T.langLabel}
          </span>
          {LARIO_LANGS.map((l) => (
            <Link
              key={l}
              to="/eventi/christmas-lario-cup"
              search={l === "it" ? {} : { lang: l }}
              hrefLang={l}
              activeOptions={{ exact: true, includeSearch: true }}
              className={`min-h-11 rounded-full px-4 py-2 text-[14px] font-extrabold ${l === lang ? "bg-[var(--uv-gold)] text-[var(--uv-night)]" : "bg-white/10 text-white"}`}
            >
              {LARIO_LANG_LABEL[l]}
            </Link>
          ))}
        </nav>
        <Sec id="tornei" kicker={T.cupsKicker} title={T.cupsTitle}>
          <div className="grid gap-4 md:grid-cols-2">
            {E.cups.map((c, i) => (
              <article
                key={c.badge}
                className={`relative isolate overflow-hidden rounded-[24px] border-2 border-white/15 px-5 pb-[22px] pt-[26px] ${i === 0 ? "bg-[radial-gradient(90%_70%_at_100%_0%,rgb(255_207_74/0.35),transparent_60%),linear-gradient(150deg,#0d4fb3,#021f4f_70%)]" : "bg-[radial-gradient(90%_70%_at_100%_0%,rgb(255_105_140/0.35),transparent_60%),linear-gradient(150deg,#b3122a,#4a0715_75%)]"}`}
              >
                <span className="rounded-[8px] bg-white/15 px-3 py-[7px] font-uv text-[15px] uppercase tracking-[0.12em]">
                  {T.cups[i]?.badge ?? c.badge}
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
                  {c.categories.map((k, j) => (
                    <div
                      key={k.big}
                      className="flex items-center gap-[14px] rounded-[16px] border-[1.5px] border-white/20 bg-white/10 px-[14px] py-3"
                    >
                      <b className="font-uv text-[34px] leading-none text-[#ffcf4a]">
                        {k.big}
                      </b>
                      <span className="font-extrabold leading-tight">
                        {T.cups[i]?.categories[j]?.title ?? k.title}
                        <small className="block text-[13.5px] font-semibold text-[#d5e2ff]">
                          {T.cups[i]?.categories[j]?.note ?? k.note}
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
                <h4 className="mb-2 mt-[18px] font-uv text-[16px] uppercase tracking-[0.12em] text-[#bfe4ff]">
                  {T.confirmedTitle}
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
                    {T.cups[i]?.note ?? c.note}
                  </p>
                )}
              </article>
            ))}
          </div>
        </Sec>

        <Sec
          id="iscrizioni"
          kicker={T.signKicker}
          title={T.signTitle}
        >
          <div className="grid gap-3 rounded-[24px] border-2 border-[rgb(255_207_74/0.5)] bg-gradient-to-br from-[rgb(255_207_74/0.18)] to-white/5 p-5">
            <div className="flex flex-wrap items-baseline gap-[10px]">
              <b className="font-uv text-[72px] leading-[0.85] text-[#ffcf4a]">
                {E.goal.min}–{E.goal.max}
              </b>
              <span className="font-uv text-[26px] uppercase">
                {T.goalWord}
              </span>
            </div>
            <div
              className="relative h-4 overflow-hidden rounded-[8px] bg-white/10"
              role="progressbar"
              aria-label={T.progressLabel}
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
              {T.confirmedNote(confirmed)}
            </small>
            <div className="flex flex-wrap gap-[10px]">
              <a
                href={E.infoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={gold}
              >
                {T.enter}
              </a>
              <a
                href={`mailto:${E.infoMail}?subject=${encodeURIComponent("Christmas Lario Cup 2026")}`}
                className={ghost}
              >
                {T.writeOrg}
              </a>
            </div>
          </div>
        </Sec>

        <Sec id="live" kicker={T.liveKicker} title={T.liveTitle}>
          <div className="overflow-hidden rounded-[24px] bg-white text-[var(--scd-ink)]">
            <div className="flex items-center justify-between gap-[10px] bg-[var(--uv-night)] px-[18px] py-4 text-white">
              <b className="font-uv text-[24px] uppercase">
                {T.liveHead[phase]}
              </b>
              <span className="inline-flex items-center gap-2 text-[14px] font-extrabold">
                <i
                  aria-hidden="true"
                  className={`size-[10px] rounded-full ${phase === "live" ? "uv-blink bg-[#ff3b44]" : "bg-[var(--uv-gold)]"}`}
                />
                {T.liveBadge[phase]}
              </span>
            </div>
            <p className="p-[18px] text-[15px] leading-relaxed text-[var(--scd-sub)]">
              {T.liveText}
            </p>
          </div>
        </Sec>

        <Sec
          id="villaggio"
          kicker={T.villageKicker}
          title={T.villageTitle}
        >
          <div className="grid grid-cols-2 gap-[10px] md:grid-cols-4">
            {E.village.map((v, i) => (
              <div
                key={v.title}
                className="rounded-[18px] border-[1.5px] border-white/15 bg-white/5 px-[14px] py-4"
              >
                <b className="block font-uv text-[22px] uppercase leading-none">
                  {T.village[i]?.title ?? v.title}
                </b>
                <span className="mt-1 block text-[14px] text-[#cfdcf5]">
                  {T.village[i]?.text ?? v.text}
                </span>
              </div>
            ))}
          </div>
        </Sec>

        <Sec
          id="partner"
          kicker={T.partnerKicker}
          title={T.partnerTitle}
        >
          <div className="grid gap-[10px] md:grid-cols-2">
            {E.partnerSlots.map((p, i) => (
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
                    {T.partners[i]?.title ?? p.title}
                  </b>
                  <span className="mt-1 block text-[14px] text-[#cfdcf5]">
                    {T.partners[i]?.text ?? p.text}
                  </span>
                  <span className="mt-[6px] inline-block rounded-[5px] bg-[#8ff0b5] px-[7px] py-1 font-uv text-[12px] uppercase tracking-[0.1em] text-[var(--uv-night)]">
                    {T.available}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <Link to="/sponsor" className={`${gold} mt-[14px]`}>
            {T.becomePartner}
          </Link>
        </Sec>

        <Sec kicker={T.postersKicker} title={T.postersTitle}>
          <div className="grid grid-cols-2 gap-3 md:max-w-[620px]">
            {E.posters.map((p, i) => (
              <figure key={p.src}>
                <img
                  src={p.src}
                  alt={T.posters[i]?.alt ?? p.alt}
                  loading="lazy"
                  className="aspect-[1122/1402] w-full rounded-[14px] object-cover shadow-[0_14px_30px_rgb(0_0_0/0.45)]"
                />
                <figcaption className="mt-2 text-[13.5px] font-bold text-[#cfdcf5]">
                  {T.posters[i]?.caption ?? p.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </Sec>

        <Sec
          id="arrivare"
          kicker={T.arriveKicker}
          title={T.arriveTitle}
        >
          <div className="grid gap-[10px] md:grid-cols-2">
            {E.cups.map((c, i) => (
              <div
                key={c.city}
                className="rounded-[18px] bg-white p-4 text-[var(--scd-ink)]"
              >
                <b className="block font-uv text-[24px] uppercase leading-none">
                  {c.city.replace(" (LC)", "")}
                </b>
                <span className="mb-[10px] mt-1 block text-[14.5px] text-[var(--scd-sub)]">
                  {c.venue}. {T.cups[i]?.arrive}
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.mapsQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-extrabold text-[var(--uv-royal)]"
                >
                  {T.openMaps}
                </a>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[14.5px] text-[#cfdcf5]">
            {T.arriveNote}
          </p>
        </Sec>

        <Sec id="organizzazione" title={T.orgTitle}>
          <div className="rounded-[24px] border-[1.5px] border-white/15 bg-white/5 p-5 text-[#dbe7ff]">
            <p>
              {T.orgText} {T.orgInfo}{" "}
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
              {T.privacy} {T.sourceLabel} {E.source}.
            </p>
          </div>
        </Sec>
        <p className="font-uv-script mt-10 text-center text-[30px] text-[#ffcf4a]">
          {T.claim}
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

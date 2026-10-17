import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { ShareButton } from "@/components/scd/ShareButton";
import { SHARE_PAGES, absoluteUrl, pageHead } from "@/lib/share";

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
import { intakeLink } from "@/lib/intake-links";

export const Route = createFileRoute("/eventi/christmas-lario-cup")({
  validateSearch: (s: Record<string, unknown>): { lang?: "de" | "en" | undefined } =>
    s["lang"] === "de" || s["lang"] === "en" ? { lang: s["lang"] } : {},
  loader: () => ({ serverNow: Date.now() }),
  // Each language version is its own canonical page (validateSearch allows only de/en), linked by hreflang.
  head: ({ match }) =>
    pageHead(SHARE_PAGES.christmasLarioCup, {
      canonical: match.search.lang ? absoluteUrl(`/eventi/christmas-lario-cup?lang=${match.search.lang}`) : undefined,
      extraLinks: [
        { rel: "alternate", hrefLang: "it", href: absoluteUrl("/eventi/christmas-lario-cup") },
        { rel: "alternate", hrefLang: "de", href: absoluteUrl("/eventi/christmas-lario-cup?lang=de") },
        { rel: "alternate", hrefLang: "en", href: absoluteUrl("/eventi/christmas-lario-cup?lang=en") },
      ],
    }),
  component: ChristmasLarioCup,
});

const pad = (n: number) => String(n).padStart(2, "0");

function ChristmasLarioCup() {
  const { serverNow } = Route.useLoaderData();
  const lang: LarioLang = parseLarioLang(Route.useSearch().lang);
  const T = LARIO_TEXT[lang];
  // One form for both cups: the female edition shares the registrations of the men's tournament (see T.cups[1].note).
  const signForm = intakeLink("ISCRIZIONE_TORNEO", { torneo: "christmas-lario-cup-maschile" });
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
  const gold = `${cta} bg-gradient-to-b from-[#ffe066] to-[var(--uv-gold)] text-[var(--uv-night)] shadow-[0_4px_0_#b38f00]`;
  const ghost = `${cta} bg-white/10 text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.4)]`;

  return (
    <main
      data-screen="event-clc"
      data-phase={phase}
      lang={lang}
      className="bg-[#020d2b] text-white"
    >
      {/* Compact SCD METAL header (Francesco 16/10/2026 «queste barre così grandi io non le voglio»): brushed navy band,
          official crest, title, date and place, the countdown and the two actions; the content starts right after. */}
      <section
        aria-labelledby="clc-t"
        className="scd-band relative overflow-hidden text-white lg:-mr-12 2xl:mr-0"
        data-hero="event"
      >
        <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(55%_120%_at_90%_0%,rgb(255_207_74/0.16),transparent_70%),radial-gradient(45%_110%_at_8%_100%,rgb(216_32_42/0.16),transparent_70%)]" />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,#8ea2c6,#ffffff_22%,#b8c5dd_50%,#ffffff_78%,#8ea2c6)]" />
        <div className="relative mx-auto grid w-full max-w-[1200px] gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8 lg:px-6 lg:py-6">
          <div className="flex items-start gap-3 lg:items-center lg:gap-5">
            <img
              src="/media/brand/logo-scd.webp"
              alt="S.C.D. ColicoDerviese"
              className="h-[56px] w-auto shrink-0 drop-shadow-[0_8px_16px_rgb(0_0_0/0.45)] lg:h-[84px]"
            />
            <div className="grid min-w-0 gap-1">
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[#ffd23f] lg:text-[12px]">
                {T.edition} · <span className="hidden sm:inline">S.C.D. ColicoDerviese </span>{T.coWith} {E.coOrganizer}
              </span>
              <h1 id="clc-t" className="m-0 font-display text-[28px] font-bold uppercase leading-[1] tracking-[0.01em] lg:text-[40px]">
                Christmas <span className="text-[#ffd23f]">Lario Cup</span>
              </h1>
              <p className="m-0 text-[13px] leading-snug text-[#dbe5f7] lg:text-[16px]">{T.tagline}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Pill icon={<Calendar className="size-4 text-[#ffd23f]" aria-hidden="true" />} title={T.dateTitle} sub={T.dateSub} />
                <Pill icon={<MapPin className="size-4 text-[#ffd23f]" aria-hidden="true" />} title="Colico e Dervio" sub={T.placeSub} />
              </div>
            </div>
          </div>
          <div className="grid gap-2.5 lg:justify-items-end">
            <p role="status" className="m-0 inline-flex items-center gap-2 font-display text-[14px] font-semibold text-[#dbe5f7]">
              <i
                aria-hidden="true"
                className={`size-2 rounded-full ${phase === "live" ? "uv-blink bg-[#ff4d5e]" : "bg-[#ffd23f]"}`}
              />
              {T.state[phase]}
            </p>
            <div className="grid w-full max-w-[320px] grid-cols-4 gap-1.5" aria-label={T.countdownLabel} data-testid="clc-countdown">
              {[
                [T.units[0], cd ? String(cd.d) : "0"],
                [T.units[1], cd ? pad(cd.h) : "00"],
                [T.units[2], cd ? pad(cd.m) : "00"],
                [T.units[3], cd ? pad(cd.s) : "00"],
              ].map(([l, v]) => (
                <div key={l} className="rounded-[10px] border border-white/15 bg-black/20 px-1 pb-1 pt-1.5 text-center">
                  <b className="block font-display text-[24px] font-bold leading-none tabular-nums lg:text-[28px]">{v}</b>
                  <small className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b4c3de]">{l}</small>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="#iscrizioni" className="scd-gold scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-4 font-display text-[15px] font-semibold">
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
              {signForm.href && (
                <a href={signForm.href} target="_blank" rel="noopener noreferrer" className={ghost} data-testid="clc-modulo-iscrizione">
                  {T.signForm}
                  <span className="sr-only"> ({T.newTab})</span>
                </a>
              )}
            </div>
            {signForm.href && <small className="text-[13.5px] text-[#d5e2ff]" data-testid="clc-modulo-nota">{T.signFormNote}</small>}
          </div>
        </Sec>

        {phase === "pre" ? (
          <p id="live" className="m-0 mt-10 scroll-mt-20 text-[15px] font-semibold text-[#cfdcf5]" data-testid="clc-live-line">
            {T.liveTitle} · {T.liveHead.pre}
          </p>
        ) : (
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
        )}

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
              {T.privacy} {T.sourceLabel}
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
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/20 bg-white/[0.07] px-3 py-1 font-display text-[13px] lg:text-[14px]">
      {icon}
      <b className="font-semibold">{title}</b>
      <span className="text-[#b4c3de]">{sub}</span>
    </span>
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

import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Database, Info, Link2, Lock, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import crest from "@/assets/brand/logo-scd.png.asset.json";
import { accessScreen, whoEnters, type AccessScreen } from "@/lib/access";
import { AREA_ICON } from "./area-icons";
import { openAccessMenu } from "./AccessMenu";

/** <head> of an access screen route: no index, honest description. */
export function accessHead(id: string) {
  const s = accessScreen(id);
  const title = `Accesso ${s.label} — S.C.D. ColicoDerviese`;
  const description = `${s.blurb ? `${s.blurb} ` : ""}Area riservata della Super App S.C.D. ColicoDerviese: un solo account per tutte le aree.`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "robots", content: "noindex" },
    ],
  };
}

function CopyLink({ path }: { path: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const t = window.setTimeout(() => setState("idle"), 2200);
    return () => window.clearTimeout(t);
  }, [state]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setState("copied");
    } catch {
      setState("manual");
    }
  };
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={copy}
        aria-label={`Copia il link diretto ${path}`}
        className="scd-focus inline-flex h-[34px] items-center gap-2 rounded-full bg-white/[0.14] px-3 text-[14px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-white/[0.22] active:scale-[0.97]"
      >
        {state === "copied" ? <Check className="size-4" strokeWidth={2} aria-hidden="true" /> : <Link2 className="size-4" strokeWidth={1.8} aria-hidden="true" />}
        <span className="lg:hidden">Copia link</span>
        <span className="hidden lg:inline">{path}</span>
      </button>
      <span role="status" aria-live="polite" className="min-h-[1em] text-[12.5px] font-medium text-[var(--out-text-soft)]">
        {state === "copied" ? "Link copiato" : state === "manual" ? `Copia a mano: ${path}` : ""}
      </span>
    </span>
  );
}

/** Mountains and the yellow lake line of board Accesso-area (decoration only). */
function Landscape() {
  return (
    <svg viewBox="0 0 390 220" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[220px] w-full lg:h-[300px]">
      <path d="M0 110 L60 60 L120 92 L190 30 L250 86 L320 46 L390 80 L390 220 L0 220Z" fill="#05427c" opacity=".7" />
      <path d="M0 160 C 120 146, 260 152, 390 140 L390 220 L0 220Z" fill="#0860A8" />
      <path d="M0 186 C 130 176, 270 180, 390 170 L390 178 C 270 188, 130 186, 0 196Z" fill="#F8D000" />
    </svg>
  );
}

function InsideCard({ s }: { s: AccessScreen }) {
  return (
    <section aria-labelledby="acc-dentro" className="rounded-[22px] bg-white p-5 text-[var(--in-ink)] shadow-[0_24px_50px_-20px_rgb(2_20_51/0.6)] lg:p-7">
      <h2 id="acc-dentro" className="text-[19px] font-bold">Cosa trovi dentro</h2>
      {s.inside.length > 0 ? (
        <ul className="mt-3 space-y-2.5" data-testid="access-inside">
          {s.inside.map((v) => (
            <li key={v} className="flex gap-3 text-[15.5px] leading-snug">
              <Check className="mt-[2px] size-5 flex-none text-[var(--in-ok)]" strokeWidth={2} aria-hidden="true" />
              {v}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[15px] leading-snug text-[var(--in-sub)]">Entra con il tuo account: trovi i contenuti di quest'area secondo il tuo ruolo.</p>
      )}
      <p className="mt-4 flex gap-2 border-t border-[var(--in-line)] pt-3 text-[13.5px] leading-snug text-[var(--in-sub)]">
        <Database className="mt-[1px] size-4 flex-none" strokeWidth={1.8} aria-hidden="true" />
        <span>{s.sources.length ? <>I dati arrivano da: {s.sources.join(", ")}. Nessun registro parallelo.</> : "I dati arrivano dagli archivi della società."}</span>
      </p>
      {s.blocker && (
        <p className="mt-3 flex gap-2 rounded-xl bg-[var(--in-warn-bg)] px-3 py-2.5 text-[14px] leading-snug text-[var(--in-warn)]">
          <TriangleAlert className="mt-[1px] size-4 flex-none" strokeWidth={1.8} aria-hidden="true" />
          <span>In sospeso: {s.blocker}.</span>
        </p>
      )}

      <Link to="/accedi" search={{ next: s.path }} className="scd-action mt-5 h-[52px] w-full text-[17px] font-bold" data-testid="access-enter">
        Accedi con la tua e-mail
        <ArrowRight className="size-5" strokeWidth={2} aria-hidden="true" />
      </Link>
      <Link to={s.enter.href as never} className="scd-focus mt-2.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#b9d5ef] bg-white text-[15px] font-semibold text-[var(--in-info)] transition-colors duration-150 hover:bg-[var(--in-info-bg)]" data-testid="access-landing">
        Cosa c'è nell'area
      </Link>
      <button type="button" onClick={openAccessMenu} className="scd-focus mt-2.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#b9d5ef] bg-white text-[15px] font-semibold text-[var(--in-info)] transition-colors duration-150 hover:bg-[var(--in-info-bg)]">
        Torna alle aree
      </button>
      <p className="mt-3 text-[14px] leading-snug text-[var(--in-sub)]">
        Ricevi un link via e-mail, senza password. Lo stesso account apre tutte le aree del ruolo che la società ti ha assegnato.
      </p>
    </section>
  );
}

/** Access screen of a reserved area (board Accesso-area). Describes and routes only. */
export function AccessScreenPage({ id }: { id: string }) {
  const s = accessScreen(id);
  const Icon = AREA_ICON[s.icon];
  return (
    <main
      data-screen="access"
      data-area={s.id}
      className="scd-pub relative isolate overflow-hidden bg-[linear-gradient(180deg,#062a52_0%,#0860A8_62%,#1898D8_100%)] pb-[200px] font-text text-white lg:pb-[260px]"
    >
      <Landscape />
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10">
        <header className="flex items-start justify-between gap-3 pt-4 lg:pt-8">
          <button type="button" onClick={openAccessMenu} className="scd-focus inline-flex h-[34px] items-center gap-1.5 rounded-md text-[15px] font-semibold text-white">
            <ArrowLeft className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
            Tutte le aree
          </button>
          <CopyLink path={s.path} />
        </header>

        <div className="lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-start lg:gap-14">
          <div>
            {s.parent && (
              <p className="mt-3 text-[14px] font-semibold text-[var(--out-text-soft)]">
                <Link to={s.parent.path as never} className="scd-focus rounded-sm underline decoration-white/40 underline-offset-4 hover:decoration-white">{s.parent.label}</Link>
                <span aria-hidden="true"> / </span>
                {s.label}
              </p>
            )}
            <div className="mt-4 flex items-center gap-3.5">
              <img src={crest.url} alt="Stemma S.C.D. ColicoDerviese" width={52} height={67} className="h-[67px] w-auto flex-none object-contain lg:h-[96px]" />
              <div className="min-w-0">
                <h1 className="font-title text-[44px] font-black leading-[0.9] [overflow-wrap:anywhere] sm:text-[52px] lg:text-[76px]">{s.label}</h1>
                <span className="mt-2 inline-flex h-[26px] items-center gap-1.5 rounded-full bg-[var(--out-yellow)] px-2.5 text-[13px] font-semibold text-[var(--in-ink)]">
                  <Lock className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
                  Riservata
                </span>
              </div>
            </div>
            {s.blurb && <p className="mt-3 max-w-[40ch] text-[16px] leading-snug text-[var(--out-text-soft)] lg:text-[19px]">{s.blurb}</p>}
            <p className="mt-5 hidden items-center gap-3 text-[15px] text-[#e6f3fc] lg:flex">
              <span className="flex size-11 items-center justify-center rounded-xl bg-white/[0.12]">
                <Icon className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
              </span>
              Un solo account SCD per tutte le aree: ognuna mostra solo ciò che il tuo ruolo può vedere.
            </p>
          </div>

          <div className="mt-6 lg:mt-0">
            <InsideCard s={s} />
            <div className="mt-4 px-1 text-[14px] leading-[1.45] text-[#e6f3fc] lg:px-2" data-testid="access-who">
              <p><b className="text-white">Chi entra qui:</b> {whoEnters(s)}.</p>
              <p className="mt-1">
                Non hai accesso?{" "}
                <Link to="/contatti" className="scd-focus rounded-sm font-semibold text-white underline decoration-[var(--out-yellow)] decoration-2 underline-offset-4">Scrivi alla segreteria</Link>
              </p>
              <p className="mt-2 flex gap-2 text-[13px] text-[var(--out-text-soft)]">
                <Info className="mt-[2px] size-4 flex-none" strokeWidth={1.8} aria-hidden="true" />
                Ruoli e permessi li assegna solo la società: nessuno può darsi un accesso da solo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

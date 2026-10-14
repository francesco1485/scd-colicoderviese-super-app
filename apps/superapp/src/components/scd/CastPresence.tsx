import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle, Sparkles } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { CastBadge, PERSONA_COPY, isReservedPath, personaFor } from "@/components/scd/SkyJolly";
import { CastPortrait } from "@/components/scd/CastPortrait";
import { openAssistant } from "@/lib/assistant-open";
import { castReady } from "@/lib/assistant-cast";
import { CAST_PERSONAS, GENNY_PRESENCE, dailyCastTip, type CastLink, type CastPersonaId, type PresenceId } from "@/lib/cast-personas";
import { romeDay } from "@/lib/era-nutrition-tips";
import { useSession } from "@/lib/use-session";

/**
 * Live guide of an area (UD-114): the character of the cast who helps on this page. Portrait only when approved
 * (assistant-cast readiness), otherwise the initial badge; today's tip (same for everybody on a Rome day); an
 * optional live line from real data given by the page; 2-4 quick actions to real pages; "Chiedi a …" opening the
 * app chat with that persona. Names still to be decided show the neutral role label.
 */

interface PresenceView {
  label: string;
  role: string;
  askLabel: string;
  tips: boolean;
  disclaimer: string;
  quick: readonly CastLink[];
  nameTbd: boolean;
}

function view(id: PresenceId): PresenceView {
  if (id === "genny") {
    return { label: GENNY_PRESENCE.label, role: GENNY_PRESENCE.role, askLabel: GENNY_PRESENCE.askLabel, tips: true, disclaimer: GENNY_PRESENCE.disclaimer, quick: GENNY_PRESENCE.quick, nameTbd: false };
  }
  const d = CAST_PERSONAS[id];
  return { label: d.label, role: d.role, askLabel: d.askLabel, tips: true, disclaimer: d.disclaimer, quick: d.quick, nameTbd: d.nameTbd };
}

/**
 * "Chiedi a …" button. The label follows the one persona rule (assistant.ts chatPersonaFor): when the persona is not
 * available to this viewer (a younger member, a public page for an inside persona) it names the helper who will
 * answer instead. While the session is loading it keeps the asked label; the server re-checks anyway.
 */
export function CastAskButton({ id, className = "", tone = "primary" }: { id: PresenceId; className?: string; tone?: "primary" | "quiet" }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, loading } = useSession();
  const viewer = session?.user ? { roles: session.roles ?? [], age15plus: null } : null;
  const asked = id === "genny" ? null : id;
  const resolved = personaFor(pathname, viewer, asked);
  const own = id === "genny" ? resolved === "genny" : resolved === id;
  const label = loading || own ? view(id).askLabel : `Chiedi a ${PERSONA_COPY[resolved].name}`;
  const cls =
    tone === "primary"
      ? "bg-[#ffd600] text-[#0b1e3a] hover:brightness-95"
      : "border border-[var(--in-line,#dbe3ee)] bg-white text-[#0b2a5b] hover:bg-[#f3f7fc]";
  return (
    <button
      type="button"
      onClick={() => (id === "genny" && isReservedPath(pathname) ? window.dispatchEvent(new Event("genny:open")) : openAssistant(asked))}
      className={`scd-focus inline-flex min-h-11 items-center gap-2 rounded-[12px] px-4 text-[15px] font-bold ${cls} ${className}`}
      data-testid={`ask-${id}`}
      data-ask-persona={resolved}
    >
      <MessageCircle className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
      {label}
    </button>
  );
}

function QuickLink({ link }: { link: CastLink }) {
  return (
    <Link
      to={link.to as never}
      {...(link.hash ? { hash: link.hash } : {})}
      className="scd-focus inline-flex min-h-11 items-center rounded-full border border-[var(--in-line,#dbe3ee)] bg-white px-3.5 text-[14.5px] font-semibold text-[#0b2a5b] hover:bg-[#f3f7fc]"
      data-testid="presence-quick"
    >
      {link.label}
    </Link>
  );
}

export interface PresenceLive {
  label: string;
  text: string;
  link?: CastLink;
}

/** Body of a presence (no outer card): used alone in a card or inside {@link CastHelpersCard} tabs. */
export function CastPresenceBody({ id, day, live, headingLevel = 2, headingId }: { id: PresenceId; day?: string | undefined; live?: PresenceLive | null | undefined; headingLevel?: 2 | 3; headingId: string }) {
  const v = view(id);
  const tip = dailyCastTip(id, day ?? romeDay());
  const H = headingLevel === 2 ? "h2" : "h3";
  const portrait = id === "acanfora" && castReady("acanfora");
  return (
    <div className="flex flex-col gap-3.5" data-presence={id} data-name-tbd={v.nameTbd ? "true" : "false"}>
      <div className="flex items-center gap-3">
        {portrait ? (
          <CastPortrait id="acanfora" className="h-[86px] flex-none lg:h-[104px]" />
        ) : (
          <CastBadge id={id} size={52} />
        )}
        <div className="min-w-0">
          <p className="m-0 text-[12.5px] font-bold uppercase tracking-wide text-[#0860A8]">Ti aiuta qui</p>
          <H id={headingId} className="m-0 text-[20px] font-extrabold leading-tight text-[#0b2a5b]">
            {v.label}
          </H>
          <p className="m-0 text-[14px] leading-snug text-[var(--in-sub,#4a5d7a)]">{v.role}</p>
        </div>
      </div>
      <div className="flex gap-3 rounded-xl border-2 border-[#ffd600] bg-white px-3.5 py-3" data-testid={`presence-tip-${id}`}>
        <span className="mt-[2px] flex size-9 flex-none items-center justify-center rounded-full bg-[#0b2a5b] text-[#ffd600]">
          <Sparkles className="size-[18px]" strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-[12.5px] font-bold uppercase tracking-wide text-[#0860A8]">Il consiglio di oggi</span>
          <b className="block text-[15.5px] font-bold leading-snug text-[#0b2a5b]">{tip.title}</b>
          <span className="mt-0.5 block text-[14.5px] leading-snug text-[var(--in-ink,#0d1a3a)]">{tip.text}</span>
        </span>
      </div>
      {live && (
        <p className="m-0 rounded-xl bg-[#eef5fc] px-3.5 py-3 text-[14.5px] leading-snug text-[#0b2a5b]" data-testid={`presence-live-${id}`}>
          <b className="mr-1">{live.label}:</b>
          {live.text}
          {live.link && (
            <>
              {" "}
              <Link to={live.link.to as never} {...(live.link.hash ? { hash: live.link.hash } : {})} className="scd-focus font-bold text-[#1556c4] underline underline-offset-2">
                {live.link.label}
              </Link>
            </>
          )}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <CastAskButton id={id} />
        {v.quick.slice(0, 4).map((l) => (
          <QuickLink key={`${l.to}#${l.hash ?? ""}`} link={l} />
        ))}
      </div>
      <p className="m-0 text-[13px] leading-snug text-[var(--in-sub,#4a5d7a)]">{v.disclaimer}</p>
    </div>
  );
}

/** A presence in its own card. */
export function CastPresence({ id, day, live, className = "", headingLevel = 2 }: { id: PresenceId; day?: string | undefined; live?: PresenceLive | null | undefined; className?: string; headingLevel?: 2 | 3 }) {
  const hid = `presence-${id}-${useId().replace(/:/g, "")}`;
  return (
    <section
      aria-labelledby={hid}
      className={`min-w-0 rounded-[16px] border border-[var(--in-line,#dbe3ee)] bg-white p-4 shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)] sm:p-5 ${className}`}
      data-testid={`presence-${id}`}
    >
      <CastPresenceBody id={id} day={day} live={live} headingLevel={headingLevel} headingId={hid} />
    </section>
  );
}

/**
 * Several characters of one area in one card, one at a time (progressive disclosure, no wall of cards): ARIA tabs
 * with arrow keys, each tab a {@link CastPresenceBody}.
 */
export function CastHelpersCard({ ids, title, sub, day, id = "cast-helpers", children }: { ids: readonly CastPersonaId[]; title: string; sub?: string; day?: string | undefined; id?: string; children?: ReactNode }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const base = useId().replace(/:/g, "");
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = ids.length - 1;
    const next = e.key === "ArrowRight" ? (active === last ? 0 : active + 1) : e.key === "ArrowLeft" ? (active === 0 ? last : active - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };
  const current = ids[active] ?? ids[0]!;
  return (
    <section
      aria-labelledby={`${base}-t`}
      id={id}
      className="min-w-0 scroll-mt-24 overflow-hidden rounded-[var(--in-radius,16px)] border border-[var(--in-line,#dbe3ee)] bg-white shadow-[var(--in-card-shadow,0_8px_24px_-12px_rgb(11_42_91/0.25))]"
      data-testid="cast-helpers"
    >
      <header className="px-4 pb-2 pt-4 sm:px-[18px]">
        <h2 id={`${base}-t`} className="m-0 text-[19px] font-bold leading-tight">
          {title}
        </h2>
        {sub && <p className="m-0 mt-1 text-[14px] leading-snug text-[var(--in-sub,#4a5d7a)]">{sub}</p>}
      </header>
      <div role="tablist" aria-label={title} className="flex flex-wrap gap-2 px-4 pb-1 pt-1 sm:px-[18px]">
        {ids.map((pid, i) => {
          const selected = i === active;
          return (
            <button
              key={pid}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              role="tab"
              type="button"
              id={`${base}-tab-${pid}`}
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={onKey}
              className={`scd-focus inline-flex min-h-11 flex-none items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-[14.5px] font-semibold ${selected ? "bg-[#0b2a5b] text-white" : "border border-[var(--in-line,#dbe3ee)] bg-white text-[#0b2a5b]"}`}
            >
              <CastBadge id={pid} size={32} />
              {CAST_PERSONAS[pid].label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${current}`} className="px-4 pb-4 pt-3 sm:px-[18px]">
        <CastPresenceBody id={current} day={day} headingLevel={3} headingId={`${base}-h-${current}`} />
      </div>
      {children}
    </section>
  );
}

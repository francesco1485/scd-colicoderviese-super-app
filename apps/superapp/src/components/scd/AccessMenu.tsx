import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  Lock,
  LogIn,
  ShieldCheck,
  UserRoundPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { sessionPositions } from "@/lib/access-nav";
import { areaLink, menuFor, type MenuEntry, type MenuGroup } from "@/lib/areas";
import type { SessionView } from "@/lib/auth.functions";
import { useSession } from "@/lib/use-session";
import { AREA_ICON } from "./area-icons";

/** Opens the "Accesso aree" menu from anywhere (e.g. a CTA on a page). */
export const openAccessMenu = () =>
  window.dispatchEvent(new CustomEvent("scd:access-menu"));

/** Login page with a way back to where the person was. */
export function loginSearch(pathname: string): { next: string | undefined } {
  return {
    next:
      pathname.startsWith("/accedi") || pathname === "/" ? undefined : pathname,
  };
}

function Entry({
  entry,
  onNavigate,
}: {
  entry: MenuEntry;
  onNavigate: () => void;
}) {
  const link = areaLink(entry.id);
  const Icon = AREA_ICON[entry.icon];
  const body = (
    <>
      <span className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-[var(--in-info-bg)] text-[var(--in-info)]">
        <Icon className="size-[19px]" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <b className="flex items-center gap-1.5 text-[15.5px] font-bold leading-tight">
          {entry.label}
          {entry.reserved && (
            <Lock
              className="size-3.5 text-[var(--in-sub)]"
              strokeWidth={1.8}
              aria-label="area riservata"
            />
          )}
        </b>
        <small className="mt-px block text-[13px] leading-snug text-[var(--in-sub)]">
          {entry.blurb}
        </small>
        {link.href ? (
          <span className="mt-0.5 block text-[12.5px] font-semibold text-[var(--in-info)]">
            {link.path}
            {!link.direct && (
              <span className="font-medium text-[var(--in-sub)]">
                {" "}
                · link diretto presto
              </span>
            )}
          </span>
        ) : (
          <span className="mt-1 inline-flex h-5 items-center rounded-full bg-[#eef3f9] px-2 text-[12px] font-semibold text-[var(--in-sub)]">
            In arrivo · {link.path}
          </span>
        )}
      </span>
    </>
  );
  const cls =
    "flex items-start gap-3 rounded-xl px-3 py-2.5 text-[var(--in-ink)]";
  if (!link.href) {
    return (
      <div className={`${cls} opacity-80`} aria-disabled="true">
        {body}
      </div>
    );
  }
  return (
    <Link
      to={link.href as never}
      onClick={onNavigate}
      className={`${cls} scd-focus transition-colors duration-150 hover:bg-[#eef6fd]`}
    >
      {body}
    </Link>
  );
}

/** Who is logged in (verified on the server): one line to manage the access. */
function SessionStrip({
  session,
  onNavigate,
}: {
  session: SessionView;
  onNavigate: () => void;
}) {
  return (
    <Link
      to="/accedi"
      search={{ next: undefined }}
      onClick={onNavigate}
      className="scd-focus mx-1 flex items-center gap-3 rounded-xl bg-[#e3f3e9] px-3 py-2.5 text-[var(--in-ink)]"
      data-testid="menu-session"
    >
      <ShieldCheck
        className="size-5 shrink-0 text-[#0b8a43]"
        strokeWidth={2}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <b className="block truncate text-[15px] leading-tight">
          {session.user?.email}
        </b>
        <small className="block text-[13px] text-[#14532d]">
          {session.badge} · gestisci l'accesso
        </small>
      </span>
    </Link>
  );
}

/** Anonymous visitor: the two doors, and why the list is short. */
function EnterBlock({
  pathname,
  configured,
  onNavigate,
}: {
  pathname: string;
  configured: boolean;
  onNavigate: () => void;
}) {
  return (
    <section
      aria-labelledby="access-enter-title"
      className="mx-1 rounded-2xl bg-[var(--in-ground)] px-4 py-4"
      data-testid="menu-enter"
    >
      <h2
        id="access-enter-title"
        className="text-[16px] font-bold leading-tight text-[var(--in-ink)]"
      >
        Entra o registrati
      </h2>
      <p className="mt-1 text-[13.5px] leading-snug text-[var(--in-sub)]">
        {configured
          ? "Con e-mail e password, oppure con un codice via e-mail."
          : "Accesso in attivazione su questo server."}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          to="/accedi"
          search={loginSearch(pathname)}
          onClick={onNavigate}
          className="scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--scd-yellow)] px-3 text-[15px] font-bold text-[#0b1e3a]"
          data-testid="menu-login"
        >
          <LogIn className="size-[18px]" strokeWidth={2} aria-hidden="true" />
          Entra
        </Link>
        <Link
          to="/registrati"
          onClick={onNavigate}
          className="scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--in-info)] bg-white px-3 text-[15px] font-bold text-[var(--in-info)]"
          data-testid="menu-register"
        >
          <UserRoundPlus
            className="size-[18px]"
            strokeWidth={2}
            aria-hidden="true"
          />
          Registrati
        </Link>
      </div>
      <p className="mt-3 flex items-start gap-2 text-[13px] leading-snug text-[var(--in-sub)]">
        <Lock
          className="mt-0.5 size-3.5 flex-none"
          strokeWidth={1.8}
          aria-hidden="true"
        />
        Le aree riservate compaiono dopo l'accesso.
      </p>
    </section>
  );
}

function Group({
  group,
  onNavigate,
}: {
  group: MenuGroup;
  onNavigate: () => void;
}) {
  return (
    <div>
      <h2 className="mx-3 mb-1.5 text-[14px] font-bold text-[var(--in-info)]">
        {group.title}
      </h2>
      {group.entries.map((e) => (
        <Entry key={e.id} entry={e} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

const Note = () => (
  <p className="mt-3 flex items-start gap-2.5 rounded-xl bg-[var(--in-ground)] px-4 py-3 text-[13.5px] leading-snug text-[var(--in-sub)]">
    <Lock
      className="mt-0.5 size-4 flex-none"
      strokeWidth={1.8}
      aria-hidden="true"
    />
    <span>
      Il lucchetto indica le aree riservate: vedi solo quelle che il tuo ruolo
      può aprire. Dove è scritto «link diretto presto», per ora si apre la
      pagina dell'area già attiva.
    </span>
  </p>
);

/**
 * "Accesso aree" (board Accesso-aree): button in the public top bar. For an anonymous visitor it
 * reads "Entra" and the panel lists the public pages plus one "Entra o registrati" block; after
 * the login it reads "Aree" and lists the areas the person's positions open (src/lib/areas.ts
 * menuFor). Desktop: panel under the bar. Phone: bottom sheet. Navigation only: every area keeps
 * its own server gate.
 */
export function AccessMenu() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { session, refresh } = useSession();

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onOpen = () => {
      refresh();
      setOpen(true);
    };
    window.addEventListener("scd:access-menu", onOpen);
    return () => window.removeEventListener("scd:access-menu", onOpen);
  }, [refresh]);
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a,[tabindex]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t))
        close(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

  const signedIn = !!session?.user;
  const groups = menuFor(sessionPositions(session));
  const navigate = () => setOpen(false);
  const cols = signedIn ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        // Below 460px the header has no room for the label next to the wordmark: icon-only square. The label stays as
        // screen-reader text and the bottom bar keeps the big "Entra" tab; "!" beats the unlayered .scd-action padding.
        // Verified at 360x780 and 390x844.
        className="scd-action max-[459px]:w-11 max-[459px]:px-0!"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        onClick={() => {
          refresh();
          setOpen((o) => !o);
        }}
        data-testid="access-button"
      >
        {signedIn ? (
          <Lock className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <LogIn className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
        )}
        {signedIn ? (
          <>
            <span className="max-[459px]:sr-only sm:hidden">Aree</span>
            <span className="hidden sm:inline">Le tue aree</span>
          </>
        ) : (
          <span className="max-[459px]:sr-only">Entra</span>
        )}
        <ChevronDown
          className={`size-[18px] transition-transform duration-200 max-[459px]:hidden ${open ? "rotate-180" : ""}`}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>

      {open &&
        createPortal(
          <>
            <div
              aria-hidden="true"
              className="fixed inset-0 z-[55] bg-[#021433]/55 lg:hidden"
            />
            <div
              ref={panelRef}
              id={panelId}
              role="region"
              aria-label={signedIn ? "Le tue aree" : "Entra nella Super App"}
              className={`scd-access-panel fixed inset-x-0 bottom-0 z-[56] max-h-[86dvh] overflow-y-auto rounded-t-[22px] bg-white px-2 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 font-text text-[var(--in-ink)] shadow-[0_-16px_50px_rgb(2_20_51/0.45)] lg:inset-x-auto lg:bottom-auto lg:right-[max(40px,calc((100vw-1440px)/2+40px))] lg:top-[calc(var(--pub-header-h)+12px)] lg:max-h-[calc(100dvh-var(--pub-header-h)-24px)] lg:rounded-[20px] lg:px-3.5 lg:pb-3.5 lg:pt-5 lg:shadow-[0_30px_70px_-20px_rgb(2_20_51/0.6)] ${signedIn ? "lg:w-[min(900px,calc(100vw-80px))]" : "lg:w-[min(640px,calc(100vw-80px))]"}`}
            >
              <div className="flex items-center justify-between px-3 pb-2 lg:hidden">
                <b className="font-title text-[24px] font-extrabold">
                  {signedIn ? "Le tue aree" : "Entra nella Super App"}
                </b>
                <button
                  type="button"
                  onClick={() => close()}
                  aria-label="Chiudi"
                  className="scd-focus flex size-11 items-center justify-center rounded-lg"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              {signedIn && session?.user ? (
                <div className="mb-3">
                  <SessionStrip session={session} onNavigate={navigate} />
                </div>
              ) : (
                <div className="mb-3">
                  <EnterBlock
                    pathname={pathname}
                    configured={session?.configured !== false}
                    onNavigate={navigate}
                  />
                </div>
              )}
              <div className={`grid gap-4 ${cols} lg:gap-x-1.5 lg:gap-y-3.5`}>
                {groups.map((g) => (
                  <Group key={g.title} group={g} onNavigate={navigate} />
                ))}
              </div>
              {signedIn && (
                <div className="px-1.5">
                  <Note />
                </div>
              )}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

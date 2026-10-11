import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Lock, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ACCESS_MENU, areaLink, type MenuEntry, type MenuGroup } from "@/lib/areas";
import { AREA_ICON } from "./area-icons";

/** Opens the "Accesso aree" menu from anywhere (e.g. a CTA on a page). */
export const openAccessMenu = () => window.dispatchEvent(new CustomEvent("scd:access-menu"));

function Entry({ entry, onNavigate }: { entry: MenuEntry; onNavigate: () => void }) {
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
          {entry.reserved && <Lock className="size-3.5 text-[var(--in-sub)]" strokeWidth={1.8} aria-label="area riservata" />}
        </b>
        <small className="mt-px block text-[13px] leading-snug text-[var(--in-sub)]">{entry.blurb}</small>
        {link.href ? (
          <span className="mt-0.5 block text-[12.5px] font-semibold text-[var(--in-info)]">
            {link.path}
            {!link.direct && <span className="font-medium text-[var(--in-sub)]"> · link diretto presto</span>}
          </span>
        ) : (
          <span className="mt-1 inline-flex h-5 items-center rounded-full bg-[#eef3f9] px-2 text-[12px] font-semibold text-[var(--in-sub)]">In arrivo · {link.path}</span>
        )}
      </span>
    </>
  );
  const cls = "flex items-start gap-3 rounded-xl px-3 py-2.5 text-[var(--in-ink)]";
  if (!link.href) {
    return <div className={`${cls} opacity-80`} aria-disabled="true">{body}</div>;
  }
  return (
    <Link to={link.href as never} onClick={onNavigate} className={`${cls} scd-focus transition-colors duration-150 hover:bg-[#eef6fd]`}>
      {body}
    </Link>
  );
}

function Group({ group, onNavigate }: { group: MenuGroup; onNavigate: () => void }) {
  return (
    <div>
      <h2 className="mx-3 mb-1.5 text-[14px] font-bold text-[var(--in-info)]">{group.title}</h2>
      {group.entries.map((e) => <Entry key={e.id} entry={e} onNavigate={onNavigate} />)}
    </div>
  );
}

const Note = () => (
  <p className="mt-3 flex items-start gap-2.5 rounded-xl bg-[var(--in-ground)] px-4 py-3 text-[13.5px] leading-snug text-[var(--in-sub)]">
    <Lock className="mt-0.5 size-4 flex-none" strokeWidth={1.8} aria-hidden="true" />
    <span>
      Il lucchetto indica le aree riservate. Un solo account SCD per tutte: ogni area mostra solo ciò che il tuo ruolo può vedere.
      Dove è scritto «link diretto presto», per ora si apre la pagina dell'area già attiva.
    </span>
  </p>
);

/**
 * "Accesso aree" (board Accesso-aree): yellow button in the public top bar that opens
 * every area with its direct link. Desktop: panel under the bar, three columns.
 * Phone: bottom sheet. Navigation only, no login and no role logic here.
 */
export function AccessMenu() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("scd:access-menu", onOpen);
    return () => window.removeEventListener("scd:access-menu", onOpen);
  }, []);
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a,[tabindex]")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) close(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [open, close]);

  const [famiglie, staff, ufficio, aziende] = ACCESS_MENU as [MenuGroup, MenuGroup, MenuGroup, MenuGroup];
  const navigate = () => setOpen(false);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="scd-action"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        <Lock className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
        <span className="sm:hidden">Aree</span>
        <span className="hidden sm:inline">Accesso aree</span>
        <ChevronDown className={`size-[18px] transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={1.8} aria-hidden="true" />
      </button>

      {open && createPortal(
        <>
          <div aria-hidden="true" className="fixed inset-0 z-[55] bg-[#021433]/55 lg:hidden" />
          <div
            ref={panelRef}
            id={panelId}
            role="region"
            aria-label="Accesso alle aree"
            className="scd-access-panel fixed inset-x-0 bottom-0 z-[56] max-h-[86dvh] overflow-y-auto rounded-t-[22px] bg-white px-2 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 font-text text-[var(--in-ink)] shadow-[0_-16px_50px_rgb(2_20_51/0.45)] lg:inset-x-auto lg:bottom-auto lg:right-[max(40px,calc((100vw-1440px)/2+40px))] lg:top-[calc(var(--pub-header-h)+12px)] lg:max-h-[calc(100dvh-var(--pub-header-h)-24px)] lg:w-[min(900px,calc(100vw-80px))] lg:rounded-[20px] lg:px-3.5 lg:pb-3.5 lg:pt-5 lg:shadow-[0_30px_70px_-20px_rgb(2_20_51/0.6)]"
          >
            <div className="flex items-center justify-between px-3 pb-2 lg:hidden">
              <b className="font-title text-[24px] font-extrabold">Accesso alle aree</b>
              <button type="button" onClick={() => close()} aria-label="Chiudi accesso aree" className="scd-focus flex size-11 items-center justify-center rounded-lg">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-1.5 lg:gap-y-3.5">
              <div className="grid content-start gap-4 lg:gap-3.5">
                <Group group={famiglie} onNavigate={navigate} />
                <div className="hidden lg:block"><Group group={aziende} onNavigate={navigate} /></div>
              </div>
              <Group group={staff} onNavigate={navigate} />
              <Group group={ufficio} onNavigate={navigate} />
              <div className="lg:hidden"><Group group={aziende} onNavigate={navigate} /></div>
            </div>
            <div className="px-1.5"><Note /></div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

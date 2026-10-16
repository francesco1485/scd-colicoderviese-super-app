import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Link2, Menu, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import crest from "@/assets/brand/logo-scd.png.asset.json";
import { areaLink, formatClubDay, railFor, searchAreas, stripValue, type RailGroup, type StripItem } from "@/lib/areas";
import type { InternalBadge } from "@/lib/internal-badges";
import { AREA_ICON } from "./area-icons";
import { InternalBadgeImage } from "./InternalBadge";

export interface InteriorShellProps {
  /** Page title (board: Big Shoulders 800). */
  title: string;
  /** Canonical direct path of this area, copied by the path chip. */
  path: string;
  /** Registry id of the current area, highlighted in the rail. */
  activeAreaId?: string;
  /** Role set of the viewer: filters the rail only. Access control stays server side (R20). */
  roles: ReadonlySet<string>;
  /** Who is looking, in plain words (rail footer). */
  roleLabel: string;
  /** Rail decided by the page (access-resolver.ts shellRailFor); when absent it comes from `roles`. */
  rail?: readonly RailGroup[] | undefined;
  /** "Oggi" counts. Unknown values render "—" and are muted, never 0. */
  highlights?: readonly StripItem[];
  /** Injected for tests and screenshots; defaults to now. */
  today?: Date;
  /** Club-made area badge next to the title (src/lib/internal-badges.ts). Reserved pages only: never on access screens. */
  badge?: InternalBadge | undefined;
  children: ReactNode;
}

function Crest({ size }: { size: number }) {
  return <img src={crest.url} alt="Stemma S.C.D. ColicoDerviese" width={Math.round((size * 480) / 628)} height={size} style={{ height: size, width: "auto" }} className="flex-none object-contain" />;
}

function Rail({ groups, activeAreaId, roleLabel, onNavigate }: { groups: RailGroup[]; activeAreaId?: string | undefined; roleLabel: string; onNavigate?: () => void }) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-2 pb-[18px] pt-0.5">
        <Crest size={44} />
        <div className="leading-none">
          <b className="ex-title block text-[20px] text-[var(--ex-on-navy)]">SCD Dentro</b>
          <small className="mt-1.5 block text-[12.5px] text-[var(--ex-on-navy-soft)]">Un account, tutte le aree</small>
        </div>
      </div>
      <nav aria-label="Aree di lavoro" className="min-h-0 flex-1 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="ex-eyebrow mx-2.5 mb-1.5 mt-4 !text-[var(--ex-on-navy-soft)]">{g.title}</p>
            {g.items.map((it) => {
              const link = areaLink(it.id);
              const Icon = AREA_ICON[it.icon];
              const active = it.id === activeAreaId;
              const cls = "flex h-11 items-center gap-2.5 rounded-[8px] px-3 text-[14.5px] font-medium";
              if (!link.href) {
                return (
                  <div key={it.id} className={`${cls} text-white/65`} aria-disabled="true">
                    <Icon className="size-[19px] flex-none" strokeWidth={1.8} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{it.label}</span>
                    <span className="rounded-full bg-white/12 px-2 py-0.5 text-[11.5px] font-semibold text-white/80">presto</span>
                  </div>
                );
              }
              return (
                <Link
                  key={it.id}
                  to={link.href as never}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`${cls} ex-rail-link scd-focus transition-colors duration-150 ${active ? "" : "text-[var(--ex-on-navy)]/90 hover:bg-white/[0.06] hover:text-white"}`}
                >
                  <Icon className="size-[19px] flex-none" strokeWidth={1.8} aria-hidden="true" />
                  <span className="min-w-0 truncate">{it.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="mt-auto border-t border-[rgb(201_162_39/0.3)] px-2.5 pt-3 text-[13px] text-[var(--ex-on-navy-soft)]">
        <b className="block text-[14.5px] font-semibold text-[var(--ex-on-navy)]">{roleLabel}</b>
        Vedi le aree del tuo ruolo
      </div>
    </>
  );
}

/** Copies the area's direct link; tells the user it worked (or what to copy by hand). */
function PathChip({ path }: { path: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const t = window.setTimeout(() => setState("idle"), 2200);
    return () => window.clearTimeout(t);
  }, [state]);
  const copy = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("manual");
    }
  };
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        aria-label={`Copia il link diretto ${path}`}
        className="scd-focus inline-flex h-11 flex-none items-center gap-2 rounded-full border border-[var(--ex-hair)] bg-white/70 px-3 text-[13px] font-medium text-[var(--in-sub)] transition-[transform,color] duration-150 hover:text-[var(--in-ink)] active:scale-[0.97]"
      >
        {state === "copied" ? <Check className="size-4" strokeWidth={2} aria-hidden="true" /> : <Link2 className="size-4" strokeWidth={1.8} aria-hidden="true" />}
        {path}
      </button>
      <span role="status" aria-live="polite" className="text-[13px] font-medium text-[var(--in-sub)]">
        {state === "copied" ? "Link copiato" : state === "manual" ? `Copia a mano: ${path}` : ""}
      </span>
    </span>
  );
}

/** Search across the club's areas (registry), with keyboard support. */
function AreaSearch() {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const listId = useId();
  const navigate = useNavigate();
  const hits = useMemo(() => searchAreas(q), [q]);
  const open = focused && q.trim().length >= 2;
  const firstLive = hits.find((h) => h.href);
  return (
    <form
      role="search"
      className="relative w-full lg:w-[300px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (firstLive?.href) void navigate({ to: firstLive.href as never });
      }}
    >
      <label className="flex h-11 items-center gap-2 rounded-[8px] border border-[var(--ex-hair-strong)] bg-white px-3 text-[var(--in-sub)] focus-within:border-[var(--ex-ink)] focus-within:shadow-[0_0_0_4px_rgb(201_162_39/0.35)]">
        <Search className="size-[18px] flex-none" strokeWidth={1.8} aria-hidden="true" />
        <span className="sr-only">Cerca in tutta la SCD</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder="Cerca in tutta la SCD"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[var(--in-ink)] outline-none"
        />
      </label>
      {open && (
        <ul id={listId} role="listbox" aria-label="Aree trovate" className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-[10px] border border-[var(--ex-hair)] bg-[var(--ex-cream)] py-1 shadow-[var(--ex-shadow-2)]">
          {hits.length === 0 && <li className="px-3 py-2.5 text-[14px] text-[var(--in-sub)]">Nessuna area con questo nome.</li>}
          {hits.map((h) => (
            <li key={h.id} role="option" aria-selected={h === firstLive}>
              {h.href ? (
                <Link to={h.href as never} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[15px] font-semibold hover:bg-[var(--in-info-bg)]">
                  {h.label}<span className="text-[13px] font-medium text-[var(--in-info)]">{h.href}</span>
                </Link>
              ) : (
                <span className="flex items-center justify-between gap-3 px-3 py-2.5 text-[15px] font-semibold text-[var(--in-sub)]">
                  {h.label}<span className="text-[13px] font-medium">in arrivo</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

/** Dark "Oggi" strip (LED dots). Zero and unknown are muted; unknown shows "—". */
export function HighlightStrip({ items }: { items: readonly StripItem[] }) {
  return (
    <section
      aria-label="Oggi"
      className="scd-led-strip ex-dark grid flex-none shadow-[inset_0_-1px_0_rgb(201_162_39/0.45)] grid-cols-2 text-white sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] lg:flex lg:min-h-[66px] lg:items-stretch"
    >
      {items.map((it) => {
        const v = stripValue(it.value);
        return (
          <div key={it.label} className="flex items-center gap-2 border-b border-r border-white/10 px-3 py-2 lg:gap-3 lg:border-b-0 lg:px-6 lg:py-2.5 lg:first:pl-8">
            <span className={`ex-num font-title text-[22px] font-extrabold leading-none lg:text-[32px] ${v.muted ? "text-[var(--in-strip-muted)]" : "text-[var(--in-action)]"}`}>
              {v.text}
              {!v.known && <span className="sr-only"> (dato non disponibile)</span>}
            </span>
            <span className="max-w-[22ch] text-[12.5px] leading-tight text-[var(--ex-on-navy-soft)] lg:text-[13.5px]">{it.label}</span>
          </div>
        );
      })}
    </section>
  );
}

/**
 * Interior work-area shell (boards Quadro-settimanale, Gestionale, Pulmini…):
 * blue rail filtered by the role set, white header with title, copy-link path chip,
 * date and search, optional dark "Oggi" strip, ground #F2F7FC body.
 * Phone: the rail becomes a drawer behind a compact blue bar; same product, same data.
 */
export function InteriorShell({ title, path, activeAreaId, roles, roleLabel, rail, highlights, today, badge, children }: InteriorShellProps) {
  const groups = useMemo(() => (rail ? [...rail] : railFor(roles)), [rail, roles]);
  const [drawer, setDrawer] = useState(false);
  const [day, setDay] = useState(() => formatClubDay(today ?? new Date()));
  useEffect(() => { if (!today) setDay(formatClubDay(new Date())); }, [today]);
  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!drawer) return;
    drawerRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <div className="scd-interior scd-excelsior flex min-h-dvh bg-[var(--in-ground)]" data-shell="interior">
      <aside className="ex-rail ex-dark sticky top-0 hidden h-dvh w-[240px] flex-none flex-col px-3 py-4 text-white lg:flex" aria-label="Menu delle aree">
        <Rail groups={groups} activeAreaId={activeAreaId} roleLabel={roleLabel} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Chiudi menu aree" className="absolute inset-0 bg-[#021433]/55" onClick={() => setDrawer(false)} />
          <div ref={drawerRef} className="ex-rail ex-dark scd-access-panel absolute inset-y-0 left-0 flex w-[min(300px,86vw)] flex-col px-3 py-4 text-white shadow-[16px_0_40px_rgb(2_20_51/0.35)]">
            <button type="button" onClick={() => setDrawer(false)} aria-label="Chiudi menu aree" className="scd-focus absolute right-2 top-2 flex size-11 items-center justify-center rounded-lg">
              <X className="size-5" aria-hidden="true" />
            </button>
            <Rail groups={groups} activeAreaId={activeAreaId} roleLabel={roleLabel} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="ex-rail ex-dark flex h-14 items-center gap-3 px-3 text-white lg:hidden">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Apri menu aree" aria-expanded={drawer} className="scd-focus flex size-11 items-center justify-center rounded-lg">
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <Crest size={34} />
          <b className="ex-title text-[18px] text-[var(--ex-on-navy)]">SCD Dentro</b>
        </div>

        {/* Phones: title only (UD-057); path chip, date and search are desktop furniture. */}
        <header className="ex-header flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-8 lg:min-h-[72px] lg:flex-nowrap lg:py-0">
          {badge ? (
            <span className="flex min-w-0 items-center gap-2.5 lg:gap-3.5" data-testid="area-badge">
              <InternalBadgeImage badge={badge} size={52} className="size-10 lg:size-[52px]" />
              <h1 className="ex-title ex-header-title m-0 min-w-0 text-[22px] lg:text-[30px]">{title}</h1>
            </span>
          ) : (
            <h1 className="ex-title ex-header-title m-0 text-[22px] lg:text-[30px]">{title}</h1>
          )}
          <span className="hidden lg:contents">
            <PathChip path={path} />
            <span className="whitespace-nowrap text-[14px] text-[var(--in-sub)] lg:ml-auto" suppressHydrationWarning>{day}</span>
            <AreaSearch />
          </span>
        </header>

        {highlights && highlights.length > 0 && <HighlightStrip items={highlights} />}

        <main className="flex-1 px-4 py-4 sm:px-8 lg:py-6">{children}</main>
      </div>
    </div>
  );
}

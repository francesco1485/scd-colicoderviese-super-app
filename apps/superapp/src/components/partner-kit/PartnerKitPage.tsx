import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, FileImage, ImagePlus, Loader2, Play, Printer, Trash2, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";

import { LedwallRotator } from "@/components/LedwallRotator";
import { Card, Chip, SourceLine } from "@/components/scd/interior-ui";
import { EmptyState, WorkAreaShell } from "@/components/scd/work-area-ui";
import type { PartnerKitData } from "@/lib/partner-kit.functions";
import {
  CALENDAR_FORMATS,
  KIT_BASES,
  KIT_CREST,
  LIVE_FRAME,
  LIVE_SCORE_SAFE,
  PROPOSAL_LABEL,
  SKY_BASE,
  crestPx,
  exportPlan,
  kitSubjectLabel,
  localSubject,
  logoPlacement,
  offerItems,
  percentStyle,
  spotFor,
  sponsorLogo,
  subjectLogoLowRes,
  toPercent,
  withLocalLogo,
  zonePx,
  type CalendarFormat,
  type ExportItem,
  type KitBase,
  type PartnerKitSubject,
} from "@/lib/partner-kit";
import {
  PITCH_STILL_HD,
  TEXTURE_LAKE,
  canvasToPng,
  downloadBlob,
  drawCalendar,
  drawLive,
  ensureFonts,
  forgetImage,
  loadImage,
  renderExport,
  sleep,
} from "@/lib/partner-kit-render";
import { SPONSORS, type Sponsor } from "@/lib/sponsors";

/**
 * Kit partner (UD-109): one internal page per partner in the sponsor area (/crm/partner/<id>) and the same page for
 * a prospect whose logo is picked on this device (/crm/partner/nuovo). Six blocks: dedicated LED wall, Sky
 * "Proposta", the four kits with the official crest in front, the week's calendar card, the live-stream bar and
 * "Prepara offerta" (PNG export made in the browser + printable summary). Nothing is uploaded, stored or mailed.
 */

const MAX_LOGO_BYTES = 8 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

type Props =
  | { mode: "partner"; subject: PartnerKitSubject | null; requestedId: string; data: PartnerKitData }
  | { mode: "new"; data: PartnerKitData };

const SECTIONS = [
  { id: "pk-ledwall", label: "Ledwall" },
  { id: "pk-sky", label: "Sky" },
  { id: "pk-divise", label: "Divise" },
  { id: "pk-calendario", label: "Calendario" },
  { id: "pk-diretta", label: "Diretta" },
  { id: "pk-offerta", label: "Prepara offerta" },
] as const;

const SOURCE_CHIP: Record<PartnerKitSubject["source"], string> = {
  sponsors: "Sponsor 2026/27",
  crm: "CRM · registro contratti",
  local: "Nuovo partner · solo su questo dispositivo",
};

/** Aspect ratio (w/h) of a logo once loaded in the browser; 0 while loading or when it fails. */
function useLogoAspect(src: string | null): { aspect: number; failed: boolean } {
  const [state, setState] = useState<{ src: string | null; aspect: number; failed: boolean }>({ src: null, aspect: 0, failed: false });
  useEffect(() => {
    if (!src) return;
    let alive = true;
    loadImage(src)
      .then((img) => alive && setState({ src, aspect: img.naturalWidth / img.naturalHeight || 0, failed: false }))
      .catch(() => alive && setState({ src, aspect: 0, failed: true }));
    return () => {
      alive = false;
    };
  }, [src]);
  return state.src === src && src ? { aspect: state.aspect, failed: state.failed } : { aspect: 0, failed: false };
}

/** Device-only logo: object URL from a picked file, revoked when replaced or when the page closes. */
function useLocalLogo() {
  const [url, setUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const urlRef = useRef<string | null>(null);
  const clear = useCallback(() => {
    if (urlRef.current) {
      forgetImage(urlRef.current);
      URL.revokeObjectURL(urlRef.current);
    }
    urlRef.current = null;
    setUrl(null);
    setFileName("");
  }, []);
  useEffect(() => clear, [clear]);
  const pick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (!LOGO_TYPES.includes(file.type)) {
        setError("Formato non valido: usa PNG, JPG, WebP o SVG.");
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        setError("File troppo grande (massimo 8 MB).");
        return;
      }
      setError("");
      clear();
      const next = URL.createObjectURL(file);
      urlRef.current = next;
      setUrl(next);
      setFileName(file.name);
    },
    [clear],
  );
  return { url, fileName, error, pick, clear };
}

export function PartnerKitPage(props: Props) {
  const { data } = props;
  const local = useLocalLogo();
  const [prospectName, setProspectName] = useState("");

  const subject: PartnerKitSubject | null = useMemo(() => {
    if (props.mode === "new") return localSubject(prospectName, local.url);
    return props.subject ? withLocalLogo(props.subject, local.url) : null;
  }, [props, prospectName, local.url]);

  const path = props.mode === "new" ? "/crm/partner/nuovo" : `/crm/partner/${props.requestedId}`;
  const title = props.mode === "new" ? "Kit nuovo partner" : "Kit partner";

  return (
    <WorkAreaShell
      id="crm"
      title={title}
      path={path}
      preview={data.gate.preview}
      note={<>Immagini di proposta generate nel browser: nulla viene caricato, salvato o inviato.</>}
    >
      <div className="flex flex-col gap-4 lg:gap-[18px]" data-testid="partner-kit">
        <Link
          to="/crm"
          className="scd-focus inline-flex min-h-10 w-fit items-center gap-1.5 rounded-[9px] px-1 text-[14.5px] font-semibold text-[var(--in-info)] hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Torna al CRM
        </Link>
        {props.mode === "partner" && !props.subject ? (
          <Card>
            <div className="p-4 sm:p-[18px]">
              <EmptyState
                title="Partner non trovato"
                action={
                  <Link to="/crm/partner/nuovo" className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--in-action)] px-4 text-[15px] font-semibold text-[var(--in-ink)]">
                    <ImagePlus className="size-4" aria-hidden="true" /> Kit nuovo partner
                  </Link>
                }
              >
                Nessun partner con questo codice tra gli sponsor 2026/27 e il registro contratti del CRM. Per un'azienda nuova usa “Kit nuovo partner”.
              </EmptyState>
            </div>
          </Card>
        ) : (
          subject && (
            <KitBody
              subject={subject}
              data={data}
              mode={props.mode}
              local={local}
              prospectName={prospectName}
              onProspectName={setProspectName}
            />
          )
        )}
      </div>
    </WorkAreaShell>
  );
}

function KitBody({
  subject,
  data,
  mode,
  local,
  prospectName,
  onProspectName,
}: {
  subject: PartnerKitSubject;
  data: PartnerKitData;
  mode: "partner" | "new";
  local: ReturnType<typeof useLocalLogo>;
  prospectName: string;
  onProspectName: (v: string) => void;
}) {
  const label = kitSubjectLabel(subject);
  const { aspect, failed } = useLogoAspect(subject.logoSrc);
  const hasLogo = !!subject.logoSrc && !failed;
  const lowRes = !local.url && subjectLogoLowRes(subject);
  const spot = local.url ? null : spotFor(subject.sponsorSlug);

  return (
    <>
      <SubjectHeader subject={subject} label={label} mode={mode} local={local} prospectName={prospectName} onProspectName={onProspectName} lowRes={lowRes} logoFailed={failed} />
      <nav aria-label="Sezioni del kit" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="scd-focus inline-flex h-10 shrink-0 items-center rounded-full border border-[var(--in-line)] bg-white px-3.5 text-[14px] font-semibold text-[var(--in-ink)] hover:bg-[#f4f8fd]">
            {s.label}
          </a>
        ))}
      </nav>
      <LedwallBlock subject={subject} hasLogo={hasLogo} spot={spot} label={label} data={data} />
      <SkyBlock subject={subject} aspect={aspect} hasLogo={hasLogo} label={label} />
      <KitsBlock subject={subject} aspect={aspect} hasLogo={hasLogo} label={label} />
      <CalendarBlock subject={subject} hasLogo={hasLogo} label={label} data={data} />
      <LiveBlock subject={subject} hasLogo={hasLogo} label={label} />
      <OfferBlock subject={subject} hasLogo={hasLogo} label={label} data={data} spot={spot} />
    </>
  );
}

/* ------------------------------------------------------------------ header */

function SubjectHeader({
  subject,
  label,
  mode,
  local,
  prospectName,
  onProspectName,
  lowRes,
  logoFailed,
}: {
  subject: PartnerKitSubject;
  label: string;
  mode: "partner" | "new";
  local: ReturnType<typeof useLocalLogo>;
  prospectName: string;
  onProspectName: (v: string) => void;
  lowRes: boolean;
  logoFailed: boolean;
}) {
  const fileId = useId();
  const nameId = useId();
  const errId = useId();
  return (
    <Card>
      <div className="grid gap-4 p-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:p-[18px] lg:grid-cols-[200px_minmax(0,1fr)_minmax(0,340px)]">
        <div className="grid h-[112px] place-items-center rounded-xl border border-[var(--in-line)] bg-white p-3 sm:h-[120px]" data-testid="pk-logo-tile">
          {subject.logoSrc && !logoFailed ? (
            <img src={subject.logoSrc} alt={label === "Partner" ? "Logo del partner" : `Logo ${label}`} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-center text-[13.5px] font-semibold leading-snug text-[var(--in-sub)]">{logoFailed ? "Logo non leggibile" : "Logo da caricare"}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="m-0 text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--in-sub)]">{mode === "new" ? "Kit nuovo partner" : "Kit partner"}</p>
          <h2 className="m-0 mt-0.5 break-words font-title text-[30px] font-bold uppercase leading-[1.05] tracking-[0.02em]" data-testid="pk-subject-name">
            {label}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone="info">{SOURCE_CHIP[subject.source]}</Chip>
            <Chip tone="warn">Proposta</Chip>
            {subject.source !== "local" && !subject.nameVerified && <Chip tone="mute">Nome da confermare con la Direzione</Chip>}
            {lowRes && (
              <Chip tone="warn">
                <TriangleAlert className="size-3.5" aria-hidden="true" /> Logo a bassa risoluzione: chiedere il file originale
              </Chip>
            )}
            {!subject.logoSrc && subject.source === "crm" && <Chip tone="mute">Logo ufficiale da raccogliere</Chip>}
          </div>
          <p className="m-0 mt-2 text-[14px] leading-snug text-[var(--in-sub)]">
            Stesse impostazioni grafiche di tutta l'app: stemma ufficiale, divise della tavola identità del club, nome S.C.D. ColicoDerviese.
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-2.5 sm:col-span-2 lg:col-span-1">
          {mode === "new" && (
            <label htmlFor={nameId} className="flex flex-col gap-1 text-[14px] font-semibold">
              Nome dell'azienda <span className="font-normal text-[var(--in-sub)]">(facoltativo, resta su questo dispositivo)</span>
              <input
                id={nameId}
                value={prospectName}
                onChange={(e) => onProspectName(e.target.value)}
                maxLength={80}
                autoComplete="off"
                className="scd-focus h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-normal text-[var(--in-ink)]"
                placeholder="Es. nome come sul logo"
                data-testid="pk-prospect-name"
              />
            </label>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={fileId}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] bg-[var(--in-action)] px-4 text-[15px] font-semibold text-[var(--in-ink)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--in-focus,#0860a8)]"
            >
              <ImagePlus className="size-4" aria-hidden="true" />
              {mode === "new" ? "Scegli il logo" : "Usa un altro logo"}
              <input
                id={fileId}
                type="file"
                accept={LOGO_TYPES.join(",")}
                onChange={local.pick}
                className="sr-only"
                aria-describedby={local.error ? errId : undefined}
                data-testid="pk-logo-input"
              />
            </label>
            {local.url && (
              <button
                type="button"
                onClick={local.clear}
                className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14.5px] font-semibold text-[var(--in-ink)]"
              >
                <Trash2 className="size-4" aria-hidden="true" /> Togli
              </button>
            )}
          </div>
          {local.fileName && <p className="m-0 truncate text-[13.5px] text-[var(--in-sub)]">In uso: {local.fileName}</p>}
          {local.error && (
            <p id={errId} role="alert" className="m-0 text-[14px] font-semibold text-[var(--in-crit)]">
              {local.error}
            </p>
          )}
          <p className="m-0 text-[13px] leading-snug text-[var(--in-sub)]">Il file resta su questo dispositivo: non viene caricato né salvato. Chiudendo la pagina sparisce.</p>
        </div>
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------- blocks */

function Block({ id, title, sub, aside, children }: { id: string; title: string; sub?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24">
      <Card id={id} title={title} sub={sub} aside={aside}>
        <div className="px-4 pb-4 sm:px-[18px] sm:pb-[18px]">{children}</div>
      </Card>
    </div>
  );
}

function NoLogo({ children }: { children?: ReactNode }) {
  return <EmptyState title="Serve il logo del partner">{children ?? "Carica il logo dal dispositivo (in alto) per vedere questa immagine."}</EmptyState>;
}

function asSponsor(subject: PartnerKitSubject): Sponsor {
  const registered = subject.sponsorSlug ? SPONSORS.find((s) => s.slug === subject.sponsorSlug) : undefined;
  const usesRegistered = !!registered && subject.logoSrc === sponsorLogo(registered).src;
  return {
    slug: usesRegistered ? registered!.slug : `${subject.id}-locale`,
    name: subject.name,
    nameVerified: subject.nameVerified,
    src: subject.logoSrc ?? "",
  };
}

function LedwallBlock({
  subject,
  hasLogo,
  spot,
  label,
  data,
}: {
  subject: PartnerKitSubject;
  hasLogo: boolean;
  spot: { src: string; poster: string } | null;
  label: string;
  data: PartnerKitData;
}) {
  const list = useMemo(() => [asSponsor(subject)], [subject]);
  const [play, setPlay] = useState(false);
  const reduce = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <Block id="pk-ledwall" title="Ledwall dedicato" sub="Il partner sul ledwall a bordo campo, alternato allo spazio del club, come lo vedrà il pubblico.">
      <div className={`grid gap-4 ${spot ? "lg:grid-cols-[minmax(0,1fr)_260px]" : ""}`}>
        {hasLogo ? (
          <LedwallRotator day={data.today} nowMs={data.nowMs} list={list} clubEvery={1} label="Anteprima ledwall · partner dedicato" />
        ) : (
          <NoLogo />
        )}
        {spot && (
          <div className="flex flex-col gap-2" data-testid="pk-spot">
            <div className="relative mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-xl bg-[#0b2a5b] lg:max-w-none">
              {play ? (
                <video src={spot.src} poster={spot.poster} controls muted playsInline autoPlay={!reduce} preload="metadata" className="absolute inset-0 size-full object-cover">
                  <track kind="captions" />
                </video>
              ) : (
                <button type="button" onClick={() => setPlay(true)} className="scd-focus group absolute inset-0 block" aria-label={`Guarda lo spot ledwall di ${label}`}>
                  <img src={spot.poster} alt="" width={270} height={480} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-[#061a3a]/25 transition-colors group-hover:bg-[#061a3a]/10">
                    <span className="grid size-14 place-items-center rounded-full bg-white/95 text-[#0b2a5b] shadow-lg">
                      <Play className="size-6" aria-hidden="true" />
                    </span>
                  </span>
                </button>
              )}
            </div>
            <a
              href={spot.src}
              download={`scd-spot-ledwall-${subject.id}-9x16.mp4`}
              className="scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14.5px] font-semibold text-[var(--in-info)]"
            >
              <Download className="size-4" aria-hidden="true" /> Scarica lo spot 9:16 (12 s)
            </a>
            <p className="m-0 text-[12.5px] leading-snug text-[var(--in-sub)]">720×1280, senza audio. Il master in alta risoluzione è nella cartella Ledwall sponsor del Drive.</p>
          </div>
        )}
      </div>
    </Block>
  );
}

function ProposalTag({ className = "" }: { className?: string }) {
  return (
    <span className={`pointer-events-none absolute left-2 top-2 z-[2] rounded-full bg-[#7a4b00]/90 px-2.5 py-1 text-[11.5px] font-bold uppercase leading-none tracking-[0.05em] text-white ring-1 ring-white/30 ${className}`}>
      Proposta
    </span>
  );
}

/** Base image with the partner logo in the sponsor zone (and, on kits, the official crest in front). */
export function KitFigure({ base, logoSrc, aspect, label, caption }: { base: KitBase; logoSrc: string | null; aspect: number; label: string; caption: string }) {
  const zone = zonePx(base.sponsor, base);
  const place = aspect > 0 ? logoPlacement(aspect, zone, base.plate) : null;
  const crest = crestPx(base);
  return (
    <figure className="m-0 min-w-0" data-testid={`pk-kit-${base.id}`}>
      <div className="relative w-full overflow-hidden rounded-xl bg-[#eef3f9]" style={{ aspectRatio: `${base.w} / ${base.h}` }}>
        <img src={base.src} alt="" aria-hidden="true" width={base.w} height={base.h} loading="lazy" decoding="async" className="absolute inset-0 block size-full" />
        {place?.plate && (
          <span aria-hidden="true" className="absolute rounded-[18%/30%] bg-white/95 shadow-[0_1px_4px_rgb(6_26_58/0.22)]" style={percentStyle(toPercent(place.plate, base))} data-testid="pk-plate" />
        )}
        {logoSrc && place && (
          <img src={logoSrc} alt={`Logo ${label} sulla divisa`} className="absolute block object-contain" style={percentStyle(toPercent(place.logo, base))} data-testid="pk-kit-logo" />
        )}
        {crest && (
          <img
            src={KIT_CREST.src}
            alt="Stemma ufficiale S.C.D. ColicoDerviese"
            width={KIT_CREST.w}
            height={KIT_CREST.h}
            className="absolute block drop-shadow-[0_1px_2px_rgb(6_26_58/0.35)]"
            style={percentStyle(toPercent(crest, base))}
            data-testid="pk-kit-crest"
          />
        )}
        <ProposalTag />
      </div>
      <figcaption className="mt-1.5 text-[14px] font-semibold">{caption}</figcaption>
    </figure>
  );
}

function SkyBlock({ subject, aspect, hasLogo, label }: { subject: PartnerKitSubject; aspect: number; hasLogo: boolean; label: string }) {
  return (
    <Block
      id="pk-sky"
      title="Sky con il logo del partner"
      sub="La mascotte in divisa da gara con il logo del partner al posto di quello attuale sul petto."
      aside={<Chip tone="warn">{PROPOSAL_LABEL}</Chip>}
    >
      {hasLogo ? (
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          <div className="mx-auto w-full max-w-[230px] sm:max-w-none">
            <KitFigure base={SKY_BASE} logoSrc={subject.logoSrc} aspect={aspect} label={label} caption="Sky · divisa da gara bianca" />
          </div>
          <div className="flex flex-col gap-2 text-[14.5px] leading-snug text-[var(--in-sub)]">
            <p className="m-0">
              Solo proposta interna: la divisa reale di Sky resta quella con il partner attuale finché la Direzione non approva il cambio. Stemma e altri marchi della divisa non sono toccati.
            </p>
            <p className="m-0 font-semibold text-[var(--in-ink)]">{PROPOSAL_LABEL}.</p>
          </div>
        </div>
      ) : (
        <NoLogo />
      )}
    </Block>
  );
}

function KitsBlock({ subject, aspect, hasLogo, label }: { subject: PartnerKitSubject; aspect: number; hasLogo: boolean; label: string }) {
  return (
    <Block
      id="pk-divise"
      title="Divise con stemma in primo piano"
      sub="Le quattro divise della tavola identità del club con il logo del partner sul petto e lo stemma ufficiale."
      aside={<Chip tone="warn">Proposta</Chip>}
    >
      {hasLogo ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {KIT_BASES.map((k) => (
            <KitFigure key={k.id} base={k} logoSrc={subject.logoSrc} aspect={aspect} label={label} caption={`Divisa ${k.label}`} />
          ))}
        </div>
      ) : (
        <NoLogo />
      )}
      <SourceLine>Divise: pannelli della tavola identità del club (mockup). Lo stemma è il file ufficiale, mai ridisegnato.</SourceLine>
    </Block>
  );
}

/* ------------------------------------------------------ canvas previews */

/** Draws a canvas preview client-side (same drawing as the PNG export); SSR shows an empty frame. */
function CanvasPreview({
  w,
  h,
  draw,
  deps,
  label,
  overlay,
  testId,
}: {
  w: number;
  h: number;
  draw: (ctx: CanvasRenderingContext2D) => Promise<void>;
  deps: readonly unknown[];
  label: string;
  overlay?: ReactNode;
  testId: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let alive = true;
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    setState("loading");
    ctx.clearRect(0, 0, w, h);
    draw(ctx)
      .then(() => alive && setState("ready"))
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-[#0b2a5b]" style={{ aspectRatio: `${w} / ${h}` }} data-testid={testId} data-state={state}>
      <canvas ref={ref} width={w} height={h} role="img" aria-label={label} className="absolute inset-0 block size-full" />
      {state === "loading" && (
        <span className="absolute inset-0 grid place-items-center text-white/80">
          <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span className="sr-only">Preparazione dell'immagine</span>
        </span>
      )}
      {state === "error" && <span className="absolute inset-0 grid place-items-center px-4 text-center text-[14px] font-semibold text-white">Immagine non disponibile in questo momento.</span>}
      {overlay}
    </div>
  );
}

function CalendarBlock({ subject, hasLogo, label, data }: { subject: PartnerKitSubject; hasLogo: boolean; label: string; data: PartnerKitData }) {
  const [format, setFormat] = useState<CalendarFormat>("4x5");
  const f = CALENDAR_FORMATS[format];
  const rows = data.calendar?.rows ?? [];
  const logoSrc = hasLogo ? subject.logoSrc : null;
  const draw = useCallback(
    async (ctx: CanvasRenderingContext2D) => {
      await ensureFonts();
      const [crest, logo, texture] = await Promise.all([
        loadImage(KIT_CREST.src).catch(() => null),
        logoSrc ? loadImage(logoSrc).catch(() => null) : Promise.resolve(null),
        loadImage(TEXTURE_LAKE).catch(() => null),
      ]);
      drawCalendar(ctx, format, { rows, today: data.today, partnerLabel: label }, { crest, logo, texture });
    },
    [format, rows, data.today, label, logoSrc],
  );
  return (
    <Block
      id="pk-calendario"
      title="Calendario con il partner"
      sub="Le gare della settimana di tutte le squadre, dal calendario ufficiale della home, con la barra “Calendario offerto da”."
      aside={
        <div role="group" aria-label="Formato" className="inline-flex gap-1 rounded-xl bg-[#e2edf8] p-1">
          {(Object.keys(CALENDAR_FORMATS) as CalendarFormat[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={format === k}
              onClick={() => setFormat(k)}
              className={`scd-focus h-9 whitespace-nowrap rounded-[9px] px-3 text-[14px] font-semibold ${format === k ? "bg-white shadow-[var(--in-card-shadow)]" : "text-[var(--in-sub)]"}`}
            >
              {CALENDAR_FORMATS[k].label}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[360px]">
          <CanvasPreview
            w={f.w}
            h={f.h}
            draw={draw}
            deps={[draw]}
            label={`Calendario della settimana, formato ${f.label}, offerto da ${label}`}
            testId="pk-calendar-canvas"
          />
        </div>
        <div className="flex flex-col gap-2 text-[14.5px] leading-snug text-[var(--in-sub)]">
          <p className="m-0">
            {rows.length === 0
              ? "Nessuna gara nei prossimi sette giorni: l'immagine lo dice in modo chiaro."
              : `${rows.length} ${rows.length === 1 ? "gara" : "gare"} nei prossimi sette giorni (casa e trasferta).`}
          </p>
          <p className="m-0">Solo dati già pubblici: data, ora, squadra, avversario, campo. Nessun nome di giocatore e nessun volto di minori.</p>
          <SourceLine>
            {data.calendar
              ? `Fonte: calendario ufficiale del club (${data.calendar.origin === "fallback" ? "copia di sicurezza inclusa" : "copia del master su Drive"}), aggiornato al ${italianStamp(data.calendar.sourceModifiedAt)}.`
              : "Calendario non raggiungibile in questo momento: l'immagine mostra la settimana senza gare."}
          </SourceLine>
        </div>
      </div>
    </Block>
  );
}

function italianStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "data non indicata";
  return new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

function LiveBlock({ subject, hasLogo, label }: { subject: PartnerKitSubject; hasLogo: boolean; label: string }) {
  const logoSrc = hasLogo ? subject.logoSrc : null;
  const draw = useCallback(
    async (ctx: CanvasRenderingContext2D) => {
      await ensureFonts();
      const [still, crest, logo] = await Promise.all([
        loadImage(PITCH_STILL_HD),
        loadImage(KIT_CREST.src).catch(() => null),
        logoSrc ? loadImage(logoSrc).catch(() => null) : Promise.resolve(null),
      ]);
      drawLive(ctx, { still, crest, logo }, label);
    },
    [label, logoSrc],
  );
  const safe = toPercent(LIVE_SCORE_SAFE, LIVE_FRAME);
  return (
    <Block id="pk-diretta" title="Diretta con il partner" sub="Barra del partner in basso nelle dirette delle gare; l'area del punteggio in alto a sinistra resta libera.">
      <CanvasPreview
        w={LIVE_FRAME.w}
        h={LIVE_FRAME.h}
        draw={draw}
        deps={[draw]}
        label={`Fotogramma della diretta con la barra del partner ${label}`}
        testId="pk-live-canvas"
        overlay={
          <span
            aria-hidden="true"
            className="pointer-events-none absolute grid place-items-center rounded-md border-2 border-dashed border-white/80 bg-black/15 text-center text-[clamp(9px,1.3vw,14px)] font-bold uppercase tracking-[0.05em] text-white"
            style={percentStyle(safe)}
            data-testid="pk-score-safe"
          >
            Area punteggio · libera
          </span>
        }
      />
      <p className="m-0 mt-2 text-[13px] text-[var(--in-sub)]">Il riquadro tratteggiato è solo una guida in anteprima: non compare nell'immagine scaricata.</p>
    </Block>
  );
}

/* ------------------------------------------------------------------ offer */

function OfferBlock({
  subject,
  hasLogo,
  label,
  data,
  spot,
}: {
  subject: PartnerKitSubject;
  hasLogo: boolean;
  label: string;
  data: PartnerKitData;
  spot: { src: string; poster: string } | null;
}) {
  const plan = useMemo(() => exportPlan(subject), [subject]);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const needsLogo = (k: ExportItem["key"]) => !hasLogo && k !== "calendar-4x5" && k !== "calendar-9x16" && k !== "live";
  const input = useMemo(
    () => ({ logoSrc: hasLogo ? subject.logoSrc : null, partnerLabel: label, calendar: { rows: data.calendar?.rows ?? [], today: data.today } }),
    [hasLogo, subject.logoSrc, label, data],
  );

  const one = useCallback(
    async (item: ExportItem) => {
      const canvas = await renderExport(item.key, input);
      downloadBlob(await canvasToPng(canvas), item.filename);
    },
    [input],
  );

  const downloadOne = async (item: ExportItem) => {
    setBusy(item.key);
    setStatus(`Preparo ${item.label}…`);
    try {
      await one(item);
      setStatus(`${item.label}: scaricata.`);
    } catch {
      setStatus(`${item.label}: non è stato possibile prepararla.`);
    } finally {
      setBusy(null);
    }
  };

  const downloadAll = async () => {
    const items = plan.filter((p) => !needsLogo(p.key));
    setBusy("all");
    let ok = 0;
    for (const [i, item] of items.entries()) {
      setStatus(`Preparo ${i + 1} di ${items.length}: ${item.label}…`);
      try {
        await one(item);
        ok++;
      } catch {
        /* keep going: the summary says how many */
      }
      await sleep(450);
    }
    setStatus(`${ok} di ${items.length} immagini scaricate.`);
    setBusy(null);
  };

  const print = () => {
    document.body.classList.add("pk-printing");
    const done = () => {
      document.body.classList.remove("pk-printing");
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.print();
    window.setTimeout(done, 1_000);
  };

  const items = offerItems({ sponsorSlug: spot ? subject.sponsorSlug : null });

  return (
    <Block id="pk-offerta" title="Prepara offerta" sub="Tutte le immagini in PNG, pronte da allegare all'offerta (nuova o di rinnovo). Si scaricano su questo dispositivo: nessuna mail viene inviata.">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadAll}
              disabled={busy !== null}
              className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--in-action)] px-4 text-[15px] font-semibold text-[var(--in-ink)] disabled:cursor-wait disabled:opacity-70"
              data-testid="pk-download-all"
            >
              {busy === "all" ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
              Scarica tutto
            </button>
            <button
              type="button"
              onClick={print}
              className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold text-[var(--in-ink)]"
            >
              <Printer className="size-4" aria-hidden="true" /> Stampa il riepilogo
            </button>
          </div>
          <p className="m-0 mb-2 min-h-[1.4em] text-[14px] font-semibold text-[var(--in-info)]" aria-live="polite" data-testid="pk-export-status">
            {status}
          </p>
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
            {plan.map((item) => {
              const blocked = needsLogo(item.key);
              return (
                <li key={item.key} className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--in-line)] bg-white px-3 py-2.5">
                  <FileImage className="size-5 flex-none text-[var(--in-info)]" strokeWidth={1.8} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <b className="block text-[14.5px] leading-tight">{item.label}</b>
                    <span className="block text-[12.5px] tabular-nums text-[var(--in-sub)]">
                      PNG {item.w}×{item.h}
                      {blocked ? " · serve il logo" : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadOne(item)}
                    disabled={busy !== null || blocked}
                    aria-label={`Scarica ${item.label}`}
                    className="scd-focus grid size-11 flex-none place-items-center rounded-[10px] border border-[var(--in-line)] bg-[#f7fbff] text-[var(--in-info)] disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid={`pk-download-${item.key}`}
                  >
                    {busy === item.key ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <section className="pk-print rounded-xl border border-[var(--in-line)] bg-white p-4" aria-labelledby="pk-print-title" data-testid="pk-summary">
          <div className="flex items-center gap-3">
            <img src={KIT_CREST.src} alt="" aria-hidden="true" width={48} height={63} className="h-[52px] w-auto" />
            <div className="min-w-0">
              <p className="m-0 text-[12.5px] font-bold uppercase tracking-[0.06em] text-[var(--in-sub)]">S.C.D. ColicoDerviese · stagione 2026/27</p>
              <h3 id="pk-print-title" className="m-0 font-title text-[22px] font-bold uppercase leading-tight">
                Proposta partner · {label}
              </h3>
            </div>
          </div>
          <p className="m-0 mt-3 text-[14px] font-semibold">Cosa riceve il partner</p>
          <ul className="m-0 mt-1.5 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-snug">
            {items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="m-0 mt-3 text-[13px] leading-snug text-[var(--in-sub)]">
            Immagini allegate: {plan.length} PNG ({plan.map((p) => p.label.replace(" (proposta)", "")).join("; ")}). Valori economici sulla proposta personalizzata della Direzione.
          </p>
          <p className="m-0 mt-2 text-[13px] font-semibold leading-snug text-[#7a4b00]">Divise e Sky sono proposte: non pubblicare senza approvazione della Direzione.</p>
          <p className="m-0 mt-2 text-[12.5px] text-[var(--in-sub)]">Preparato il {italianDay(data.today)}.</p>
        </section>
      </div>
    </Block>
  );
}

function italianDay(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T12:00:00Z`));
}

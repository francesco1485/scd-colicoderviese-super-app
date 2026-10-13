/**
 * Client-side drawing of the partner kit images (UD-109) for the preview canvases and the PNG export.
 * Same geometry as the page (partner-kit.ts). Every function touches the DOM only when called, never at module level,
 * so the module is SSR safe. Images are same-origin /media files or device blob: URLs, so the canvas is never tainted
 * and toBlob() works. Nothing is uploaded: the PNG is handed to the browser as a download.
 */
import { LEDWALL_BOARD_PX, LEDWALL_STILL } from "./ledwall-rotation";
import {
  CALENDAR_FORMATS,
  KIT_BASES,
  KIT_CREST,
  KIT_EXPORT_SCALE,
  LIVE_BAR,
  LIVE_FRAME,
  LIVE_PARTNER_PLATE,
  SKY_BASE,
  crestPx,
  dayChipLabel,
  fitContain,
  logoPlacement,
  rowsForFormat,
  weekRangeLabel,
  zonePx,
  type CalendarFormat,
  type CalendarRow,
  type ExportKey,
  type KitBase,
  type Rect,
} from "./partner-kit";

const NAVY = "#0b2a5b";
const NAVY_DEEP = "#061a3a";
const BLUE = "#1556c4";
const SKY_BLUE = "#9cc3ea";
const YELLOW = "#ffd600";
const WHITE = "#ffffff";
const TITLE = "'Big Shoulders Display', 'Anton', Impact, sans-serif";
const TEXT = "'Fira Sans', system-ui, sans-serif";
const COND = "'Fira Sans Condensed', 'Fira Sans', system-ui, sans-serif";

export const PITCH_STILL_HD = "/media/sponsor/ledwall-board-empty-1920.webp";
export const TEXTURE_LAKE = "/media/brand/tex/mountains-lake.png";

const cache = new Map<string, Promise<HTMLImageElement>>();

/** Loads an image once (same-origin or blob:), decoded and ready for drawImage. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit) return hit;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("blob:")) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image not available: ${src.startsWith("blob:") ? "logo locale" : src}`));
    img.src = src;
  });
  // A failed load must be retryable (e.g. offline for a moment).
  p.catch(() => cache.delete(src));
  cache.set(src, p);
  return p;
}

/** Forget a device logo when its object URL is revoked. */
export const forgetImage = (src: string) => cache.delete(src);

/** The web fonts the canvases use (loaded by the app CSS; canvas needs them ready before fillText). */
export async function ensureFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  await Promise.all(
    [`700 40px ${TITLE}`, `700 24px ${TEXT}`, `800 24px ${TEXT}`, `600 24px ${TEXT}`, `400 24px ${TEXT}`, `700 24px ${COND}`].map((f) =>
      document.fonts.load(f).catch(() => []),
    ),
  );
}

const aspectOf = (img: HTMLImageElement | null) => (img && img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 0);

function roundRect(ctx: CanvasRenderingContext2D, r: Rect, radius: number) {
  const rad = Math.min(radius, r.w / 2, r.h / 2);
  ctx.beginPath();
  ctx.moveTo(r.x + rad, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rad);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rad);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rad);
  ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rad);
  ctx.closePath();
}

const scaleRect = (r: Rect, k: number): Rect => ({ x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k });

/** Text fitted to a width by reducing the size (never below `min`), then ellipsis. */
function fitText(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, size: number, maxW: number, min = 10): { text: string; size: number } {
  let s = size;
  ctx.font = font(s);
  while (ctx.measureText(text).width > maxW && s > min) {
    s -= 1;
    ctx.font = font(s);
  }
  if (ctx.measureText(text).width <= maxW) return { text, size: s };
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return { text: `${t.trimEnd()}…`, size: s };
}

/** Partner logo contained in a box; without a logo the neutral label is written instead. */
function drawLogoOrLabel(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, box: Rect, label: string, color = NAVY) {
  const a = aspectOf(logo);
  if (logo && a > 0) {
    const r = fitContain(a, box);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(logo, r.x, r.y, r.w, r.h);
    return;
  }
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const f = fitText(ctx, label.toUpperCase(), (px) => `700 ${px}px ${TITLE}`, Math.round(box.h * 0.6), box.w);
  ctx.font = `700 ${f.size}px ${TITLE}`;
  ctx.fillText(f.text, box.x + box.w / 2, box.y + box.h / 2);
}

/* ------------------------------------------------------------- kits and Sky */

/** A kit (or Sky) with the partner logo in the sponsor zone and, on kits, the official crest in front. */
export function drawKit(
  ctx: CanvasRenderingContext2D,
  base: KitBase,
  imgs: { base: HTMLImageElement; logo: HTMLImageElement | null; crest: HTMLImageElement | null },
  scale = KIT_EXPORT_SCALE,
) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imgs.base, 0, 0, base.w * scale, base.h * scale);
  const a = aspectOf(imgs.logo);
  if (imgs.logo && a > 0) {
    const place = logoPlacement(a, zonePx(base.sponsor, base), base.plate);
    if (place.plate) {
      const p = scaleRect(place.plate, scale);
      ctx.save();
      ctx.shadowColor = "rgba(6, 26, 58, 0.22)";
      ctx.shadowBlur = 6 * scale;
      ctx.shadowOffsetY = 1.5 * scale;
      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      roundRect(ctx, p, p.h * 0.18);
      ctx.fill();
      ctx.restore();
    }
    const l = scaleRect(place.logo, scale);
    ctx.drawImage(imgs.logo, l.x, l.y, l.w, l.h);
  }
  const c = crestPx(base);
  if (c && imgs.crest) {
    const r = scaleRect(c, scale);
    ctx.save();
    ctx.shadowColor = "rgba(6, 26, 58, 0.35)";
    ctx.shadowBlur = 5 * scale;
    ctx.shadowOffsetY = 1.5 * scale;
    ctx.drawImage(imgs.crest, r.x, r.y, r.w, r.h);
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ ledwall */

/** The pitch still with the partner on the LED board (same board rectangle as the in-app LED wall). */
export function drawLedwall(ctx: CanvasRenderingContext2D, imgs: { still: HTMLImageElement; logo: HTMLImageElement | null }, label: string) {
  const { width: w, height: h } = LEDWALL_STILL;
  ctx.drawImage(imgs.still, 0, 0, w, h);
  const b = LEDWALL_BOARD_PX;
  const board: Rect = { x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 };
  ctx.save();
  ctx.shadowColor = "rgba(255, 255, 255, 0.45)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(board.x, board.y, board.w, board.h);
  ctx.restore();
  drawLogoOrLabel(ctx, imgs.logo, { x: board.x + board.w * 0.14, y: board.y + board.h * 0.11, w: board.w * 0.72, h: board.h * 0.78 }, label);
  // LED pixel grid.
  ctx.fillStyle = "rgba(11, 42, 91, 0.035)";
  for (let y = board.y; y < board.y + board.h; y += 3) ctx.fillRect(board.x, y, board.w, 1);
  for (let x = board.x; x < board.x + board.w; x += 3) ctx.fillRect(x, board.y, 1, board.h);
}

/* ----------------------------------------------------------------- calendar */

const it = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", ...o }).format(new Date(`${iso}T12:00:00Z`));

/** Short venue for the card ("Colico · Campo 1" or the town of an away ground). */
export function cardVenue(v: string): string {
  const t = v.trim();
  const m = t.match(/^([^-–,]+?)\s*[-–]\s*(.+)$/);
  if (!m) return t;
  const place = m[1]!.trim();
  const rest = m[2]!.replace(/,.*$/, "").trim();
  return /^colico$/i.test(place) ? `${place} · ${rest}` : place;
}

/** Title-case of all-caps words ("BELLANO" -> "Bellano"), sigle (A.S.D., U.S.) unchanged. */
export function softCaps(t: string): string {
  return t.replace(/\b[A-ZÀ-Ý]{3,}\b/g, (w) => (/^(ASD|SSD|SCD|USD|ASDC|FC|AC|CONI|FIGC|LND|CSI|GS|US)$/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()));
}

/** Weekly calendar card (1080x1350 or 1080x1920) with the "Calendario offerto da" partner bar. */
export function drawCalendar(
  ctx: CanvasRenderingContext2D,
  format: CalendarFormat,
  data: { rows: readonly CalendarRow[]; today: string; partnerLabel: string },
  imgs: { crest: HTMLImageElement | null; logo: HTMLImageElement | null; texture: HTMLImageElement | null },
) {
  const { w, h } = CALENDAR_FORMATS[format];
  const tall = format === "9x16";
  // Background: navy with a light blue glow and the lake/mountain line art at the bottom.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, NAVY);
  g.addColorStop(1, NAVY_DEEP);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.85, 0, 0, w * 0.85, 0, w * 0.9);
  glow.addColorStop(0, "rgba(27, 120, 225, 0.45)");
  glow.addColorStop(1, "rgba(27, 120, 225, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const barH = tall ? 210 : 190;
  if (imgs.texture) {
    const tw = w * 1.05;
    const th = tw * (imgs.texture.naturalHeight / imgs.texture.naturalWidth);
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.drawImage(imgs.texture, (w - tw) / 2, h - barH - th * 0.92, tw, th);
    ctx.restore();
  }

  // Header: official crest, club name, title, week.
  const pad = 72;
  let y = tall ? 120 : 72;
  const crestH = tall ? 170 : 150;
  if (imgs.crest) {
    const cw = crestH * (KIT_CREST.w / KIT_CREST.h);
    ctx.drawImage(imgs.crest, pad, y, cw, crestH);
  }
  const tx = pad + crestH * (KIT_CREST.w / KIT_CREST.h) + 30;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = WHITE;
  ctx.font = `700 34px ${TEXT}`;
  ctx.fillText("S.C.D. ColicoDerviese", tx, y + 46);
  ctx.fillStyle = YELLOW;
  ctx.font = `700 ${tall ? 96 : 86}px ${TITLE}`;
  ctx.fillText("SI GIOCA", tx, y + (tall ? 128 : 118));
  ctx.fillStyle = WHITE;
  ctx.font = `600 30px ${TEXT}`;
  ctx.fillText(weekRangeLabel(data.today), tx, y + (tall ? 172 : 156));
  y += crestH + (tall ? 70 : 48);

  // Rows.
  const { shown, more } = rowsForFormat(data.rows, format);
  const listBottom = h - barH - (tall ? 70 : 40);
  if (shown.length === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = `600 40px ${TEXT}`;
    ctx.textAlign = "center";
    ctx.fillText("Nessuna gara nei prossimi sette giorni:", w / 2, y + 140);
    ctx.fillText("è settimana di allenamenti.", w / 2, y + 196);
  } else {
    const slots = shown.length + (more > 0 ? 1 : 0);
    const gap = 14;
    const rowH = Math.min(tall ? 118 : 110, (listBottom - y - gap * (slots - 1)) / slots);
    let lastDate = "";
    for (const row of shown) {
      const r: Rect = { x: pad - 16, y, w: w - 2 * (pad - 16), h: rowH };
      ctx.fillStyle = "rgba(255,255,255,0.97)";
      roundRect(ctx, r, 18);
      ctx.fill();
      // Side bar: home blue, away light blue.
      ctx.fillStyle = row.homeAway === "CASA" ? BLUE : row.homeAway === "FUORI" ? SKY_BLUE : "#dbe5f1";
      roundRect(ctx, { x: r.x + 10, y: r.y + 12, w: 7, h: r.h - 24 }, 4);
      ctx.fill();
      // Day + time column.
      const cx = r.x + 36;
      ctx.textAlign = "left";
      ctx.fillStyle = row.date === lastDate ? "#8a9bb5" : NAVY;
      ctx.font = `700 ${Math.round(rowH * 0.2)}px ${COND}`;
      ctx.fillText(dayChipLabel(row.date), cx, r.y + rowH * 0.38);
      ctx.fillStyle = NAVY;
      ctx.font = `700 ${Math.round(rowH * 0.42)}px ${TITLE}`;
      ctx.fillText(row.time || "—", cx, r.y + rowH * 0.82);
      lastDate = row.date;
      // Match.
      const mx = r.x + 230;
      const right = r.x + r.w - 24;
      const badgeW = 118;
      const textW = right - badgeW - 18 - mx;
      const ours = `ColicoDerviese ${row.team}`;
      const theirs = softCaps(row.opponent);
      const line = row.homeAway === "FUORI" ? `${theirs} – ${ours}` : `${ours} – ${theirs}`;
      ctx.fillStyle = "#0b1e3a";
      const f = fitText(ctx, line.toUpperCase(), (px) => `700 ${px}px ${TITLE}`, Math.round(rowH * 0.34), textW, 18);
      ctx.font = `700 ${f.size}px ${TITLE}`;
      ctx.fillText(f.text, mx, r.y + rowH * 0.47);
      ctx.fillStyle = "#4a5d7a";
      const venue = softCaps(cardVenue(row.venue)) || "Campo da definire";
      const vf = fitText(ctx, `${venue}${row.confirmed ? "" : " · orario da confermare"}`, (px) => `500 ${px}px ${TEXT}`, Math.round(rowH * 0.21), textW, 14);
      ctx.font = `500 ${vf.size}px ${TEXT}`;
      ctx.fillText(vf.text, mx, r.y + rowH * 0.8);
      // Home/away badge.
      const bx = right - badgeW;
      const by = r.y + (rowH - 44) / 2;
      ctx.fillStyle = row.homeAway === "CASA" ? BLUE : row.homeAway === "FUORI" ? "#e7effa" : "#eef3f9";
      roundRect(ctx, { x: bx, y: by, w: badgeW, h: 44 }, 22);
      ctx.fill();
      ctx.fillStyle = row.homeAway === "CASA" ? WHITE : NAVY;
      ctx.textAlign = "center";
      ctx.font = `700 24px ${COND}`;
      ctx.fillText(row.homeAway === "CASA" ? "CASA" : row.homeAway === "FUORI" ? "FUORI" : "—", bx + badgeW / 2, by + 31);
      ctx.textAlign = "left";
      y += rowH + gap;
    }
    if (more > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = `600 30px ${TEXT}`;
      ctx.fillText(`+ ${more} ${more === 1 ? "altra gara" : "altre gare"} sul calendario del club`, pad, y + 40);
    }
  }

  // Partner bar.
  const bar: Rect = { x: 0, y: h - barH, w, h: barH };
  ctx.fillStyle = WHITE;
  ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, bar.y, w, 10);
  ctx.fillStyle = NAVY;
  ctx.textAlign = "left";
  ctx.font = `700 30px ${COND}`;
  ctx.fillText("CALENDARIO OFFERTO DA", pad, bar.y + barH / 2 + 10);
  const logoBox: Rect = { x: 520, y: bar.y + 34, w: w - 520 - pad, h: barH - 58 };
  drawLogoOrLabel(ctx, imgs.logo, logoBox, data.partnerLabel);
}

/* --------------------------------------------------------------- live frame */

/** 1920x1080 live frame: pitch still, partner on the LED board, bottom bar with the partner; score bug area free. */
export function drawLive(
  ctx: CanvasRenderingContext2D,
  imgs: { still: HTMLImageElement; logo: HTMLImageElement | null; crest: HTMLImageElement | null },
  partnerLabel: string,
) {
  drawLedwall(ctx, { still: imgs.still, logo: imgs.logo }, partnerLabel);
  const { w } = LIVE_FRAME;
  const bar = LIVE_BAR;
  const g = ctx.createLinearGradient(0, bar.y, 0, bar.y + bar.h);
  g.addColorStop(0, "rgba(11, 42, 91, 0.96)");
  g.addColorStop(1, "rgba(6, 26, 58, 0.98)");
  ctx.fillStyle = g;
  ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, bar.y, w, 6);
  // Left: LIVE pill, crest, club.
  const midY = bar.y + 6 + (bar.h - 6) / 2;
  ctx.fillStyle = "#e5243b";
  roundRect(ctx, { x: 48, y: midY - 24, w: 104, h: 48 }, 24);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.font = `700 28px ${COND}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("LIVE", 100, midY + 1);
  if (imgs.crest) {
    const ch = 92;
    ctx.drawImage(imgs.crest, 176, midY - ch / 2, ch * (KIT_CREST.w / KIT_CREST.h), ch);
  }
  ctx.textAlign = "left";
  ctx.font = `700 52px ${TITLE}`;
  ctx.fillText("S.C.D. COLICODERVIESE", 262, midY - 8);
  ctx.fillStyle = SKY_BLUE;
  ctx.font = `600 26px ${TEXT}`;
  ctx.fillText("Diretta della gara · stagione 2026/27", 264, midY + 32);
  // Right: partner plate.
  const p = LIVE_PARTNER_PLATE;
  ctx.fillStyle = WHITE;
  roundRect(ctx, p, 16);
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.font = `700 22px ${COND}`;
  ctx.textAlign = "left";
  ctx.fillText("IN DIRETTA CON", p.x + 24, p.y + p.h / 2 + 1);
  drawLogoOrLabel(ctx, imgs.logo, { x: p.x + 210, y: p.y + 12, w: p.w - 234, h: p.h - 24 }, partnerLabel);
  ctx.textBaseline = "alphabetic";
}

/* ------------------------------------------------------------------- export */

export interface RenderInput {
  logoSrc: string | null;
  partnerLabel: string;
  calendar: { rows: readonly CalendarRow[]; today: string };
}

/** Draws one export image on a new canvas at its export size. */
export async function renderExport(key: ExportKey, input: RenderInput): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const logo = input.logoSrc ? await loadImage(input.logoSrc).catch(() => null) : null;
  const crest = await loadImage(KIT_CREST.src).catch(() => null);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas non disponibile");
  if (key === "ledwall" || key === "live") {
    canvas.width = LIVE_FRAME.w;
    canvas.height = LIVE_FRAME.h;
    const still = await loadImage(PITCH_STILL_HD);
    if (key === "ledwall") drawLedwall(ctx, { still, logo }, input.partnerLabel);
    else drawLive(ctx, { still, logo, crest }, input.partnerLabel);
    return canvas;
  }
  if (key === "calendar-4x5" || key === "calendar-9x16") {
    const format: CalendarFormat = key === "calendar-4x5" ? "4x5" : "9x16";
    canvas.width = CALENDAR_FORMATS[format].w;
    canvas.height = CALENDAR_FORMATS[format].h;
    const texture = await loadImage(TEXTURE_LAKE).catch(() => null);
    drawCalendar(ctx, format, { ...input.calendar, partnerLabel: input.partnerLabel }, { crest, logo, texture });
    return canvas;
  }
  const base = key === "sky" ? SKY_BASE : KIT_BASES.find((k) => k.id === key);
  if (!base) throw new Error(`immagine sconosciuta: ${key}`);
  canvas.width = base.w * KIT_EXPORT_SCALE;
  canvas.height = base.h * KIT_EXPORT_SCALE;
  drawKit(ctx, base, { base: await loadImage(base.src), logo, crest: base.crest ? crest : null });
  return canvas;
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("esportazione non riuscita"))), "image/png"));
}

/** Hands a file to the browser as a download (no upload, no storage). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
}

export const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** The day label of a calendar card date ("sabato 18 ottobre"). */
export const longDay = (iso: string) => it(iso, { weekday: "long", day: "numeric", month: "long" });

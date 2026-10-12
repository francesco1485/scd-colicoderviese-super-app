/**
 * Feed della Super App (r86, UD-089): schede bianche arrotondate della tavola madre, scroll stile social. Ogni scheda ha
 * una testata con il canale (società, squadra, evento), il bottone "Segui", il contenuto e la riga "Forza SCD · Condividi".
 * Solo dati reali: post approvati dalla Direzione, gare del calendario ufficiale, sponsor 2026/27, eventi pubblicati.
 */
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bell,
  Flame,
  MapPin,
  Radio,
  Search,
  Share2,
} from "lucide-react";
import type { ReactNode } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { venueCase } from "@/lib/board-data";
import type { WeekItem } from "@/lib/home-week";
import {
  timeAgo,
  type ChannelInfo,
  type FeedMode,
  type Post,
} from "@/lib/social";
import { sponsorLabel, type Sponsor } from "@/lib/sponsors";
import type { Team } from "@/lib/universe";

const wk = (d: string) =>
  new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "short" })
    .format(new Date(`${d}T12:00:00Z`))
    .replace(".", "")
    .toUpperCase();
const dd = (d: string) => String(Number(d.slice(8, 10)));
const mon = (d: string) =>
  new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", month: "short" })
    .format(new Date(`${d}T12:00:00Z`))
    .replace(".", "")
    .toUpperCase();
const longDay = (d: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(new Date(`${d}T12:00:00Z`))
    .replace(/\./g, "");

/* ------------------------------------------------------------------ tabs */

export const FEED_TABS: readonly { id: FeedMode; label: string }[] = [
  { id: "perte", label: "Per te" },
  { id: "tutti", label: "Tutti" },
  { id: "dirette", label: "Dirette" },
];

export function FeedTabs({
  mode,
  onChange,
  tone = "dark",
}: {
  mode: FeedMode;
  onChange: (m: FeedMode) => void;
  tone?: "dark" | "light";
}) {
  return (
    <div
      role="tablist"
      aria-label="Cosa vedere"
      className={`flex gap-6 ${tone === "dark" ? "px-4" : "px-1"}`}
    >
      {FEED_TABS.map((t) => {
        const on = t.id === mode;
        const color =
          tone === "dark"
            ? on
              ? "text-white"
              : "text-[#9fb6d6]"
            : on
              ? "text-[#0b2a5b]"
              : "text-[#5a6b85]";
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={`scd-focus min-h-11 border-b-[3px] px-0.5 text-[16px] font-bold ${color} ${on ? "border-[var(--uv-gold)]" : "border-transparent"}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------- scaffolding */

export function FeedCard({
  children,
  testid,
}: {
  children: ReactNode;
  testid?: string;
}) {
  return (
    <article
      data-testid={testid}
      className="overflow-hidden rounded-[20px] bg-white shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
    >
      {children}
    </article>
  );
}

export function ChannelAvatar({
  channel,
  size = 36,
}: {
  channel: Pick<ChannelInfo, "kind" | "code" | "color">;
  size?: number;
}) {
  if (channel.kind === "club") return <ClubCrestOfficial size={size + 2} />;
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-uv text-white"
      style={{
        width: size,
        height: size,
        background: channel.color,
        fontSize: Math.round(size * 0.38),
      }}
    >
      {channel.code}
    </span>
  );
}

export function FollowButton({
  on,
  onToggle,
  busy,
  size = "sm",
}: {
  on: boolean;
  onToggle: () => void;
  busy?: boolean;
  size?: "sm" | "lg";
}) {
  const base =
    size === "lg"
      ? "h-[46px] flex-1 rounded-[14px] text-[16px]"
      : "h-[34px] rounded-full px-3.5 text-[14px]";
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-pressed={on}
      className={`scd-focus shrink-0 font-bold transition-colors disabled:opacity-60 ${base} ${on ? "bg-[#e3eefb] text-[#0b2a5b]" : "bg-[var(--uv-gold)] text-[#0b1e3a]"}`}
    >
      {on ? "Segui già" : "Segui"}
    </button>
  );
}

export function CardHead({
  channel,
  meta,
  right,
}: {
  channel: ChannelInfo;
  meta: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-3">
      <Link
        to={channel.href}
        className="scd-focus flex min-w-0 items-center gap-2.5 rounded-md"
        aria-label={channel.label}
      >
        <ChannelAvatar channel={channel} />
        <span className="grid min-w-0 leading-tight">
          <span className="flex items-center gap-1 truncate text-[15px] font-bold text-[#0b1e3a]">
            {channel.label}
            {channel.kind === "club" && (
              <BadgeCheck
                className="size-4 text-[#1e7fd8]"
                aria-label="Account ufficiale"
              />
            )}
          </span>
          <span className="truncate text-[13px] text-[#5a6b85]">{meta}</span>
        </span>
      </Link>
      {right && (
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {right}
        </div>
      )}
    </div>
  );
}

export function CardActions({
  forza,
  mine,
  onForza,
  onShare,
  more,
}: {
  forza: number;
  mine: boolean;
  onForza: () => void;
  onShare: () => void;
  more?: { href: string; label: string };
}) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5">
      <button
        type="button"
        onClick={onForza}
        aria-pressed={mine}
        className={`scd-focus flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-[14px] font-bold ${mine ? "text-[#e0482f]" : "text-[#0b2a5b]"}`}
      >
        <Flame
          className="size-[22px]"
          fill={mine ? "currentColor" : "none"}
          aria-hidden="true"
        />
        Forza SCD
        {forza > 0 && (
          <span className="font-semibold text-[#5a6b85]">· {forza}</span>
        )}
      </button>
      <button
        type="button"
        onClick={onShare}
        className="scd-focus flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-[14px] font-semibold text-[#0b2a5b]"
      >
        <Share2 className="size-[22px]" aria-hidden="true" />
        Condividi
      </button>
      {more && (
        <Link
          to={more.href}
          className="scd-focus ml-auto flex min-h-11 items-center rounded-md px-3 text-[14px] font-bold text-[#1e7fd8]"
        >
          {more.label}
        </Link>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- blocks */

/** Scheda "Prossima gara" della tavola: blocco data blu a sinistra, gara e campo a destra. */
export function MatchBlock({
  item,
  compact = false,
}: {
  item: WeekItem;
  compact?: boolean;
}) {
  const casa = item.homeAway === "CASA";
  return (
    <div
      className={`flex overflow-hidden rounded-[16px] border border-[#dce5f0] ${compact ? "" : "mx-3.5 mb-3"}`}
    >
      <div className="grid w-[84px] shrink-0 place-items-center bg-[#0b2a5b] py-3 text-white">
        <span className="text-[13px] font-bold text-[var(--uv-gold)]">
          {wk(item.date)}
        </span>
        <span className="font-uv text-[40px] leading-none">
          {dd(item.date)}
        </span>
        <span className="text-[13px] font-semibold">{mon(item.date)}</span>
      </div>
      <div className="grid min-w-0 flex-1 gap-1 px-3.5 py-3">
        <span className="text-[12px] font-bold text-[#1e7fd8]">
          {casa ? "IN CASA" : "TRASFERTA"} ·{" "}
          {item.time ? `ORE ${item.time}` : "ORARIO DA CONFERMARE"}
        </span>
        <span className="font-uv text-[24px] leading-[1.05] text-[#0b1e3a]">
          {item.title.toUpperCase()}
        </span>
        <span className="flex items-center gap-1 text-[14px] text-[#3e5272]">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {venueCase(item.venue) || "Campo da confermare"}
          </span>
        </span>
      </div>
    </div>
  );
}

/** Scheda del weekend: i numeri veri della settimana e le prossime gare. */
export function WeekPost({
  channel,
  games,
  home,
  firstDay,
  lastDay,
  onShare,
  teamOf,
}: {
  channel: ChannelInfo;
  games: readonly WeekItem[];
  home: number;
  firstDay: string;
  lastDay: string;
  onShare: () => void;
  teamOf: (i: WeekItem) => Team | undefined;
}) {
  const away = games.length - home;
  return (
    <FeedCard testid="feed-week">
      <CardHead channel={channel} meta="Ufficiale · dal calendario SCD" />
      <div className="bg-[#0b2a5b] px-4 pb-4 pt-5 text-white">
        <div className="font-uv text-[34px] leading-none">
          {games.length
            ? `SETTIMANA ${longDay(firstDay)} – ${longDay(lastDay)}`.toUpperCase()
            : "NESSUNA GARA IN PROGRAMMA"}
        </div>
        {games.length > 0 && (
          <div className="mt-3.5 flex gap-2.5">
            <Stat n={games.length} label="gare" gold />
            <Stat n={home} label="in casa" />
            <Stat n={away} label="in trasferta" />
          </div>
        )}
        <ul className="m-0 mt-3.5 grid list-none gap-1.5 p-0 text-[14px]">
          {games.slice(0, 5).map((g) => {
            const t = teamOf(g);
            return (
              <li key={g.id} className="flex gap-2.5">
                <span className="w-[86px] shrink-0 font-bold text-[var(--uv-gold)]">
                  {wk(g.date).slice(0, 3)} {g.time || "--:--"}
                </span>
                <span className="min-w-0 truncate">
                  {t?.short ?? g.groupLabel} · {g.title} ·{" "}
                  {g.homeAway === "CASA" ? "casa" : "fuori"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <CardActions
        forza={0}
        mine={false}
        onForza={() => {}}
        onShare={onShare}
        more={{ href: "/calendario", label: "Tutto il calendario" }}
      />
    </FeedCard>
  );
}

function Stat({
  n,
  label,
  gold = false,
}: {
  n: number;
  label: string;
  gold?: boolean;
}) {
  return (
    <div
      className={`flex-1 rounded-[14px] px-3 py-2.5 ${gold ? "bg-[var(--uv-gold)] text-[#0b1e3a]" : "bg-white/12"}`}
    >
      <div className="font-uv text-[34px] leading-none">{n}</div>
      <div className="text-[13px] font-bold">{label}</div>
    </div>
  );
}

/** Un post approvato (notizia, gara o diretta) di un canale. */
export function PostCard({
  post,
  channel,
  nowMs,
  match,
  onForza,
  onShare,
}: {
  post: Post;
  channel: ChannelInfo;
  nowMs: number;
  match?: WeekItem | undefined;
  onForza: () => void;
  onShare: () => void;
}) {
  const meta = `${post.kind === "LIVE" ? "Diretta" : post.kind === "MATCH" ? "Gara" : channel.kind === "club" ? "Ufficiale" : "Staff · approvato dalla Direzione"} · ${timeAgo(post.publishedAt ?? post.createdAt, nowMs)}`;
  return (
    <FeedCard testid="feed-post">
      <CardHead
        channel={channel}
        meta={meta}
        right={
          post.kind === "LIVE" ? (
            <span className="flex items-center gap-1 rounded-full bg-[#e0482f] px-2.5 py-1 text-[12px] font-bold text-white">
              <Radio className="size-3.5" aria-hidden="true" />
              LIVE
            </span>
          ) : undefined
        }
      />
      {post.mediaUrl && (
        <img
          src={post.mediaUrl}
          alt={post.title ?? ""}
          className="block max-h-[420px] w-full object-cover"
          loading="lazy"
        />
      )}
      {match && <MatchBlock item={match} />}
      <div className="grid gap-1.5 px-3.5 pb-3.5">
        {post.title && (
          <h3 className="m-0 font-uv text-[24px] leading-[1.05] text-[#0b1e3a]">
            {post.title}
          </h3>
        )}
        <p className="m-0 whitespace-pre-line text-[15px] leading-[1.45] text-[#0b1e3a]">
          {post.body}
        </p>
        {post.kind === "LIVE" && post.liveUrl && (
          <a
            href={post.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="scd-focus mt-1 inline-flex h-11 items-center justify-center rounded-[12px] bg-[#e0482f] px-4 text-[14px] font-bold text-white"
          >
            Guarda la diretta sul canale ufficiale
          </a>
        )}
      </div>
      <CardActions
        forza={post.forza}
        mine={post.mine}
        onForza={onForza}
        onShare={onShare}
      />
    </FeedCard>
  );
}

/** Partner del giorno: solo sponsor 2026/27 con nome confermato; il coupon resta "in arrivo" finché non c'è l'accordo. */
export function SponsorPost({ sponsor }: { sponsor: Sponsor }) {
  return (
    <FeedCard testid="feed-sponsor">
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <span className="grid size-9 place-items-center rounded-full bg-[#fff6bf] text-[#8a6d00]">
          <Flame className="size-[18px]" aria-hidden="true" />
        </span>
        <span className="grid leading-tight">
          <span className="text-[15px] font-bold text-[#0b1e3a]">
            Partner del giorno
          </span>
          <span className="text-[13px] text-[#5a6b85]">Sponsor 2026/27</span>
        </span>
      </div>
      <div className="grid h-[150px] place-items-center border-y border-[#eef3f9] bg-[#f7fafe]">
        <img
          src={sponsor.src}
          alt={sponsorLabel(sponsor)}
          className="max-h-[90px] max-w-[200px] object-contain"
          loading="lazy"
        />
      </div>
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <span className="flex-1 text-[14px] text-[#3e5272]">
          {sponsorLabel(sponsor)} sostiene tutte le squadre SCD.
        </span>
        <Link
          to="/sponsor"
          className="scd-focus rounded-[12px] border-2 border-dashed border-[#1e7fd8] px-2.5 py-1.5 text-[13px] font-bold text-[#1e7fd8]"
        >
          I partner
        </Link>
      </div>
    </FeedCard>
  );
}

/** Evento già pubblicato nell'app (pagina reale), con la locandina ufficiale. */
export function EventPost({
  channel,
  when,
  image,
  text,
  follow,
}: {
  channel: ChannelInfo;
  when: string;
  image: string;
  text: string;
  follow?: ReactNode;
}) {
  return (
    <FeedCard testid="feed-event">
      <CardHead
        channel={{ ...channel, kind: "club" }}
        meta={`Evento SCD · ${when}`}
        right={follow}
      />
      <Link to={channel.href} className="block" aria-label={channel.label}>
        <img
          src={image}
          alt={`Locandina ${channel.label}`}
          className="block h-[300px] w-full object-cover"
          loading="lazy"
        />
      </Link>
      <div className="grid gap-1 px-3.5 py-3">
        <h3 className="m-0 font-uv text-[24px] leading-[1.05] text-[#0b1e3a]">
          {channel.label}
        </h3>
        <p className="m-0 text-[15px] leading-[1.45] text-[#0b1e3a]">{text}</p>
      </div>
    </FeedCard>
  );
}

/* ------------------------------------------------------------ header bits */

export function FeedHeaderActions({
  onEnter,
  unread = false,
}: {
  onEnter: () => void;
  unread?: boolean;
}) {
  return (
    <div className="ml-auto flex gap-1">
      <Link
        to="/squadre"
        aria-label="Cerca squadre ed eventi"
        className="scd-focus grid size-11 place-items-center rounded-[12px] bg-white/10 text-white"
      >
        <Search className="size-5" aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={onEnter}
        aria-label="Avvisi e accesso"
        className="scd-focus relative grid size-11 place-items-center rounded-[12px] bg-white/10 text-white"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unread && (
          <span
            aria-hidden="true"
            className="absolute right-2.5 top-2.5 size-2.5 rounded-full border-2 border-[#0b2a5b] bg-[var(--uv-gold)]"
          />
        )}
      </button>
    </div>
  );
}

export function EmptyFeed({
  mode,
  signedIn,
}: {
  mode: FeedMode;
  signedIn: boolean;
}) {
  const text =
    mode === "dirette"
      ? "Nessuna diretta in corso. Le dirette delle gare in casa escono qui, sul canale ufficiale della società."
      : mode === "perte" && !signedIn
        ? "Iscriviti con un tocco: scegli le squadre da seguire e qui vedi prima le loro notizie."
        : "Ancora nessun post qui. Intanto il calendario e le gare della settimana sono sempre aggiornati.";
  return (
    <div className="rounded-[20px] bg-white px-4 py-6 text-center text-[15px] leading-[1.45] text-[#3e5272] shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
      {text}
      {mode === "perte" && !signedIn && (
        <div className="mt-3">
          <Link
            to="/registrati"
            className="scd-focus inline-flex h-11 items-center rounded-[12px] bg-[var(--uv-gold)] px-5 font-bold text-[#0b1e3a]"
          >
            Iscriviti
          </Link>
        </div>
      )}
    </div>
  );
}

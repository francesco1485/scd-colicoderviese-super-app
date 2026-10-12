import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Archive, Check, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";
import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { InteriorShell } from "@/components/scd/InteriorShell";
import { EmptyState } from "@/components/scd/work-area-ui";
import { getSession } from "@/lib/auth.functions";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { CLUB_EVENTS } from "@/lib/club-events";
import {
  AUTHOR_LABEL,
  channelsFrom,
  isBaseActivityChannel,
  KIND_LABEL,
  STATUS_LABEL,
  timeAgo,
  type Post,
  type PostStatus,
} from "@/lib/social";
import { RULE_REASON_LABEL } from "@/lib/moderation";
import { decidePost, getPostsQueue } from "@/lib/social.functions";
import type { PublicGroup } from "@/lib/public-snapshots";
import { orderTeams } from "@/lib/universe";

/**
 * Contenuti e feed (UD-089, foglio 6): la coda di approvazione della Direzione. I post dello staff escono nel feed
 * solo dopo l'ok; un "no" richiede il motivo, che l'autore legge nella sua area. Ogni decisione è registrata.
 */
export const Route = createFileRoute("/direzione_/contenuti")({
  loader: async () => {
    const [session, queue, calendar] = await Promise.all([
      getSession(),
      getPostsQueue(),
      getPublicCalendarSnapshot(),
    ]);
    return { session, queue, groups: calendar.groups, serverNow: Date.now() };
  },
  head: () => accessHead("direzione"),
  component: ContenutiRoute,
});

const TONE: Readonly<Record<PostStatus, ChipTone>> = {
  PENDING: "warn",
  APPROVED: "ok",
  REJECTED: "crit",
  ARCHIVED: "mute",
};

function ContenutiRoute() {
  const { session, queue, groups, serverNow } = Route.useLoaderData();
  if (!session.user || queue === null)
    return <AccessScreenPage id="direzione" />;
  return (
    <Queue
      roles={session.roles}
      badge={session.badge}
      initial={queue}
      groups={groups}
      serverNow={serverNow}
    />
  );
}

function Queue({
  roles,
  badge,
  initial,
  groups,
  serverNow,
}: {
  roles: string[];
  badge: string | null;
  initial: Post[];
  groups: PublicGroup[];
  serverNow: number;
}) {
  const [posts, setPosts] = useState(initial);
  const [note, setNote] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const decide = useServerFn(decidePost);
  const channels = useMemo(
    () =>
      channelsFrom(
        orderTeams(groups),
        CLUB_EVENTS.map((e) => ({ id: e.id, title: e.title, href: e.href })),
      ),
    [groups],
  );
  const label = (key: string) =>
    channels.find((c) => c.key === key)?.label ?? key;
  const pending = posts.filter((p) => p.status === "PENDING");
  const decided = posts.filter((p) => p.status !== "PENDING");

  async function act(p: Post, decision: "APPROVED" | "REJECTED" | "ARCHIVED") {
    const n = note[p.id]?.trim();
    if (decision === "REJECTED" && !n) {
      setMsg("Scrivi il motivo: l'autore lo legge.");
      return;
    }
    const r = await decide({
      data: {
        id: p.id,
        channel: p.channel,
        decision,
        ...(n ? { note: n } : {}),
      },
    });
    setMsg(r.message);
    if (r.ok)
      setPosts((ps) =>
        ps.map((x) =>
          x.id === p.id
            ? {
                ...x,
                status: decision,
                decisionNote: n || null,
                publishedAt:
                  decision === "APPROVED"
                    ? (x.publishedAt ?? new Date().toISOString())
                    : x.publishedAt,
              }
            : x,
        ),
      );
  }

  return (
    <InteriorShell
      title="Contenuti e feed"
      path="/direzione/contenuti"
      activeAreaId="direzione"
      roles={new Set(roles)}
      roleLabel={badge ?? "Direzione"}
      highlights={[
        { value: pending.length, label: "da approvare" },
        {
          value: decided.filter((p) => p.status === "APPROVED").length,
          label: "pubblicati (30 giorni)",
        },
      ]}
    >
      <div className="flex flex-col gap-[18px]">
        {msg && (
          <p
            role="status"
            className="m-0 rounded-[12px] bg-[#e3eefb] px-3 py-2.5 text-[14px] font-semibold text-[#0b2a5b]"
          >
            {msg}
          </p>
        )}
        <Card
          id="coda"
          title="Da approvare"
          sub="Qui arrivano solo i post che il moderatore automatico non ha deciso da solo: primo post di un autore, dubbi, segnalazioni. Controlla minori e, per l'attività di base, che non ci sia il risultato."
        >
          <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
            {pending.length === 0 ? (
              <EmptyState title="Niente in attesa">
                Quando un mister o un dirigente invia un post, compare qui.
              </EmptyState>
            ) : (
              pending.map((p) => (
                <article
                  key={p.id}
                  className="grid gap-2.5 rounded-[14px] border border-[var(--in-line)] p-3.5"
                >
                  <Head p={p} label={label(p.channel)} serverNow={serverNow} />
                  {isBaseActivityChannel(p.channel) && (
                    <Chip tone="warn">Attività di base: niente risultato</Chip>
                  )}
                  <Body p={p} />
                  <label className="grid gap-1 text-[13px] font-semibold">
                    Nota per l'autore (obbligatoria se non pubblichi)
                    <input
                      value={note[p.id] ?? ""}
                      onChange={(e) =>
                        setNote((n) => ({ ...n, [p.id]: e.target.value }))
                      }
                      maxLength={300}
                      className="h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px] font-normal outline-none focus:border-[var(--in-info)]"
                      placeholder="Es. togli il cognome del ragazzo"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => act(p, "APPROVED")}
                      className="scd-focus inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-[var(--uv-gold)] font-bold text-[#0b1e3a]"
                    >
                      <Check className="size-5" aria-hidden="true" />
                      Pubblica
                    </button>
                    <button
                      type="button"
                      onClick={() => act(p, "REJECTED")}
                      className="scd-focus inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-[var(--in-line)] bg-white font-bold text-[#8a2a1c]"
                    >
                      <X className="size-5" aria-hidden="true" />
                      Non pubblicare
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </Card>

        <Card
          id="recenti"
          title="Ultimi 30 giorni"
          sub="Pubblicati e non. Un post pubblicato si può togliere dal feed in ogni momento."
        >
          <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
            {decided.length === 0 ? (
              <EmptyState title="Ancora nessun post">
                Il primo post lo puoi scrivere tu dalla pagina Crea: esce
                subito, firmato come account ufficiale.
              </EmptyState>
            ) : (
              decided.map((p) => (
                <article
                  key={p.id}
                  className="grid gap-2 rounded-[14px] border border-[var(--in-line)] p-3.5"
                >
                  <Head p={p} label={label(p.channel)} serverNow={serverNow} />
                  <Body p={p} />
                  {p.decisionNote && (
                    <span className="text-[13px] text-[var(--in-sub)]">
                      Nota: {p.decisionNote}
                    </span>
                  )}
                  {p.status === "APPROVED" && (
                    <button
                      type="button"
                      onClick={() => act(p, "ARCHIVED")}
                      className="scd-focus inline-flex h-10 w-fit items-center gap-1.5 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[14px] font-semibold text-[var(--in-ink)]"
                    >
                      <Archive className="size-4" aria-hidden="true" />
                      Togli dal feed
                    </button>
                  )}
                </article>
              ))
            )}
            <Link
              to="/crea"
              className="scd-focus inline-flex h-11 w-fit items-center rounded-[12px] bg-[#0b2a5b] px-4 font-bold text-white"
            >
              Scrivi un post ufficiale
            </Link>
          </div>
        </Card>
      </div>
    </InteriorShell>
  );
}

function Head({
  p,
  label,
  serverNow,
}: {
  p: Post;
  label: string;
  serverNow: number;
}) {
  const auto =
    p.verdict === "CHECKING"
      ? "in controllo automatico"
      : p.verdict === "REPORTED"
        ? `nascosto: ${p.reports} segnalazioni`
        : p.verdict === "REVIEW"
          ? `il moderatore automatico chiede un controllo${p.reasons.length ? ": " + p.reasons.map((r) => RULE_REASON_LABEL[r] ?? r).join(", ") : ""}`
          : p.verdict === "BLOCK"
            ? "bloccato dal moderatore automatico"
            : p.verdict === "ALLOW" && p.authorKind !== "OFFICE"
              ? "approvato dal moderatore automatico"
              : null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--in-sub)]">
      <b className="text-[15px] text-[var(--in-ink)]">{label}</b>·{" "}
      {AUTHOR_LABEL[p.authorKind]} · {KIND_LABEL[p.kind]} ·{" "}
      {timeAgo(p.createdAt, serverNow)}
      {auto && (
        <span className="basis-full text-[12.5px] text-[#6b5400]">{auto}</span>
      )}
      <span className="ml-auto">
        <Chip tone={TONE[p.status]}>{STATUS_LABEL[p.status]}</Chip>
      </span>
    </div>
  );
}

function Body({ p }: { p: Post }) {
  return (
    <div className="grid gap-1">
      {p.title && <b className="text-[16px]">{p.title}</b>}
      <p className="m-0 whitespace-pre-line text-[14.5px] leading-[1.45]">
        {p.body}
      </p>
      {p.mediaUrl && (
        <a
          href={p.mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-semibold text-[var(--in-info)]"
        >
          Apri foto o video
        </a>
      )}
      {p.liveUrl && (
        <a
          href={p.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-semibold text-[var(--in-info)]"
        >
          Link della diretta
        </a>
      )}
    </div>
  );
}

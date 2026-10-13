import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  ChevronLeft,
  ExternalLink,
  Share2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  EmptyFeed,
  FollowButton,
  MatchBlock,
  PostCard,
} from "@/components/universe/Feed";
import { SkyCameo } from "@/components/universe/Community";
import { isKidsPath } from "@/components/scd/SkyJolly";
import {
  MembersOnlyScreen,
  membersOnlyHead,
} from "@/components/scd/MembersOnly";
import { getSession } from "@/lib/auth.functions";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { CLUB_EVENTS } from "@/lib/club-events";
import { calendarToWeekItems, romeParts } from "@/lib/home-week";
import { InitialsAvatar } from "@/components/scd/Avatar";
import {
  ROSTER_PUBLIC_TEAMS,
  roleLabel,
  rosterCountLabel,
  rosterSections,
  type RosterPlayer,
} from "@/lib/public-roster";
import { getPublicRoster } from "@/lib/public-roster.functions";
import { publicTeamCrest } from "@/lib/team-crest";
import { resultLinkFor, VERIFIED_CHAMPIONSHIPS } from "@/lib/official-links";
import {
  channelsFrom,
  isBaseActivityChannel,
  teamChannel,
  type Post,
} from "@/lib/social";
import {
  getChannelFeed,
  getPublicSocial,
  setFollow,
  toggleForza,
} from "@/lib/social.functions";
import { itemState, orderTeams } from "@/lib/universe";

/**
 * Pagina squadra (UD-089, foglio 3): testata con il colore ufficiale dell'annata, "Segui", prossima gara, le gare
 * che vengono, la rosa (r94: nomi per le squadre agonistiche con la regola dell'età, solo il numero per l'attività
 * di base), i post approvati della squadra. Stessa grafica per la Prima Squadra e per i più piccoli. Niente foto
 * dei ragazzi: avatar con le iniziali nel colore della squadra.
 */
async function loadTeam(team: string) {
  const id = team.toLowerCase();
  if (!/^[a-z0-9_-]{1,40}$/.test(id)) throw notFound();
  // Teams are inside (UD-100): no team data for anonymous visitors, only the members-only screen.
  const session = await getSession();
  if (!session.user) return { signedIn: false as const, id };
  const [calendar, social, posts, roster] = await Promise.all([
    getPublicCalendarSnapshot(),
    getPublicSocial(),
    getChannelFeed({ data: { channel: teamChannel(id) } }),
    getPublicRoster({ data: { team: id } }),
  ]);
  const group = calendar.groups.find((g) => g.id === id);
  if (!group) throw notFound();
  const serverNow = Date.now();
  const today =
    romeParts(new Date(serverNow).toISOString())?.date ??
    new Date(serverNow).toISOString().slice(0, 10);
  return {
    signedIn: true as const,
    id,
    group,
    groups: calendar.groups,
    events: calendar.events.filter((e) => e.group === id),
    social,
    posts,
    roster,
    serverNow,
    today,
  };
}

export const Route = createFileRoute("/squadre_/$team")({
  loader: ({ params }) => loadTeam(params.team),
  head: ({ loaderData }) =>
    loaderData?.signedIn
      ? {
          meta: [
            {
              title: `${loaderData.group.label} — S.C.D. ColicoDerviese`,
            },
            {
              name: "description",
              content: `Gare, notizie e dirette della squadra ${loaderData.group.label} della S.C.D. ColicoDerviese. Segui la squadra nell'app.`,
            },
            { name: "robots", content: "noindex" },
          ],
        }
      : membersOnlyHead("Squadra"),
  notFoundComponent: () => (
    <main className="min-h-dvh bg-[#f2f6fb] px-4 pt-8 text-center text-[#0b1e3a]">
      <h1 className="font-uv text-[28px]">SQUADRA NON TROVATA</h1>
      <Link
        to="/squadre"
        className="scd-focus inline-flex h-11 items-center rounded-[12px] bg-[var(--uv-gold)] px-5 font-bold"
      >
        Tutte le squadre
      </Link>
    </main>
  ),
  component: TeamRoute,
});

function TeamRoute() {
  const data = Route.useLoaderData();
  if (!data.signedIn) return <MembersOnlyScreen next={`/squadre/${data.id}`} />;
  return <TeamPage data={data} />;
}

type TeamData = Extract<
  Awaited<ReturnType<typeof loadTeam>>,
  { signedIn: true }
>;

function TeamPage({ data }: { data: TeamData }) {
  const {
    id,
    group,
    groups,
    events,
    social,
    posts: initialPosts,
    roster,
    serverNow,
    today,
  } = data;
  const [nowMs, setNowMs] = useState(serverNow);
  const [follows, setFollows] = useState(social.follows);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [sky, setSky] = useState<{ title: string; text: string } | null>(null);
  const doFollow = useServerFn(setFollow);
  const doForza = useServerFn(toggleForza);
  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const team = useMemo(
    () => orderTeams([group]).find((t) => t.id === id)!,
    [group, id],
  );
  const channel = useMemo(
    () =>
      channelsFrom(
        orderTeams(groups),
        CLUB_EVENTS.map((e) => ({ id: e.id, title: e.title, href: e.href })),
      ).find((c) => c.key === teamChannel(id))!,
    [groups, id],
  );
  const matches = useMemo(
    () =>
      calendarToWeekItems(events, groups).sort((a, b) =>
        (a.date + a.time).localeCompare(b.date + b.time),
      ),
    [events, groups],
  );
  const upcoming = useMemo(
    () =>
      matches.filter((m) => m.date >= today && itemState(m, nowMs) !== "done"),
    [matches, today, nowMs],
  );
  const next = upcoming[0] ?? null;
  const base = isBaseActivityChannel(channel.key);
  const followers = social.counts[channel.key] ?? 0;
  const followed = follows.includes(channel.key);
  const c = VERIFIED_CHAMPIONSHIPS[id];
  const champ = c ? `${c.name} ${c.group}`.trim() : null;
  const results = resultLinkFor(id);

  const toggle = async () => {
    if (!social.signedIn) {
      setSky({
        title: "Iscriviti",
        text: 'Con un account segui la squadra e la trovi in "Per te".',
      });
      return;
    }
    const on = !followed;
    setFollows((f) =>
      on ? [...f, channel.key] : f.filter((x) => x !== channel.key),
    );
    const r = await doFollow({ data: { channel: channel.key, on } });
    if (!r.ok) {
      setFollows((f) =>
        on ? f.filter((x) => x !== channel.key) : [...f, channel.key],
      );
      setSky({ title: "Non salvato", text: r.message });
    }
  };
  const forza = async (post: Post) => {
    if (!social.signedIn) {
      setSky({ title: "Forza SCD!", text: "Iscriviti per fare il tifo." });
      return;
    }
    const r = await doForza({ data: { id: post.id } });
    if (r.ok)
      setPosts((ps) =>
        ps.map((p) =>
          p.id === post.id
            ? { ...p, mine: r.on === true, forza: r.forza ?? p.forza }
            : p,
        ),
      );
  };
  const share = async () => {
    const text = `${group.label} · S.C.D. ColicoDerviese${next ? ` · prossima gara ${next.date.split("-").reverse().join("/")} ${next.time}` : ""}`;
    try {
      if (navigator.share)
        await navigator.share({ title: group.label, text, url: location.href });
      else {
        await navigator.clipboard.writeText(`${text} ${location.href}`);
        setSky({ title: "Copiato", text: "Incolla il messaggio dove vuoi." });
      }
    } catch {
      /* annullato */
    }
  };

  return (
    <main
      data-screen="squadra"
      className="min-h-dvh bg-[#f2f6fb] pb-28 text-[#0b1e3a]"
    >
      <div className="relative h-[210px] overflow-hidden bg-[#06306f]">
        <img
          src="/media/scd/lario-header.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover object-[center_60%] opacity-70"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgb(7_29_66/0.25),rgb(11_42_91/0.95))]"
        />
        <Link
          to="/squadre"
          aria-label="Tutte le squadre"
          className="scd-focus absolute left-3 top-3.5 grid size-11 place-items-center rounded-[12px] bg-white/14 text-white"
        >
          <ChevronLeft className="size-6" aria-hidden="true" />
        </Link>
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1.5"
          style={{ background: team.color }}
        />
      </div>
      <div className="border-b border-[#dce5f0] bg-white px-4 pb-4">
        <div className="relative -mt-11 flex items-end gap-3.5">
          {/* Public page: official club crest only; annata crests stay internal (Direzione, 13/10/2026). */}
          <span className="grid size-[88px] place-items-center rounded-[24px] border-4 border-white bg-white shadow-[0_6px_16px_rgb(11_42_91/0.2)]">
            <img
              src={publicTeamCrest()}
              alt="Stemma ufficiale S.C.D. ColicoDerviese"
              width={55}
              height={72}
              className="h-[70px] w-auto object-contain"
            />
          </span>
        </div>
        <p className="mb-0 mt-3 text-[13px] font-bold uppercase tracking-[0.08em] text-[#3e5272]">
          ColicoDerviese
        </p>
        <h1 className="mb-0 mt-1 font-uv text-[32px] leading-none">
          {group.label.toUpperCase()}
        </h1>
        <p className="mb-0 mt-1.5 text-[15px] text-[#3e5272]">
          {[
            group.years.length ? `Annate ${group.years.join("–")}` : null,
            champ ?? (base ? "Attività di base" : "Settore giovanile"),
            followers > 0
              ? `${followers} ${followers === 1 ? "persona segue" : "persone seguono"}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-3.5 flex gap-2">
          <FollowButton on={followed} onToggle={toggle} size="lg" />
          <Link
            to="/comunicazioni"
            aria-label="Avvisi della squadra"
            className="scd-focus grid size-[46px] place-items-center rounded-[14px] border-2 border-[#0b2a5b] bg-white text-[#0b2a5b]"
          >
            <Bell className="size-5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={share}
            aria-label="Condividi"
            className="scd-focus grid size-[46px] place-items-center rounded-[14px] border-2 border-[#0b2a5b] bg-white text-[#0b2a5b]"
          >
            <Share2 className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-[720px] grid-cols-1 gap-3.5 px-3 pt-3.5">
        <RosterSection
          teamId={id}
          color={team.color}
          base={base}
          count={roster.count}
          players={roster.players}
          signedIn={social.signedIn}
        />
        <section className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
          <h2 className="mb-2.5 mt-0 text-[13px] font-bold tracking-[0.04em] text-[#1e7fd8]">
            PROSSIMA GARA
          </h2>
          {next ? (
            <MatchBlock item={next} compact />
          ) : (
            <p className="m-0 text-[15px] text-[#3e5272]">
              Nessuna gara in programma nel calendario ufficiale.
            </p>
          )}
          {upcoming.length > 1 && (
            <ul className="m-0 mt-2.5 grid list-none gap-1.5 border-t border-[#eef3f9] p-0 pt-2.5 text-[14px] text-[#3e5272]">
              {upcoming.slice(1, 4).map((m) => (
                <li key={m.id} className="flex gap-2.5">
                  <b className="w-[108px] shrink-0 text-[#0b1e3a]">
                    {fmt(m.date)} {m.time}
                  </b>
                  <span className="min-w-0 truncate">
                    {m.title} · {m.homeAway === "CASA" ? "casa" : "fuori"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid grid-cols-2 gap-2.5">
          <Link
            to="/allenamenti"
            className="scd-focus grid gap-2 rounded-[18px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
          >
            <span className="grid size-10 place-items-center rounded-[12px] bg-[#1e90e0] text-white">
              <Bell className="size-5" aria-hidden="true" />
            </span>
            <b className="text-[15px]">Allenamenti</b>
            <span className="text-[13px] text-[#5a6b85]">
              Giorni, orari e campo
            </span>
          </Link>
          {results ? (
            <a
              href={results.url}
              target="_blank"
              rel="noopener noreferrer"
              className="scd-focus grid gap-2 rounded-[18px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
            >
              <span className="grid size-10 place-items-center rounded-[12px] bg-[var(--uv-gold)] text-[#0b1e3a]">
                <ExternalLink className="size-5" aria-hidden="true" />
              </span>
              <b className="text-[15px]">Classifica</b>
              <span className="text-[13px] text-[#5a6b85]">
                Fonte ufficiale LND
              </span>
            </a>
          ) : (
            <div className="grid gap-2 rounded-[18px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
              <span className="grid size-10 place-items-center rounded-[12px] bg-[#e3eefb] text-[#0b2a5b]">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <b className="text-[15px]">
                {base ? "Niente classifiche" : "Classifica"}
              </b>
              <span className="text-[13px] text-[#5a6b85]">
                {base
                  ? "Attività di base: si gioca per imparare"
                  : "Non ancora verificata sul sito LND"}
              </span>
            </div>
          )}
        </div>

        {posts.length ? (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              channel={channel}
              nowMs={nowMs}
              onForza={() => forza(p)}
              onShare={share}
            />
          ))
        ) : (
          <EmptyFeed mode="tutti" signedIn={social.signedIn} />
        )}

        <p className="m-0 flex items-start gap-2 rounded-[14px] bg-[#eef5ff] px-3 py-3 text-[13px] leading-[1.4] text-[#22385c]">
          <ShieldCheck
            className="size-[18px] shrink-0 text-[#1e7fd8]"
            aria-hidden="true"
          />
          {base
            ? "Attività di base: i nomi e le foto dei bambini restano nell'area riservata a staff e famiglie."
            : "Rosa dalle liste ufficiali della stagione. Dei minorenni compare solo il nome con l'iniziale del cognome; niente foto dei ragazzi."}
        </p>
      </div>
      <SkyCameo message={sky} onClose={() => setSky(null)} persona={isKidsPath(`/squadre/${id}`) ? "sky" : "club"} />
    </main>
  );
}

function RosterSection({
  teamId,
  color,
  base,
  count,
  players,
  signedIn,
}: {
  teamId: string;
  color: string;
  base: boolean;
  count: number;
  players: readonly RosterPlayer[];
  signedIn: boolean;
}) {
  const named = ROSTER_PUBLIC_TEAMS.has(teamId) && !base;
  const sections = named ? rosterSections(players) : [];
  const minors = players.some((p) => !p.adult);
  return (
    <section
      className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]"
      aria-labelledby="rosa-title"
      data-testid="team-roster"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2
          id="rosa-title"
          className="m-0 text-[13px] font-bold tracking-[0.04em] text-[#1e7fd8]"
        >
          ROSA
        </h2>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3e5272]">
          <Users className="size-4" aria-hidden="true" />
          {rosterCountLabel(count, base)}
        </span>
      </div>
      {named && sections.length > 0 ? (
        <div className="grid gap-3">
          {sections.map((s) => (
            <div key={s.role ?? "none"}>
              {s.label && (
                <h3 className="mb-1.5 mt-0 text-[12px] font-bold uppercase tracking-[0.06em] text-[#5a6b85]">
                  {s.label}
                </h3>
              )}
              <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-2 p-0 sm:grid-cols-3">
                {s.players.map((p) => (
                  <li key={p.id} className="flex min-w-0 items-center gap-2.5">
                    <InitialsAvatar name={p.name} color={color} size={36} />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold leading-tight">
                        {p.name}
                      </span>
                      {p.role && !s.label && (
                        <span className="block text-[12px] text-[#5a6b85]">
                          {roleLabel(p.role)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {minors && !signedIn && (
            <p className="m-0 text-[13px] leading-[1.4] text-[#5a6b85]">
              Dei minorenni compare l'iniziale del cognome. I tesserati SCD
              vedono i nomi completi dopo l'accesso.
            </p>
          )}
        </div>
      ) : (
        <p className="m-0 text-[15px] leading-[1.45] text-[#3e5272]">
          {base
            ? count > 0
              ? "Nell'attività di base i bambini giocano per imparare: niente nomi in pubblico."
              : "Gli iscritti arrivano dal gestionale della stagione."
            : "La rosa arriva dalle liste ufficiali della stagione, appena disponibile."}
        </p>
      )}
    </section>
  );
}

const fmt = (d: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(new Date(`${d}T12:00:00Z`))
    .replace(/\./g, "");

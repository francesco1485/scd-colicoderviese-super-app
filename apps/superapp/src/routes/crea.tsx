import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Info, X } from "lucide-react";
import { useMemo, useState } from "react";

import { getSession } from "@/lib/auth.functions";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { CLUB_EVENTS } from "@/lib/club-events";
import {
  channelsFrom,
  isBaseActivityChannel,
  KIND_LABEL,
  POST_KINDS,
  postableChannels,
  type PostKind,
} from "@/lib/social";
import { createPost, getPublicSocial } from "@/lib/social.functions";
import type { PublicGroup } from "@/lib/public-snapshots";
import { orderTeams } from "@/lib/universe";

/**
 * Crea contenuto (UD-089, foglio 5): un post per la società, una squadra o un evento. La Direzione pubblica subito, lo
 * staff invia alla Direzione. I controlli sui minori sono obbligatori prima dell'invio; per l'attività di base anche
 * "niente risultato". Chi non ha un ruolo vede come ottenerlo, non un modulo che poi fallisce.
 */
export const Route = createFileRoute("/crea")({
  loader: async () => {
    const [session, social, calendar] = await Promise.all([
      getSession(),
      getPublicSocial(),
      getPublicCalendarSnapshot(),
    ]);
    return { session, social, groups: calendar.groups };
  },
  head: () => ({
    meta: [
      { title: "Nuovo post — S.C.D. ColicoDerviese" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CreaRoute,
});

const MAIN_TEAMS = [
  "prima",
  "u19",
  "u16",
  "u15",
  "2014",
  "2015",
  "pulcini",
  "primicalci",
  "piccoli",
];
const inputCls =
  "w-full rounded-[14px] border border-[#c9d6e6] bg-white px-3 text-[16px] text-[#0b1e3a] outline-none focus:border-[#1e7fd8]";

function CreaRoute() {
  const { session, social, groups } = Route.useLoaderData();
  if (!session.user)
    return (
      <Gate
        title="Entra per pubblicare"
        text="I post li scrivono la Direzione e lo staff abilitato. Entra con il tuo account: se hai un ruolo, qui trovi il modulo."
        cta={{ to: "/entra", label: "Accedi" }}
      />
    );
  if (!social.canPost)
    return (
      <Gate
        title="Serve un'abilitazione"
        text="Il tuo account vede calendario e attività. Per pubblicare come staff di una squadra chiedi alla Direzione di abilitarti dalla pagina Accessi."
        cta={{ to: "/la-mia-scd", label: "La mia SCD" }}
      />
    );
  return <CreaForm groups={groups} office={social.office} />;
}

function Gate({
  title,
  text,
  cta,
}: {
  title: string;
  text: string;
  cta: { to: string; label: string };
}) {
  return (
    <main
      data-screen="crea"
      className="min-h-dvh bg-[#f2f6fb] px-4 pb-28 pt-6 text-[#0b1e3a]"
    >
      <div className="mx-auto max-w-[520px] rounded-[20px] bg-white p-5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
        <h1 className="m-0 font-uv text-[28px] leading-none">
          {title.toUpperCase()}
        </h1>
        <p className="mb-4 mt-2 text-[15px] leading-[1.45] text-[#3e5272]">
          {text}
        </p>
        <Link
          to={cta.to}
          className="scd-focus inline-flex h-12 items-center rounded-[14px] bg-[var(--uv-gold)] px-5 font-bold text-[#0b1e3a]"
        >
          {cta.label}
        </Link>
      </div>
    </main>
  );
}

function CreaForm({
  groups,
  office,
}: {
  groups: readonly PublicGroup[];
  office: boolean;
}) {
  const navigate = useNavigate();
  const send = useServerFn(createPost);
  const teams = useMemo(
    () =>
      orderTeams(
        groups.filter((g) => g.count > 0 || MAIN_TEAMS.includes(g.id)),
        [],
      ),
    [groups],
  );
  const channels = useMemo(
    () =>
      postableChannels(
        channelsFrom(
          teams,
          CLUB_EVENTS.map((e) => ({ id: e.id, title: e.title, href: e.href })),
        ),
        office,
      ),
    [teams, office],
  );
  const [channel, setChannel] = useState(channels[0]?.key ?? "");
  const [kind, setKind] = useState<PostKind>("NEWS");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [minorsOk, setMinorsOk] = useState(false);
  const [noNamesOk, setNoNamesOk] = useState(false);
  const [noResultOk, setNoResultOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const base = isBaseActivityChannel(channel);
  const ready =
    !!channel &&
    body.trim().length > 0 &&
    minorsOk &&
    noNamesOk &&
    (!base || noResultOk) &&
    (kind !== "LIVE" || /^https:\/\//.test(liveUrl.trim()));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await send({
        data: {
          channel,
          kind,
          title: title.trim() || undefined,
          body: body.trim(),
          mediaUrl: mediaUrl.trim() || undefined,
          liveUrl: liveUrl.trim() || undefined,
          minorsOk,
          noNamesOk,
          noResultOk,
          baseActivity: base,
        },
      });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok)
        setTimeout(
          () => navigate({ to: r.status === "APPROVED" ? "/" : "/la-mia-scd" }),
          900,
        );
    } catch {
      setMsg({
        ok: false,
        text: "Non è stato possibile inviare. Riprova tra poco.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      data-screen="crea"
      className="min-h-dvh bg-[#f2f6fb] pb-28 text-[#0b1e3a]"
    >
      <div className="flex items-center gap-2 bg-[#0b2a5b] px-3 py-3.5 text-white">
        <Link
          to="/"
          aria-label="Chiudi"
          className="scd-focus grid size-11 place-items-center rounded-[12px] bg-white/12"
        >
          <X className="size-5" aria-hidden="true" />
        </Link>
        <span className="font-uv text-[24px]">NUOVO POST</span>
      </div>
      <form
        onSubmit={submit}
        className="mx-auto grid max-w-[560px] gap-3.5 px-3.5 pt-4"
      >
        <label className="grid gap-1.5 text-[14px] font-bold">
          Pubblica come
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className={`${inputCls} h-12 font-semibold`}
          >
            {channels.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
                {c.kind === "club"
                  ? " · ufficiale"
                  : c.kind === "team"
                    ? " · staff"
                    : " · evento"}
              </option>
            ))}
          </select>
        </label>

        <div role="radiogroup" aria-label="Tipo di post" className="flex gap-2">
          {POST_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`scd-focus h-11 flex-1 rounded-[12px] text-[14px] font-bold ${kind === k ? "bg-[#0b2a5b] text-white" : "border border-[#c9d6e6] bg-white text-[#0b2a5b]"}`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>

        <label className="grid gap-1.5 text-[14px] font-bold">
          Titolo (facoltativo)
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className={`${inputCls} h-12`}
            placeholder="Es. Domenica si gioca in casa"
          />
        </label>
        <label className="grid gap-1.5 text-[14px] font-bold">
          Testo
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={2000}
            required
            className={`${inputCls} resize-none py-3 font-normal leading-[1.45]`}
            placeholder="Cosa vuoi dire a chi segue la squadra?"
          />
        </label>
        <label className="grid gap-1.5 text-[14px] font-bold">
          <span className="flex items-center gap-2">
            <ImagePlus className="size-5 text-[#1e7fd8]" aria-hidden="true" />
            Foto o video (link, facoltativo)
          </span>
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            maxLength={500}
            inputMode="url"
            className={`${inputCls} h-12 font-normal`}
            placeholder="https://..."
          />
          <span className="text-[12.5px] font-normal text-[#5a6b85]">
            Il caricamento diretto dal telefono arriva con il prossimo passo:
            per ora un link (Drive della società, canale ufficiale).
          </span>
        </label>
        {kind === "LIVE" && (
          <label className="grid gap-1.5 text-[14px] font-bold">
            Link della diretta (canale ufficiale SCD)
            <input
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              maxLength={500}
              inputMode="url"
              required
              className={`${inputCls} h-12 font-normal`}
              placeholder="https://..."
            />
          </label>
        )}

        <fieldset className="m-0 grid gap-3 rounded-[16px] border-0 bg-white p-3.5 shadow-[0_2px_10px_rgb(11_42_91/0.08)]">
          <legend className="float-left w-full p-0 text-[14px] font-bold">
            Prima di inviare
          </legend>
          <Check on={minorsOk} onChange={setMinorsOk}>
            Nessun minore riconoscibile, oppure tutti hanno la liberatoria
            firmata.
          </Check>
          <Check on={noNamesOk} onChange={setNoNamesOk}>
            Nessun nome o cognome di ragazzi nel testo.
          </Check>
          {base && (
            <Check on={noResultOk} onChange={setNoResultOk}>
              Attività di base: il risultato non si pubblica (CU SGS n.2
              2026/27).
            </Check>
          )}
          {kind === "LIVE" && (
            <p className="m-0 flex gap-2 rounded-[12px] bg-[#eef5ff] px-3 py-2.5 text-[13px] leading-[1.35] text-[#22385c]">
              <Info
                className="size-[18px] shrink-0 text-[#1e7fd8]"
                aria-hidden="true"
              />
              Diretta: solo gare in casa, gratis, sui canali ufficiali della
              società (regolamento LND).
            </p>
          )}
        </fieldset>

        {msg && (
          <p
            role="status"
            className={`m-0 rounded-[12px] px-3 py-2.5 text-[14px] font-semibold ${msg.ok ? "bg-[#e3f7ea] text-[#145a32]" : "bg-[#fde8e4] text-[#8a2a1c]"}`}
          >
            {msg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={!ready || busy}
          className="scd-focus h-[54px] rounded-[16px] bg-[var(--uv-gold)] text-[18px] font-bold text-[#0b1e3a] disabled:opacity-50"
        >
          {office ? "Pubblica" : "Invia alla Direzione"}
        </button>
        <p className="m-0 text-center text-[13px] text-[#5a6b85]">
          {office
            ? "Esce subito nel feed, firmato come account ufficiale."
            : "Il post esce nel feed dopo l'ok della Direzione."}
        </p>
      </form>
    </main>
  );
}

function Check({
  on,
  onChange,
  children,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2.5 text-[14px] leading-[1.35]">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-[22px] shrink-0 accent-[#0b2a5b]"
      />
      {children}
    </label>
  );
}

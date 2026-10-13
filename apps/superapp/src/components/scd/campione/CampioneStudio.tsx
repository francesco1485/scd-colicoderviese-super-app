/**
 * "Crea il tuo campione" v1 — members area, not published (UD-102, Direzione 13/10/2026 "ok procedi").
 * Three paths as the Direzione asked:
 *   A. Basi pronte — working now: pick a realistic base (AI-generated original, not a photo), nickname, number.
 *   B. Descrizione scritta — full form; generation only when the server says it is switched on.
 *   C. Foto del volto — visible but locked until consent and DPIA; minors are routed to the Famiglia area.
 * The page never claims a save that did not happen: in preview mode it says that saving is not active.
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Camera,
  Check,
  ImageIcon,
  LayoutGrid,
  Loader2,
  Lock,
  PenLine,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import {
  AI_LABEL,
  AVATAR_BASES,
  DESCRIPTION_MAX,
  GEN_DISABLED_LABEL,
  NICKNAME_MAX,
  QUICK_CHOICES,
  baseByKey,
  basesFor,
  capState,
  genDisabledText,
  moderateText,
  photoPathFor,
  treatAsMinor,
  validateNickname,
  validateShirtNumber,
  type QuickKey,
  type QuickSelection,
} from "@/lib/avatar-studio";
import type { AvatarStudioData } from "@/lib/avatar-studio.functions";
import { generateAvatarFromText, saveMyAvatar } from "@/lib/avatar-studio.functions";

import { ChampionPreview } from "./ChampionPreview";
import { MemberCardPanel } from "./MemberCardPanel";

type PathKey = "basi" | "testo" | "foto";

const QUICK_LABEL: Record<QuickKey, string> = {
  hair: "Capelli",
  skin: "Carnagione",
  build: "Corporatura",
  role: "Ruolo",
  celebration: "Esultanza",
};

type Notice = { tone: "ok" | "info" | "error"; text: string } | null;

export function CampioneStudio({ data }: { data: AvatarStudioData }) {
  const minor = treatAsMinor(data.ageBand);
  const allowed = useMemo(() => basesFor(data.ageBand), [data.ageBand]);
  const initialBase =
    data.saved && allowed.some((b) => b.key === data.saved?.baseKey) ? data.saved.baseKey : (allowed[0]?.key ?? "");
  const [path, setPath] = useState<PathKey>("basi");
  const [baseKey, setBaseKey] = useState(initialBase);
  const [nickname, setNickname] = useState(data.saved?.nickname ?? "");
  const [numberText, setNumberText] = useState(data.saved ? String(data.saved.shirtNumber) : "");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [generated, setGenerated] = useState<string | null>(null);
  const save = useServerFn(saveMyAvatar);

  const nick = validateNickname(nickname);
  const num = validateShirtNumber(numberText);
  const base = baseByKey(baseKey);
  const shownNumber = num.ok ? num.value : null;
  const shownNick = nick.ok ? nick.value : nickname.trim().slice(0, NICKNAME_MAX);

  const onSave = async () => {
    setTouched(true);
    setNotice(null);
    if (!nick.ok || !num.ok || !base) return;
    setSaving(true);
    try {
      const r = await save({ data: { baseKey: base.key, nickname: nick.value, shirtNumber: num.value } });
      setNotice(r.saved ? { tone: "ok", text: r.message } : { tone: r.preview ? "info" : "error", text: r.message });
    } catch {
      setNotice({ tone: "error", text: "Salvataggio non riuscito, riprova tra poco." });
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: PathKey; letter: string; title: string; kicker: string; icon: typeof Camera; badge: string }[] = [
    { key: "basi", letter: "A", title: "Basi pronte", kicker: "Pronto in 1 tocco", icon: LayoutGrid, badge: "Attivo" },
    {
      key: "testo",
      letter: "B",
      title: "Descrizione scritta",
      kicker: "Con parole tue",
      icon: PenLine,
      badge: data.generation.enabled ? "Attivo" : "Non ancora attivo",
    },
    { key: "foto", letter: "C", title: "Foto del volto", kicker: "Ti somiglia davvero", icon: Camera, badge: "In arrivo" },
  ];
  const tabsId = useId();

  return (
    <main data-screen="campione" className="min-h-dvh bg-[#eef3f9] pb-28 font-sans text-[#0b1e3a] lg:pb-14">
      <header className="relative overflow-hidden bg-[linear-gradient(160deg,#0b2a5b,#1556c4)] text-white">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 pb-7 pt-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/la-mia-scd"
              className="scd-focus grid size-11 shrink-0 place-items-center rounded-full bg-white/14 hover:bg-white/22"
              aria-label="Torna a La mia SCD"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
            <ClubCrestOfficial size={42} />
            <span className="grid min-w-0">
              <span className="truncate font-uv text-[22px] leading-none">
                COLICO<span className="text-[#ffd600]">DERVIESE</span>
              </span>
              <span className="text-[13px] font-semibold text-[#dbe6f5]">La mia SCD · area soci</span>
            </span>
          </div>
          <h1 className="m-0 font-uv text-[clamp(38px,9vw,64px)] uppercase leading-[0.92]">
            Crea il tuo <span className="text-[#ffd600]">campione</span>
          </h1>
          <p className="m-0 max-w-[640px] text-[16px] leading-snug text-[#e3ecf8]">
            Realistico, ma non è una foto: è il tuo avatar per l'app e la tua card.
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1240px] gap-5 px-4 pt-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-8">
        <div className="grid min-w-0 gap-5">
          {data.storage !== "ACTIVE" && (
            <p
              className="m-0 flex gap-2.5 rounded-[16px] border border-[#e6c200] bg-[#fff8cc] p-3.5 text-[14.5px] leading-snug text-[#4d3d00]"
              data-testid="preview-mode"
            >
              <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span>
                <b>Versione di prova.</b> Puoi scegliere e vedere l'anteprima, ma il salvataggio non è ancora attivo: la
                Direzione deve approvare l'archivio degli avatar.
              </span>
            </p>
          )}
          {minor && (
            <p className="m-0 flex gap-2.5 rounded-[16px] bg-white p-3.5 text-[14.5px] leading-snug text-[#3e5272] shadow-[0_2px_10px_rgb(11_42_91/0.06)]">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#1a7f45]" aria-hidden="true" />
              <span>
                {data.ageBand === "MINOR" ? <b>Under 18:</b> : <b>Età non ancora verificata:</b>} l'avatar è sempre di
                spalle, con il solo nickname. Sotto i 14 anni lo crea il genitore dal profilo Famiglia.
              </span>
            </p>
          )}

          <div role="tablist" aria-label="Come vuoi creare il tuo campione" className="grid gap-2.5 sm:grid-cols-3">
            {tabs.map((t) => {
              const selected = t.key === path;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  id={`${tabsId}-${t.key}`}
                  aria-selected={selected}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setPath(t.key)}
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                    e.preventDefault();
                    const i = tabs.findIndex((x) => x.key === path);
                    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : tabs.length - 1;
                    const next = tabs[(i + step) % tabs.length]!.key;
                    setPath(next);
                    document.getElementById(`${tabsId}-${next}`)?.focus();
                  }}
                  className={`scd-focus grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 rounded-[18px] border-2 bg-white p-3.5 text-left shadow-[0_2px_10px_rgb(11_42_91/0.06)] motion-safe:transition-colors ${
                    selected ? "border-[#ffd600]" : "border-transparent hover:border-[#c9d7ea]"
                  }`}
                >
                  <span
                    className={`row-span-2 grid size-11 place-items-center rounded-full font-uv text-[22px] ${
                      selected ? "bg-[#1556c4] text-white" : "bg-[#e3ecf8] text-[#0b2a5b]"
                    }`}
                    aria-hidden="true"
                  >
                    {t.letter}
                  </span>
                  <span className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-[#1556c4]">{t.kicker}</span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <b className="text-[16px] leading-tight">{t.title}</b>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${
                        t.badge === "Attivo" ? "bg-[#e3f7ea] text-[#145a32]" : "bg-[#eef1f5] text-[#4a5d7a]"
                      }`}
                    >
                      {t.badge}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <section
            role="tabpanel"
            id={`${tabsId}-panel`}
            aria-labelledby={`${tabsId}-${path}`}
            className="rounded-[22px] bg-white p-4 shadow-[0_2px_10px_rgb(11_42_91/0.08)] sm:p-5"
          >
            {path === "basi" && (
              <BasesPanel
                minor={minor}
                baseKey={baseKey}
                onBase={setBaseKey}
                allowedKeys={allowed.map((b) => b.key)}
              />
            )}
            {path === "testo" && (
              <TextPanel data={data} nickname={nickname} numberText={numberText} onGenerated={setGenerated} />
            )}
            {path === "foto" && <PhotoPanel data={data} />}

            {path !== "foto" && (
              <IdentityFields
                nickname={nickname}
                numberText={numberText}
                onNickname={setNickname}
                onNumber={setNumberText}
                nickError={touched || nickname ? (nick.ok ? null : nick.error) : null}
                numError={touched || numberText ? (num.ok ? null : num.error) : null}
              />
            )}

            {path === "basi" && (
              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="scd-focus inline-flex h-13 min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#ffd600] px-5 font-uv text-[22px] uppercase text-[#0b2a5b] shadow-[0_3px_0_#d9b500] hover:brightness-95 disabled:opacity-70 sm:w-auto sm:justify-self-start"
                  data-testid="save-champion"
                >
                  {saving ? <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" /> : <Check className="size-5" aria-hidden="true" />}
                  {data.storage === "ACTIVE" ? "Usa questo campione" : "Controlla e prova"}
                </button>
                <div aria-live="polite" className="min-h-0">
                  {notice && <NoticeLine notice={notice} />}
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="grid min-w-0 gap-6 lg:sticky lg:top-4">
          <section aria-label="Anteprima del tuo campione" className="grid gap-2">
            {path === "testo" && generated ? (
              <ChampionPreview
                src={generated}
                alt="Il tuo campione creato con IA dalla descrizione"
                nickname={shownNick}
                number={shownNumber}
                caption="Creato dalla tua descrizione"
                prototype={false}
              />
            ) : (
              <ChampionPreview
                src={base?.src ?? null}
                alt={base?.alt ?? ""}
                nickname={shownNick}
                number={shownNumber}
                caption={base ? `Base ${base.label} · ${base.viewLabel}` : ""}
              />
            )}
            <p className="m-0 text-[13px] leading-snug text-[#4a5d7a]">
              Persone inventate, nessuno stemma o sponsor generato: lo stemma ufficiale lo aggiunge l'app. Nickname e numero
              compaiono sulla card; la scritta sulla maglia della base resta quella del prototipo.
            </p>
          </section>
          <MemberCardPanel cards={data.cards} credits={data.credits} nickname={shownNick} />
        </aside>
      </div>
    </main>
  );
}

function NoticeLine({ notice }: { notice: NonNullable<Notice> }) {
  const tone =
    notice.tone === "ok"
      ? "bg-[#e3f7ea] text-[#145a32]"
      : notice.tone === "info"
        ? "bg-[#e8f0fb] text-[#0b2a5b]"
        : "bg-[#fde8e4] text-[#8a2a1c]";
  return (
    <p className={`m-0 rounded-[12px] px-3 py-2.5 text-[14.5px] leading-snug ${tone}`} role={notice.tone === "error" ? "alert" : undefined}>
      {notice.text}
    </p>
  );
}

function BasesPanel({
  minor,
  baseKey,
  onBase,
  allowedKeys,
}: {
  minor: boolean;
  baseKey: string;
  onBase: (k: string) => void;
  allowedKeys: string[];
}) {
  const id = useId();
  const shown = AVATAR_BASES.filter((b) => allowedKeys.includes(b.key));
  return (
    <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
      <legend className="mb-1 p-0">
        <span className="block font-uv text-[30px] uppercase leading-none text-[#0b2a5b]">
          Scegli <span className="text-[#1556c4]">una base</span>
        </span>
        <span className="mt-1 block text-[15px] text-[#3e5272]">Campioni realistici già pronti: poi metti nickname e numero.</span>
      </legend>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {shown.map((b) => {
          const checked = b.key === baseKey;
          return (
            <label
              key={b.key}
              className={`group relative block cursor-pointer overflow-hidden rounded-[18px] outline-offset-2 ring-[3px] motion-safe:transition-shadow has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-[#1556c4] ${
                checked ? "ring-[#ffd600]" : "ring-transparent hover:ring-[#c9d7ea]"
              }`}
            >
              <input
                type="radio"
                name={`${id}-base`}
                value={b.key}
                checked={checked}
                onChange={() => onBase(b.key)}
                className="sr-only"
              />
              <img src={b.src} alt="" width={640} height={794} loading="lazy" className="block aspect-[4/5] w-full object-cover" />
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgb(6_22_50/0.9))]" />
              <span className="absolute inset-x-0 bottom-0 grid justify-items-center p-2.5 text-center text-white">
                <span className="font-uv text-[24px] uppercase leading-none">{b.label}</span>
                <span className="text-[13px] text-[#dbe6f5]">{b.viewLabel}</span>
              </span>
              {checked && (
                <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-[#ffd600] text-[#0b2a5b]">
                  <Check className="size-5" aria-hidden="true" />
                </span>
              )}
              <span className="sr-only">{`${b.label}, ${b.viewLabel}. ${b.alt}`}</span>
            </label>
          );
        })}
      </div>
      {minor ? (
        <p className="m-0 flex gap-2 text-[13.5px] leading-snug text-[#4a5d7a]">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Le basi con il volto sono riservate agli adulti verificati dal club.
        </p>
      ) : (
        <p className="m-0 text-[13.5px] leading-snug text-[#4a5d7a]">
          Immagini create con IA, persone inventate: non sono foto. In attesa di approvazione della Direzione.
        </p>
      )}
    </fieldset>
  );
}

function IdentityFields({
  nickname,
  numberText,
  onNickname,
  onNumber,
  nickError,
  numError,
}: {
  nickname: string;
  numberText: string;
  onNickname: (v: string) => void;
  onNumber: (v: string) => void;
  nickError: string | null;
  numError: string | null;
}) {
  const id = useId();
  const field =
    "scd-focus h-12 w-full rounded-[12px] border-2 bg-white px-3.5 text-[17px] text-[#0b1e3a] placeholder:text-[#7a8aa3] focus:border-[#1556c4] focus:outline-none";
  return (
    <div className="mt-5 grid gap-4 border-t border-[#eef3f9] pt-5 sm:grid-cols-[minmax(0,1fr)_140px]">
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-nick`} className="text-[14px] font-bold text-[#0b2a5b]">
          Nickname <span className="font-normal text-[#4a5d7a]">(max {NICKNAME_MAX} caratteri)</span>
        </label>
        <input
          id={`${id}-nick`}
          value={nickname}
          maxLength={NICKNAME_MAX}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onNickname(e.target.value)}
          placeholder="Es. Lampo"
          aria-invalid={Boolean(nickError)}
          aria-describedby={`${id}-nick-h${nickError ? ` ${id}-nick-e` : ""}`}
          className={`${field} ${nickError ? "border-[#c0392b]" : "border-[#c9d7ea]"}`}
          data-testid="nickname"
        />
        <span id={`${id}-nick-h`} className="text-[13px] text-[#4a5d7a]">
          Un soprannome, non il nome e cognome tuo o di altri.
        </span>
        {nickError && (
          <span id={`${id}-nick-e`} className="text-[13.5px] font-semibold text-[#a32b1d]">
            {nickError}
          </span>
        )}
      </div>
      <div className="grid content-start gap-1.5">
        <label htmlFor={`${id}-num`} className="text-[14px] font-bold text-[#0b2a5b]">
          Numero
        </label>
        <input
          id={`${id}-num`}
          value={numberText}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          onChange={(e) => onNumber(e.target.value.replace(/\D/g, "").slice(0, 2))}
          placeholder="1–99"
          aria-invalid={Boolean(numError)}
          aria-describedby={numError ? `${id}-num-e` : undefined}
          className={`${field} ${numError ? "border-[#c0392b]" : "border-[#c9d7ea]"}`}
          data-testid="shirt-number"
        />
        {numError && (
          <span id={`${id}-num-e`} className="text-[13.5px] font-semibold text-[#a32b1d]">
            {numError}
          </span>
        )}
      </div>
    </div>
  );
}

function TextPanel({
  data,
  nickname,
  numberText,
  onGenerated,
}: {
  data: AvatarStudioData;
  nickname: string;
  numberText: string;
  onGenerated: (url: string | null) => void;
}) {
  const id = useId();
  const generate = useServerFn(generateAvatarFromText);
  const [description, setDescription] = useState("");
  const [quick, setQuick] = useState<QuickSelection>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [remaining, setRemaining] = useState(() => capState(data.caps.usedToday, data.caps.usedMonth));
  const length = [...description].length;
  const live = description.trim() ? moderateText(description) : ({ ok: true } as const);
  const enabled = data.generation.enabled;

  const onGenerate = async () => {
    setNotice(null);
    if (!enabled) return;
    setBusy(true);
    try {
      const n = Number(numberText);
      const r = await generate({ data: { description, quick, nickname, shirtNumber: Number.isFinite(n) ? n : 0 } });
      if (r.ok) {
        onGenerated(r.dataUrl);
        setRemaining(capState(data.caps.daily - r.remainingToday, data.caps.monthly - r.remainingMonth));
        setNotice({ tone: "ok", text: "Fatto: guarda l'anteprima. Il salvataggio delle immagini create con IA non è ancora attivo." });
      } else {
        setNotice({ tone: r.disabled ? "info" : "error", text: r.message });
      }
    } catch {
      setNotice({ tone: "error", text: "Generazione non riuscita, riprova più tardi." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="m-0 font-uv text-[30px] uppercase leading-none text-[#0b2a5b]">
          Descrivilo <span className="text-[#1556c4]">con parole tue</span>
        </h2>
        <p className="mb-0 mt-1 text-[15px] text-[#3e5272]">Più dettagli dai, più ti somiglia. Nessuna foto, nessun dato del volto.</p>
      </div>
      <div className="grid gap-1.5 rounded-[18px] border-2 border-[#1556c4] p-3.5 focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-[#1556c4]/40">
        <label htmlFor={`${id}-desc`} className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#1556c4]">
          Com'è il tuo campione?
        </label>
        <textarea
          id={`${id}-desc`}
          value={description}
          onChange={(e) => setDescription([...e.target.value].slice(0, DESCRIPTION_MAX).join(""))}
          rows={3}
          placeholder="Es. capelli ricci scuri, fisico snello, attaccante veloce, esulta con le braccia al cielo"
          aria-describedby={`${id}-desc-h ${id}-desc-c`}
          aria-invalid={!live.ok}
          className="min-h-[92px] w-full resize-y border-0 bg-transparent p-0 text-[17px] leading-snug text-[#0b1e3a] placeholder:text-[#7a8aa3] focus:outline-none"
        />
        <span className="flex items-end justify-between gap-3">
          <span id={`${id}-desc-h`} className="flex gap-1.5 text-[13px] leading-snug text-[#4a5d7a]">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#1a7f45]" aria-hidden="true" />
            Il testo viene controllato: niente nomi di persone reali, marchi o parole offensive.
          </span>
          <span id={`${id}-desc-c`} className="shrink-0 text-[13px] tabular-nums text-[#4a5d7a]">
            {length}/{DESCRIPTION_MAX}
          </span>
        </span>
      </div>
      {!live.ok && (
        <p className="m-0 rounded-[12px] bg-[#fde8e4] px-3 py-2.5 text-[14px] text-[#8a2a1c]" role="alert">
          {live.message}
        </p>
      )}

      {(Object.keys(QUICK_CHOICES) as QuickKey[]).map((k) => (
        <ChipGroup
          key={k}
          label={QUICK_LABEL[k]}
          options={QUICK_CHOICES[k]}
          value={quick[k] ?? null}
          onChange={(v) => setQuick((q) => ({ ...q, [k]: v ?? undefined }))}
        />
      ))}

      <div className="grid gap-2 rounded-[16px] bg-[#f4f7fb] p-3.5">
        <p className="m-0 flex items-center gap-1.5 text-[13.5px] font-semibold text-[#0b2a5b]">
          <Sparkles className="size-4 text-[#1556c4]" aria-hidden="true" />
          Ogni immagine porta l'etichetta «{AI_LABEL}».
        </p>
        <p className="m-0 text-[13.5px] leading-snug text-[#4a5d7a]">
          Massimo {data.caps.daily} creazioni al giorno e {data.caps.monthly} al mese
          {enabled ? ` · oggi ne restano ${remaining.remainingToday}` : ""}.
          {treatAsMinor(data.ageBand) ? " Per il tuo account il campione è sempre di spalle." : ""}
        </p>
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!enabled || busy || !live.ok}
          aria-describedby={!enabled ? `${id}-off` : undefined}
          className="scd-focus inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#0b2a5b] px-5 font-uv text-[22px] uppercase text-white hover:bg-[#123a7a] disabled:cursor-not-allowed disabled:bg-[#c3cede] disabled:text-[#3e5272] sm:w-auto sm:justify-self-start"
          data-testid="generate-champion"
        >
          {busy ? (
            <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
          ) : enabled ? (
            <Sparkles className="size-5" aria-hidden="true" />
          ) : (
            <Lock className="size-5" aria-hidden="true" />
          )}
          {enabled ? "Crea il mio campione" : GEN_DISABLED_LABEL}
        </button>
        {!enabled && data.generation.reason && (
          <p id={`${id}-off`} className="m-0 text-[13.5px] leading-snug text-[#4a5d7a]" data-testid="gen-disabled">
            {genDisabledText(data.generation.reason)} Intanto puoi usare le basi pronte.
          </p>
        )}
        <div aria-live="polite">{notice && <NoticeLine notice={notice} />}</div>
      </div>
    </div>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={`${id}-l`} className="grid gap-2">
      <span id={`${id}-l`} className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#3e5272]">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o === value;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? null : o)}
              className={`scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-[15px] font-semibold motion-safe:transition-colors ${
                on ? "border-[#0b2a5b] bg-[#0b2a5b] text-white" : "border-[#d5e0ee] bg-white text-[#0b1e3a] hover:border-[#9fb4d2]"
              }`}
            >
              {on && <Check className="size-4 text-[#ffd600]" aria-hidden="true" />}
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PhotoPanel({ data }: { data: AvatarStudioData }) {
  const state = photoPathFor(data.ageBand);
  return (
    <div className="grid gap-4" data-testid="photo-locked">
      <div>
        <h2 className="m-0 font-uv text-[30px] uppercase leading-none text-[#0b2a5b]">
          Dalla tua foto <span className="text-[#1556c4]">· {state.title}</span>
        </h2>
        <p className="mb-0 mt-1 text-[15px] text-[#3e5272]">
          Un selfie, il consenso, e l'IA crea un avatar che ti somiglia. Poi la foto viene cancellata.
        </p>
      </div>
      <div className="grid gap-3 rounded-[18px] border-2 border-dashed border-[#b8c7dc] bg-[#f4f7fb] p-5 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#e3ecf8] text-[#0b2a5b]">
          <Lock className="size-7" aria-hidden="true" />
        </span>
        <p className="m-0 text-[17px] font-bold text-[#0b2a5b]">In arrivo: serve il consenso e la valutazione privacy (DPIA)</p>
        <p className="m-0 text-[14.5px] leading-snug text-[#3e5272]">{state.text}</p>
        <button
          type="button"
          disabled
          className="mx-auto inline-flex min-h-12 cursor-not-allowed items-center gap-2 rounded-[14px] bg-[#c3cede] px-5 text-[16px] font-bold text-[#3e5272]"
        >
          <Camera className="size-5" aria-hidden="true" />
          Carica foto · non disponibile
        </button>
      </div>
      <ul className="m-0 grid list-none gap-2 p-0 text-[14.5px] leading-snug text-[#3e5272]">
        <Bullet icon={<ShieldCheck className="size-4 text-[#1a7f45]" aria-hidden="true" />}>
          La foto non verrà mai conservata: serve solo a creare l'avatar e poi si cancella.
        </Bullet>
        <Bullet icon={<ImageIcon className="size-4 text-[#1556c4]" aria-hidden="true" />}>
          Prima gli adulti, con consenso specifico e revocabile.
        </Bullet>
      </ul>
      {state.familyRoute && (
        <div className="grid gap-2 rounded-[16px] bg-[#e8f0fb] p-4">
          <p className="m-0 text-[14.5px] leading-snug text-[#0b2a5b]">
            Per gli under 18 l'avatar dalla foto passerà solo dal profilo Famiglia, con il consenso del genitore.
          </p>
          <Link
            to={state.familyRoute}
            className="scd-focus inline-flex min-h-11 w-fit items-center rounded-[12px] bg-[#0b2a5b] px-4 text-[15px] font-bold text-white"
          >
            Vai al profilo Famiglia
          </Link>
        </div>
      )}
    </div>
  );
}

function Bullet({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

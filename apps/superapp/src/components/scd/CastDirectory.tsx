import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";

import { CastAskButton } from "@/components/scd/CastPresence";
import { CastBadge, PersonaAvatar } from "@/components/scd/SkyJolly";
import { PUBLIC_CHAT_AREAS } from "@/lib/assistant";
import { CAST_FACES, CAST_PERSONAS, FACE_IDS, PRESENCE_HOMES, TIP_ONLY_IDS, VERA_PRESENCE, type CastLink, type FaceId, type TipOnlyId } from "@/lib/cast-personas";

/** Order of the directory (UD-121): Vera first, then the four faces, then the "consigli del giorno" group. */
export const CAST_DIRECTORY_ORDER = {
  chat: "vera",
  faces: FACE_IDS,
  tips: TIP_ONLY_IDS,
} as const satisfies { chat: "vera"; faces: readonly FaceId[]; tips: readonly TipOnlyId[] };

function HomeLink({ home }: { home: CastLink & { reserved: boolean } }) {
  return (
    <Link
      to={home.to as never}
      {...(home.hash ? { hash: home.hash } : {})}
      className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3 text-[14px] font-semibold"
    >
      {home.reserved && <Lock className="size-3.5" aria-hidden="true" />}
      {home.label}
      {home.reserved && <span className="sr-only"> (area riservata, serve l'accesso)</span>}
    </Link>
  );
}

function FaceRow({ id }: { id: FaceId }) {
  const f = CAST_FACES[id];
  // "Chiedi a Vera" with the area only where the area answers with public data (this page is public).
  const canAsk = f.area !== null && PUBLIC_CHAT_AREAS.includes(f.area);
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-background p-3.5" data-cast-row={id} data-cast-group="face">
      <div className="flex items-center gap-3">
        {id === "sky" ? <PersonaAvatar persona="sky" size={44} /> : <CastBadge id={id} size={44} />}
        <div className="min-w-0">
          <b className="block text-[16px] leading-tight">{f.label}</b>
          <span className="block text-[13.5px] leading-snug text-muted-foreground">{f.does}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <HomeLink home={f.home} />
        {canAsk && <CastAskButton area={f.area} tone="quiet" />}
      </div>
    </li>
  );
}

/**
 * "I nostri personaggi" (UD-121, Direzione 14/10/2026: "Personaggi semplificati"), on a public page:
 * 1. Vera, the club reception and the one chat of the app;
 * 2. the four faces with concrete actions (Chef della Club House, Volto sponsor, Mentore dei tornei, Sky only in the
 *    under-14 world), each with one line on what it does for you and where it lives;
 * 3. a small "Consigli del giorno" group: the characters that are only a short rotating tip, without chat.
 * Names still to be decided show the role label; portraits only when approved.
 */
export function CastDirectory() {
  return (
    <div className="flex flex-col gap-4" data-testid="cast-directory">
      <section
        aria-labelledby="cast-vera-t"
        className="flex min-w-0 flex-col gap-3 rounded-xl border-2 border-[#ffd600] bg-background p-4"
        data-cast-row="vera"
        data-cast-group="chat"
      >
        <div className="flex items-center gap-3">
          <PersonaAvatar persona="vera" size={52} />
          <div className="min-w-0">
            <p className="m-0 text-[12.5px] font-bold uppercase tracking-wide text-[#0860A8]">L'unica chat dell'app</p>
            <h3 id="cast-vera-t" className="m-0 text-[18px] font-extrabold leading-tight">
              {VERA_PRESENCE.label}, {VERA_PRESENCE.role.toLowerCase()}
            </h3>
            <p className="m-0 text-[14px] leading-snug text-muted-foreground">{VERA_PRESENCE.does}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CastAskButton />
        </div>
      </section>

      <div>
        <h3 className="m-0 mb-2 text-[16px] font-bold">I volti delle aree</h3>
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
          {CAST_DIRECTORY_ORDER.faces.map((id) => (
            <FaceRow key={id} id={id} />
          ))}
        </ul>
      </div>

      <div data-cast-group="tips">
        <h3 className="m-0 mb-2 flex items-center gap-1.5 text-[16px] font-bold">
          <Sparkles className="size-4 text-[#0860A8]" aria-hidden="true" />
          Consigli del giorno
        </h3>
        <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {CAST_DIRECTORY_ORDER.tips.map((id) => {
            const d = CAST_PERSONAS[id];
            const home = PRESENCE_HOMES[id];
            return (
              <li key={id} className="flex min-w-0 items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2" data-cast-row={id}>
                <CastBadge id={id} size={32} />
                <span className="min-w-0 text-[13.5px] leading-snug">
                  <b className="block text-[14.5px]">{d.label}</b>
                  {d.does}{" "}
                  <Link to={home.to as never} {...(home.hash ? { hash: home.hash } : {})} className="scd-focus font-semibold text-[#1556c4] underline underline-offset-2">
                    {home.label}
                    {home.reserved && <span className="sr-only"> (area riservata)</span>}
                  </Link>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="m-0 text-[13.5px] leading-snug text-muted-foreground">
        Sono personaggi originali dell'app, non persone reali: alcuni nomi sono ancora da decidere. Iride risponde solo con le informazioni della società, non conferma ordini né
        incassa, e per chi è in difficoltà indica sempre una persona vera e il referente Tutela minori. I consigli del giorno sono testi brevi e generali, mai consigli medici o
        psicologici personali.
      </p>
    </div>
  );
}

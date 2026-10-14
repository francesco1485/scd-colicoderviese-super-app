import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { CastAskButton } from "@/components/scd/CastPresence";
import { CastBadge, PersonaAvatar } from "@/components/scd/SkyJolly";
import { PUBLIC_CAST_PERSONAS } from "@/lib/assistant";
import { CAST_PERSONAS, GENNY_PRESENCE, PRESENCE_HOMES, type PresenceId } from "@/lib/cast-personas";

interface Row {
  id: PresenceId | "crovi";
  label: string;
  role: string;
  home: { label: string; to: string; hash?: string; reserved: boolean };
  canAsk: boolean;
}

/** Order of the directory: the public helper first, then the people of the club, then the content characters. */
export const CAST_DIRECTORY_ORDER: readonly PresenceId[] = ["biglietteria", "mentore-tornei", "volto-sponsor", "genny", "accoglienza-chef", "acanfora", "era", "preparatore-atletico", "mental-coach", "musica-relax"];

function rows(): Row[] {
  const out: Row[] = [
    { id: "crovi", label: "Crovi", role: "Il tuttologo del calcio dilettanti: risponde nelle pagine pubbliche", home: { label: "Ogni pagina pubblica", to: "/", reserved: false }, canAsk: false },
  ];
  for (const id of CAST_DIRECTORY_ORDER) {
    if (id === "genny") {
      out.push({ id, label: GENNY_PRESENCE.label, role: `${GENNY_PRESENCE.role}: per staff e soci adulti`, home: PRESENCE_HOMES.genny, canAsk: false });
      continue;
    }
    const d = CAST_PERSONAS[id];
    out.push({ id, label: d.label, role: d.role, home: PRESENCE_HOMES[id], canAsk: PUBLIC_CAST_PERSONAS.includes(id) });
  }
  return out;
}

/**
 * "I nostri personaggi" (UD-114): who helps where, on a public page. Characters whose name is still to be decided
 * show their role label; portraits only when approved. "Chiedi a …" only for the characters that answer with public
 * data; the others live in reserved areas and ask to sign in. Sky, the mascot of the under-14s, is mentioned without
 * a chat here (Direzione 13/10/2026: Sky never fronts public pages).
 */
export function CastDirectory() {
  return (
    <div className="flex flex-col gap-3" data-testid="cast-directory">
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
        {rows().map((r) => (
          <li key={r.id} className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-background p-3.5" data-cast-row={r.id}>
            <div className="flex items-center gap-3">
              {r.id === "crovi" ? <PersonaAvatar persona="crovi" size={44} /> : <CastBadge id={r.id} size={44} />}
              <div className="min-w-0">
                <b className="block text-[16px] leading-tight">{r.label}</b>
                <span className="block text-[13.5px] leading-snug text-muted-foreground">{r.role}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={r.home.to as never}
                {...(r.home.hash ? { hash: r.home.hash } : {})}
                className="scd-focus inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3 text-[14px] font-semibold"
              >
                {r.home.reserved && <Lock className="size-3.5" aria-hidden="true" />}
                {r.home.label}
                {r.home.reserved && <span className="sr-only"> (area riservata, serve l'accesso)</span>}
              </Link>
              {r.canAsk && r.id !== "crovi" && <CastAskButton id={r.id} />}
            </div>
          </li>
        ))}
      </ul>
      <p className="m-0 text-[13.5px] leading-snug text-muted-foreground">
        Sono personaggi originali dell'app, non persone reali: alcuni nomi sono ancora da decidere. Rispondono solo con le informazioni della società, non confermano ordini né
        incassano, e per chi è in difficoltà indicano sempre una persona vera e il referente Tutela minori. Sky, la mascotte portafortuna, accompagna i soci più piccoli nelle loro
        aree.
      </p>
    </div>
  );
}

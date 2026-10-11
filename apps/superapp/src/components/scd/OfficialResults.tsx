import { ExternalLink, Trophy } from "lucide-react";

import { OFFICIAL_RESULT_LINKS, RESULTS_VERIFIED_ON, SECONDARY_RESULT_LINKS, resultLinkFor } from "@/lib/official-links";

const verifiedOn = RESULTS_VERIFIED_ON.split("-").reverse().join("/");

/**
 * "Risultati ufficiali" block: the federation pages where scores and standings live.
 * The app shows no score of its own. Tone "light" on white pages, "dark" on the outside palette.
 */
export function OfficialResults({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  const dark = tone === "dark";
  const card = dark ? "bg-white/[0.08] text-white hover:bg-white/[0.14]" : "bg-white text-[var(--scd-ink)] shadow-[var(--scd-card-shadow)] hover:bg-[#f4f8fc]";
  const sub = dark ? "text-[#cfe3f5]" : "text-[var(--scd-sub)]";
  return (
    <section aria-labelledby="risultati-ufficiali-t" className={className} data-testid="official-results">
      <h2 id="risultati-ufficiali-t" className={`m-0 flex items-center gap-2 font-title text-[26px] font-black uppercase leading-none ${dark ? "text-white" : "text-[var(--scd-ink)]"}`}>
        <Trophy className={`size-6 ${dark ? "text-[var(--out-yellow)]" : "text-[var(--scd-blue)]"}`} strokeWidth={2.2} aria-hidden="true" />
        Risultati ufficiali
      </h2>
      <p className={`m-0 mt-1 text-[14px] leading-snug ${sub}`}>
        Risultati e classifiche li pubblica la federazione: qui trovi i link diretti. Campionati verificati su gare.lnd.it il {verifiedOn}.
      </p>
      <ul className="m-0 mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
        {OFFICIAL_RESULT_LINKS.map((l) => (
          <li key={l.id}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`scd-focus flex min-h-[56px] items-center gap-3 rounded-[12px] px-3 py-2 transition-colors duration-150 ${card}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold leading-tight">{l.label}</span>
                <span className={`block text-[13px] leading-tight ${sub}`}>{l.detail}</span>
              </span>
              <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
              <span className="sr-only">(si apre in una nuova scheda)</span>
            </a>
          </li>
        ))}
      </ul>
      <p className={`m-0 mt-3 text-[13px] leading-snug ${sub}`}>
        Altre fonti (non ufficiali):{" "}
        {SECONDARY_RESULT_LINKS.map((l, i) => (
          <span key={l.id}>
            {i > 0 && " · "}
            <a href={l.url} target="_blank" rel="noopener noreferrer" className={`font-semibold underline ${dark ? "text-white" : "text-[var(--scd-blue)]"}`}>
              {l.label}
            </a>
          </span>
        ))}
      </p>
    </section>
  );
}

/** One-line link to the official results of a group, for match cards. Renders nothing when not verified. */
export function GroupResultsLink({ group, className = "" }: { group: string | undefined | null; className?: string }) {
  const l = resultLinkFor(group);
  if (!l) return null;
  return (
    <a href={l.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 font-bold text-[var(--scd-blue)] underline ${className}`}>
      Risultati ufficiali · {l.label.split(" · ")[1] ?? l.label}
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  );
}

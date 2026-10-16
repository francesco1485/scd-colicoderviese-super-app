/**
 * Entry from Direzione → Accessi to Direzione → Ruoli (r111, Francesco 15/10/2026): a brushed navy METAL band with the
 * three platform colours (SCD ONE azzurro, CORE navy, GROW sole) and one gold action. It links, it never grants.
 */
import { Link } from "@tanstack/react-router";
import { ChevronRight, Layers } from "lucide-react";

import { TONES } from "@/components/home/tones";
import { PLATFORMS, PLATFORM_LABEL, PLATFORM_TONE } from "@/lib/role-templates";

export function RolesLink() {
  return (
    <section data-testid="roles-link" aria-labelledby="roles-link-title" className="scd-band overflow-hidden rounded-2xl px-4 py-4 text-white sm:px-[18px]">
      <p className="m-0 text-[12.5px] font-bold uppercase tracking-[0.14em] text-[#ffd84a]">Deleghe</p>
      <h2 id="roles-link-title" className="m-0 mt-0.5 flex items-center gap-2 text-[19px] font-bold leading-tight">
        <Layers className="size-5 flex-none text-[#ffd84a]" aria-hidden="true" />
        Ruoli per piattaforma
      </h2>
      <p className="m-0 mt-1.5 text-[14.5px] leading-snug text-[#dbe5f7]">
        Gruppi di sezioni pronti da caricare sulle persone. Li creano solo il Presidente e il Direttore Generale; da soli non aprono nulla.
      </p>
      <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0" aria-label="Piattaforme">
        {PLATFORMS.map((p) => (
          <li key={p} className={`${TONES[PLATFORM_TONE[p]].band} rounded-full px-2.5 py-1 text-[13px] font-bold ring-1 ring-white/30`}>
            {PLATFORM_LABEL[p]}
          </li>
        ))}
      </ul>
      <Link to="/direzione/ruoli" className="scd-gold scd-focus mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-[12px] px-4 text-[15px] font-bold">
        Apri i ruoli
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

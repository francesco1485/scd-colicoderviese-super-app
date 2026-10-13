import { Link } from "@tanstack/react-router";
import { MapPin, Phone, TriangleAlert } from "lucide-react";

import { CastPortrait } from "@/components/scd/CastPortrait";
import { Card } from "@/components/scd/interior-ui";
import {
  ACANFORA_DISCLAIMER,
  CALL_112_WHEN,
  HEAD_KNOCK_RULE,
  KNOCK_STEPS,
  firstAidRooms,
} from "@/lib/first-aid-info";

/**
 * Dottor Acanfora's corner of the Infermeria: what to do for common sports knocks (RICE in plain
 * words), when to call 112, and where the infermeria room is when the facility data records it.
 * General information only, never a diagnosis. His picture shows once it is in the app.
 */
export function AcanforaCard({ portraitReady }: { portraitReady?: boolean }) {
  const rooms = firstAidRooms();
  return (
    <Card
      id="inf-acanfora"
      title="L'angolo del Dottor Acanfora"
      sub="Botte, distorsioni e colpi in campo: cosa fare subito, in parole semplici."
    >
      <div className="flex flex-col gap-4 px-4 pb-5 sm:px-[18px] lg:flex-row lg:items-start">
        <CastPortrait
          id="acanfora"
          ready={portraitReady}
          className="h-[150px] self-center lg:h-[220px] lg:self-start"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <section aria-labelledby="inf-botte">
            <h3 id="inf-botte" className="m-0 text-[17px] font-bold">
              Botta o distorsione
            </h3>
            <ol className="m-0 mt-2 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2" data-testid="acanfora-steps">
              {KNOCK_STEPS.map((s, i) => (
                <li key={s.key} className="flex gap-3 rounded-xl bg-[#eef5fc] px-3.5 py-3">
                  <span
                    aria-hidden="true"
                    className="flex size-8 flex-none items-center justify-center rounded-full bg-[#0860A8] text-[15px] font-black text-white"
                  >
                    {s.title.charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <b className="block text-[15.5px] leading-snug text-[#0b2a5b]">
                      <span className="sr-only">Passo {i + 1}: </span>
                      {s.title}
                    </b>
                    <span className="mt-0.5 block text-[14.5px] leading-snug">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section
            aria-labelledby="inf-112"
            className="rounded-xl bg-[var(--in-crit-bg)] px-4 py-3.5 text-[var(--in-crit)]"
          >
            <h3 id="inf-112" className="m-0 flex items-center gap-2 text-[17px] font-bold">
              <TriangleAlert className="size-5 flex-none" strokeWidth={1.8} aria-hidden="true" />
              Chiama subito il 112 se
            </h3>
            <ul className="m-0 mt-2 list-disc space-y-1 pl-5 text-[14.5px] leading-snug">
              {CALL_112_WHEN.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <a
              href="tel:112"
              className="scd-focus mt-3 inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-[var(--in-crit)] px-4 text-[16px] font-bold text-white"
            >
              <Phone className="size-5" strokeWidth={2} aria-hidden="true" />
              Chiama il 112
            </a>
          </section>

          <p className="m-0 rounded-xl border border-[var(--in-line)] px-3.5 py-3 text-[14.5px] leading-snug">
            <b>{HEAD_KNOCK_RULE.split(":")[0]}:</b>
            {HEAD_KNOCK_RULE.slice(HEAD_KNOCK_RULE.indexOf(":") + 1)}
          </p>

          {rooms.length > 0 && (
            <p className="m-0 flex gap-2 text-[14.5px] leading-snug" data-testid="acanfora-rooms">
              <MapPin className="mt-[2px] size-[18px] flex-none text-[#0860A8]" strokeWidth={1.8} aria-hidden="true" />
              <span>
                Locale infermeria: {rooms.map((r) => r.site).join(", ")}.{" "}
                <Link to="/impianti" className="font-semibold text-[var(--scd-blue,#0860A8)] underline underline-offset-2">
                  Vedi la mappa degli impianti
                </Link>
              </span>
            </p>
          )}

          <p role="note" className="m-0 rounded-xl bg-[var(--in-info-bg)] px-3.5 py-3 text-[14px] leading-snug text-[var(--in-info)]">
            {ACANFORA_DISCLAIMER}
          </p>
        </div>
      </div>
    </Card>
  );
}

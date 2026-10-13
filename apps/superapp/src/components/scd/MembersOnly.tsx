/**
 * Members-only screen of a public-chrome page (UD-100, Direzione 13/10/2026: "Le squadre sono dentro non fuori").
 * Same gate pattern as the reserved areas (AccessScreen): the route loader asks the server for the session and,
 * when nobody is signed in, renders this screen instead of loading any team data. It describes and routes only:
 * no data, no names, no calendar.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";

import { ClubCrestOfficial } from "@/components/SiteChrome";

/** <head> of a members-only page: honest description, never indexed. */
export function membersOnlyHead(title: string) {
  const description =
    "Le squadre della S.C.D. ColicoDerviese sono riservate ai soci: entra con il tuo account per vederle.";
  return {
    meta: [
      { title: `${title} — S.C.D. ColicoDerviese` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — S.C.D. ColicoDerviese` },
      { property: "og:description", content: description },
      { name: "robots", content: "noindex" },
    ],
  };
}

export function MembersOnlyScreen({
  title = "Le squadre sono riservate ai soci",
  text = "Entra per vederle: rose, gare e notizie di ogni squadra della ColicoDerviese.",
  next,
}: {
  title?: string;
  text?: string;
  /** Page to return to after signing in. */
  next: string;
}) {
  return (
    <main
      data-screen="members-only"
      className="grid min-h-[calc(100dvh-var(--pub-header-h,64px))] place-items-center bg-[#eef3f9] px-4 py-10 font-sans text-[#0b1e3a]"
    >
      <section
        aria-labelledby="members-only-t"
        className="w-full max-w-[460px] overflow-hidden rounded-[20px] bg-white text-center shadow-[0_1px_2px_rgb(11_42_91/0.06),0_18px_40px_-18px_rgb(11_42_91/0.35)]"
      >
        <div className="grid justify-items-center gap-3 bg-[#0b2a5b] px-6 pb-6 pt-7 text-white">
          <ClubCrestOfficial size={64} />
          <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-[#ffd600] px-2.5 text-[12.5px] font-bold text-[#0b1e3a]">
            <Lock className="size-3.5" strokeWidth={2} aria-hidden="true" />
            Riservato ai soci
          </span>
        </div>
        <div className="grid gap-4 px-6 pb-7 pt-6">
          <h1
            id="members-only-t"
            className="m-0 font-uv text-[30px] uppercase leading-[0.98] text-[#0b2a5b]"
          >
            {title}
          </h1>
          <p className="m-0 text-[15.5px] leading-snug text-[#4a5d7a]">
            {text}
          </p>
          <Link
            to="/accedi"
            search={{ next }}
            className="scd-focus inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#ffd600] text-[16.5px] font-bold text-[#0b1e3a] transition-[filter] duration-150 hover:brightness-95"
            data-testid="members-only-enter"
          >
            Entra
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
          <p className="m-0 text-[14px] text-[#4a5d7a]">
            Non hai ancora un account?{" "}
            <Link
              to="/registrati"
              className="scd-focus rounded-sm font-semibold text-[#1556c4] underline underline-offset-4"
            >
              Registrati
            </Link>
          </p>
          <p className="m-0 border-t border-[#e6edf6] pt-4 text-[13px] leading-snug text-[#5a6b85]">
            Il calendario gare resta pubblico:{" "}
            <Link
              to="/calendario"
              className="scd-focus rounded-sm font-semibold text-[#1556c4] underline underline-offset-4"
            >
              apri il calendario
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}

/**
 * Time-limited initiative page (Direzione 13/10/2026 15:57): lezioni tecnico-coordinative del mister Alessandro
 * Perico in collaborazione con la ColicoDerviese. Clean HTML text is the primary content; the coach's flyer is a
 * secondary visual (stock photos, not SCD athletes). Outside its window (server Rome day) the page is a 404.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Phone } from "lucide-react";

import { METAL_WRAP, MetalPageHeader } from "@/components/scd/MetalPageHeader";
import { dayMonth } from "@/lib/initiatives";
import { getInitiative } from "@/lib/initiatives.functions";
import { PUBLIC_PAGES, pageHead } from "@/lib/share";

const INITIATIVE_ID = "lezioni-tecnico-coordinative-perico";

export const Route = createFileRoute("/eventi/lezioni-tecnico-coordinative")({
  loader: async () => {
    const item = await getInitiative({ data: { id: INITIATIVE_ID } });
    if (!item) throw notFound();
    return item;
  },
  head: () => pageHead(PUBLIC_PAGES.lezioniTecnicoCoordinative),
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-bold">Iniziativa non disponibile</h1>
      <p className="mt-2 text-muted-foreground">
        Questa iniziativa non è pubblicata in questo periodo.
      </p>
      <Link
        to="/eventi"
        className="mt-4 inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-bold uppercase"
      >
        Tutti gli eventi
      </Link>
    </main>
  ),
  component: InitiativePage,
});

function InitiativePage() {
  const item = Route.useLoaderData();
  return (
    <main data-screen="initiative" data-testid={`initiative-${item.id}`}>
      <MetalPageHeader kicker={`Iniziativa · fino al ${dayMonth(item.showUntil)}`} title={item.title}>
        {item.subtitle}
      </MetalPageHeader>
      <section
        className={`${METAL_WRAP} grid gap-5 pb-10 pt-4 lg:pt-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-start`}
      >
        <article className="card-premium grid gap-4 p-5 md:p-7">
          <div>
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.12em] text-[#1556c4]">
              Il mister
            </p>
            <h2 className="mt-1 text-2xl font-bold">{item.organizer.name}</h2>
            <ul className="mt-2 grid list-none gap-1 p-0 text-[15px] text-muted-foreground">
              {item.organizer.credentials.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <p className="m-0 text-[16px] leading-relaxed">{item.text}</p>
          <div
            className="grid gap-2 rounded-[16px] bg-[#eef3f9] p-4"
            data-testid="initiative-contact"
          >
            <p className="m-0 text-[13px] font-bold uppercase tracking-[0.06em] text-[#1556c4]">
              {item.contact.label}
            </p>
            <p className="m-0 select-text font-uv text-[30px] leading-none text-[#0b2a5b]">
              {item.contact.display}
            </p>
            <a
              href={`tel:${item.contact.tel}`}
              className="surface-sun inline-flex h-11 w-fit items-center gap-2 rounded-lg px-4 text-sm font-bold uppercase"
            >
              <Phone className="size-4" aria-hidden="true" />
              Chiama il mister
              <span className="sr-only"> al numero {item.contact.display}</span>
            </a>
          </div>
          <p className="m-0 text-[13px] text-muted-foreground">
            Iniziativa del mister in collaborazione con la S.C.D. ColicoDerviese: giorni, orari e costi sono indicati
            direttamente da lui.
          </p>
          <Link
            to="/eventi"
            className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-semibold text-[#1556c4]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Tutti gli eventi
          </Link>
        </article>
        <figure className="m-0 overflow-hidden rounded-[20px] bg-white shadow-premium">
          <img
            src={item.flyer.src}
            alt={item.flyer.alt}
            width={1080}
            height={1350}
            loading="lazy"
            decoding="async"
            className="h-auto w-full"
          />
          <figcaption className="px-4 py-3 text-[12.5px] text-muted-foreground">
            Volantino del mister. {item.flyer.note}
          </figcaption>
        </figure>
      </section>
    </main>
  );
}

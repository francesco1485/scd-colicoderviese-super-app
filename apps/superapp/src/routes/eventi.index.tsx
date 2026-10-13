import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHero, heroOverlapCls } from "@/components/ui-kit";
import { getPublicFeed } from "@/lib/club.functions";

export const Route = createFileRoute("/eventi/")({
  loader: () => getPublicFeed(),
  head: () => ({
    meta: [
      { title: "Eventi — S.C.D. ColicoDerviese" },
      {
        name: "description",
        content:
          "Open day, tornei e serate biancoblù pubblicati dalla S.C.D. ColicoDerviese sull'Alto Lago di Como.",
      },
      { property: "og:title", content: "Eventi — S.C.D. ColicoDerviese" },
      {
        property: "og:description",
        content:
          "Open day, tornei e serate biancoblù della S.C.D. ColicoDerviese.",
      },
    ],
  }),
  component: Eventi,
});

function Eventi() {
  const feed = Route.useLoaderData();
  const eventi = feed.items.filter((i) => i.kind === "event");
  return (
    <main>
      <PageHero eyebrow="Vivere il club" title="Eventi">
        Iscrizioni gratuite oggi; eventuali quote future saranno indicate su
        ogni evento.
      </PageHero>
      <section className={`${heroOverlapCls} mx-auto max-w-6xl px-4 pb-5`}>
        <Link
          to="/eventi/christmas-lario-cup"
          className="relative flex min-h-[220px] items-end overflow-hidden rounded-[20px] bg-[#021f4f] text-white shadow-premium"
          data-testid="eventi-clc"
        >
          <img
            src="/media/eventi/christmas-lario-cup-2026-maschile.webp"
            alt=""
            className="absolute inset-0 size-full object-cover object-top opacity-75"
            loading="lazy"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgb(2_31_79/0.95)]"
          />
          <span className="relative grid gap-1 p-5">
            <span className="text-sm font-bold uppercase tracking-wider text-[#ffd21f]">
              Torneo protetto · 8 dicembre 2026
            </span>
            <b className="font-uv text-[34px] uppercase leading-[0.92]">
              Christmas Lario Cup
            </b>
            <span className="text-[15px] text-[#dbe7ff]">
              1ª edizione a Colico e Dervio, iscrizioni aperte.
            </span>
          </span>
        </Link>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-4 md:grid-cols-3">
        {eventi.length === 0 ? (
          <div className="card-premium p-5 md:col-span-3">
            <p className="m-0 text-[16px] font-bold">
              Gli altri eventi della stagione
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open day, tornei e serate compaiono qui appena la società li
              pubblica. Intanto trovi gare e allenamenti nel calendario e le
              novità nel feed del club.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/calendario"
                className="surface-sun inline-flex h-11 items-center rounded-lg px-4 text-sm font-bold uppercase"
              >
                Calendario
              </Link>
              <Link
                to="/"
                className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-bold uppercase"
              >
                Dal club
              </Link>
            </div>
          </div>
        ) : (
          eventi.map((e) => (
            <article key={e.id} className="overflow-hidden card-premium">
              {e.image && (
                <img
                  src={e.image}
                  alt={e.title}
                  loading="lazy"
                  className="h-44 w-full object-cover"
                />
              )}
              <div className="space-y-2 p-5">
                {e.startAt && (
                  <p className="eyebrow">
                    {new Date(e.startAt).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                )}
                <h2 className="text-xl font-bold">{e.title}</h2>
                {e.body && (
                  <p className="text-sm text-muted-foreground">{e.body}</p>
                )}
                {e.link && (
                  <a
                    href={e.link}
                    className="surface-sun inline-block rounded-lg px-4 py-2 text-sm font-bold uppercase"
                  >
                    Partecipa
                  </a>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { PageHero, SyncPlaceholder } from "@/components/ui-kit";
import { getPublicFeed } from "@/lib/club.functions";

export const Route = createFileRoute("/eventi")({
  loader: () => getPublicFeed(),
  head: () => ({
    meta: [
      { title: "Eventi — S.D.C. ColicoDerviese" },
      { name: "description", content: "Open day, tornei e serate biancoblù pubblicati dalla S.D.C. ColicoDerviese sull'Alto Lago di Como." },
      { property: "og:title", content: "Eventi — S.D.C. ColicoDerviese" },
      { property: "og:description", content: "Open day, tornei e serate biancoblù della S.D.C. ColicoDerviese." },
    ],
  }),
  component: Eventi,
});

function Eventi() {
  const feed = Route.useLoaderData();
  const eventi = feed.items.filter((i) => i.kind === "event");
  return (
    <main>
      <PageHero eyebrow="Vivere il club" title="Eventi">Iscrizioni gratuite oggi; eventuali quote future saranno indicate su ogni evento.</PageHero>
      <section className="mx-auto -mt-8 grid max-w-6xl gap-5 px-4 md:grid-cols-3">
        {eventi.length === 0 ? (
          <>
            <SyncPlaceholder label="Prossimi eventi" />
            <SyncPlaceholder label="Tornei" />
            <SyncPlaceholder label="Open day" />
          </>
        ) : (
          eventi.map((e) => (
            <article key={e.id} className="overflow-hidden card-premium">
              {e.image && <img src={e.image} alt={e.title} loading="lazy" className="h-44 w-full object-cover" />}
              <div className="space-y-2 p-5">
                {e.startAt && <p className="eyebrow">{new Date(e.startAt).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}</p>}
                <h2 className="text-xl font-bold">{e.title}</h2>
                {e.body && <p className="text-sm text-muted-foreground">{e.body}</p>}
                {e.link && <a href={e.link} className="surface-sun inline-block rounded-lg px-4 py-2 text-sm font-bold uppercase">Partecipa</a>}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { NotActiveNote, ProposalForm } from "@/components/giving/public";
import { PageHero, heroOverlapCls } from "@/components/ui-kit";
import { getGivingPublic } from "@/lib/giving.functions";
import { useSession } from "@/lib/use-session";

/** Proponi un miglioramento (UD-113): anyone, signed in or not, optionally anonymous. Never public until staff publish. */
export const Route = createFileRoute("/sostieni/proponi")({
  loader: () => getGivingPublic(),
  head: () => ({
    meta: [
      { title: "Proponi un miglioramento — S.C.D. ColicoDerviese" },
      { name: "description", content: "Segnala alla S.C.D. ColicoDerviese un miglioramento o un bisogno per campi, palestra, infermeria, club house o sicurezza, anche in forma anonima." },
    ],
  }),
  component: ProponiPage,
});

function ProponiPage() {
  const { engine } = Route.useLoaderData();
  const { session } = useSession();
  const active = engine === "applied";
  return (
    <main>
      <PageHero eyebrow="Sostieni il club" title={<>Proponi un <span className="text-accent">miglioramento</span></>} clamp={false}>
        Campi, palestra, infermeria, club house, sicurezza: dicci cosa servirebbe. Puoi restare anonimo e dire se puoi dare una mano.
      </PageHero>
      <section className={`${heroOverlapCls} mx-auto mb-16 max-w-3xl px-4`}>
        <div className="card-premium space-y-5 p-5 sm:p-6">
          {!active && <NotActiveNote />}
          <ProposalForm active={active} signedIn={Boolean(session?.user)} />
        </div>
      </section>
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { NotActiveNote, ProposalForm } from "@/components/giving/public";
import { ShareButton } from "@/components/scd/ShareButton";
import { PageHero, heroOverlapCls } from "@/components/ui-kit";
import { getGivingPublic } from "@/lib/giving.functions";
import { SHARE_PAGES, pageHead } from "@/lib/share";
import { useSession } from "@/lib/use-session";

/** Proponi un miglioramento (UD-113): anyone, signed in or not, optionally anonymous. Never public until staff publish. */
export const Route = createFileRoute("/sostieni/proponi")({
  loader: () => getGivingPublic(),
  head: () => pageHead(SHARE_PAGES.proponi),
  component: ProponiPage,
});

function ProponiPage() {
  const { engine } = Route.useLoaderData();
  const { session } = useSession();
  const active = engine === "applied";
  return (
    <main>
      <PageHero eyebrow="Sostieni il club" title={<>Proponi un <span className="text-accent">miglioramento</span></>} clamp={false} action={<ShareButton page={SHARE_PAGES.proponi} />}>
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

import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, HandCoins, Mail, Scale, Users } from "lucide-react";

import { FundApplicationForm } from "@/components/giving/fund-apply";
import { NotActiveNote, btnSun } from "@/components/giving/public";
import { ShareButton } from "@/components/scd/ShareButton";
import { PageHero, heroOverlapCls, inputCls } from "@/components/ui-kit";
import { CLUB_PROFILE } from "@/lib/club-profile";
import { FONDO_PUBLIC_TEXT, TEXT_PENDING, euro, itDay } from "@/lib/giving";
import { getGivingPublic } from "@/lib/giving.functions";
import { getMyFamilyForFund } from "@/lib/roster.functions";
import { pageHead, SHARE_PAGES } from "@/lib/share";

/**
 * Fondo Solidale, public page (UD-113). The texts are the Direzione's (FONDO_PUBLIC_TEXT): until they arrive every block
 * says "Testo in arrivo dalla Direzione". No IBAN and no amounts are written here; aggregated totals appear only when
 * the Direzione switches them on (scd_giving_settings.fund_public_totals).
 */
export const Route = createFileRoute("/sostieni/fondo-solidale")({
  loader: async () => {
    const [pub, family] = await Promise.all([getGivingPublic(), getMyFamilyForFund()]);
    return { pub, family };
  },
  head: () => pageHead(SHARE_PAGES.fondoSolidale),
  component: FondoPage,
});

const BLOCKS = [
  { key: "intro", icon: HandCoins, title: "Che cos'è" },
  { key: "who", icon: Users, title: "Chi può fare domanda" },
  { key: "how", icon: FileText, title: "Come si fa domanda" },
  { key: "when", icon: Scale, title: "Tempi e decisione" },
] as const;

function FondoPage() {
  const { pub, family } = Route.useLoaderData();
  const active = pub.engine === "applied";
  const signedIn = family.state === "ok";
  return (
    <main>
      <PageHero eyebrow="Fondo Solidale" title={<>Nessun ragazzo resta fuori <span className="text-accent">per la quota</span></>} clamp={false} action={<ShareButton page={SHARE_PAGES.fondoSolidale} />}>
        Il Fondo Solidale della S.C.D. ColicoDerviese. Domande, ISEE e nomi restano riservati alla Direzione.
      </PageHero>
      <section className={`${heroOverlapCls} mx-auto grid max-w-6xl gap-4 px-4 md:grid-cols-2`}>
        {BLOCKS.map((b) => {
          const t = FONDO_PUBLIC_TEXT?.[b.key] ?? null;
          return (
            <article key={b.key} className="card-premium p-5" data-testid={`fondo-${b.key}`}>
              <b.icon className="size-5 text-primary" aria-hidden="true" />
              <h2 className="mt-2 text-xl font-bold">{b.title}</h2>
              {t ? <p className="m-0 mt-2 text-sm">{t}</p> : <p className="m-0 mt-2 text-sm italic text-muted-foreground">{TEXT_PENDING}</p>}
            </article>
          );
        })}
      </section>

      {!active && (
        <div className="mx-auto mt-8 max-w-6xl px-4"><NotActiveNote /></div>
      )}

      {pub.data?.fund && (
        <section className="mx-auto mt-10 max-w-6xl px-4" aria-labelledby="fondo-totali">
          <h2 id="fondo-totali" className="text-2xl font-bold">Il Fondo in numeri</h2>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[["Entrate confermate", pub.data.fund.confirmed], ["Già usati per le quote", pub.data.fund.allocated], ["Disponibili", pub.data.fund.available]].map(([l, v]) => (
              <div key={l as string} className="card-premium p-4"><dt className="text-xs font-semibold uppercase text-muted-foreground">{l as string}</dt><dd className="m-0 mt-1 font-display text-2xl font-bold">{euro(v as number)}</dd></div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">Totali aggregati al {itDay(pub.data.fund.asOf)} · fonte: {pub.data.fund.source}. Nessun dato personale.</p>
        </section>
      )}

      <section className="mx-auto mt-14 grid max-w-6xl gap-4 px-4 md:grid-cols-2">
        <article className="surface-deep rounded-2xl p-6 shadow-premium" data-testid="fondo-dona">
          <p className="eyebrow">Sostieni il Fondo</p>
          <h2 className="mt-1 text-2xl font-bold">Una donazione, anche piccola</h2>
          <p className="mt-2 text-sm opacity-85">L'app non incassa: scrivi alla Tesoreria e ti indichiamo i canali ufficiali del club. Puoi scegliere di comparire con il nome, restare anonimo in pubblico o essere completamente anonimo (in quel caso niente ricevuta).</p>
          <a href={`mailto:${CLUB_PROFILE.contacts.email}?subject=${encodeURIComponent("Donazione al Fondo Solidale")}`} className={`${btnSun} mt-4`}>
            <Mail className="size-4" aria-hidden="true" /> Scrivi alla Tesoreria
          </a>
          <p className="mt-3 text-xs opacity-75">Aziende: <Link to="/sponsor" hash="proposta" className="underline">sponsor dedicato al Fondo</Link>.</p>
        </article>
        <article className="card-premium p-6" data-testid="fondo-domanda">
          <p className="eyebrow">Fai domanda</p>
          <h2 className="mt-1 text-2xl font-bold">Per tuo figlio o tua figlia</h2>
          {signedIn ? (
            <div className="mt-4">
              <FundApplicationForm mode="family" children={family.members} active={active} inputCls={inputCls} buttonCls={btnSun} />
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">Per fare domanda online accedi con il tuo account di genitore. Puoi anche consegnarla in segreteria.</p>
              <Link to="/accedi" search={{ next: "/sostieni/fondo-solidale" } as never} className={`${btnSun} mt-4`}>Accedi per fare domanda</Link>
            </>
          )}
        </article>
      </section>
      <div className="mb-16" />
    </main>
  );
}

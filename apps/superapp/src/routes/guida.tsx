import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, Brain, CalendarDays, ClipboardCheck, ClipboardList, FileText, HeartPulse, KeyRound, Megaphone, PartyPopper, ShieldCheck, Smartphone, Ticket, UserPlus, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { CastDirectory } from "@/components/scd/CastDirectory";

/**
 * "Come funziona": quick guide for the launch, public so families can read it before signing in.
 * Plain steps per role, matching what the app does today (UD-062…UD-069) and the four doors of
 * config/superapp-audiences.v1.json (UD-078). No personal data.
 */
export const Route = createFileRoute("/guida")({
  head: () => ({
    meta: [
      { title: "Come funziona l'app | S.C.D. ColicoDerviese" },
      { name: "description", content: "Guida rapida all'app della S.C.D. ColicoDerviese per tifosi, soci, famiglie, atleti, mister e segreteria: accesso, convocazioni e presa visione, notifiche, certificati e distinta." },
    ],
  }),
  component: Guida,
});

const ROLES = [
  { id: "tifosi", label: "Tifosi e simpatizzanti" },
  { id: "soci", label: "Soci e volontari" },
  { id: "famiglie", label: "Famiglie e atleti" },
  { id: "mister", label: "Mister e dirigenti" },
  { id: "segreteria", label: "Segreteria e Direzione" },
] as const;

function Step({ n, icon, title, children }: { n: number; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[44px_minmax(0,1fr)] gap-3">
      <span className="grid size-11 place-items-center rounded-full bg-[var(--scd-blue)] text-white" aria-hidden="true">{icon}</span>
      <div className="min-w-0 pt-1">
        <h3 className="m-0 text-[17px] font-bold leading-tight"><span className="sr-only">Passo {n}: </span>{title}</h3>
        <div className="mt-1 text-[15.5px] leading-relaxed text-[#33405a]">{children}</div>
      </div>
    </li>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 id={`${id}-t`} className="m-0 text-[24px] font-bold leading-tight">{title}</h2>
      <p className="mt-1 text-[15px] text-muted-foreground">{intro}</p>
      <ol className="m-0 mt-5 grid list-none gap-5 p-0">{children}</ol>
    </section>
  );
}

function Guida() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10" data-testid="guida">
      <header>
        <h1 className="m-0 text-[34px] font-bold leading-tight">Come funziona l'app</h1>
        <p className="mt-2 text-[16px] leading-relaxed">Tre minuti per capire cosa fai tu e cosa fa l'app. Per seguire la squadra non serve nessun account; chi ha un ruolo nel club entra con e-mail o telefono e password. Password dimenticata? Ti arriva una e-mail con il pulsante per sceglierne una nuova.</p>
        <nav aria-label="Scegli il tuo ruolo" className="mt-4 flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <a key={r.id} href={`#${r.id}`} className="inline-flex h-11 items-center rounded-full border border-border bg-white px-4 text-[15px] font-semibold">{r.label}</a>
          ))}
          <a href="#personaggi" className="inline-flex h-11 items-center rounded-full border border-border bg-white px-4 text-[15px] font-semibold">I nostri personaggi</a>
        </nav>
      </header>

      <Section id="tifosi" title="Tifosi e simpatizzanti" intro="Per chi segue la squadra: niente registrazione, niente dati personali.">
        <Step n={1} icon={<CalendarDays className="size-5" />} title="Le partite di tutte le squadre">
          Apri <Link to="/calendario" className="font-semibold text-[var(--scd-blue)] underline">Calendario</Link>: giorno, ora e campo di ogni gara, dalla Prima Squadra ai più piccoli. Le squadre giovanili compaiono solo con il nome della squadra.
        </Step>
        <Step n={2} icon={<Ticket className="size-5" />} title="Biglietti e ingresso">
          In <Link to="/impianti" className="font-semibold text-[var(--scd-blue)] underline">Impianti</Link> trovi i campi di Colico e Dervio, dove si entra, gli orari della biglietteria e le gratuità previste dalla società.
        </Step>
        <Step n={3} icon={<PartyPopper className="size-5" />} title="Tornei, feste ed eventi">
          In <Link to="/eventi" className="font-semibold text-[var(--scd-blue)] underline">Eventi</Link> ci sono i tornei e le serate del club. Le foto pubblicate non mostrano il volto dei minori senza la liberatoria firmata dalla famiglia.
        </Step>
        <Step n={4} icon={<Smartphone className="size-5" />} title="Tienila sul telefono">
          Con <Link to="/installa" className="font-semibold text-[var(--scd-blue)] underline">Installa l'app</Link> la metti tra le app del telefono in un tocco, e puoi passare il codice QR agli amici.
        </Step>
      </Section>

      <Section id="soci" title="Soci e volontari" intro="Per chi fa parte dell'associazione o vuole dare una mano.">
        <Step n={1} icon={<UserPlus className="size-5" />} title="Iscriversi alla SCD">
          Da <Link to="/entra" className="font-semibold text-[var(--scd-blue)] underline">Iscriviti</Link> parti con il modulo: la segreteria ti richiama per documenti e tesseramento. La quota si paga solo nei modi indicati dalla società: l'app non incassa nulla.
        </Step>
        <Step n={2} icon={<FileText className="size-5" />} title="Regole e documenti dell'associazione">
          In <Link to="/societa" className="font-semibold text-[var(--scd-blue)] underline">Società</Link> ci sono regolamento e carta dei valori, codice di condotta, regole per trasferte e minori, privacy e liberatoria immagini: sono pubblici, i dati delle persone no.
        </Step>
        <Step n={3} icon={<Megaphone className="size-5" />} title="Avvisi del club">
          In <Link to="/comunicazioni" className="font-semibold text-[var(--scd-blue)] underline">Comunicazioni</Link> trovi gli avvisi e le novità della stagione.
        </Step>
        <Step n={4} icon={<ShieldCheck className="size-5" />} title="Tutela dei minori">
          Chi lavora con i ragazzi segue le regole in <Link to="/safeguarding" className="font-semibold text-[var(--scd-blue)] underline">Tutela dei minori</Link>, dove trovi anche come segnalare un problema in modo riservato.
        </Step>
      </Section>

      <Section id="famiglie" title="Famiglie e atleti" intro="Per genitori, tutori e atleti maggiorenni.">
        <Step n={1} icon={<KeyRound className="size-5" />} title="Entra con la tua e-mail">
          Apri <Link to="/accedi" search={{ next: undefined }} className="font-semibold text-[var(--scd-blue)] underline">Accedi</Link>, scrivi l'e-mail che hai dato alla società e tocca il link che ricevi. Aprilo dallo stesso telefono da cui l'hai chiesto.
        </Step>
        <Step n={2} icon={<UserPlus className="size-5" />} title="Non ti fa entrare?">
          Usa <Link to="/registrati" className="font-semibold text-[var(--scd-blue)] underline">Registrati</Link>: nome, cognome, data di nascita, e-mail e telefono. La segreteria controlla chi sei e ti attiva.
        </Step>
        <Step n={3} icon={<Smartphone className="size-5" />} title="Mettila sul telefono">
          Su iPhone: Condividi → "Aggiungi alla schermata Home". Su Android: menu del browser → "Installa app". Si apre come un'app vera. Passo passo, con il codice QR da condividere: <Link to="/installa" className="font-semibold text-[var(--scd-blue)] underline">Installa l'app</Link>.
        </Step>
        <Step n={4} icon={<BellRing className="size-5" />} title="Attiva le notifiche">
          Nella pagina Famiglia tocca "Attiva le notifiche": ti arriva un avviso quando il mister convoca. Solo convocazioni, niente pubblicità.
        </Step>
        <Step n={5} icon={<ClipboardCheck className="size-5" />} title="Prendi visione della convocazione">
          La convocazione delle squadre agonistiche è un impegno: chi è convocato c'è. Tocca "Presa visione" per dire al mister che l'hai letta. Se c'è un impedimento vero, tocca "Segnala un impedimento" fino all'inizio della gara: la convocazione resta valida, il mister riceve la segnalazione e decide. Per motivi di salute non scrivere dettagli: parlane con il mister o con la segreteria.
        </Step>
      </Section>

      <Section id="mister" title="Mister e dirigenti" intro="Per chi segue una squadra.">
        <Step n={1} icon={<Users className="size-5" />} title="La tua squadra">
          Dopo l'accesso trovi la rosa delle squadre che ti ha assegnato la società, con tesseramento e certificato di ognuno.
        </Step>
        <Step n={2} icon={<ClipboardCheck className="size-5" />} title="Convoca 1-2 giorni prima">
          Scegli la gara, spunta i ragazzi (anche da altre annate che puoi convocare), metti ora e luogo del ritrovo e invia. Chi non ha certificato valido o tesseramento non può essere convocato.
        </Step>
        <Step n={3} icon={<ClipboardList className="size-5" />} title="Alla gara: la distinta">
          Scegli tra i convocati chi va in lista, con numeri, titolari, capitano, vice e panchina. Poi il dirigente la ricopia sul portale LND (per le giovanili è obbligatorio) o la stampa.
        </Step>
        <Step n={4} icon={<BellRing className="size-5" />} title="Togliere un ragazzo">
          Togli la spunta e premi il pulsante: la convocazione resta nello storico come ritirata e sparisce dalla pagina della famiglia.
        </Step>
      </Section>

      <Section id="segreteria" title="Segreteria e Direzione" intro="Per chi gestisce persone, accessi e documenti.">
        <Step n={1} icon={<HeartPulse className="size-5" />} title="Certificati medici">
          Segreteria → Certificati: squadra per squadra, data di scadenza e tipo. Spunta "Ho visto il certificato" quando lo hai in mano.
        </Step>
        <Step n={2} icon={<UserPlus className="size-5" />} title="Richieste di accesso">
          Segreteria → Persone → Richieste: controlla chi è la persona, collegala alla scheda giusta e autorizza.
        </Step>
        <Step n={3} icon={<Users className="size-5" />} title="Tesseramenti e squadre">
          Segreteria → Persone, filtro "Senza squadra": apri la scheda e tocca "Conferma e assegna". Da lì sposti un atleta di squadra o lo aggiungi a una seconda annata: il mister lo vede subito nella rosa, lo storico resta.
        </Step>
        <Step n={4} icon={<ShieldCheck className="size-5" />} title="Permessi su misura">
          Direzione → Accessi: ruolo, aree in più, squadre in più, sospensione. Ogni modifica resta nello storico.
        </Step>
        <Step n={5} icon={<Wallet className="size-5" />} title="Compensi e stipendi">
          Tesoreria → Compensi: la Direzione fissa l'accordo, la Tesoreria segna presenze e rimborsi, chiude il mese e prepara la lista dei pagamenti. I bonifici si fanno in banca: l'app non paga e non conserva IBAN.
        </Step>
        <Step n={6} icon={<Brain className="size-5" />} title="Cervellone">
          Direzione → Cervellone: cerca in documenti, posta catalogata, economia e storia del club, con le scadenze in vista. Ognuno vede solo il livello del proprio ruolo.
        </Step>
      </Section>

      <section id="personaggi" aria-labelledby="personaggi-t" className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 id="personaggi-t" className="m-0 text-[24px] font-bold leading-tight">I nostri personaggi</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">Una sola chat, Iride, che risponde a tutto e ti porta dal volto giusto; quattro volti con azioni concrete; e i consigli del giorno.</p>
        <div className="mt-4">
          <CastDirectory />
        </div>
      </section>

      <p className="m-0 text-[14.5px] text-muted-foreground">
        Dubbi? Scrivi alla segreteria: <b className="select-all">sportclubcolico@gmail.com</b>. Come trattiamo i dati: <Link to="/privacy" className="underline">informativa privacy</Link>.
      </p>
    </main>
  );
}

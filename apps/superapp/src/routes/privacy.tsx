import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { openCookiePrefs } from "@/components/CookieConsent";
import { CLUB_PROFILE } from "@/lib/club-profile";

/**
 * Informativa privacy e cookie (art. 13 GDPR) della Super App. Launch audit 2026-10-12.
 * Content reflects what the app actually does (data, hosting regions, cookies). Retention periods and the final
 * text are confirmed by the Direzione before the public launch: PRIVACY_STATUS says so on the page.
 */
export const PRIVACY_VERSION = "1.0";
export const PRIVACY_STATUS: "bozza" | "approvata" = "bozza";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy e cookie | S.C.D. ColicoDerviese" },
      { name: "description", content: "Come la S.C.D. ColicoDerviese tratta i dati personali nella sua app: quali dati, perché, per quanto tempo, chi li vede e quali sono i tuoi diritti." },
    ],
  }),
  component: Privacy,
});

const c = CLUB_PROFILE.contacts;

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-[21px] font-bold leading-tight">{children}</h2>;
}

function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-[16px] leading-relaxed" data-testid="privacy-page">
      <p className="flex items-center gap-2 text-[14px] font-bold text-primary"><ShieldCheck className="size-4" aria-hidden="true" /> Informativa privacy e cookie · versione {PRIVACY_VERSION}</p>
      <h1 className="mt-2 text-[34px] font-bold leading-tight">Come trattiamo i tuoi dati</h1>
      {PRIVACY_STATUS === "bozza" && (
        <p className="mt-4 rounded-xl border border-[#f1d3a5] bg-[#fff8ec] px-4 py-3 text-[15px]">
          Testo in approvazione: la Direzione lo conferma prima dell'apertura dell'app a tutti.
        </p>
      )}

      <H2>Chi è il titolare</H2>
      <p>
        {CLUB_PROFILE.name}, {c.address}. Scrivi a <b className="select-all">{c.email}</b> oppure alla PEC <b className="select-all">{c.pec}</b> per qualsiasi domanda sui tuoi dati.
      </p>

      <H2>Quali dati usa l'app</H2>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li><b>Accesso</b>: l'indirizzo e-mail con cui entri. Non usiamo password.</li>
        <li><b>Anagrafica sportiva</b>: nome, cognome, data di nascita, squadra e stato del tesseramento di atleti, genitori, staff e dirigenti, presi dai moduli d'iscrizione e dall'elenco tesserati della società.</li>
        <li><b>Certificato medico</b>: solo la data di scadenza e il tipo (agonistico o non agonistico). Il certificato vero resta in segreteria: l'app non conserva documenti né diagnosi.</li>
        <li><b>Attività di squadra</b>: convocazioni, risposte "Ci sarò", distinte preparate dal mister.</li>
        <li><b>Richiesta di accesso</b>: nome, cognome, data di nascita, e-mail e telefono di chi si registra, finché la segreteria non verifica.</li>
        <li><b>Notifiche</b>: se le attivi, un identificativo tecnico del tuo telefono per mandarti l'avviso delle convocazioni.</li>
        <li><b>Storico delle modifiche</b>: chi ha cambiato un accesso, un certificato o una distinta, e quando.</li>
      </ul>

      <H2>Perché li usiamo</H2>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>Organizzare l'attività sportiva: squadre, allenamenti, convocazioni e gare. Base: il rapporto associativo e di tesseramento (art. 6.1.b GDPR).</li>
        <li>Rispettare le regole sportive e di legge, per esempio far giocare solo chi ha un certificato medico valido e un tesseramento regolare (art. 6.1.c e art. 9.2 GDPR per il dato sulla idoneità sportiva).</li>
        <li>Proteggere l'app e i dati: accessi, permessi, storico delle modifiche (art. 6.1.f GDPR).</li>
      </ul>
      <p className="mt-2">Non usiamo i dati per pubblicità, non li vendiamo e non creiamo profili commerciali.</p>

      <H2>Minori</H2>
      <p>
        I dati dei ragazzi li fornisce il genitore o tutore con il modulo d'iscrizione. Nelle pagine pubbliche non compaiono mai nomi, foto o date di nascita di minori. Nell'app li vedono solo il genitore collegato, lo staff della squadra e l'ufficio della società. Foto e nomi in comunicazioni pubbliche richiedono il consenso scritto della famiglia.
      </p>

      <H2>Chi vede i dati</H2>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>Ogni persona vede solo ciò che le spetta: la famiglia i propri figli, il mister le proprie squadre, la segreteria e la direzione quello che serve al loro lavoro.</li>
        <li>FIGC, LND e Comitati ricevono i dati necessari al tesseramento e alle gare, come titolari autonomi.</li>
        <li>Fornitori tecnici che lavorano per conto della società: Supabase (database, server a Francoforte, UE), Render (server dell'app, Francoforte, UE), Google (invio delle e-mail di accesso dalla casella della società) e i servizi di notifica del tuo telefono (Google, Apple o Mozilla), che ricevono solo il testo dell'avviso.</li>
        <li>Alcuni di questi fornitori hanno sede negli Stati Uniti: eventuali trasferimenti avvengono solo con le garanzie previste dal GDPR (decisione di adeguatezza UE-USA o clausole contrattuali standard).</li>
      </ul>

      <H2>Per quanto tempo</H2>
      <p>
        Teniamo i dati per la stagione sportiva in corso e per il tempo successivo necessario a chiudere tesseramenti, obblighi sportivi e di legge. Le richieste di accesso non autorizzate vengono chiuse. Quando un atleta lascia la società resta solo nello storico, non più nelle viste dell'app.
      </p>

      <H2>I tuoi diritti</H2>
      <p>
        Puoi chiedere di vedere, correggere o cancellare i tuoi dati, limitarne l'uso, opporti o riceverne una copia (art. 15-22 GDPR), scrivendo a {c.email}. Puoi anche presentare reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).
      </p>

      <H2>Cookie</H2>
      <p>
        L'app usa solo strumenti tecnici: un cookie di sessione per tenerti dentro dopo l'accesso, la memoria del browser per ricordare le tue scelte e una copia offline delle sole pagine pubbliche. Non usiamo statistiche né cookie di marketing. Le aree riservate non vengono mai salvate offline e, quando esci, la copia sul telefono viene cancellata.
      </p>
      <H2>Crediti e proprietà intellettuale</H2>
      <p>
        L'app è ideata e creata da <b>Francesco Coppola</b>, che ne detiene il diritto d'autore (© 2026) e la concede in uso gratuito alla {CLUB_PROFILE.name}. Stemma della società, loghi degli sponsor e marchi federali appartengono ai rispettivi titolari.
      </p>
      <button type="button" onClick={openCookiePrefs} className="mt-3 inline-flex h-11 items-center rounded-[10px] border border-border px-4 text-[15px] font-semibold">
        Preferenze cookie
      </button>
    </main>
  );
}

/**
 * «Sfida della settimana» and «Quiz del giorno» on the public home (ideas I-261017-04/05, Francesco 17/10/2026:
 * «attraente, interattiva, fluida e dinamica, soprattutto per i ragazzi»; research docs/piattaforme/ricerche/ragazzi-social.md).
 *
 * Static, typed content only: no network, no account, no personal data. The rotation is deterministic for a given
 * Europe/Rome calendar date, so server and device show the same item.
 *
 * Territory facts are restricted to the verified list given by the Direzione (17/10/2026): Dervio first named in 814,
 * Abbazia di Piona consecrated 1138, Forte di Fuentes built 1603-1604, Forte Montecchio Nord built 1912-1914, Colico
 * and Dervio clubs merged in 2012 (first joint season 2012/13). The club founding year is never stated.
 * Rules questions follow the IFAB Laws of the Game (11-a-side football).
 */
import { romeParts } from "@/lib/home-week";

export type Sfida = { id: string; title: string; how: string };

export type QuizQuestion = {
  id: string;
  topic: "regole" | "territorio";
  q: string;
  answers: readonly [string, string, string];
  /** Index of the right answer in `answers`. */
  correct: 0 | 1 | 2;
  /** One line shown after the answer. */
  why: string;
};

export const SFIDE: readonly Sfida[] = [
  { id: "palleggi-10", title: "10 palleggi di fila", how: "Senza far cadere la palla: conta ad alta voce, se cade si riparte da zero." },
  { id: "piede-debole-20", title: "20 passaggi col piede debole", how: "Contro un muro, solo col piede che usi meno. Interno del piede, palla rasoterra." },
  { id: "slalom-6", title: "Slalom tra 6 birilli", how: "Bastano bottiglie o scarpe. Andata e ritorno senza toccarne nessuno." },
  { id: "suola-30", title: "30 secondi di tocchi di suola", how: "Piede destro e sinistro alternati sopra la palla, senza fermarti." },
  { id: "stop-15", title: "15 stop d'interno per lato", how: "Lancia la palla contro un muro e fermala con l'interno, prima destro poi sinistro." },
  { id: "bersaglio-5", title: "5 tiri su 10 nel bersaglio", how: "Scegli un bersaglio (una porta disegnata, un cerchio) e prova 10 tiri da fermo." },
  { id: "palleggi-alternati-8", title: "8 palleggi alternati", how: "Destro, sinistro, destro, sinistro: 8 di fila alternando sempre il piede." },
  { id: "conduzione-2min", title: "2 minuti di guida col piede debole", how: "Porta la palla in giro con il piede che usi meno, tocchi piccoli e testa alta." },
  { id: "tic-tac-20", title: "20 tic-tac interno-interno", how: "Da fermo, palla tra i due piedi: tocco interno destro, interno sinistro, veloce." },
  { id: "giravolta-5", title: "5 giravolte con la suola per lato", how: "Ferma la palla con la suola e girati portandola con te: piano all'inizio, poi più veloce." },
  { id: "passaggi-prima-20", title: "20 passaggi di prima", how: "Con un amico o un familiare: ogni passaggio di prima, senza stop." },
  { id: "insegna", title: "Insegna un gesto tecnico", how: "Spiega a qualcuno di casa come si fa un passaggio d'interno. Chi insegna impara due volte." },
  { id: "acqua", title: "Borraccia sempre piena", how: "Porta la tua borraccia a ogni allenamento della settimana e bevi anche prima di iniziare." },
  { id: "stretching-10", title: "10 minuti di allungamento", how: "Dopo un allenamento: polpacci, cosce e schiena, senza molleggiare." },
];

export const QUIZ: readonly QuizQuestion[] = [
  { id: "r-giocatori", topic: "regole", q: "Quanti giocatori per squadra sono in campo in una partita a 11?", answers: ["10", "11", "12"], correct: 1, why: "Undici, portiere compreso: per questo si chiama calcio a 11." },
  { id: "t-dervio-814", topic: "territorio", q: "In che anno Dervio compare per la prima volta in un documento?", answers: ["814", "1138", "1603"], correct: 0, why: "Il nome di Dervio è citato per la prima volta nell'anno 814." },
  { id: "r-tempi", topic: "regole", q: "Quanto dura ciascun tempo di una partita di calcio a 11 tra adulti?", answers: ["30 minuti", "40 minuti", "45 minuti"], correct: 2, why: "Due tempi da 45 minuti, più il recupero deciso dall'arbitro." },
  { id: "t-piona-1138", topic: "territorio", q: "In che anno fu consacrata l'Abbazia di Piona?", answers: ["814", "1138", "1912"], correct: 1, why: "L'Abbazia di Piona fu consacrata nel 1138." },
  { id: "r-rigore", topic: "regole", q: "A quanti metri dalla porta si trova il dischetto del rigore?", answers: ["9 metri", "11 metri", "16 metri"], correct: 1, why: "Il punto del calcio di rigore è a 11 metri dalla linea di porta." },
  { id: "t-fuentes", topic: "territorio", q: "Quando fu costruito il Forte di Fuentes?", answers: ["Nel 1138", "Nel 1603-1604", "Nel 1912-1914"], correct: 1, why: "Il Forte di Fuentes fu costruito tra il 1603 e il 1604." },
  { id: "r-rimessa-gol", topic: "regole", q: "Si può segnare direttamente da una rimessa laterale nella porta avversaria?", answers: ["Sì, sempre", "No, è calcio di rinvio", "Sì, ma vale doppio"], correct: 1, why: "Il gol diretto da rimessa laterale non vale: si riprende con un calcio di rinvio." },
  { id: "t-montecchio", topic: "territorio", q: "In quali anni fu costruito il Forte Montecchio Nord?", answers: ["1603-1604", "1912-1914", "2012-2013"], correct: 1, why: "Il Forte Montecchio Nord fu costruito tra il 1912 e il 1914." },
  { id: "r-gialli", topic: "regole", q: "Cosa succede a chi riceve due ammonizioni nella stessa partita?", answers: ["Niente, si azzera", "Esce per 10 minuti", "Viene espulso"], correct: 2, why: "Due cartellini gialli fanno un rosso: il giocatore viene espulso." },
  { id: "t-fusione", topic: "territorio", q: "In che anno si sono unite le società di calcio di Colico e Dervio?", answers: ["2008", "2012", "2016"], correct: 1, why: "La fusione è del 2012: la prima stagione insieme è stata la 2012/13." },
  { id: "r-portiere-mani", topic: "regole", q: "Dove può prendere la palla con le mani il portiere?", answers: ["Nella propria area di rigore", "In tutta la sua metà campo", "Ovunque"], correct: 0, why: "Solo nella propria area di rigore; fuori è un giocatore come gli altri." },
  { id: "t-prima-stagione", topic: "territorio", q: "Qual è stata la prima stagione giocata insieme da Colico e Dervio?", answers: ["2010/11", "2012/13", "2014/15"], correct: 1, why: "Dopo la fusione del 2012, la prima stagione insieme è stata la 2012/13." },
  { id: "r-gol-linea", topic: "regole", q: "Quando un pallone è gol?", answers: ["Quando tocca la linea", "Quando è oltre la linea per metà", "Quando ha superato del tutto la linea"], correct: 2, why: "È gol solo se tutto il pallone ha superato la linea di porta tra i pali e sotto la traversa." },
  { id: "t-ordine", topic: "territorio", q: "Quale di questi tre è arrivato per primo?", answers: ["Forte di Fuentes", "Abbazia di Piona", "Forte Montecchio Nord"], correct: 1, why: "L'Abbazia di Piona (1138) viene prima del Forte di Fuentes (1603-1604) e del Montecchio Nord (1912-1914)." },
  { id: "r-barriera", topic: "regole", q: "A che distanza deve stare la barriera su un calcio di punizione?", answers: ["5 metri", "9,15 metri", "11 metri"], correct: 1, why: "Gli avversari devono stare ad almeno 9,15 metri dal pallone." },
  { id: "t-fuentes-montecchio", topic: "territorio", q: "Quanti secoli separano la costruzione del Forte di Fuentes da quella del Montecchio Nord?", answers: ["Circa uno", "Circa tre", "Circa sei"], correct: 1, why: "Dal 1603-1604 al 1912-1914 passano circa tre secoli." },
  { id: "r-angolo", topic: "regole", q: "Si può segnare direttamente da calcio d'angolo?", answers: ["Sì", "No", "Solo nel secondo tempo"], correct: 0, why: "Sì: il gol diretto da calcio d'angolo nella porta avversaria è valido." },
  { id: "r-fuorigioco-rimessa", topic: "regole", q: "C'è fuorigioco se ricevi la palla direttamente da una rimessa laterale?", answers: ["Sì, sempre", "No, mai", "Solo in area"], correct: 1, why: "Non c'è fuorigioco su rimessa laterale, calcio d'angolo e calcio di rinvio." },
  { id: "r-retropassaggio", topic: "regole", q: "Un compagno passa la palla di piede al portiere apposta. Il portiere può prenderla con le mani?", answers: ["Sì", "No, è punizione indiretta", "Solo se è fuori area"], correct: 1, why: "Su passaggio volontario di piede il portiere non può usare le mani: punizione indiretta." },
  { id: "r-posizione", topic: "regole", q: "Trovarsi in posizione di fuorigioco è già un'infrazione?", answers: ["Sì, sempre", "No, solo se partecipi al gioco", "Solo nel primo tempo"], correct: 1, why: "La posizione da sola non si punisce: conta se partecipi attivamente all'azione." },
  { id: "r-rigorista", topic: "regole", q: "Chi tira il rigore colpisce il palo: può ritirare subito lui?", answers: ["Sì", "No, deve toccarla prima un altro giocatore", "Sì, ma solo di testa"], correct: 1, why: "Il rigorista non può toccare di nuovo la palla finché non l'ha toccata un altro giocatore." },
  { id: "r-indiretta", topic: "regole", q: "Come segnala l'arbitro un calcio di punizione indiretto?", answers: ["Fischia due volte", "Alza un braccio", "Mostra un cartellino"], correct: 1, why: "L'arbitro tiene il braccio alzato finché la palla non tocca un altro giocatore o esce." },
];

/** Days since 1970-01-01 for a Rome calendar date "YYYY-MM-DD" (pure date arithmetic, no time zone). */
export function dayNumber(romeDate: string): number {
  const [y, m, d] = romeDate.split("-").map(Number) as [number, number, number];
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

const mod = (n: number, len: number) => ((n % len) + len) % len;

/** Index of the item of the day: changes at Rome midnight, cycles through the whole list. */
export function dayIndex(romeDate: string, len: number): number {
  return len > 0 ? mod(dayNumber(romeDate), len) : 0;
}

/** Monday (ISO week start) of the week containing `romeDate`, as "YYYY-MM-DD". */
export function weekMonday(romeDate: string): string {
  const n = dayNumber(romeDate);
  // 1970-01-01 was a Thursday: (n + 3) % 7 is 0 on Mondays.
  return new Date((n - mod(n + 3, 7)) * 86_400_000).toISOString().slice(0, 10);
}

/** Index of the item of the ISO week (Monday to Sunday): same for every day of the week. */
export function weekIndex(romeDate: string, len: number): number {
  return len > 0 ? mod(Math.floor(dayNumber(weekMonday(romeDate)) / 7), len) : 0;
}

/** Rome calendar date of an instant. */
export function romeDateOf(nowMs: number): string {
  return romeParts(new Date(nowMs).toISOString())?.date ?? new Date(nowMs).toISOString().slice(0, 10);
}

export function sfidaOfWeek(romeDate: string): Sfida {
  return SFIDE[weekIndex(romeDate, SFIDE.length)]!;
}

export function quizOfDay(romeDate: string): QuizQuestion {
  return QUIZ[dayIndex(romeDate, QUIZ.length)]!;
}

/** localStorage key of the challenge of a week (one key per week and challenge). */
export function sfidaKey(romeDate: string, s: Sfida): string {
  return `scd.sfida.v1.${weekMonday(romeDate)}.${s.id}`;
}

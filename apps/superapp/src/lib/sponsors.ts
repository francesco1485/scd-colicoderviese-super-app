/**
 * Sponsor in corso nella stagione 2026/27: elenco dato dalla Direzione il 12/10/2026 ("i nostri sponsor attuali
 * e che hanno rinnovato"), tavola "Lo sport unisce la nostra comunità". Ordine della tavola.
 * Loghi ritagliati dalla tavola ufficiale della società senza ridisegnarli (SCD:ASSET KEEP_ENHANCE); dove esiste un
 * file migliore già caricato si usa quello. I file ad alta risoluzione vanno presi dalle cartelle sponsor del Drive.
 * name null o nameVerified false: nome non leggibile con certezza dalla tavola, da confermare con la Direzione.
 */
export interface Sponsor {
  slug: string;
  name: string | null;
  nameVerified: boolean;
  src: string;
}

export const SPONSORS_AS_OF = "2026-10-12";

export const SPONSORS: readonly Sponsor[] = [
  { slug: "hdi-maglia", name: "HDI Assicurazioni · Maglia Assicurazioni", nameVerified: true, src: "/media/sponsor/hdi-maglia-assicurazioni.webp" },
  { slug: "dell-oca", name: "Dell'Oca Prodotti Petroliferi", nameVerified: true, src: "/media/sponsor/2026-27/dell-oca.webp" },
  { slug: "atl-iveco", name: "ATL Iveco", nameVerified: true, src: "/media/sponsor/2026-27/atl-iveco.webp" },
  { slug: "atv", name: "ATV", nameVerified: true, src: "/media/sponsor/2026-27/atv.webp" },
  { slug: "carcano", name: "Carcano", nameVerified: true, src: "/media/sponsor/2026-27/carcano.webp" },
  { slug: "mds-impianti", name: "MDS Impianti", nameVerified: true, src: "/media/sponsor/2026-27/mds-impianti.webp" },
  { slug: "bigamonti", name: "Bigamonti", nameVerified: false, src: "/media/sponsor/2026-27/bigamonti.webp" },
  // Name verified 14/10/2026: official site nbcweighing.com, Drive folder NBC_ELETTRONICA, official LED spot "NBC ELETTRONICA GROUP".
  { slug: "nbc", name: "NBC Elettronica Group", nameVerified: true, src: "/media/sponsor/2026-27/nbc.webp" },
  { slug: "sponsor-sole", name: null, nameVerified: false, src: "/media/sponsor/2026-27/sponsor-sole.webp" },
  { slug: "turbojet-spurghi", name: "Turbojet Spurghi", nameVerified: true, src: "/media/sponsor/2026-27/turbojet-spurghi.webp" },
  { slug: "gimoka", name: "Gimoka", nameVerified: true, src: "/media/sponsor/2026-27/gimoka.webp" },
  { slug: "attivita-di-recupero", name: "Attività di Recupero", nameVerified: true, src: "/media/sponsor/2026-27/attivita-di-recupero.webp" },
  { slug: "farmacia-santa-rita", name: "Farmacia Santa Rita", nameVerified: true, src: "/media/sponsor/2026-27/farmacia-santa-rita.webp" },
  { slug: "saglio-sport", name: "Saglio Sport Cantù", nameVerified: true, src: "/media/sponsor/saglio-sport.webp" },
  { slug: "consilia-studio", name: "Consilia Studio", nameVerified: true, src: "/media/sponsor/2026-27/consilia-studio.webp" },
  { slug: "domino-services", name: "Domino Services", nameVerified: true, src: "/media/sponsor/2026-27/domino-services.webp" },
  { slug: "molteni", name: "Molteni", nameVerified: true, src: "/media/sponsor/2026-27/molteni.webp" },
  { slug: "rusconi-guerino", name: "Rusconi Guerino", nameVerified: true, src: "/media/sponsor/2026-27/rusconi-guerino.webp" },
  { slug: "ottica-visus", name: "Ottica Visus", nameVerified: true, src: "/media/sponsor/2026-27/ottica-visus.webp" },
  { slug: "mps-infissi", name: "MPS Infissi", nameVerified: true, src: "/media/sponsor/2026-27/mps-infissi.webp" },
  { slug: "lumax", name: "Lumax", nameVerified: true, src: "/media/sponsor/2026-27/lumax.webp" },
  { slug: "bcc-valsassina", name: "BCC Valsassina", nameVerified: true, src: "/media/sponsor/2026-27/bcc-valsassina.webp" },
  { slug: "trafilerie-alexia", name: "Trafilerie Alluminio Alexia", nameVerified: true, src: "/media/sponsor/2026-27/trafilerie-alexia.webp" },
  { slug: "quaini-impianti", name: "Quaini Impianti Elettrici", nameVerified: true, src: "/media/sponsor/2026-27/quaini-impianti.webp" },
  { slug: "spazio-domus", name: "Spazio Domus", nameVerified: true, src: "/media/sponsor/2026-27/spazio-domus.webp" },
  { slug: "lo-squalo", name: "Lo Squalo", nameVerified: false, src: "/media/sponsor/2026-27/lo-squalo.webp" },
  { slug: "sponsor-bar", name: null, nameVerified: false, src: "/media/sponsor/2026-27/sponsor-bar.webp" },
  { slug: "cleaning", name: "Cleaning", nameVerified: false, src: "/media/sponsor/2026-27/cleaning.webp" },
  { slug: "nagi-car", name: "Na.gi Car", nameVerified: true, src: "/media/sponsor/2026-27/nagi-car.webp" },
  { slug: "prisma", name: "Prisma", nameVerified: true, src: "/media/sponsor/2026-27/prisma.webp" },
  { slug: "varenna-holidays", name: "Varenna Holidays", nameVerified: true, src: "/media/sponsor/2026-27/varenna-holidays.webp" },
  { slug: "zurich", name: "Zurich", nameVerified: true, src: "/media/sponsor/2026-27/zurich.webp" },
  { slug: "stilmoto", name: "Stilmoto", nameVerified: true, src: "/media/sponsor/2026-27/stilmoto.webp" },
  { slug: "sponsor-bb", name: null, nameVerified: false, src: "/media/sponsor/2026-27/sponsor-bb.webp" },
  { slug: "sponsor-arancio", name: null, nameVerified: false, src: "/media/sponsor/2026-27/sponsor-arancio.webp" },
  { slug: "dego-arredamenti", name: "Dego Arredamenti", nameVerified: true, src: "/media/sponsor/2026-27/dego-arredamenti.webp" },
  { slug: "essegi-legno", name: "Essegi Legno", nameVerified: true, src: "/media/sponsor/2026-27/essegi-legno.webp" },
];

/** Accessible label: the name only when it is certain, otherwise a neutral label (never an invented name). */
export function sponsorLabel(s: Sponsor): string {
  return s.name && s.nameVerified ? s.name : "Sponsor della ColicoDerviese";
}

export const sponsorsToConfirm = (): Sponsor[] => SPONSORS.filter((s) => !s.nameVerified);

import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, HeartHandshake, ShieldCheck, Users } from "lucide-react";

export const Route = createFileRoute("/aree/")({
  head: () => ({
    meta: [
      { title: "Aree riservate — S.D.C. ColicoDerviese" },
      {
        name: "description",
        content:
          "Accedi all'area Famiglia, Atleta, Staff o Direzione della Super App ufficiale S.D.C. ColicoDerviese.",
      },
      { property: "og:title", content: "Aree riservate — S.D.C. ColicoDerviese" },
      {
        property: "og:description",
        content: "Area Famiglia, Atleta, Staff e Direzione della Super App biancoblù.",
      },
    ],
  }),
  component: AreePage,
});

export const aree = [
  {
    slug: "famiglia",
    nome: "Famiglia",
    testo: "Quote, comunicazioni, convocazioni e documenti dei tuoi figli.",
    icon: HeartHandshake,
  },
  {
    slug: "atleta",
    nome: "Atleta",
    testo: "Il tuo profilo, obiettivi, presenze e programma personale.",
    icon: GraduationCap,
  },
  {
    slug: "staff",
    nome: "Staff",
    testo: "Rosa, sedute, disponibilità campi e report partita.",
    icon: Users,
  },
  {
    slug: "direzione",
    nome: "Direzione",
    testo: "Tesseramenti, bilanci, sponsor e indicatori di società.",
    icon: ShieldCheck,
  },
] as const;

function AreePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="eyebrow">Accesso riservato</p>
      <h1 className="mt-2 text-3xl font-bold">Le aree della società</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Ogni area mostra solo le informazioni del proprio ruolo. Le credenziali sono verificate
        lato server sul gestionale della società: nessun dato sensibile viene esposto nel browser.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {aree.map((a) => (
          <Link
            key={a.slug}
            to="/aree/$area"
            params={{ area: a.slug }}
            className="group flex items-start gap-4 p-5 card-premium transition-transform hover:-translate-y-1"
          >
            <span className="surface-deep flex size-11 shrink-0 items-center justify-center rounded-xl">
              <a.icon className="size-5" />
            </span>
            <span>
              <span className="block font-display text-lg font-bold uppercase">{a.nome}</span>
              <span className="block text-sm text-muted-foreground">{a.testo}</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}

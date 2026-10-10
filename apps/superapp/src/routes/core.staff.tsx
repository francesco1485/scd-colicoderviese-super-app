import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Megaphone, MoveRight, UserRound } from "lucide-react";

import { DemoSpacer } from "@/components/scd/area";
import { BandCard, DemoStrip, GearAction, HeroHeader, IconTile, R20Note, Sheet } from "@/components/scd/board";
import { BallIcon, CalendarGridIcon, ConeIcon, PeopleIcon } from "@/components/scd/icons";
import { openMenu } from "@/components/SiteChrome";
import { getPublicCalendarSnapshot } from "@/lib/calendar.functions";
import { groupShort, homeMatchesOn, quadroDay, staffCounters, titleCase, trainingRowsFor, venueCase } from "@/lib/board-data";
import { romeParts } from "@/lib/home-week";
import { loadQuadro } from "@/lib/public-snapshots";

const QUADRO = loadQuadro();

export const Route = createFileRoute("/core/staff")({
  loader: async () => {
    const calendar = await getPublicCalendarSnapshot();
    const now = romeParts(new Date().toISOString());
    return { calendar, today: now?.date ?? new Date().toISOString().slice(0, 10) };
  },
  head: () => ({ meta: [
    { title: "Area Staff (anteprima) — SCD CORE · S.C.D. ColicoDerviese" },
    { name: "description", content: "Area Staff della Super App S.C.D. ColicoDerviese: squadre e attività di oggi dalle fonti pubbliche, il resto in anteprima fino all'accesso R20." },
    { name: "robots", content: "noindex" },
  ] }),
  component: AreaStaff,
});

/** Colori delle pill come nella tavola: grigio, giallo, blu (a rotazione). */
const CHIPS = ["bg-[#e2e4ea] text-[var(--scd-ink)]", "bg-[#fdeeb2] text-[var(--scd-ink)]", "bg-[var(--scd-blue)] text-white"];
const BARS = ["#0a3a9a", "var(--scd-yellow)", "var(--scd-green)"];

type Activity = { id: string; start: string; end: string; kind: "allenamento" | "gara"; title: string; place: string; chip: string };

function AreaStaff() {
  const { calendar, today } = Route.useLoaderData();
  const counters = staffCounters(calendar.groups, calendar.events);
  const weekday = quadroDay(today);
  const activities: Activity[] = [
    ...trainingRowsFor(today, QUADRO.slots).map((t): Activity => ({ id: t.id, start: t.time, end: t.end, kind: "allenamento", title: `Allenamento ${t.teams}`, place: `Centro Sportivo - Colico · Campo ${t.field.slice(1)}`, chip: t.teams.split(" + ")[0]! })),
    ...homeMatchesOn(calendar.events, today).map((e): Activity => {
      const g = calendar.groups.find((x) => x.id === e.group);
      return { id: e.id, start: e.time || "--:--", end: "", kind: "gara", title: `${groupShort(g, e.category)} vs ${titleCase(e.opponent || "Avversario da definire")}`, place: venueCase(e.venue), chip: groupShort(g, e.category) };
    }),
  ].sort((a, b) => a.start.localeCompare(b.start));
  const dayName = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "long" }).format(new Date(`${today}T12:00:00Z`));
  const trend = ["u15", "u16", "u19", "prima"].map((id) => calendar.groups.find((g) => g.id === id)).filter((g) => !!g);

  return (
    <main data-screen="staff" data-testid="core-vision-staff">
      <HeroHeader
        title="Area Staff"
        subtitle={<>Statistiche, squadre, atleti<br />e gestione del club.</>}
        action={<GearAction onClick={openMenu} />}
        sky="staff"
        titleGap={30}
        bottomGap={28}
        testId="staff-hero"
      />
      <Sheet overlap={12}>
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          <div>
            <div className="grid grid-cols-4 gap-[6px]" role="group" aria-label="Numeri del club" data-testid="staff-counters">
              <Counter icon={<PeopleIcon size={28} className="text-[#1d4fa8]" />} value={counters.teams} label="Squadre" hint="Gruppi con gare nel calendario 2026/27" />
              <Counter icon={<UserRound className="size-[26px] fill-[var(--scd-green)] text-[var(--scd-green)]" strokeWidth={2} />} value={null} label="Atleti" hint="Dato R20 non collegato" />
              <Counter icon={<UserRound className="size-[26px] fill-[var(--scd-yellow)] text-[#141a2a]" strokeWidth={2} />} value={null} label="Staff" hint="Dato R20 non collegato" />
              <Counter icon={<FileText className="size-[26px] text-[#1d2b66]" strokeWidth={2.2} />} value={null} label="Documenti" hint="Dato R20 non collegato" />
            </div>
            <nav className="mt-[8px] grid grid-cols-4 gap-[6px]" aria-label="Funzioni staff">
              <IconTile label={<>Convocazioni<br />e presenze</>} icon={<CalendarGridIcon size={34} className="text-[#1d4fa8]" />} target={{ to: "/aree/$area", params: { area: "staff" } }} className="h-[112px]" labelClassName="text-[12.5px] tracking-[-0.01em]" />
              <IconTile label={<>Comunicazioni<br /><span className="font-medium text-[var(--scd-sub)]">avvisi del club</span></>} icon={<Megaphone className="size-[34px] fill-[#1d4fa8] text-[#1d4fa8]" strokeWidth={1.8} />} target={{ to: "/comunicazioni" }} className="h-[112px]" labelClassName="text-[12.5px] tracking-[-0.01em]" />
              <IconTile label={<>Persone<br />e staff</>} icon={<PeopleIcon size={38} className="text-[#1d4fa8]" />} target={{ to: "/core/impianti-calendari", search: { sezione: "responsabili" } }} className="h-[112px]" labelClassName="text-[12.5px]" />
              <IconTile label={<>Documenti<br />e scadenze</>} icon={<FileText className="size-[34px] text-[#1d4fa8]" strokeWidth={2.1} />} target={{ to: "/aree/$area", params: { area: "staff" } }} className="h-[112px]" labelClassName="text-[12.5px]" />
            </nav>
          </div>

          <div>
            <BandCard title="Prossime attività di oggi" more={{ label: "Vedi calendario", target: { to: "/core/impianti-calendari", search: { sezione: "quadro" } } }} testId="staff-today">
              {activities.length ? (
                <ul className="px-[10px]">
                  {activities.map((a, i) => (
                    <li key={a.id} className="flex items-center gap-[10px] border-b border-[var(--scd-line)] py-[11px] last:border-0">
                      <span className="w-[4px] shrink-0 self-stretch rounded-full" style={{ background: BARS[i % 3] }} aria-hidden="true" />
                      <span className="w-[50px] shrink-0 text-[16.5px] font-bold leading-[1.2] text-[var(--scd-ink)]">{a.start}{a.end && <><br />{a.end}</>}</span>
                      <span className="flex w-[30px] shrink-0 justify-center">{a.kind === "allenamento" ? <ConeIcon size={28} className="text-[var(--scd-orange)]" title="Allenamento" /> : <BallIcon size={28} className="text-[#0d1630]" title="Partita" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-[14.5px] font-bold leading-[1.2] text-[var(--scd-ink)]">{a.title}</span>
                        <span className="mt-[2px] block text-[12.5px] leading-tight text-[var(--scd-sub)]">{a.place}</span>
                      </span>
                      <span className={`max-w-[96px] shrink-0 truncate rounded-[7px] px-[9px] py-[6px] text-[13px] font-semibold ${CHIPS[i % 3]}`}>{a.chip}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-[14px] py-[16px] text-[14px] text-[var(--scd-sub)]">Oggi ({dayName}) nessuna attività al centro sportivo nel calendario pubblico e nel quadro allenamenti.</p>
              )}
              <p className="border-t border-[var(--scd-line)] px-[12px] py-[6px] text-[11.5px] text-[var(--scd-sub)]">
                {weekday ? "Allenamenti dal quadro lun–ven (fotografia 09/10/2026)" : "Sabato e domenica: il quadro allenamenti copre solo lun–ven"} · gare in casa dal calendario validato.
              </p>
            </BandCard>

            <BandCard title="Andamento squadre" more={{ label: "Vedi tutti", target: { to: "/calendario", search: { vista: "prossime" } } }} bodyClassName="grid grid-cols-4 gap-[6px] p-[8px]" testId="staff-trend">
              {trend.map((g) => (
                <Link key={g.id} to="/calendario" search={{ annata: g.years[0] ?? g.id, vista: "prossime" }} className="flex h-[112px] flex-col items-center justify-between rounded-[10px] bg-white py-[10px] text-center shadow-[var(--scd-card-shadow)]">
                  <span className="text-[14px] font-bold leading-tight tracking-[-0.02em] text-[var(--scd-ink)]">{groupShort(g)}</span>
                  <MoveRight className="size-[34px] text-[#b4bccb]" strokeWidth={2.4} aria-hidden="true" />
                  <span className="text-[11.5px] font-semibold leading-tight text-[var(--scd-sub)]">Risultati<br />in arrivo</span>
                </Link>
              ))}
            </BandCard>
          </div>
        </div>
        <R20Note area="staff" />
        <DemoSpacer />
      </Sheet>
      <DemoStrip />
    </main>
  );
}

function Counter({ icon, value, label, hint }: { icon: React.ReactNode; value: number | null; label: string; hint: string }) {
  return (
    <div className="scd-card flex h-[92px] flex-col items-center justify-center gap-[8px] px-1" title={hint}>
      <span className="flex items-center gap-[6px]">
        {icon}
        <span className="text-[24px] font-bold leading-none text-[var(--scd-ink)]" aria-label={value === null ? `${label}: non verificato` : `${label}: ${value}`}>{value ?? "—"}</span>
      </span>
      <span className="text-[14.5px] font-semibold leading-none text-[var(--scd-ink)]">{label}</span>
    </div>
  );
}

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { InteriorShell } from "@/components/scd/InteriorShell";
import { PlatformStarter } from "@/components/scd/Piattaforme";
import { StagingBanner, WorkAreaGateView } from "@/components/scd/work-area-ui";
import { ClubCatalogEditor } from "@/features/club-catalog/ClubCatalogEditor";
import { getClubCatalogDesk, saveClubCatalogEntry, type CatalogDeskPlatform } from "@/lib/club-catalog.functions";
import type { CatalogPlatform } from "@/lib/club-catalog";
import { CLUB_CARDS, activationText } from "@/lib/club-cards";
import { platformBySlug } from "@/lib/piattaforme";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/** Rail role set: only areas open to every staff role appear (the page itself is behind the work-area gate). */
const PREVIEW_ROLES: ReadonlySet<string> = new Set();
const PLATFORM = platformBySlug("convenzioni");
const PLATFORMS: CatalogPlatform[] = ["CONVENZIONI", "TESSERE"];

/**
 * Platform 19 Convenzioni, with the data entry of the club cards ("tessere"): same staff gate as /gestionale. The two
 * editors write the r115 register (STAGED until "applica r115"); the database decides who writes (Convenzioni: the
 * Direzione; Tessere: Direzione and Segreteria). The three club cards stay the Direzione policy
 * (config/scd-club-cards.v1.json): here one adds benefits, rules and other card types, never a copy of them.
 */
export const Route = createFileRoute("/gestionale/piattaforme/convenzioni")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "gestionale" } });
    const open = gate.view === "page";
    const desk = open ? await getClubCatalogDesk({ data: { platforms: PLATFORMS } }).catch(() => null) : null;
    return { gate, interior: open, desk: desk?.platforms ?? null };
  },
  head: () => ({
    meta: [
      { title: `${PLATFORM.name} — SCD Dentro · S.C.D. ColicoDerviese` },
      { name: "description", content: `Piattaforma ${PLATFORM.id} del gestionale: ${PLATFORM.purpose}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConvenzioniPageGate,
});

const unread = (platform: CatalogPlatform): CatalogDeskPlatform => ({ platform, state: "unavailable", entries: null });

function ConvenzioniPageGate() {
  const { gate, desk } = Route.useLoaderData();
  const router = useRouter();
  const save = useServerFn(saveClubCatalogEntry);
  const of = (p: CatalogPlatform) => desk?.find((d) => d.platform === p) ?? unread(p);
  const conv = of("CONVENZIONI");
  const cards = of("TESSERE");
  const reload = () => void router.invalidate();
  return (
    <WorkAreaGateView id="gestionale" gate={gate}>
      {gate.preview && <StagingBanner />}
      <InteriorShell title={PLATFORM.name} path={Route.fullPath} activeAreaId="gestionale" roles={PREVIEW_ROLES} roleLabel="Anteprima staff">
        <div className="flex flex-col gap-[18px]">
          <PlatformStarter p={PLATFORM} />
          <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-2 xl:items-start">
            <ClubCatalogEditor platform="CONVENZIONI" state={conv.state} entries={conv.entries} onSave={(input) => save({ data: input })} onDone={reload} />
            <ClubCatalogEditor id="tessere" platform="TESSERE" state={cards.state} entries={cards.entries} onSave={(input) => save({ data: input })} onDone={reload}>
              <div className="px-4 pb-3 sm:px-[18px]" data-testid="tessere-policy">
                <h3 className="m-0 text-[15px] font-bold">Le tre card già decise dalla Direzione</h3>
                <ul className="m-0 mt-1 grid list-none gap-1 p-0 text-[14.5px] leading-snug">
                  {CLUB_CARDS.tiers.map((t) => (
                    <li key={t.id}>
                      <b>{t.label}</b> — {activationText(t)}
                    </li>
                  ))}
                </ul>
                <p className="m-0 mt-1 text-[13px] text-[var(--in-sub)]">
                  Importi e regole base restano quelli della policy della Direzione; scadenza della card: {CLUB_CARDS.validity.endDate ?? "da confermare"}.{" "}
                  <Link to="/card" className="font-semibold text-[var(--in-info)] underline">
                    Vedi la pagina pubblica
                  </Link>
                </p>
              </div>
            </ClubCatalogEditor>
          </div>
        </div>
      </InteriorShell>
    </WorkAreaGateView>
  );
}

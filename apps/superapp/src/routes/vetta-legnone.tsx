/**
 * /vetta-legnone — public showcase of platform 17 «Ricerca calciatori e iscriviti come calciatore», named
 * «Vetta Legnone» by Francesco (17/10/2026). Engine: PERSONE. Content and measurement: src/lib/vetta-legnone.ts.
 * Study: docs/piattaforme/ricerche/vetta-legnone-studio.md. No form, no data collected here: every CTA goes to an
 * existing page (/entra, /contatti, /top11); the player profile is «in arrivo» until consents exist.
 */
import { createFileRoute } from "@tanstack/react-router";

import { VettaHero } from "@/components/vetta-legnone/VettaHero";
import { HistoryEpochs } from "@/components/vetta-legnone/VettaHistory";
import {
  AudienceCtas,
  CastIntro,
  HowItWorks,
  LevelLadder,
  RulesBand,
  WhoWeSeek,
} from "@/components/vetta-legnone/VettaSections";
import { pageHead } from "@/lib/share";
import { VETTA_SHARE } from "@/lib/vetta-legnone";

export const Route = createFileRoute("/vetta-legnone")({
  head: () => pageHead(VETTA_SHARE),
  component: VettaLegnone,
});

function VettaLegnone() {
  return (
    <main data-screen="vetta-legnone" className="bg-white text-[var(--scd-ink)]">
      <VettaHero />
      <CastIntro />
      <AudienceCtas />
      <WhoWeSeek />
      <LevelLadder />
      <HistoryEpochs />
      <HowItWorks />
      <RulesBand />
    </main>
  );
}

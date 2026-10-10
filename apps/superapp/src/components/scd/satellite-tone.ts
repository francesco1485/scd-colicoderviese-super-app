import type { Satellite } from "@/lib/satellites";

/** Accent per satellite area: left bar colour + status chip classes (contrast checked on white). */
export const SATELLITE_TONE: Record<Satellite["tone"], { bar: string; chip: string }> = {
  blue: { bar: "var(--scd-blue)", chip: "bg-[#e3eefb] text-[#0457af]" },
  sky: { bar: "var(--scd-sky)", chip: "bg-[#e1f3fc] text-[#0b5f8a]" },
  yellow: { bar: "var(--scd-yellow)", chip: "bg-[#fff6cc] text-[#5c4600]" },
  navy: { bar: "var(--scd-navy)", chip: "bg-[#e4e9f2] text-[#022d66]" },
  green: { bar: "var(--scd-green)", chip: "bg-[#e2f4e6] text-[#0d6b22]" },
  orange: { bar: "var(--scd-orange)", chip: "bg-[#ffe9df] text-[#9a3207]" },
};

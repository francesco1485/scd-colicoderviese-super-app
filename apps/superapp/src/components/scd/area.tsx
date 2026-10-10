/** Elementi comuni delle schermate riservate (Atleta, Famiglia, Staff): DEMO fino all'accesso R20. */
import { Segmented } from "./board";

export function AreaTabs({ active, tone = "blue" }: { active: "atleta" | "famiglia" | "staff"; tone?: "blue" | "yellow" }) {
  return (
    <Segmented
      tone={tone}
      label="Area riservata"
      items={[
        { label: "Atleta", active: active === "atleta", target: { to: "/core/atleta" } },
        { label: "Famiglia", active: active === "famiglia", target: { to: "/core/famiglia" } },
        { label: "Staff", active: active === "staff", target: { to: "/core/staff" } },
      ]}
    />
  );
}

/** Spazio finale su smartphone per barra inferiore + striscia DEMO fisse. */
export function DemoSpacer() {
  return <div className="h-[24px] lg:hidden" aria-hidden="true" />;
}

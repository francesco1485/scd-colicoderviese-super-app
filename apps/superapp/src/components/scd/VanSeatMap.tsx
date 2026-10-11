import { type PulminoRun, ridersTotal, seatPlan } from "@/lib/pulmini-runs";

/**
 * Top view of a minibus (front on the right, driving towards the destination).
 * Children are drawn as small figurative faces in their team colour: never photos, never names.
 * The driver (adult volunteer) is shown with the display name from the Master Pulmini.
 */

const SKIN = ["#f1c7a5", "#e0ac83", "#c68b62", "#9c6644", "#f6d5bd", "#d9a37a"];
const HAIR = ["#3b2a1e", "#6b4423", "#1d1d1d", "#b5813f", "#e2c27a", "#5a3a22"];

function Face({ x, y, r, seed, shirt, adult = false }: { x: number; y: number; r: number; seed: number; shirt: string; adult?: boolean }) {
  const skin = SKIN[seed % SKIN.length]!;
  const hair = adult ? "#8a8f98" : HAIR[(seed * 7 + 3) % HAIR.length]!;
  const long = !adult && seed % 3 === 1;
  return (
    <g>
      {/* shoulders in team colour */}
      <path d={`M${x - r * 1.25} ${y + r * 1.75} Q${x} ${y + r * 0.55} ${x + r * 1.25} ${y + r * 1.75} Z`} fill={shirt} />
      {long && <path d={`M${x - r * 1.02} ${y + r * 0.9} Q${x - r * 1.2} ${y - r * 0.6} ${x} ${y - r * 1.05} Q${x + r * 1.2} ${y - r * 0.6} ${x + r * 1.02} ${y + r * 0.9} Z`} fill={hair} />}
      <circle cx={x} cy={y} r={r} fill={skin} />
      <path d={`M${x - r} ${y - r * 0.15} Q${x - r * 0.95} ${y - r * 1.15} ${x} ${y - r * 1.08} Q${x + r * 0.95} ${y - r * 1.15} ${x + r} ${y - r * 0.15} Q${x} ${y - r * 0.55} ${x - r} ${y - r * 0.15} Z`} fill={hair} />
      <circle cx={x - r * 0.36} cy={y + r * 0.08} r={r * 0.11} fill="#1d2433" />
      <circle cx={x + r * 0.36} cy={y + r * 0.08} r={r * 0.11} fill="#1d2433" />
      <path d={`M${x - r * 0.38} ${y + r * 0.42} Q${x} ${y + r * 0.72} ${x + r * 0.38} ${y + r * 0.42}`} stroke="#1d2433" strokeWidth={r * 0.1} fill="none" strokeLinecap="round" />
    </g>
  );
}

export interface TeamColor {
  label: string;
  color: string;
}

export function VanSeatMap({
  run,
  teams,
  destination,
  className = "",
}: {
  run: PulminoRun | null;
  teams: ReadonlyMap<string, TeamColor>;
  destination: string;
  className?: string;
}) {
  const plan = seatPlan(run);
  // Layout: cabin bench (2 passengers) next to the driver, then rows of 3.
  const cabin = Math.min(2, plan.seats);
  const rest = plan.seats - cabin;
  const rows = Math.ceil(rest / 3);
  const seatW = 38;
  const gap = 8;
  const rowW = seatW + gap;
  const bodyX = 18;
  const rearPad = 18;
  const cabinX = bodyX + rearPad + rows * rowW + 10;
  const W = cabinX + seatW + 70;
  const H = 150;
  const top = 18;
  const laneY = (i: number) => top + 14 + i * 40; // 3 lanes: 0 top (driver side), 1 middle, 2 bottom

  const seats: Array<{ x: number; y: number; who: string | null; idx: number }> = [];
  // rows from the back (left) towards the cabin (right)
  for (let r = 0; r < rows; r++) {
    for (let l = 0; l < 3; l++) {
      const n = r * 3 + l;
      if (n >= rest) break;
      seats.push({ x: bodyX + rearPad + r * rowW, y: laneY(l), who: plan.occupancy[cabin + n] ?? null, idx: cabin + n });
    }
  }
  for (let c = 0; c < cabin; c++) seats.push({ x: cabinX, y: laneY(c + 1), who: plan.occupancy[c] ?? null, idx: c });

  const used = new Map<string, number>();
  for (const s of plan.occupancy) if (s && s !== "adult") used.set(s, (used.get(s) ?? 0) + 1);
  const kids = run ? ridersTotal(run) : 0;
  const driver = run?.driver ?? null;

  return (
    <figure className={`m-0 ${className}`}>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full min-w-[300px] max-w-[520px]"
          role="img"
          aria-label={`${run?.vehicle ?? "Pulmino"} verso ${destination}: autista ${driver ?? "da assegnare"}, ${kids} ragazzi su ${plan.seats} posti`}
        >
          {/* body */}
          <rect x={bodyX} y={top} width={W - bodyX - 40} height={H - 2 * top} rx="22" fill="#ffffff" stroke="#0457af" strokeWidth="3" />
          {/* windscreen and bonnet */}
          <path d={`M${W - 40} ${top + 10} q22 ${(H - 2 * top) / 2 - 10} 0 ${H - 2 * top - 20}`} fill="#d7e9fb" stroke="#0457af" strokeWidth="3" />
          {/* mirrors */}
          <rect x={cabinX + seatW - 4} y={top - 9} width="16" height="8" rx="3" fill="#0457af" />
          <rect x={cabinX + seatW - 4} y={H - top + 1} width="16" height="8" rx="3" fill="#0457af" />
          {/* driving direction */}
          <path d={`M${W - 14} ${H / 2 - 9} l12 9 l-12 9`} fill="none" stroke="#ffd82a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

          {seats.map((s) => {
            const team = s.who && s.who !== "adult" ? teams.get(s.who) : undefined;
            return (
              <g key={s.idx}>
                <rect
                  x={s.x}
                  y={s.y - 13}
                  width={seatW}
                  height="34"
                  rx="9"
                  fill={s.who ? "#eef4ff" : "#ffffff"}
                  stroke={s.who ? "#9cc0e6" : "#b9cfe6"}
                  strokeWidth="1.6"
                  strokeDasharray={s.who ? undefined : "4 3"}
                />
                {s.who && <Face x={s.x + seatW / 2} y={s.y} r={9} seed={s.idx + 1} shirt={s.who === "adult" ? "#7b8794" : team?.color ?? "#3b5683"} adult={s.who === "adult"} />}
              </g>
            );
          })}

          {/* driver: top lane of the cabin (left-hand drive) */}
          <rect x={cabinX} y={laneY(0) - 13} width={seatW} height="34" rx="9" fill={driver ? "#fff6cc" : "#ffffff"} stroke="#e0b800" strokeWidth="1.8" strokeDasharray={driver ? undefined : "4 3"} />
          {driver ? (
            <Face x={cabinX + seatW / 2} y={laneY(0)} r={10} seed={3} shirt="#0457af" adult />
          ) : (
            <text x={cabinX + seatW / 2} y={laneY(0) + 6} textAnchor="middle" fontSize="15" fontWeight="800" fill="#b38f00">?</text>
          )}
          <circle cx={cabinX + seatW + 9} cy={laneY(0) + 4} r="8" fill="none" stroke="#1d2433" strokeWidth="2.4" />
        </svg>
      </div>
      <figcaption className="mt-2 grid gap-1.5 text-[14px] leading-snug">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <b className="text-[15px]">{run?.vehicle ?? "Pulmino"}</b>
          <span className="text-[var(--in-sub)]">→ {destination}</span>
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            Autista: <b>{driver ?? "da assegnare"}</b>
          </span>
          <span>
            Ragazzi: <b>{kids}</b> / {plan.seats} posti{run && run.adults > 0 ? ` · ${run.adults} accompagnator${run.adults === 1 ? "e" : "i"}` : ""}
          </span>
          {!plan.confirmed && <span className="text-[var(--in-sub)]">schema tipo 9 posti, posti da confermare</span>}
          {plan.overflow > 0 && <b className="text-[#b42318]">{plan.overflow} senza posto</b>}
        </span>
        {used.size > 0 && (
          <span className="flex flex-wrap gap-1.5" aria-label="Squadre a bordo">
            {[...used.entries()].map(([id, n]) => (
              <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--in-info-bg)] px-2 py-0.5 text-[13px] font-semibold">
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: teams.get(id)?.color ?? "#3b5683" }} />
                {teams.get(id)?.label ?? id} · {n}
              </span>
            ))}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

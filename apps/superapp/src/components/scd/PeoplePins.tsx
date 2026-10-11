import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { initials, type StaffKind, type StaffPerson } from "@/lib/staff-roster";

/**
 * "Omini" (UD-046): the adults present on a pitch, in a changing room or on a van,
 * drawn as small figures with name and role. Tapping one opens the card: the e-mail
 * appears only when the viewer is inside an open area; otherwise a link to log in.
 * Children never appear here.
 */

const KIND_COLOR: Record<StaffKind, string> = {
  dirigente: "#0457af",
  mister: "#1f8a4c",
  autista: "#b36b00",
  responsabile: "#6b3fa0",
  staff: "#4a6380",
};

export const KIND_LABEL: Record<StaffKind, string> = {
  dirigente: "Dirigente",
  mister: "Mister",
  autista: "Autista",
  responsabile: "Responsabile",
  staff: "Staff",
};

export function Figure({ person, size = 44 }: { person: StaffPerson; size?: number }) {
  const color = KIND_COLOR[person.kind];
  if (person.avatar) {
    return <img src={person.avatar} alt="" width={size} height={size} className="rounded-full object-cover ring-2 ring-white" style={{ width: size, height: size, boxShadow: `0 0 0 3px ${color}` }} />;
  }
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className="shrink-0">
      <circle cx="24" cy="24" r="23" fill="#eef4ff" stroke={color} strokeWidth="2.5" />
      <circle cx="24" cy="18" r="8" fill={color} opacity=".9" />
      <path d="M8 44c2-10 8-15 16-15s14 5 16 15z" fill={color} />
      <text x="24" y="40" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff" fontFamily="Barlow, system-ui, sans-serif">
        {initials(person.name)}
      </text>
    </svg>
  );
}

export function PeoplePins({
  people,
  emails,
  size = 44,
  dark = false,
  label = "Presenti",
}: {
  people: readonly StaffPerson[];
  /** id → e-mail, present only when the viewer may see contacts. */
  emails?: Readonly<Record<string, string>>;
  size?: number;
  /** On dark backgrounds the labels turn light. */
  dark?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (people.length === 0) return null;
  const sub = dark ? "text-[#cfe0ff]" : "text-[var(--scd-sub,#46617f)]";
  const ink = dark ? "text-white" : "text-[var(--scd-ink,#062a52)]";
  return (
    <div className="grid gap-2" data-testid="people-pins">
      <span className={`text-[11.5px] font-extrabold uppercase tracking-[0.06em] ${sub}`}>{label}</span>
      <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-2 p-0">
        {people.map((p) => {
          const isOpen = open === p.id;
          const email = emails?.[p.id];
          return (
            <li key={p.id} className="relative">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : p.id)}
                aria-expanded={isOpen}
                className={`flex max-w-[176px] items-center gap-2 rounded-full py-1 pl-1 pr-3 text-left ${dark ? "bg-white/10" : "bg-white shadow-[0_2px_6px_rgb(0_20_60/0.1)]"}`}
              >
                <Figure person={p} size={size} />
                <span className="min-w-0">
                  <b className={`block truncate text-[13px] leading-tight ${ink}`}>{p.name}</b>
                  <span className={`block truncate text-[11px] leading-tight ${sub}`}>{p.role}</span>
                </span>
              </button>
              {isOpen && (
                <div role="dialog" aria-label={p.name} className="absolute left-0 top-[calc(100%+6px)] z-20 w-[240px] rounded-[12px] border border-[#d3e0ee] bg-white p-3 text-[13.5px] text-[#062a52] shadow-[0_12px_24px_rgb(0_10_40/0.25)]">
                  <b className="block">{p.name}</b>
                  <span className="block text-[#46617f]">{p.role}</span>
                  {p.teams.length > 0 && <span className="mt-1 block text-[12.5px] text-[#46617f]">Segue: {p.teams.join(", ")}</span>}
                  {email ? (
                    <span className="mt-2 block select-all break-all font-semibold">{email}</span>
                  ) : (
                    <Link to="/aree" className="mt-2 inline-flex min-h-[36px] items-center rounded-[10px] bg-[#0457af] px-3 text-[13px] font-bold text-white">
                      Accedi per i riferimenti
                    </Link>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

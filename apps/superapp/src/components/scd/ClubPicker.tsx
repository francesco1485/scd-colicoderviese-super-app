/**
 * Opponent club picker of the request machine (UD-154): a search bar over the clubs already registered (r133
 * scd_clubs) and the calendar opponents of the crest registry, with "Nuova società" inline when the club is not
 * there yet. No crest is ever drawn here: the club gets a crest only through config/scd-opponent-crests.v1.json.
 */
import { useServerFn } from "@tanstack/react-start";
import { Check, Plus, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { createClub, searchClubs, type ClubSuggestion } from "@/lib/request-machine.functions";

export interface PickedClub {
  id: string;
  name: string;
  city: string | null;
}

const field =
  "scd-focus h-11 w-full rounded-[10px] border border-[#b9c8dc] bg-white px-3 text-[15px] text-[#0b1e3a] placeholder:text-[#5d6f8a]";
const btn = "scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-3.5 text-[15px] font-bold";

export function ClubPicker({
  value,
  onChange,
  initialQuery = "",
  disabled = false,
  label = "Società avversaria",
}: {
  value: PickedClub | null;
  onChange: (club: PickedClub | null) => void;
  initialQuery?: string;
  disabled?: boolean;
  label?: string;
}) {
  const search = useServerFn(searchClubs);
  const create = useServerFn(createClub);
  const [q, setQ] = useState(initialQuery);
  const [items, setItems] = useState<ClubSuggestion[]>([]);
  const [ready, setReady] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newClub, setNewClub] = useState({ name: "", city: "", province: "", figcMatricola: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const seq = useRef(0);
  const id = useId();

  useEffect(() => {
    if (disabled || value) return;
    const query = q.trim();
    if (query.length < 2) {
      setItems([]);
      return;
    }
    const n = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const r = await search({ data: { q: query } });
        if (n !== seq.current) return;
        setReady(r.ready);
        setItems(r.items);
      } catch {
        if (n === seq.current) setReady(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, disabled, value, search]);

  async function pick(s: ClubSuggestion) {
    setMsg(null);
    if (s.id) {
      onChange({ id: s.id, name: s.name, city: s.city });
      return;
    }
    setBusy(true);
    try {
      const r = await create({ data: { name: s.name, ...(s.crestKey ? { crestKey: s.crestKey } : {}) } });
      if (r.ok && r.club?.id) onChange({ id: r.club.id, name: r.club.name, city: r.club.city });
      else setMsg(r.message);
    } catch {
      setMsg("Società non salvata: riprova.");
    } finally {
      setBusy(false);
    }
  }

  async function addNew() {
    setMsg(null);
    if (newClub.name.trim().length < 2) {
      setMsg("Scrivi il nome della società.");
      return;
    }
    setBusy(true);
    try {
      const r = await create({
        data: {
          name: newClub.name.trim(),
          ...(newClub.city.trim() ? { city: newClub.city.trim() } : {}),
          ...(newClub.province.trim() ? { province: newClub.province.trim() } : {}),
          ...(newClub.figcMatricola.trim() ? { figcMatricola: newClub.figcMatricola.trim() } : {}),
        },
      });
      if (r.ok && r.club?.id) {
        onChange({ id: r.club.id, name: r.club.name, city: r.club.city });
        setAdding(false);
      } else setMsg(r.message);
    } catch {
      setMsg("Società non salvata: riprova.");
    } finally {
      setBusy(false);
    }
  }

  if (value) {
    return (
      <div className="grid gap-1.5">
        <span className="text-[14px] font-semibold text-[#3e5272]">{label}</span>
        <div className="flex min-h-11 items-center gap-2 rounded-[10px] border border-[#2ba36b] bg-[#eefaf3] px-3">
          <Check className="size-4 flex-none text-[#1d7a4e]" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-[15px] font-semibold">
            {value.name}
            {value.city ? <span className="font-normal text-[#3e5272]"> · {value.city}</span> : null}
          </span>
          {!disabled && (
            <button type="button" onClick={() => onChange(null)} className="scd-focus grid size-11 place-items-center rounded-[10px]" aria-label="Cambia società">
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      <label htmlFor={`${id}-q`} className="text-[14px] font-semibold text-[#3e5272]">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#5d6f8a]" aria-hidden="true" />
        <input
          id={`${id}-q`}
          type="search"
          value={q}
          disabled={disabled}
          onChange={(e) => setQ(e.target.value.slice(0, 60))}
          placeholder="Cerca per nome o paese"
          autoComplete="off"
          aria-controls={`${id}-list`}
          className={`${field} pl-9`}
        />
      </div>
      {!ready && <p className="m-0 text-[13.5px] text-[#8a5a00]">Ricerca non disponibile finché la funzione non è attiva.</p>}
      {items.length > 0 && (
        <ul id={`${id}-list`} className="m-0 grid list-none gap-1 p-0" aria-label="Società trovate">
          {items.map((s) => (
            <li key={`${s.id ?? "reg"}-${s.name}`}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void pick(s)}
                className="scd-focus flex min-h-11 w-full items-center gap-2 rounded-[10px] border border-[#d5e0ee] bg-white px-3 text-left text-[15px] hover:bg-[#f2f7fd]"
              >
                <span className="min-w-0 flex-1 font-semibold">{s.name}</span>
                {s.city && <span className="text-[13.5px] text-[#3e5272]">{s.city}</span>}
                {!s.id && <span className="text-[12.5px] font-semibold text-[#1e6fbf]">dal calendario</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!disabled && !adding && (
        <button type="button" onClick={() => { setAdding(true); setNewClub((c) => ({ ...c, name: c.name || q.trim() })); }} className={`${btn} justify-self-start border border-[#1e6fbf] bg-white text-[#1e6fbf]`}>
          <Plus className="size-4" aria-hidden="true" />
          Nuova società
        </button>
      )}
      {adding && (
        <fieldset className="m-0 grid gap-2 rounded-[12px] border border-[#d5e0ee] bg-[#f7fbff] p-3">
          <legend className="px-1 text-[14px] font-bold">Nuova società</legend>
          <label className="grid gap-1 text-[14px] font-semibold text-[#3e5272]">
            Nome
            <input className={field} value={newClub.name} maxLength={120} onChange={(e) => setNewClub({ ...newClub, name: e.target.value })} />
          </label>
          <div className="grid grid-cols-[1fr_88px] gap-2">
            <label className="grid gap-1 text-[14px] font-semibold text-[#3e5272]">
              Paese
              <input className={field} value={newClub.city} maxLength={80} onChange={(e) => setNewClub({ ...newClub, city: e.target.value })} />
            </label>
            <label className="grid gap-1 text-[14px] font-semibold text-[#3e5272]">
              Prov.
              <input className={field} value={newClub.province} maxLength={2} placeholder="LC" onChange={(e) => setNewClub({ ...newClub, province: e.target.value.toUpperCase() })} />
            </label>
          </div>
          <label className="grid gap-1 text-[14px] font-semibold text-[#3e5272]">
            Matricola FIGC (se nota)
            <input className={field} value={newClub.figcMatricola} inputMode="numeric" maxLength={10} onChange={(e) => setNewClub({ ...newClub, figcMatricola: e.target.value.replace(/\D/g, "") })} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void addNew()} className={`${btn} bg-[#0b2a5b] text-white`}>
              Salva società
            </button>
            <button type="button" onClick={() => setAdding(false)} className={`${btn} border border-[#b9c8dc] bg-white text-[#0b1e3a]`}>
              Chiudi
            </button>
          </div>
        </fieldset>
      )}
      {msg && (
        <p className="m-0 text-[14px] font-semibold text-[#b3261e]" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}

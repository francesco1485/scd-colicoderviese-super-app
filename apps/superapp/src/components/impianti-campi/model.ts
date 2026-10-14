/**
 * Shared state of the Impianti e campi page: scenario, hypothetical bookings
 * (browser only), derived simulation and analysis. No server persistence.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import snapshot from "@/data/calendario-snapshot-20261010.json";
import {
  DEFAULT_OPTIONS,
  PRESETS,
  analyse,
  clubToday,
  homeMatches,
  parseStoredBookings,
  simulate,
  withBookings,
  type Analysis,
  type Booking,
  type RotationMatch,
  type ScenarioOptions,
  type ScenarioPreset,
  type SnapshotEvent,
} from "@/lib/rotation";

export const BASE_MATCHES: readonly RotationMatch[] = homeMatches(
  snapshot.events as SnapshotEvent[],
);
export const SNAPSHOT_DAY = snapshot.source_modified_at.slice(0, 10);

const GROUP_COLORS = snapshot.groups as Record<
  string,
  { color: string } | undefined
>;
/** Official team colour from the calendar snapshot; neutral for bookings. */
export function teamColor(group: string): string {
  if (group === "ipotesi") return "#47607e";
  return GROUP_COLORS[group]?.color ?? "#668196";
}

const STORE_KEY = "scd-impianti-ipotesi-v1";

export type PresetId = ScenarioPreset["id"] | "custom";
export type TabId = "colico" | "dervio" | "simulazione";

export interface ImpiantiModel {
  today: string;
  preset: PresetId;
  options: ScenarioOptions;
  lightsVerified: boolean;
  bookings: Booking[];
  items: RotationMatch[];
  analysis: Analysis;
  applyPreset: (id: ScenarioPreset["id"]) => void;
  setOptions: (patch: Partial<ScenarioOptions>) => void;
  setLightsVerified: (v: boolean) => void;
  addBooking: (b: Omit<Booking, "id">) => Booking;
  removeBooking: (id: string) => void;
  storageOk: boolean;
}

export function useImpiantiModel(): ImpiantiModel {
  const [today] = useState(() => clubToday());
  const [preset, setPreset] = useState<PresetId>("now");
  const [options, setOpts] = useState<ScenarioOptions>(DEFAULT_OPTIONS);
  const [lightsVerified, setLightsVerified] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [storageOk, setStorageOk] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setBookings(parseStoredBookings(window.localStorage.getItem(STORE_KEY)));
    } catch {
      setStorageOk(false);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(bookings));
      setStorageOk(true);
    } catch {
      setStorageOk(false);
    }
  }, [bookings, loaded]);

  const applyPreset = useCallback((id: ScenarioPreset["id"]) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    setOpts((o) => ({ ...o, modes: { ...p.modes }, auto: p.auto }));
  }, []);

  const setOptions = useCallback((patch: Partial<ScenarioOptions>) => {
    if (patch.modes) setPreset("custom");
    setOpts((o) => ({
      ...o,
      ...patch,
      ...(patch.modes ? { auto: false } : {}),
    }));
  }, []);

  const addBooking = useCallback((b: Omit<Booking, "id">): Booking => {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const created = { ...b, id, createdAt: new Date().toISOString() };
    setBookings((list) => [...list, created]);
    return created;
  }, []);
  const removeBooking = useCallback(
    (id: string) => setBookings((list) => list.filter((b) => b.id !== id)),
    [],
  );

  const items = useMemo(
    () => simulate(withBookings(BASE_MATCHES, bookings), options),
    [bookings, options],
  );
  const analysis = useMemo(
    () =>
      analyse(items, {
        today,
        startDate: options.startDate,
        buffer: options.buffer,
        maxDervioPerDay: options.maxDervioPerDay,
        lightsVerified,
      }),
    [
      items,
      today,
      options.startDate,
      options.buffer,
      options.maxDervioPerDay,
      lightsVerified,
    ],
  );

  return {
    today,
    preset,
    options,
    lightsVerified,
    bookings,
    items,
    analysis,
    applyPreset,
    setOptions,
    setLightsVerified,
    addBooking,
    removeBooking,
    storageOk,
  };
}

export function presetLabel(id: PresetId): string {
  return id === "custom"
    ? "Scenario personalizzato"
    : (PRESETS.find((p) => p.id === id)?.label ?? "—");
}

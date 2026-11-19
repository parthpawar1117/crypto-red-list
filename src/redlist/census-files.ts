/** Where the local quarterly census lives, and which dates it covers. */
import { existsSync, readFileSync } from "node:fs";
import type { CoinSnapshot } from "./criteria";
import { liveUniverse } from "./census";

export const FIRST_CENSUS = "2018-11-15";
export const LAST_CENSUS = "2026-11-15";

/** 15 Feb / May / Aug / Nov from FIRST_CENSUS to LAST_CENSUS. */
export function censusDates(first = FIRST_CENSUS, last = LAST_CENSUS): string[] {
  const out: string[] = [];
  for (let d = first; d <= last; d = shiftMonths(d, 3)) out.push(d);
  return out;
}

export function shiftMonths(date: string, months: number): string {
  const dt = new Date(`${date}T00:00:00Z`);
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return dt.toISOString().slice(0, 10);
}

export const censusPath = (date: string) => `data/census/${date}.json`;

/**
 * Loads one census as id -> snapshot (or null if not downloaded), in the same
 * universe the live site rates: derivative tokens dropped, ranks renumbered.
 */
export function loadCensus(date: string): Map<number, CoinSnapshot> | null {
  const file = censusPath(date);
  if (!existsSync(file)) return null;
  const rows = JSON.parse(readFileSync(file, "utf8")) as CoinSnapshot[];
  return liveUniverse(new Map(rows.map((r) => [r.id, r])));
}

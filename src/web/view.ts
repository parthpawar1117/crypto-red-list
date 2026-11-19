/** Slim, serialisable rows for pages and client components. */
import type { RedListStatus } from "../redlist/assess";
import type { CoinInfo } from "../live/coin-info";
import type { LiveRedList } from "../live/redlist-live";
import { criteriaCode, statusChange } from "./status";

export interface CoinRow {
  id: number;
  symbol: string;
  name: string;
  rank: number;
  status: RedListStatus;
  probability: number | null;
  criteria: string;
  reasons: string[];
  logo: string | null;
  change: ReturnType<typeof statusChange>;
  previous: RedListStatus | null;
  /** Member of CMC's flagship CMC100 index right now. */
  inCmc100: boolean;
}

export function toRows(list: LiveRedList, info: Record<number, CoinInfo>, previous: Record<string, string> | null, cmc100Ids: Set<number> = new Set()): CoinRow[] {
  return list.coins.map((c) => {
    const prev = (previous?.[String(c.id)] as RedListStatus | undefined) ?? undefined;
    return {
      id: c.id,
      symbol: c.symbol,
      name: c.name ?? c.symbol,
      rank: c.rank,
      status: c.status,
      probability: c.probability,
      criteria: criteriaCode(c.signals),
      reasons: c.reasons,
      logo: info[c.id]?.logo ?? null,
      change: statusChange(prev, c.status),
      previous: prev ?? null,
      inCmc100: cmc100Ids.has(c.id),
    };
  });
}

/** Position of a probability on the five-band meter (each band one fifth). */
export function meterPosition(p: number): number {
  const edges = [0, 0.05, 0.1, 0.2, 0.4, 1];
  for (let i = 0; i < 5; i++) {
    if (p < edges[i + 1]! || i === 4) return (i + Math.min(1, (p - edges[i]!) / (edges[i + 1]! - edges[i]!))) / 5;
  }
  return 1;
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

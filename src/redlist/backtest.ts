/**
 * Point-in-time cohorts: on a past date, rate every eligible coin using only
 * what CMC's census showed then, and attach what actually happened 12 months
 * later. Because the census includes coins that later died, there is no
 * survivorship bias: dead coins are in the data, not quietly missing.
 */
import { marketRatio, signalA, signalB, signalD, type CoinSnapshot } from "./criteria";

export interface CohortRow {
  date: string;
  id: number;
  symbol: string;
  rank: number;
  a: number | null;
  b: number | null;
  d: number | null;
  young: boolean;
  /** Not in CMC's top 3,000 twelve months later (delisted, dead or collapsed). */
  vanished: boolean;
  /** 12-month price change, null when the coin vanished or prices are missing. */
  ret: number | null;
}

export interface CohortInput {
  date: string;
  now: Map<number, CoinSnapshot>;
  halfAgo: Map<number, CoinSnapshot>;
  yearAgo: Map<number, CoinSnapshot>;
  later: Map<number, CoinSnapshot>;
}

export function buildCohort({ date, now, halfAgo, yearAgo, later }: CohortInput): CohortRow[] {
  const market = marketRatio(now.values(), yearAgo);
  const rows: CohortRow[] = [];
  for (const coin of now.values()) {
    if (coin.rank > 500 || coin.stable) continue;
    const half = halfAgo.get(coin.id);
    if (!half) continue; // Data Deficient
    const year = yearAgo.get(coin.id);
    const next = later.get(coin.id);
    const ret = next?.price && coin.price ? next.price / coin.price - 1 : null;
    rows.push({
      date,
      id: coin.id,
      symbol: coin.symbol,
      rank: coin.rank,
      a: signalA(coin, year, market)?.level ?? null,
      b: signalB(coin, half)?.level ?? null,
      d: signalD(coin)?.level ?? null,
      young: !year,
      vanished: !next,
      ret,
    });
  }
  return rows.sort((x, y) => x.rank - y.rank);
}

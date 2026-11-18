/**
 * The time machine: what the Red List would have said on a past date, and
 * what actually happened next.
 *
 * Each cohort is rated with assessCoin, the exact function the live site
 * uses, from CMC census snapshots on that date and 6 / 12 months before.
 * The outcome comes from the snapshot 12 months later. Nothing from after
 * the date is used for the rating itself.
 */
import { assessCoin, type RedListStatus } from "./assess";
import { marketRatio, type CoinSnapshot } from "./criteria";
import type { ModelWeights } from "./model";
import { redListIndex, statusCounts, type StatusCounts } from "./rli";

/** Price change assumed for a coin that left the top 3,000 (its price is unknown). */
export const VANISHED_RETURN = -0.95;
/** Cap on one coin's 12-month gain (+1000%) so a single moonshot can't dominate the average. */
export const RETURN_CAP = 10;

export interface RatedCoin {
  id: number;
  symbol: string;
  rank: number;
  status: RedListStatus;
  probability: number | null;
  reasons: string[];
  vanished?: boolean;
  ret?: number | null;
}

export interface RatedCohort {
  date: string;
  rli: number | null;
  counts: StatusCounts;
  hasOutcome: boolean;
  coins: RatedCoin[];
}

export interface CohortInput {
  date: string;
  now: Map<number, CoinSnapshot>;
  halfAgo: Map<number, CoinSnapshot>;
  yearAgo: Map<number, CoinSnapshot>;
  /** Snapshot 12 months later, or null if that date has not come yet. */
  later: Map<number, CoinSnapshot> | null;
  weights: ModelWeights;
}

export function rateCohort({ date, now, halfAgo, yearAgo, later, weights }: CohortInput): RatedCohort {
  const top = [...now.values()].filter((c) => c.rank <= 500).sort((a, b) => a.rank - b.rank);
  const market = marketRatio(top, yearAgo);
  const coins = top.map((c): RatedCoin => {
    const a = assessCoin({ now: c, halfAgo: halfAgo.get(c.id), yearAgo: yearAgo.get(c.id), marketRatio: market, weights });
    const base: RatedCoin = { id: c.id, symbol: c.symbol, rank: c.rank, status: a.status, probability: a.probability, reasons: a.reasons };
    if (!later) return base;
    const next = later.get(c.id);
    return { ...base, vanished: !next, ret: next?.price && c.price ? next.price / c.price - 1 : null };
  });
  const statuses = coins.map((x) => x.status);
  return { date, rli: redListIndex(statuses), counts: statusCounts(statuses), hasOutcome: later !== null, coins };
}

const ASSESSED: RedListStatus[] = ["CR", "EN", "VU", "NT", "LC"];
const isRed = (s: RedListStatus) => s === "EN" || s === "CR";

export interface CohortSummary {
  date: string;
  rli: number | null;
  counts: StatusCounts;
  riskiest: RatedCoin[];
  outcome: null | {
    byStatus: Record<"CR" | "EN" | "VU" | "NT" | "LC", { n: number; vanished: number }>;
    /** Average 12-month return of an equal-weight portfolio of all assessed coins. */
    portfolio: { holdAll: number; exitRed: number };
  };
}

export function summarizeCohort(cohort: RatedCohort, topN = 10): CohortSummary {
  const assessed = cohort.coins.filter((c) => ASSESSED.includes(c.status));
  const riskiest = [...assessed].sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0)).slice(0, topN);
  const base = { date: cohort.date, rli: cohort.rli, counts: cohort.counts, riskiest };
  if (!cohort.hasOutcome) return { ...base, outcome: null };

  const byStatus = { CR: { n: 0, vanished: 0 }, EN: { n: 0, vanished: 0 }, VU: { n: 0, vanished: 0 }, NT: { n: 0, vanished: 0 }, LC: { n: 0, vanished: 0 } };
  let hold = 0;
  let exit = 0;
  let n = 0;
  for (const c of assessed) {
    const bucket = byStatus[c.status as keyof typeof byStatus];
    bucket.n++;
    if (c.vanished) bucket.vanished++;
    const r = c.vanished ? VANISHED_RETURN : c.ret == null ? null : Math.min(c.ret, RETURN_CAP);
    if (r == null) continue;
    hold += r;
    exit += isRed(c.status) ? 0 : r;
    n++;
  }
  return { ...base, outcome: { byStatus, portfolio: { holdAll: n ? hold / n : 0, exitRed: n ? exit / n : 0 } } };
}

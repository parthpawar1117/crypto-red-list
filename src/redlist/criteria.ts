/**
 * The three warning signals of the Crypto Red List (rules v3).
 *
 * Each signal turns raw CoinMarketCap census numbers into a value (what was
 * measured) and a level (how bad it is). Levels feed the risk model; values
 * feed the plain-language reasons shown to people.
 *
 * Signal C from earlier versions (rank drop) is gone: in out-of-sample tests
 * it carried a negative weight, i.e. it made predictions worse.
 */

/** One coin in one CMC historical listings snapshot ("census"). */
export interface CoinSnapshot {
  id: number;
  symbol: string;
  name?: string;
  rank: number;
  /** num_market_pairs: how many trading pairs list the coin. */
  pairs: number | null;
  mcap: number | null;
  /** 24h volume in USD. */
  vol: number | null;
  price?: number | null;
  /** Tagged as a stablecoin by CMC. */
  stable: boolean;
  /** Represents another asset (wrapped, staked, bridged); left out of the universe. */
  derivative?: boolean;
}

export interface Signal {
  value: number;
  level: number;
}

/** Grades a value against descending cut-offs: >= cuts[0] is the highest level. */
function grade(value: number, cuts: number[]): number {
  const i = cuts.findIndex((c) => value >= c);
  return i === -1 ? 0 : cuts.length - i;
}

/**
 * A: how far the coin fell behind the whole market over 12 months, in %.
 * 0 means it moved with the market; 90 means it kept only a tenth of what
 * the typical top-500 coin kept. Cut-offs 90 / 80 / 65 / 45 give levels 4..1.
 */
export function signalA(now: CoinSnapshot, yearAgo: CoinSnapshot | undefined, market: number): Signal | null {
  if (!yearAgo?.mcap || !now.mcap || yearAgo.mcap <= 0 || now.mcap <= 0 || market <= 0) return null;
  const value = (1 - now.mcap / yearAgo.mcap / market) * 100;
  return { value, level: grade(value, [90, 80, 65, 45]) };
}

/**
 * B: share of exchange pairs lost over 6 months, in %. Negative means it
 * gained pairs. Cut-offs 70 / 50 / 30 / 15 give levels 4..1. In the backtest
 * this was the strongest single signal: exchanges leave before coins die.
 */
export function signalB(now: CoinSnapshot, halfAgo: CoinSnapshot | undefined): Signal | null {
  if (!halfAgo?.pairs || halfAgo.pairs <= 0 || now.pairs == null) return null;
  const value = ((halfAgo.pairs - now.pairs) * 100) / halfAgo.pairs;
  return { value, level: grade(value, [70, 50, 30, 15]) };
}

/**
 * D: daily turnover, 24h volume as % of market cap. A coin almost nobody
 * trades has a price that means little and no buyers when holders want out.
 * Below 0.01 / 0.2 / 0.5 / 1 % gives levels 4..1 (under 0.01%, coins
 * vanished 57% of the time in the training years vs 21% at 0.01-0.2%).
 *
 * Exactly zero volume counts as "not reported", not as level 4. Until 2025
 * zero-volume coins nearly all died, but from late 2025 CMC reports 0 for
 * many healthy coins (in the Nov 2025 cohort 1 of 16 vanished), so zero
 * no longer means what it used to.
 */
export function signalD(now: CoinSnapshot): Signal | null {
  if (!now.mcap || now.mcap <= 0 || !now.vol || now.vol <= 0) return null;
  const value = (now.vol * 100) / now.mcap;
  const level = value < 0.01 ? 4 : value < 0.2 ? 3 : value < 0.5 ? 2 : value < 1 ? 1 : 0;
  return { value, level };
}

/**
 * The typical 12-month market-cap ratio: median over top-500 coins present in
 * both snapshots. Signal A divides by this so a market-wide crash (2022) does
 * not paint every coin red.
 */
export function marketRatio(now: Iterable<CoinSnapshot>, yearAgo: Map<number, CoinSnapshot>): number {
  const ratios: number[] = [];
  for (const c of now) {
    const p = yearAgo.get(c.id);
    if (c.rank <= 500 && p?.mcap && c.mcap && p.mcap > 0 && c.mcap > 0) ratios.push(c.mcap / p.mcap);
  }
  if (ratios.length === 0) return 1;
  ratios.sort((a, b) => a - b);
  return ratios[Math.floor(ratios.length / 2)]!;
}

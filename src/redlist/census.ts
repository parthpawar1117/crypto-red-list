/**
 * Turns CoinMarketCap listing rows (/v1/cryptocurrency/listings/latest and
 * /listings/historical share this shape) into CoinSnapshots. A full set of
 * snapshots for one date is a "census": CMC's point-in-time record of which
 * coins existed and how they traded, including coins that later died.
 * That census is what makes an honest backtest possible.
 */
import type { CoinSnapshot } from "./criteria";

export interface CmcListingRow {
  id: number;
  symbol: string;
  name?: string;
  cmc_rank: number;
  num_market_pairs?: number | null;
  tags?: Array<string | { slug?: string }> | null;
  quote?: { USD?: { price?: number | null; market_cap?: number | null; volume_24h?: number | null } };
}

/** "stablecoin" itself or any "<kind>-stablecoin" tag; not "stablecoin-protocol". */
export function isStablecoin(tags: CmcListingRow["tags"] | undefined): boolean {
  return (tags ?? []).some((t) => {
    const slug = typeof t === "string" ? t : t?.slug ?? "";
    return slug === "stablecoin" || slug.endsWith("-stablecoin");
  });
}

const num = (v: number | null | undefined): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function fromCmcListing(row: CmcListingRow): CoinSnapshot {
  const q = row.quote?.USD ?? {};
  return {
    id: row.id,
    symbol: row.symbol,
    ...(row.name ? { name: row.name } : {}),
    rank: row.cmc_rank,
    pairs: num(row.num_market_pairs),
    price: num(q.price),
    mcap: num(q.market_cap),
    vol: num(q.volume_24h),
    stable: isStablecoin(row.tags),
  };
}

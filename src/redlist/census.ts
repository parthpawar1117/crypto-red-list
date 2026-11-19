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

/**
 * Backup for stablecoins CMC forgot to tag (eUSD, USDon, USX in Nov 2026):
 * a dollar-like name or symbol AND a price within 2% of $1. The price check
 * stops dollar-named coins that are not pegged from being skipped.
 */
export function looksDollarPegged(symbol: string, name: string | undefined, price: number | null | undefined): boolean {
  if (typeof price !== "number" || Math.abs(price - 1) > 0.02) return false;
  const label = `${symbol} ${name ?? ""}`;
  return /usd|dollar/i.test(label) || /^US[A-Z0-9]{0,3}$/.test(symbol);
}

const TOKENIZED_TAGS = new Set(["tokenized-assets", "tokenized-gold", "tokenized-stock", "tokenized-etfs", "tokenized-commodities", "tokenized-treasury-bonds"]);

/**
 * Tokenized real-world assets (gold, stocks, ETFs, bonds). Their value tracks
 * something outside crypto and many are held, not traded, so like
 * stablecoins they are Not Evaluated. Protocols such as ONDO or LINK
 * ("real-world-assets-protocols") are ordinary coins and still rated.
 */
export function isTokenizedAsset(tags: CmcListingRow["tags"] | undefined): boolean {
  return (tags ?? []).some((t) => TOKENIZED_TAGS.has(typeof t === "string" ? t : t?.slug ?? ""));
}

const DERIVATIVE_TAGS = new Set(["rehypothecated-crypto", "liquid-staking-derivatives", "wrapped-tokens"]);

/**
 * Tokens that represent another asset (stETH, WBTC, JitoSOL, USDT0...). They
 * are receipts, held rather than traded, so "thin trading" means nothing for
 * them. CMC's live listings/latest already leaves them out; we drop them
 * from historical snapshots too, so training, backtest and live rate the
 * same universe.
 */
export function isDerivative(tags: CmcListingRow["tags"] | undefined): boolean {
  return (tags ?? []).some((t) => DERIVATIVE_TAGS.has(typeof t === "string" ? t : t?.slug ?? ""));
}

/** Drop derivative tokens and re-rank the rest 1..n by CMC rank (new Map, input untouched). */
export function liveUniverse(census: Map<number, CoinSnapshot>): Map<number, CoinSnapshot> {
  const kept = [...census.values()].filter((c) => !c.derivative).sort((a, b) => a.rank - b.rank);
  return new Map(kept.map((c, i) => [c.id, { ...c, rank: i + 1 }]));
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
    stable: isStablecoin(row.tags) || looksDollarPegged(row.symbol, row.name, q.price) || isTokenizedAsset(row.tags),
    derivative: isDerivative(row.tags),
  };
}

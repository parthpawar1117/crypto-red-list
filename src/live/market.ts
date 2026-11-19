/**
 * Market context around the Red List, from five more CoinMarketCap endpoints
 * (all available on the free Basic plan, one call each, ~4 credits):
 *
 *   /v1/global-metrics/quotes/latest        total market cap, BTC dominance, altcoin share
 *   /v3/fear-and-greed/latest               today's market mood
 *   /v1/altcoin-season-index/historical     90 days of altcoin season (why altcoins are under pressure)
 *   /v3/index/cmc100-latest                 CMC's flagship index and its 100 members
 *   /v1/key/info                            the live credit budget (0 credits)
 *
 * Each is optional: if CMC refuses one (plan change, outage), its panel is
 * hidden and the rest of the page still renders.
 */
import { CmcError, type CmcClient, type CmcResult } from "../cmc/client";
import type { RedListStatus } from "../redlist/assess";

export interface GlobalMarket {
  totalMarketCap: number;
  altcoinShare: number;
  btcDominance: number;
  volume24h: number;
  updated: string;
}

export interface IndexMember {
  id: number;
  symbol: string;
  name: string;
  weight: number;
}

export interface MarketContext {
  global: GlobalMarket | null;
  mood: { value: number; label: string; updated: string } | null;
  altSeason: { date: string; value: number }[] | null;
  cmc100: { value: number; change24h: number; updated: string; members: IndexMember[] } | null;
  budget: { monthlyLimit: number; usedThisMonth: number; perMinute: number } | null;
}

/** null for any CoinMarketCap error (the panel hides); programming errors still throw. */
export async function optional<T>(call: Promise<CmcResult<T>>): Promise<T | null> {
  try {
    return (await call).data;
  } catch (err) {
    if (err instanceof CmcError) return null;
    throw err;
  }
}

interface CmcGlobal {
  btc_dominance: number;
  last_updated: string;
  quote: { USD: { total_market_cap: number; altcoin_market_cap: number; total_volume_24h: number } };
}
interface CmcMood { value: number; update_time: string; value_classification: string }
interface CmcAltSeason { points: { timestamp: string; altcoin_index: number }[] }
interface CmcIndex { value: number; value_24h_percentage_change: number; last_update: string; constituents: IndexMember[] }
interface CmcKey { plan: { credit_limit_monthly: number; rate_limit_minute: number }; usage: { current_month: { credits_used: number } } }

export async function fetchMarketContext(client: CmcClient): Promise<MarketContext> {
  const [g, mood, alt, idx, key] = await Promise.all([
    optional(client.get<CmcGlobal>("/v1/global-metrics/quotes/latest")),
    optional(client.get<CmcMood>("/v3/fear-and-greed/latest")),
    optional(client.get<CmcAltSeason>("/v1/altcoin-season-index/historical", { timeframe: "90d" })),
    optional(client.get<CmcIndex>("/v3/index/cmc100-latest")),
    optional(client.get<CmcKey>("/v1/key/info")),
  ]);
  const usd = g?.quote?.USD;
  return {
    global: usd
      ? { totalMarketCap: usd.total_market_cap, altcoinShare: usd.altcoin_market_cap / usd.total_market_cap, btcDominance: g!.btc_dominance, volume24h: usd.total_volume_24h, updated: g!.last_updated }
      : null,
    mood: mood ? { value: mood.value, label: mood.value_classification, updated: mood.update_time } : null,
    altSeason: alt?.points ? alt.points.map((p) => ({ date: p.timestamp.slice(0, 10), value: p.altcoin_index })) : null,
    cmc100: idx?.constituents
      ? { value: idx.value, change24h: idx.value_24h_percentage_change, updated: idx.last_update, members: idx.constituents.map(({ id, symbol, name, weight }) => ({ id, symbol, name, weight })) }
      : null,
    budget: key ? { monthlyLimit: key.plan.credit_limit_monthly, usedThisMonth: key.usage.current_month.credits_used, perMinute: key.plan.rate_limit_minute } : null,
  };
}

const THREATENED: RedListStatus[] = ["CR", "EN", "VU"];

/** CMC100 members that the Red List rates Vulnerable or worse, riskiest first. */
export function threatenedIndexMembers<M extends IndexMember>(
  members: M[],
  coins: { id: number; status: RedListStatus; probability: number | null }[],
): (M & { status: RedListStatus; probability: number | null })[] {
  const byId = new Map(coins.map((c) => [c.id, c]));
  return members
    .map((m) => ({ ...m, ...(byId.get(m.id) ?? { status: "NE" as RedListStatus, probability: null }) }))
    .filter((m) => THREATENED.includes(m.status))
    .sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));
}

/** The CMC100's change over the 12 months after `date`, from dated index values. */
export function cmc100Return(values: Record<string, number>, date: string): number | null {
  const start = values[date];
  const [y, m, d] = date.split("-").map(Number);
  const end = values[`${y! + 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`];
  return start && end ? end / start - 1 : null;
}

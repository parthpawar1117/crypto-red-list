/**
 * Builds today's Crypto Red List from live CoinMarketCap data.
 *
 * Calls (7 in total, ~63 credits):
 * - /v1/cryptocurrency/listings/latest           top 500 right now
 * - /v1/cryptocurrency/listings/historical x 3   top 3,000 on (today - 182 days)
 * - /v1/cryptocurrency/listings/historical x 3   top 3,000 on (today - 364 days)
 *
 * 182 / 364 days (not exactly 6 / 12 months) keeps both look-backs inside the
 * 1-year history that CMC's free Basic plan allows. The engine is the same one
 * the backtest measured; the weights are the shipped, out-of-sample-tested ones.
 */
import type { CmcClient, EvidenceEntry, EvidenceLedger } from "../cmc/client";
import { assessCoin, type Assessment } from "../redlist/assess";
import { fromCmcListing, type CmcListingRow } from "../redlist/census";
import { marketRatio, type CoinSnapshot } from "../redlist/criteria";
import { redListIndex, statusCounts, type StatusCounts } from "../redlist/rli";
import { SHIPPED_WEIGHTS } from "../redlist/shipped-model";
import type { ModelWeights } from "../redlist/model";

export const LIST_SIZE = 500;
const HISTORY_DEPTH = 3000;
const PAGE = 1000;

export type LiveCoin = CoinSnapshot & Assessment;

/** An evidence entry without the raw response body (kept small for the page). */
export type EvidenceSummary = Omit<EvidenceEntry, "response">;

export interface LiveRedList {
  asOf: string;
  dates: { today: string; halfAgo: string; yearAgo: string };
  marketRatio: number;
  rli: number | null;
  counts: StatusCounts;
  /** Riskiest first: by probability, then NE / DD at the end. */
  coins: LiveCoin[];
  evidence: EvidenceSummary[];
  /** Credits charged by CMC for this build (cached answers cost 0). */
  credits: number;
}

const DAY = 86_400_000;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

export function liveDates(now: Date) {
  const t = now.getTime();
  return { today: isoDay(t), halfAgo: isoDay(t - 182 * DAY), yearAgo: isoDay(t - 364 * DAY) };
}

async function historical(client: CmcClient, date: string): Promise<Map<number, CoinSnapshot>> {
  const pages = await Promise.all(
    Array.from({ length: HISTORY_DEPTH / PAGE }, (_, i) =>
      client.get<CmcListingRow[]>("/v1/cryptocurrency/listings/historical", { date, start: i * PAGE + 1, limit: PAGE, convert: "USD" }),
    ),
  );
  return new Map(pages.flatMap((p) => p.data.map(fromCmcListing)).map((c) => [c.id, c]));
}

export interface BuildOptions {
  now?: Date;
  /** The ledger the client writes to; its entries become the list's evidence. */
  ledger: EvidenceLedger;
  weights?: ModelWeights;
}

export async function buildLiveRedList(client: CmcClient, { now = new Date(), ledger, weights = SHIPPED_WEIGHTS }: BuildOptions): Promise<LiveRedList> {
  const dates = liveDates(now);
  const latest = await client.get<CmcListingRow[]>("/v1/cryptocurrency/listings/latest", { start: 1, limit: LIST_SIZE, convert: "USD" });
  const halfAgo = await historical(client, dates.halfAgo);
  const yearAgo = await historical(client, dates.yearAgo);

  const today = latest.data.map(fromCmcListing);
  const market = marketRatio(today, yearAgo);
  const coins: LiveCoin[] = today.map((c) => ({
    ...c,
    ...assessCoin({ now: c, halfAgo: halfAgo.get(c.id), yearAgo: yearAgo.get(c.id), marketRatio: market, weights }),
  }));
  coins.sort((a, b) => (b.probability ?? -1) - (a.probability ?? -1) || a.rank - b.rank);

  const statuses = coins.map((c) => c.status);
  const evidence = ledger.entries().map((e): EvidenceSummary => {
    const copy: Partial<EvidenceEntry> = { ...e };
    delete copy.response;
    return copy as EvidenceSummary;
  });
  return {
    asOf: latest.evidence.timestamp,
    dates,
    marketRatio: market,
    rli: redListIndex(statuses),
    counts: statusCounts(statuses),
    coins,
    evidence,
    credits: ledger.totalCredits(),
  };
}

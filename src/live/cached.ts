/**
 * Shared, persistent caches (Next.js Data Cache via unstable_cache). The API
 * route and every page read the same cached copies, so CoinMarketCap is
 * called once per refresh window no matter how many people visit, and the
 * cache survives redeploys.
 *
 * Budget (worst case, every window refreshed):
 *   Red List        62 credits x 4 a day   ~7.4k / month
 *   coin info        5 credits x 1 a day   ~150 / month
 *   fear & greed     3 credits x 1 a day   ~90 / month
 *   total                                  ~7.7k / month  (< 10k on CMC Basic)
 */
import { unstable_cache } from "next/cache";
import { createCmcClient, EvidenceLedger, type EvidenceEntry } from "../cmc/client";
import { fetchCoinInfo, type CoinInfo } from "./coin-info";
import { fetchFearGreedHistory, type FearGreedDay } from "./fear-greed";
import { getRedList, REFRESH_SECONDS } from "./get-redlist";
import type { EvidenceSummary } from "./redlist-live";
import { SHIPPED_WEIGHTS } from "../redlist/shipped-model";

const DAY = 86_400;

function summarize(entries: EvidenceEntry[]): EvidenceSummary[] {
  return entries.map((e) => {
    const copy: Partial<EvidenceEntry> = { ...e };
    delete copy.response;
    return copy as EvidenceSummary;
  });
}

// The weights are part of the key: a retrained model never serves ratings from the old one.
export const getCachedRedList = unstable_cache(getRedList, ["redlist", SHIPPED_WEIGHTS.join(",")], { revalidate: REFRESH_SECONDS, tags: ["redlist"] });

export interface CachedCoinInfo {
  info: Record<number, CoinInfo>;
  evidence: EvidenceSummary[];
}

export const getCachedCoinInfo = unstable_cache(
  async (): Promise<CachedCoinInfo> => {
    const list = await getCachedRedList();
    const ledger = new EvidenceLedger();
    const client = createCmcClient({ apiKey: process.env.CMC_PRO_API_KEY, ledger });
    const info = await fetchCoinInfo(client, list.coins.map((c) => c.id));
    return { info: Object.fromEntries(info), evidence: summarize(ledger.entries()) };
  },
  ["coin-info-v1"],
  { revalidate: DAY, tags: ["coin-info"] },
);

export interface CachedFearGreed {
  history: FearGreedDay[];
  evidence: EvidenceSummary[];
}

export const getCachedFearGreed = unstable_cache(
  async (): Promise<CachedFearGreed> => {
    const ledger = new EvidenceLedger();
    const client = createCmcClient({ apiKey: process.env.CMC_PRO_API_KEY, ledger });
    const history = await fetchFearGreedHistory(client);
    return { history, evidence: summarize(ledger.entries()) };
  },
  ["fear-greed-v1"],
  { revalidate: DAY, tags: ["fear-greed"] },
);

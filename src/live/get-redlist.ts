/**
 * Server-only entry point: builds today's Red List with the app's CMC key.
 * Callers (the API route and pages) cache the result for an hour via Next.js
 * revalidation, so visitors never trigger CMC calls themselves; if a refresh
 * fails, Next.js keeps serving the last good list.
 */
import { createCmcClient, EvidenceLedger } from "../cmc/client";
import { buildLiveRedList, type LiveRedList } from "./redlist-live";

/**
 * Refresh every 6 hours. Each refresh is 7 calls / ~62 credits, so at most
 * 62 x 4 x 30 = ~7.4k credits a month: inside CMC Basic's 10k. Statuses move
 * slowly (signals look back 6 and 12 months), so hourly would add cost, not
 * insight. Refreshes only happen when someone visits, so real use is lower.
 */
export const REFRESH_SECONDS = 21600;

export async function getRedList(): Promise<LiveRedList> {
  const ledger = new EvidenceLedger();
  const client = createCmcClient({ apiKey: process.env.CMC_PRO_API_KEY, ledger });
  return buildLiveRedList(client, { ledger });
}

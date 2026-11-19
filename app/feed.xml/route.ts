/** GET /feed.xml: RSS of coins uplisted since last quarter, then every threatened coin. */
import { getCachedRedList } from "@/live/cached";
import backtest from "@/redlist/backtest-results.json";
import { alertsFeed } from "@/web/share";
import { THREATENED } from "@/web/status";
import { toRows } from "@/web/view";

export const revalidate = 21600;
const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://crypto-red-list.vercel.app";

export async function GET() {
  const list = await getCachedRedList();
  const rows = toRows(list, {}, backtest.previousQuarter?.statuses ?? null);
  const items = [...rows.filter((r) => r.change === "uplisted"), ...rows.filter((r) => r.change !== "uplisted" && THREATENED.includes(r.status))];
  return new Response(alertsFeed(items, { site: SITE, asOf: list.asOf }), {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, s-maxage=21600" },
  });
}

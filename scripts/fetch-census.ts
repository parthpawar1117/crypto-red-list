/**
 * Downloads the quarterly CoinMarketCap census used to train and backtest the
 * Red List: top 3,000 coins on the 15th of Feb/May/Aug/Nov, Nov 2018 - Nov 2026,
 * from /v1/cryptocurrency/listings/historical. Already-downloaded dates are skipped.
 *
 * Usage: npm run census
 * Cost: about 30 credits per date (~1,000 for all 33). History before the last
 * 12 months needs a paid CMC plan; on Basic only the recent dates download.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createCmcClient, CmcError } from "../src/cmc/client";
import { fromCmcListing, type CmcListingRow } from "../src/redlist/census";
import { censusDates, censusPath } from "../src/redlist/census-files";

const client = createCmcClient({ apiKey: process.env.CMC_PRO_API_KEY });
mkdirSync("data/census", { recursive: true });

let credits = 0;
for (const date of censusDates()) {
  const file = censusPath(date);
  if (existsSync(file)) continue;
  try {
    const rows = [];
    for (let start = 1; start <= 3000; start += 1000) {
      const { data, evidence } = await client.get<CmcListingRow[]>("/v1/cryptocurrency/listings/historical", { date, start, limit: 1000, convert: "USD" });
      credits += evidence.creditCount ?? 0;
      rows.push(...data.map(fromCmcListing));
    }
    writeFileSync(file, JSON.stringify(rows));
    console.log(`saved ${date}: ${rows.length} coins`);
  } catch (err) {
    if (err instanceof CmcError && err.kind === "plan") console.log(`skipped ${date}: needs a paid CMC plan`);
    else throw err;
  }
}
console.log(`done, ${credits} credits used`);

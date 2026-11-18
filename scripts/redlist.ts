/**
 * Prints today's Crypto Red List from live CMC data (~63 credits).
 * Usage: npm run redlist
 */
import { createCmcClient, EvidenceLedger } from "../src/cmc/client";
import { buildLiveRedList } from "../src/live/redlist-live";

const ledger = new EvidenceLedger();
const client = createCmcClient({ apiKey: process.env.CMC_PRO_API_KEY, ledger });
const list = await buildLiveRedList(client, { ledger });

const pct = (p: number | null) => (p == null ? "  -  " : `${(p * 100).toFixed(1).padStart(4)}%`);
console.log(`Crypto Red List, data as of ${list.asOf}`);
console.log(`Look-backs: ${list.dates.halfAgo} and ${list.dates.yearAgo} | market 12-month ratio ${list.marketRatio.toFixed(3)}`);
console.log(`Red List Index ${list.rli?.toFixed(3)} | counts ${JSON.stringify(list.counts)}`);
console.log("\nRiskiest 15:");
for (const c of list.coins.slice(0, 15)) {
  console.log(`${c.status.padEnd(3)} ${pct(c.probability)}  #${String(c.rank).padEnd(4)} ${c.symbol.padEnd(10)} ${c.reasons.join("; ")}`);
}
console.log(`\n${list.evidence.length} API calls, ${list.credits} credits:`);
for (const e of list.evidence) console.log(`  [${e.id}] ${e.endpoint} ${JSON.stringify(e.params)} -> HTTP ${e.httpStatus}, ${e.creditCount} credits`);

/**
 * Runs the time machine over every quarter from Nov 2019 to Nov 2026 with the
 * shipped model and writes src/redlist/backtest-results.json for the site.
 *
 * The file holds only our own derived results (statuses, probabilities, the
 * Red List Index, outcomes), never CMC's raw census data.
 *
 * Usage: npm run backtest   (needs data/census, see npm run census)
 */
import { writeFileSync } from "node:fs";
import { censusDates, loadCensus, shiftMonths } from "../src/redlist/census-files";
import { SHIPPED_MODEL, SHIPPED_WEIGHTS } from "../src/redlist/shipped-model";
import { rateCohort, summarizeCohort, RETURN_CAP, VANISHED_RETURN, type CohortSummary } from "../src/redlist/time-machine";

const TRAIN_LAST = SHIPPED_MODEL.train.to;
const TEST_FIRST = SHIPPED_MODEL.test.from;
const split = (d: string) => (d <= TRAIN_LAST ? "train" : d < TEST_FIRST ? "gap" : "test");

const cohorts: (CohortSummary & { split: string })[] = [];
for (const date of censusDates("2019-11-15")) {
  const now = loadCensus(date), halfAgo = loadCensus(shiftMonths(date, -6)), yearAgo = loadCensus(shiftMonths(date, -12));
  if (!now || !halfAgo || !yearAgo) throw new Error(`census missing around ${date}; run npm run census`);
  const later = loadCensus(shiftMonths(date, 12));
  const summary = summarizeCohort(rateCohort({ date, now, halfAgo, yearAgo, later, weights: SHIPPED_WEIGHTS }), 10);
  cohorts.push({ ...summary, split: later ? split(date) : "no outcome yet" });
}

const round = (v: number, dp = 4) => Number(v.toFixed(dp));
const withOutcome = cohorts.filter((c) => c.outcome);
const testCohorts = withOutcome.filter((c) => c.split === "test");
const portfolio = (list: typeof withOutcome) => {
  const hold = list.reduce((s, c) => s + c.outcome!.portfolio.holdAll, 0) / list.length;
  const exit = list.reduce((s, c) => s + c.outcome!.portfolio.exitRed, 0) / list.length;
  const wins = list.filter((c) => c.outcome!.portfolio.exitRed > c.outcome!.portfolio.holdAll).length;
  const worst = list.reduce((w, c) => (c.outcome!.portfolio.holdAll < w.outcome!.portfolio.holdAll ? c : w));
  return {
    cohorts: list.length,
    avgHoldAll: round(hold),
    avgExitRed: round(exit),
    exitBetterIn: wins,
    worstCohort: { date: worst.date, holdAll: round(worst.outcome!.portfolio.holdAll), exitRed: round(worst.outcome!.portfolio.exitRed) },
  };
};

const results = {
  generatedFrom: "CoinMarketCap /v1/cryptocurrency/listings/historical, quarterly census, top 3,000",
  model: { version: SHIPPED_MODEL.version, train: { from: SHIPPED_MODEL.train.from, to: TRAIN_LAST }, test: SHIPPED_MODEL.test },
  assumptions: { vanishedReturn: VANISHED_RETURN, returnCap: RETURN_CAP, outcome: SHIPPED_MODEL.outcome },
  portfolio: { all: portfolio(withOutcome), test: portfolio(testCohorts) },
  cohorts: cohorts.map((c) => ({
    ...c,
    rli: c.rli == null ? null : round(c.rli),
    riskiest: c.riskiest.map((r) => ({ ...r, probability: r.probability == null ? null : round(r.probability, 3), ...(r.ret != null ? { ret: round(r.ret, 3) } : {}) })),
    outcome: c.outcome && { ...c.outcome, portfolio: { holdAll: round(c.outcome.portfolio.holdAll), exitRed: round(c.outcome.portfolio.exitRed) } },
  })),
};

writeFileSync("src/redlist/backtest-results.json", JSON.stringify(results, null, 1) + "\n");
console.log(JSON.stringify(results.portfolio, null, 2));
for (const c of results.cohorts) {
  const red = c.outcome ? `${c.outcome.byStatus.EN.vanished + c.outcome.byStatus.CR.vanished}/${c.outcome.byStatus.EN.n + c.outcome.byStatus.CR.n} red vanished, LC ${c.outcome.byStatus.LC.vanished}/${c.outcome.byStatus.LC.n}` : "";
  const pf = c.outcome ? `hold ${(c.outcome.portfolio.holdAll * 100).toFixed(1)}% vs sell-red ${(c.outcome.portfolio.exitRed * 100).toFixed(1)}%` : "";
  console.log(c.date, c.split.padEnd(14), "RLI", c.rli?.toFixed(3), red.padEnd(36), pf);
}

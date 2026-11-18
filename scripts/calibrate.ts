/**
 * Trains the Red List risk model and measures it honestly.
 *
 * - Train: cohorts Nov 2019 - Nov 2021 (every outcome known by Nov 2022).
 * - Test:  cohorts Nov 2022 - Nov 2025, never seen during training.
 * The weights that were tested are the weights the site uses: no refit on
 * the test years, so the published test numbers describe the shipped model.
 *
 * Usage: npm run calibrate   (needs data/census, see npm run census)
 * Writes src/redlist/model.json.
 */
import { writeFileSync } from "node:fs";
import { buildCohort, type CohortRow } from "../src/redlist/backtest";
import { censusDates, loadCensus, shiftMonths } from "../src/redlist/census-files";
import { auc, featuresOf, FEATURE_NAMES, predict, statusFromProbability, STATUS_THRESHOLDS, train, type Status } from "../src/redlist/model";

const TRAIN_LAST = "2021-11-15";
const TEST_FIRST = "2022-11-15";

const rows: CohortRow[] = [];
for (const date of censusDates("2019-11-15", "2025-11-15")) {
  const now = loadCensus(date), halfAgo = loadCensus(shiftMonths(date, -6)), yearAgo = loadCensus(shiftMonths(date, -12)), later = loadCensus(shiftMonths(date, 12));
  if (!now || !halfAgo || !yearAgo || !later) throw new Error(`census missing around ${date}; run npm run census`);
  rows.push(...buildCohort({ date, now, halfAgo, yearAgo, later }));
}

const trainRows = rows.filter((r) => r.date <= TRAIN_LAST);
const testRows = rows.filter((r) => r.date >= TEST_FIRST);
const x = (r: CohortRow) => featuresOf({ rank: r.rank, a: r.a, b: r.b, d: r.d, young: r.young });
const y = (r: CohortRow): number => (r.vanished ? 1 : 0);

const weights = train(trainRows.map(x), trainRows.map(y), { iterations: 5000, learningRate: 1.5 });
const round = (v: number, dp = 4) => Number(v.toFixed(dp));

function evaluate(rs: CohortRow[]) {
  const p = rs.map((r) => predict(x(r), weights));
  const labels = rs.map(y);
  const base = labels.reduce((s, v) => s + v, 0) / rs.length;
  const order = p.map((v, i) => [v, labels[i]!] as const).sort((a, b) => b[0] - a[0]);
  const top = order.slice(0, Math.round(rs.length / 10));
  const topRate = top.reduce((s, [, l]) => s + l, 0) / top.length;
  const byStatus = Object.fromEntries(
    (["LC", "NT", "VU", "EN", "CR"] as Status[]).map((s) => {
      const idx = p.map((v, i) => (statusFromProbability(v) === s ? i : -1)).filter((i) => i >= 0);
      const vanished = idx.filter((i) => labels[i]).length;
      const meanP = idx.reduce((sum, i) => sum + p[i]!, 0) / (idx.length || 1);
      return [s, { n: idx.length, vanished, rate: idx.length ? round(vanished / idx.length) : null, predicted: idx.length ? round(meanP) : null }];
    }),
  );
  return {
    coinQuarters: rs.length,
    cohorts: new Set(rs.map((r) => r.date)).size,
    baseRate: round(base),
    auc: round(auc(p, labels)),
    aucRankOnly: round(auc(rs.map((r) => r.rank), labels)),
    riskiestTenth: { rate: round(topRate), lift: round(topRate / base, 2) },
    byStatus,
  };
}

const model = {
  version: 3,
  outcome: "Not in CoinMarketCap's top 3,000 twelve months later",
  features: FEATURE_NAMES,
  weights: weights.map((w) => round(w)),
  thresholds: STATUS_THRESHOLDS,
  train: { from: "2019-11-15", to: TRAIN_LAST, ...evaluate(trainRows) },
  test: { from: TEST_FIRST, to: "2025-11-15", ...evaluate(testRows) },
};

writeFileSync("src/redlist/model.json", JSON.stringify(model, null, 2) + "\n");
console.log(JSON.stringify(model, null, 2));

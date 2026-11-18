import { describe, expect, it } from "vitest";
import { buildCohort } from "@/redlist/backtest";
import type { CoinSnapshot } from "@/redlist/criteria";

const c = (id: number, over: Partial<CoinSnapshot> = {}): CoinSnapshot => ({
  id,
  symbol: `C${id}`,
  rank: id,
  pairs: 100,
  mcap: 1_000_000,
  vol: 100_000,
  stable: false,
  ...over,
});
const census = (...coins: CoinSnapshot[]) => new Map(coins.map((x) => [x.id, x]));

describe("buildCohort", () => {
  const now = census(c(1), c(2, { pairs: 20 }), c(3, { stable: true }), c(4), c(5, { rank: 600 }));
  const half = census(c(1), c(2), c(3), c(5));
  const year = census(c(1), c(2), c(3));
  const later = census(c(1), c(4), c(5));

  const rows = buildCohort({ date: "2021-11-15", now, halfAgo: half, yearAgo: year, later });

  it("rates top-500, non-stable coins that have 6-month history (skips NE and DD)", () => {
    expect(rows.map((r) => r.id)).toEqual([1, 2]);
  });

  it("labels a coin vanished when it is missing from the census 12 months later", () => {
    expect(rows.find((r) => r.id === 1)?.vanished).toBe(false);
    expect(rows.find((r) => r.id === 2)?.vanished).toBe(true);
  });

  it("records the signal levels the model needs, using only data known on the date", () => {
    expect(rows.find((r) => r.id === 2)).toMatchObject({ date: "2021-11-15", rank: 2, b: 4, young: false });
  });
});

import { describe, expect, it } from "vitest";
import { assessCoin } from "@/redlist/assess";
import type { CoinSnapshot } from "@/redlist/criteria";
import type { ModelWeights } from "@/redlist/model";

const coin = (over: Partial<CoinSnapshot> = {}): CoinSnapshot => ({
  id: 1,
  symbol: "TEST",
  rank: 100,
  pairs: 100,
  mcap: 1_000_000_000,
  vol: 50_000_000,
  stable: false,
  ...over,
});

// Weights chosen by hand for the tests: B and D push risk up strongly.
const weights: ModelWeights = [-4, 0.5, 1, 3, 3, 0.5];

describe("assessCoin", () => {
  it("rates a healthy coin Least Concern with a low probability", () => {
    const r = assessCoin({ now: coin(), halfAgo: coin(), yearAgo: coin(), marketRatio: 1, weights });
    expect(r.status).toBe("LC");
    expect(r.probability).toBeLessThan(0.05);
    expect(r.reasons).toEqual([]);
  });

  it("rates a coin losing exchanges with thin trading as Critically Endangered and says why", () => {
    const r = assessCoin({
      now: coin({ pairs: 20, vol: 1_000_000, mcap: 1_000_000_000 }),
      halfAgo: coin({ pairs: 100 }),
      yearAgo: coin(),
      marketRatio: 1,
      weights,
    });
    expect(r.status).toBe("CR");
    expect(r.signals.B).toMatchObject({ value: 80, level: 4 });
    expect(r.signals.D).toMatchObject({ level: 3 });
    expect(r.reasons).toContain("Lost 80% of its exchange pairs in 6 months");
    expect(r.reasons).toContain("Trades only 0.10% of its value per day");
  });

  it("marks stablecoins Not Evaluated: they are designed to hold a peg, not to grow", () => {
    const r = assessCoin({ now: coin({ stable: true }), halfAgo: coin(), yearAgo: coin(), marketRatio: 1, weights });
    expect(r.status).toBe("NE");
    expect(r.probability).toBeNull();
  });

  it("marks coins with no 6-month history Data Deficient instead of guessing", () => {
    const r = assessCoin({ now: coin(), halfAgo: undefined, yearAgo: undefined, marketRatio: 1, weights });
    expect(r.status).toBe("DD");
    expect(r.probability).toBeNull();
  });

  it("still rates a coin that is 6-12 months old, flagged young", () => {
    const r = assessCoin({ now: coin(), halfAgo: coin(), yearAgo: undefined, marketRatio: 1, weights });
    expect(r.signals.A).toBeNull();
    expect(r.young).toBe(true);
    expect(r.probability).not.toBeNull();
  });

  it("explains a market-relative crash in plain words", () => {
    const r = assessCoin({ now: coin({ mcap: 100_000_000 }), halfAgo: coin(), yearAgo: coin(), marketRatio: 1, weights });
    expect(r.reasons).toContain("Fell 90% behind the overall market in 12 months");
  });
});

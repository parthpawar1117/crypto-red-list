import { describe, expect, it } from "vitest";
import { rateCohort, summarizeCohort, VANISHED_RETURN, RETURN_CAP } from "@/redlist/time-machine";
import type { CoinSnapshot } from "@/redlist/criteria";
import type { ModelWeights } from "@/redlist/model";

const c = (id: number, over: Partial<CoinSnapshot> = {}): CoinSnapshot => ({
  id,
  symbol: `C${id}`,
  rank: id,
  pairs: 100,
  mcap: 1_000_000_000,
  vol: 50_000_000,
  price: 1,
  stable: false,
  ...over,
});
const census = (...coins: CoinSnapshot[]) => new Map(coins.map((x) => [x.id, x]));
// B and D push risk up hard, so coin 2 (lost 80% of pairs, thin trading) is red.
const weights: ModelWeights = [-4, 0.5, 1, 3, 3, 0.5];

const now = census(c(1), c(2, { pairs: 20, vol: 1_000_000 }), c(3, { stable: true }), c(4), c(5, { price: 2 }));
const half = census(c(1), c(2), c(3), c(5));
const year = census(c(1), c(2), c(3), c(5));
const later = census(c(1, { price: 1.5 }), c(5, { price: 60 }));

describe("rateCohort", () => {
  const cohort = rateCohort({ date: "2022-11-15", now, halfAgo: half, yearAgo: year, later, weights });

  it("rates every top-500 coin exactly like the live list (NE and DD included)", () => {
    const status = Object.fromEntries(cohort.coins.map((x) => [x.id, x.status]));
    expect(status[1]).toBe("LC");
    expect(["EN", "CR"]).toContain(status[2]);
    expect(status[3]).toBe("NE");
    expect(status[4]).toBe("DD");
    expect(cohort.counts.NE).toBe(1);
    expect(cohort.rli).toBeGreaterThan(0);
  });

  it("attaches the 12-month outcome: vanished, or the price return", () => {
    const byId = Object.fromEntries(cohort.coins.map((x) => [x.id, x]));
    expect(byId[1]).toMatchObject({ vanished: false, ret: 0.5 });
    expect(byId[2]).toMatchObject({ vanished: true, ret: null });
    expect(byId[5]!.ret).toBeCloseTo(29);
  });

  it("has no outcome for recent dates whose 12 months have not passed", () => {
    const live = rateCohort({ date: "2026-11-15", now, halfAgo: half, yearAgo: year, later: null, weights });
    expect(live.coins[0]).not.toHaveProperty("vanished");
  });
});

describe("summarizeCohort", () => {
  const s = summarizeCohort(rateCohort({ date: "2022-11-15", now, halfAgo: half, yearAgo: year, later, weights }), 3);

  it("lists the riskiest coins first with what happened to them", () => {
    expect(s.riskiest[0]).toMatchObject({ symbol: "C2", vanished: true });
    expect(s.riskiest).toHaveLength(3);
  });

  it("counts real vanishing per status among assessed coins", () => {
    expect(s.outcome!.byStatus.LC).toEqual({ n: 2, vanished: 0 });
    const red = s.outcome!.byStatus.EN.n + s.outcome!.byStatus.CR.n;
    expect(red).toBe(1);
  });

  it("simulates an equal-weight holder, with and without selling EN/CR coins", () => {
    // Assessed coins: 1 (+50%), 2 (vanished -> -95%), 5 (+2900% capped at +1000%)
    expect(VANISHED_RETURN).toBe(-0.95);
    expect(RETURN_CAP).toBe(10);
    expect(s.outcome!.portfolio.holdAll).toBeCloseTo((0.5 - 0.95 + 10) / 3);
    expect(s.outcome!.portfolio.exitRed).toBeCloseTo((0.5 + 0 + 10) / 3);
  });

  it("omits outcome sections for a cohort without outcomes", () => {
    const live = summarizeCohort(rateCohort({ date: "2026-11-15", now, halfAgo: half, yearAgo: year, later: null, weights }));
    expect(live.outcome).toBeNull();
    expect(live.riskiest[0]).not.toHaveProperty("vanished");
  });
});

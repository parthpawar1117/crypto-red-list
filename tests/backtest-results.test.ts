import { describe, expect, it } from "vitest";
import results from "@/redlist/backtest-results.json";
import { SHIPPED_MODEL } from "@/redlist/shipped-model";

// Guards the published time-machine results the site shows.
describe("published backtest results", () => {
  it("cover every quarter from Nov 2019 to Nov 2026", () => {
    expect(results.cohorts).toHaveLength(29);
    expect(results.cohorts[0]!.date).toBe("2019-11-15");
    expect(results.cohorts.at(-1)!.date).toBe("2026-11-15");
  });

  it("were produced by the shipped model", () => {
    expect(results.model.test).toEqual(SHIPPED_MODEL.test);
  });

  it("only claim outcomes for quarters whose 12 months have passed", () => {
    for (const c of results.cohorts) {
      if (c.date > "2025-11-15") expect(c.outcome).toBeNull();
      else expect(c.outcome).not.toBeNull();
    }
  });

  it("show selling red coins helped in most test quarters", () => {
    expect(results.portfolio.test.cohorts).toBe(13);
    expect(results.portfolio.test.exitBetterIn).toBeGreaterThanOrEqual(10);
  });

  it("keep last quarter's statuses (id -> status only) for the 'changed since' feed", () => {
    expect(results.previousQuarter.date).toBe("2026-08-15");
    const statuses = Object.values(results.previousQuarter.statuses);
    expect(statuses.length).toBeGreaterThan(450);
    for (const s of statuses) expect(["CR", "EN", "VU", "NT", "LC", "DD", "NE"]).toContain(s);
  });

  it("contain derived results only, never raw CMC market data", () => {
    const text = JSON.stringify(results);
    for (const raw of ["market_cap", "volume_24h", "num_market_pairs", "\"mcap\"", "\"vol\"", "\"pairs\""]) expect(text).not.toContain(raw);
  });
});

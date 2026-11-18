import { describe, expect, it } from "vitest";
import { marketRatio, signalA, signalB, signalD, type CoinSnapshot } from "@/redlist/criteria";

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

describe("signal A: market-cap decline relative to the whole market (12 months)", () => {
  it("is 0% when the coin moved exactly with the market", () => {
    const a = signalA(coin({ mcap: 500 }), coin({ mcap: 1000 }), 0.5);
    expect(a?.value).toBeCloseTo(0);
    expect(a?.level).toBe(0);
  });

  it("measures how far it fell behind the market and grades it 0-4", () => {
    // Market flat (ratio 1), coin lost 92% -> level 4 (>= 90)
    expect(signalA(coin({ mcap: 80 }), coin({ mcap: 1000 }), 1)).toMatchObject({ level: 4 });
    // 85% behind -> level 3 (>= 80)
    expect(signalA(coin({ mcap: 150 }), coin({ mcap: 1000 }), 1)?.level).toBe(3);
    // 70% -> 2, 50% -> 1, 30% -> 0
    expect(signalA(coin({ mcap: 300 }), coin({ mcap: 1000 }), 1)?.level).toBe(2);
    expect(signalA(coin({ mcap: 500 }), coin({ mcap: 1000 }), 1)?.level).toBe(1);
    expect(signalA(coin({ mcap: 700 }), coin({ mcap: 1000 }), 1)?.level).toBe(0);
  });

  it("does not punish a coin that fell less than a crashing market", () => {
    // Market fell 60% (ratio 0.4), coin fell 50% -> outperformed
    expect(signalA(coin({ mcap: 500 }), coin({ mcap: 1000 }), 0.4)?.level).toBe(0);
  });

  it("returns null without a year-ago snapshot or market caps", () => {
    expect(signalA(coin(), undefined, 1)).toBeNull();
    expect(signalA(coin({ mcap: null }), coin(), 1)).toBeNull();
    expect(signalA(coin(), coin({ mcap: 0 }), 1)).toBeNull();
  });
});

describe("signal B: share of exchange pairs lost (6 months)", () => {
  it("grades pair loss 0-4 with cut-offs 70 / 50 / 30 / 15 %", () => {
    expect(signalB(coin({ pairs: 25 }), coin({ pairs: 100 }))).toMatchObject({ value: 75, level: 4 });
    expect(signalB(coin({ pairs: 45 }), coin({ pairs: 100 }))?.level).toBe(3);
    expect(signalB(coin({ pairs: 65 }), coin({ pairs: 100 }))?.level).toBe(2);
    expect(signalB(coin({ pairs: 80 }), coin({ pairs: 100 }))?.level).toBe(1);
    expect(signalB(coin({ pairs: 90 }), coin({ pairs: 100 }))?.level).toBe(0);
  });

  it("treats gaining pairs as no loss", () => {
    expect(signalB(coin({ pairs: 150 }), coin({ pairs: 100 }))).toMatchObject({ value: -50, level: 0 });
  });

  it("returns null without a 6-month-ago pair count", () => {
    expect(signalB(coin(), undefined)).toBeNull();
    expect(signalB(coin(), coin({ pairs: 0 }))).toBeNull();
    expect(signalB(coin({ pairs: null }), coin())).toBeNull();
  });
});

describe("signal D: trading turnover (24h volume / market cap)", () => {
  it("grades thin trading 0-4 with cut-offs 0.01 / 0.2 / 0.5 / 1 %", () => {
    expect(signalD(coin({ vol: 50_000 }))).toMatchObject({ value: 0.005, level: 4 });
    expect(signalD(coin({ vol: 1_000_000 }))).toMatchObject({ value: 0.1, level: 3 });
    expect(signalD(coin({ vol: 3_000_000 }))?.level).toBe(2);
    expect(signalD(coin({ vol: 8_000_000 }))?.level).toBe(1);
    expect(signalD(coin({ vol: 20_000_000 }))?.level).toBe(0);
  });

  it("treats exactly zero volume as not reported (no signal): since late 2025 CMC shows 0 for many live coins", () => {
    expect(signalD(coin({ vol: 0 }))).toBeNull();
  });

  it("returns null without volume or market cap", () => {
    expect(signalD(coin({ vol: null }))).toBeNull();
    expect(signalD(coin({ mcap: 0 }))).toBeNull();
  });
});

describe("marketRatio", () => {
  it("is the median 12-month market-cap ratio of top-500 coins present in both snapshots", () => {
    const now = [coin({ id: 1, mcap: 50 }), coin({ id: 2, mcap: 100 }), coin({ id: 3, mcap: 300 }), coin({ id: 4, mcap: 10, rank: 900 })];
    const past = new Map([1, 2, 3, 4].map((id) => [id, coin({ id, mcap: 100 })]));
    expect(marketRatio(now, past)).toBe(1);
  });

  it("falls back to 1 when nothing overlaps", () => {
    expect(marketRatio([coin()], new Map())).toBe(1);
  });
});

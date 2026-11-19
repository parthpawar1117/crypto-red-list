import { describe, expect, it } from "vitest";
import { fromCmcListing, isStablecoin, looksDollarPegged } from "@/redlist/census";

const listing = {
  id: 74,
  name: "Dogecoin",
  symbol: "DOGE",
  cmc_rank: 6,
  num_market_pairs: 1100,
  tags: ["mineable", "memes"],
  quote: { USD: { price: 0.38, market_cap: 55_000_000_000, volume_24h: 11_000_000_000 } },
};

describe("fromCmcListing", () => {
  it("maps a /v1/cryptocurrency/listings row to a CoinSnapshot", () => {
    expect(fromCmcListing(listing)).toEqual({
      id: 74,
      symbol: "DOGE",
      name: "Dogecoin",
      rank: 6,
      pairs: 1100,
      price: 0.38,
      mcap: 55_000_000_000,
      vol: 11_000_000_000,
      stable: false,
      derivative: false,
    });
  });

  it("keeps missing numbers as null instead of inventing zeros", () => {
    const s = fromCmcListing({ id: 1, symbol: "X", cmc_rank: 9, quote: { USD: {} } });
    expect(s).toMatchObject({ pairs: null, price: null, mcap: null, vol: null, stable: false });
  });

  it("flags stablecoins from their tags", () => {
    expect(fromCmcListing({ ...listing, tags: ["stablecoin", "usd-stablecoin"] }).stable).toBe(true);
  });
});

describe("isStablecoin", () => {
  it("recognises CMC's stablecoin tags (strings or tag objects)", () => {
    expect(isStablecoin(["stablecoin"])).toBe(true);
    expect(isStablecoin(["fiat-stablecoin"])).toBe(true);
    expect(isStablecoin([{ slug: "usd-stablecoin" }])).toBe(true);
    expect(isStablecoin(["memes", "stablecoin-protocol"])).toBe(false);
    expect(isStablecoin(undefined)).toBe(false);
  });
});

describe("looksDollarPegged (backup for stablecoins CMC forgot to tag)", () => {
  it("catches coins named like a dollar that trade within 2% of $1", () => {
    expect(looksDollarPegged("eUSD", "Electronic USD", 0.9987)).toBe(true);
    expect(looksDollarPegged("USDon", "U.S. Dollar Tokenized Currency (Ondo)", 1.001)).toBe(true);
    expect(looksDollarPegged("USX", "Solstice USX", 0.999)).toBe(true);
  });

  it("ignores dollar-named coins that are not near $1, and $1 coins without a dollar name", () => {
    expect(looksDollarPegged("USDX", "Some USD Token", 0.42)).toBe(false);
    expect(looksDollarPegged("ABC", "Alphabet", 1.0)).toBe(false);
    expect(looksDollarPegged("eUSD", undefined, null)).toBe(false);
  });

  it("is applied by fromCmcListing", () => {
    const row = { id: 9, symbol: "eUSD", name: "Electronic USD", cmc_rank: 485, tags: ["ethereum-ecosystem"], quote: { USD: { price: 0.9987 } } };
    expect(fromCmcListing(row).stable).toBe(true);
  });
});

import { isDerivative, liveUniverse } from "@/redlist/census";

describe("isDerivative (tokens that represent another asset: wrapped, staked, bridged)", () => {
  it("uses CMC's tags, the same ones listings/latest leaves out", () => {
    expect(isDerivative(["defi", "rehypothecated-crypto"])).toBe(true);
    expect(isDerivative(["liquid-staking-derivatives"])).toBe(true);
    expect(isDerivative([{ slug: "wrapped-tokens" }])).toBe(true);
    expect(isDerivative(["defi", "staking"])).toBe(false);
    expect(isDerivative(undefined)).toBe(false);
  });

  it("is applied by fromCmcListing", () => {
    expect(fromCmcListing({ id: 3717, symbol: "WBTC", cmc_rank: 204, tags: ["wrapped-tokens"], quote: { USD: { price: 90000 } } }).derivative).toBe(true);
    expect(fromCmcListing(listing).derivative).toBe(false);
  });
});

describe("liveUniverse", () => {
  it("drops derivative tokens and re-ranks the rest 1..n, like CMC's live listing", () => {
    const snap = (id: number, rank: number, derivative = false) => ({ id, symbol: `C${id}`, rank, pairs: 1, mcap: 1, vol: 1, stable: false, derivative });
    const census = new Map([snap(1, 1), snap(2, 2, true), snap(3, 3), snap(4, 10)].map((s) => [s.id, s]));
    const u = liveUniverse(census);
    expect([...u.values()].map((c) => [c.id, c.rank])).toEqual([[1, 1], [3, 2], [4, 3]]);
    expect(census.get(3)!.rank).toBe(3); // input not mutated
  });
});

import { isTokenizedAsset } from "@/redlist/census";

describe("isTokenizedAsset (tokenized gold, stocks, ETFs: tracks an asset outside crypto)", () => {
  it("uses CMC's tokenized-asset tags", () => {
    expect(isTokenizedAsset(["tokenized-assets", "tokenized-etfs", "ondo-stocks-ecosystem"])).toBe(true);
    expect(isTokenizedAsset(["tokenized-gold"])).toBe(true);
    expect(isTokenizedAsset(["tokenized-stock", "xstocks-ecosystem"])).toBe(true);
    expect(isTokenizedAsset(["real-world-assets-protocols"])).toBe(false); // ONDO, LINK: protocols, not receipts
  });

  it("makes fromCmcListing mark the coin Not Evaluated, like a stablecoin", () => {
    const row = { id: 1, symbol: "IVVon", name: "iShares Core S&P 500 Tokenized ETF (Ondo)", cmc_rank: 305, tags: ["tokenized-assets", "tokenized-etfs"], quote: { USD: { price: 680 } } };
    expect(fromCmcListing(row).stable).toBe(true);
  });
});

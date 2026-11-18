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

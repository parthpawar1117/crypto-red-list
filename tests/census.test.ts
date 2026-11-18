import { describe, expect, it } from "vitest";
import { fromCmcListing, isStablecoin } from "@/redlist/census";

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

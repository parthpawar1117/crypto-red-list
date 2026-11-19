import { describe, expect, it, vi } from "vitest";
import { createCmcClient, EvidenceLedger, type FetchLike } from "@/cmc/client";
import { fetchMarketContext, threatenedIndexMembers, cmc100Return, optional } from "@/live/market";
import { TEST_KEY } from "./helpers";

const ok = (data: unknown, credits = 1) => new Response(JSON.stringify({ status: { error_code: 0, credit_count: credits, timestamp: "2026-11-19T18:45:00Z" }, data }), { status: 200 });
const planError = () => new Response(JSON.stringify({ status: { error_code: 1006, error_message: "Your API Key subscription plan doesn't support this endpoint.", credit_count: 0 } }), { status: 403 });

const ROUTES: Record<string, () => Response> = {
  "/v1/global-metrics/quotes/latest": () => ok({ btc_dominance: 58.79, eth_dominance: 10.1, last_updated: "2026-11-19T18:44:59Z", quote: { USD: { total_market_cap: 2.15e12, altcoin_market_cap: 8.88e11, total_volume_24h: 7.1e10 } } }),
  "/v3/fear-and-greed/latest": () => ok({ value: 11, update_time: "2026-11-19T18:38:10Z", value_classification: "Extreme fear" }),
  "/v1/altcoin-season-index/historical": () => ok({ timeframe: "90d", points: [{ timestamp: "2026-08-22T00:00:00Z", altcoin_index: 60, altcoin_marketcap: 1e12 }, { timestamp: "2026-11-19T00:00:00Z", altcoin_index: 44, altcoin_marketcap: 9e11 }] }),
  "/v3/index/cmc100-latest": () => ok({ value: 123.12, value_24h_percentage_change: -0.01, last_update: "2026-11-19T18:45:00Z", constituents: [{ id: 1, symbol: "BTC", name: "Bitcoin", weight: 67.8 }, { id: 3957, symbol: "LEO", name: "UNUS SED LEO", weight: 0.4 }] }),
  "/v1/key/info": () => ok({ plan: { credit_limit_monthly: 450000, rate_limit_minute: 600 }, usage: { current_month: { credits_used: 2324, credits_left: 447676 } } }, 0),
};

function client(overrides: Record<string, () => Response> = {}) {
  const fetch = vi.fn<FetchLike>(async (url) => (overrides[url.pathname] ?? ROUTES[url.pathname] ?? (() => new Response("{}", { status: 404 })))());
  const ledger = new EvidenceLedger();
  return { fetch, ledger, cmc: createCmcClient({ apiKey: TEST_KEY, fetch, ledger }) };
}

describe("fetchMarketContext (5 Basic-plan endpoints, one call each)", () => {
  it("returns market totals, mood, altcoin season, CMC100 members and the credit budget", async () => {
    const { cmc, ledger } = client();
    const m = await fetchMarketContext(cmc);
    expect(m.global).toEqual({ totalMarketCap: 2.15e12, altcoinShare: 8.88e11 / 2.15e12, btcDominance: 58.79, volume24h: 7.1e10, updated: "2026-11-19T18:44:59Z" });
    expect(m.mood).toEqual({ value: 11, label: "Extreme fear", updated: "2026-11-19T18:38:10Z" });
    expect(m.altSeason).toEqual([{ date: "2026-08-22", value: 60 }, { date: "2026-11-19", value: 44 }]);
    expect(m.cmc100).toMatchObject({ value: 123.12, change24h: -0.01, members: [{ id: 1, symbol: "BTC", weight: 67.8 }, { id: 3957, symbol: "LEO", weight: 0.4 }] });
    expect(m.budget).toEqual({ monthlyLimit: 450000, usedThisMonth: 2324, perMinute: 600 });
    expect(ledger.entries().map((e) => e.endpoint).sort()).toEqual([
      "/v1/altcoin-season-index/historical",
      "/v1/global-metrics/quotes/latest",
      "/v1/key/info",
      "/v3/fear-and-greed/latest",
      "/v3/index/cmc100-latest",
    ]);
  });

  it("hides a panel instead of failing when the plan does not include an endpoint", async () => {
    const { cmc } = client({ "/v3/index/cmc100-latest": planError });
    const m = await fetchMarketContext(cmc);
    expect(m.cmc100).toBeNull();
    expect(m.global).not.toBeNull();
  });
});

describe("optional", () => {
  it("returns null for plan, auth-less and server errors, but rethrows programming errors", async () => {
    const { cmc } = client({ "/v1/key/info": planError });
    expect(await optional(cmc.get("/v1/key/info"))).toBeNull();
    await expect(optional(Promise.reject(new TypeError("bug")))).rejects.toThrow("bug");
  });
});

describe("threatenedIndexMembers", () => {
  it("lists CMC100 members the Red List rates Vulnerable or worse, riskiest first", () => {
    const members = [{ id: 1, symbol: "BTC", name: "Bitcoin", weight: 67.8 }, { id: 3957, symbol: "LEO", name: "UNUS SED LEO", weight: 0.4 }, { id: 9, symbol: "X", name: "X", weight: 0.1 }];
    const coins = [
      { id: 1, status: "LC" as const, probability: 0.01 },
      { id: 3957, status: "VU" as const, probability: 0.15 },
      { id: 9, status: "EN" as const, probability: 0.3 },
    ];
    expect(threatenedIndexMembers(members, coins).map((m) => m.symbol)).toEqual(["X", "LEO"]);
  });
});

describe("cmc100Return", () => {
  it("is the index's 12-month change between two dated values", () => {
    expect(cmc100Return({ "2024-11-15": 178.85, "2025-11-15": 190.37 }, "2024-11-15")).toBeCloseTo(190.37 / 178.85 - 1);
    expect(cmc100Return({ "2024-11-15": 178.85 }, "2024-11-15")).toBeNull();
    expect(cmc100Return({}, "2022-11-15")).toBeNull();
  });
});

import { describe, expect, it, vi } from "vitest";
import { buildLiveRedList, liveDates } from "@/live/redlist-live";
import { createCmcClient, EvidenceLedger, type FetchLike } from "@/cmc/client";
import type { CmcListingRow } from "@/redlist/census";
import { TEST_KEY } from "./helpers";

const row = (id: number, over: Partial<CmcListingRow> & { mcap?: number; vol?: number } = {}): CmcListingRow => ({
  id,
  symbol: `C${id}`,
  name: `Coin ${id}`,
  cmc_rank: id,
  num_market_pairs: over.num_market_pairs ?? 100,
  tags: over.tags ?? [],
  quote: { USD: { price: 1, market_cap: over.mcap ?? 1_000_000_000, volume_24h: over.vol ?? 50_000_000 } },
});

/** Fake CMC: latest = coins 1..4 (coin 2 is dying, 3 is a stablecoin, 4 is new); history has 1..3. */
function fakeCmc() {
  const latest = [row(1), row(2, { num_market_pairs: 10, vol: 500_000 }), row(3, { tags: ["stablecoin"] }), row(4)];
  const history = [row(1), row(2), row(3)];
  return vi.fn<FetchLike>(async (url) => {
    const ok = (data: unknown, credits: number) => new Response(JSON.stringify({ status: { error_code: 0, credit_count: credits, timestamp: "2026-11-19T00:00:00Z" }, data }), { status: 200 });
    if (url.pathname === "/v1/cryptocurrency/listings/latest") return ok(latest, 3);
    if (url.pathname === "/v1/cryptocurrency/listings/historical") return ok(url.searchParams.get("start") === "1" ? history : [], 10);
    return new Response("{}", { status: 404 });
  });
}

describe("liveDates", () => {
  it("looks back 182 and 364 days so it stays inside CMC Basic's 1-year history", () => {
    expect(liveDates(new Date("2026-11-19T10:00:00Z"))).toEqual({ today: "2026-11-19", halfAgo: "2026-05-21", yearAgo: "2025-11-20" });
  });
});

describe("buildLiveRedList", () => {
  it("rates today's top coins from latest + 6- and 12-month-old CMC snapshots", async () => {
    const fetch = fakeCmc();
    const ledger = new EvidenceLedger();
    const client = createCmcClient({ apiKey: TEST_KEY, fetch, ledger });
    const list = await buildLiveRedList(client, { now: new Date("2026-11-19T10:00:00Z"), ledger });

    const byId = Object.fromEntries(list.coins.map((c) => [c.id, c]));
    expect(byId[1]!.status).toBe("LC");
    expect(["EN", "CR"]).toContain(byId[2]!.status);
    expect(byId[2]!.reasons).toContain("Lost 90% of its exchange pairs in 6 months");
    expect(byId[3]!.status).toBe("NE");
    expect(byId[4]!.status).toBe("DD");
  });

  it("sorts riskiest first and reports counts, Red List Index and dates", async () => {
    const ledger = new EvidenceLedger();
    const client = createCmcClient({ apiKey: TEST_KEY, fetch: fakeCmc(), ledger });
    const list = await buildLiveRedList(client, { now: new Date("2026-11-19T10:00:00Z"), ledger });

    expect(list.coins[0]!.id).toBe(2);
    expect(list.counts.LC).toBe(1);
    expect(list.counts.NE + list.counts.DD).toBe(2);
    expect(list.rli).toBeGreaterThan(0);
    expect(list.rli).toBeLessThan(1);
    expect(list.dates).toEqual({ today: "2026-11-19", halfAgo: "2026-05-21", yearAgo: "2025-11-20" });
  });

  it("makes 7 calls (latest + 3 pages for each historical date) and cites them all", async () => {
    const fetch = fakeCmc();
    const ledger = new EvidenceLedger();
    const client = createCmcClient({ apiKey: TEST_KEY, fetch, ledger });
    const list = await buildLiveRedList(client, { now: new Date("2026-11-19T10:00:00Z"), ledger });

    expect(fetch).toHaveBeenCalledTimes(7);
    expect(list.evidence).toHaveLength(7);
    expect(list.evidence[0]).toMatchObject({ id: "E1", endpoint: "/v1/cryptocurrency/listings/latest", ok: true });
    expect(list.evidence[0]).not.toHaveProperty("response");
    expect(list.credits).toBe(3 + 6 * 10);
    for (const call of fetch.mock.calls) expect(call[0].toString()).not.toContain(TEST_KEY);
  });
});

describe("refresh schedule", () => {
  it("keeps the route's literal revalidate in sync and inside CMC Basic's 10k credits/month", async () => {
    const { REFRESH_SECONDS } = await import("@/live/get-redlist");
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("app/api/redlist/route.ts", "utf8")).toContain(`export const revalidate = ${REFRESH_SECONDS};`);
    const creditsPerRefresh = 62;
    const perMonth = (30 * 86400 / REFRESH_SECONDS) * creditsPerRefresh;
    expect(perMonth).toBeLessThan(10_000);
  });
});

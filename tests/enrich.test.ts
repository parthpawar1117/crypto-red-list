import { describe, expect, it, vi } from "vitest";
import { createCmcClient, EvidenceLedger, type FetchLike } from "@/cmc/client";
import { fetchCoinInfo, firstSentences } from "@/live/coin-info";
import { fetchFearGreedHistory, fearGreedOn, monthlyAverage } from "@/live/fear-greed";
import { TEST_KEY } from "./helpers";

const ok = (data: unknown) => new Response(JSON.stringify({ status: { error_code: 0, credit_count: 1 }, data }), { status: 200 });

describe("fetchCoinInfo (/v2/cryptocurrency/info)", () => {
  it("batches ids 100 per call and keeps only what the coin page shows", async () => {
    const fetch = vi.fn<FetchLike>(async (url) => {
      const ids = url.searchParams.get("id")!.split(",");
      return ok(Object.fromEntries(ids.map((id) => [id, {
        id: Number(id), name: `Coin ${id}`, logo: `https://s2.coinmarketcap.com/${id}.png`,
        description: "First sentence here. Second one. Third one is long and dropped.",
        date_added: "2020-01-02T00:00:00.000Z", urls: { website: ["https://example.org/"] },
        platform: id === "5" ? { name: "Ethereum" } : null, category: "token",
      }])));
    });
    const client = createCmcClient({ apiKey: TEST_KEY, fetch, ledger: new EvidenceLedger() });
    const info = await fetchCoinInfo(client, Array.from({ length: 150 }, (_, i) => i + 1));

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(info.size).toBe(150);
    expect(info.get(5)).toEqual({
      logo: "https://s2.coinmarketcap.com/5.png",
      about: "First sentence here. Second one.",
      website: "https://example.org/",
      dateAdded: "2020-01-02",
      platform: "Ethereum",
    });
    expect(info.get(6)!.platform).toBeNull();
  });
});

describe("firstSentences", () => {
  it("keeps the first two sentences and caps the length", () => {
    expect(firstSentences("A b. C d! E f? G h.")).toBe("A b. C d!");
    expect(firstSentences("x".repeat(400)).length).toBeLessThanOrEqual(281);
    expect(firstSentences(undefined)).toBe("");
  });
});

describe("fetchFearGreedHistory (/v3/fear-and-greed/historical)", () => {
  it("pages back until CMC returns nothing and sorts oldest first", async () => {
    const day = (iso: string, value: number) => ({ timestamp: String(Date.parse(iso) / 1000), value, value_classification: "Fear" });
    const fetch = vi.fn<FetchLike>(async (url) => {
      const start = url.searchParams.get("start");
      if (start === "1") return ok([day("2026-11-18", 12), day("2026-11-17", 20)]);
      if (start === "501") return ok([day("2023-08-15", 55)]);
      return ok([]);
    });
    const client = createCmcClient({ apiKey: TEST_KEY, fetch, ledger: new EvidenceLedger() });
    const history = await fetchFearGreedHistory(client);

    expect(history.map((h) => h.date)).toEqual(["2023-08-15", "2026-11-17", "2026-11-18"]);
    expect(history[0]).toEqual({ date: "2023-08-15", value: 55, label: "Fear" });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe("fearGreedOn", () => {
  const history = [
    { date: "2023-08-14", value: 40, label: "Fear" },
    { date: "2023-08-16", value: 60, label: "Greed" },
  ];
  it("returns the value on the date, or the closest earlier day", () => {
    expect(fearGreedOn(history, "2023-08-16")?.value).toBe(60);
    expect(fearGreedOn(history, "2023-08-15")?.value).toBe(40);
  });
  it("returns null before the history starts", () => {
    expect(fearGreedOn(history, "2019-11-15")).toBeNull();
  });
});

describe("monthlyAverage", () => {
  it("smooths daily readings into one point per month, dated mid-month", () => {
    const days = [
      { date: "2024-01-01", value: 10, label: "" },
      { date: "2024-01-31", value: 30, label: "" },
      { date: "2024-02-10", value: 70, label: "" },
    ];
    expect(monthlyAverage(days)).toEqual([
      { date: "2024-01-15", value: 20 },
      { date: "2024-02-15", value: 70 },
    ]);
  });
});

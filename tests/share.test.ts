import { describe, expect, it } from "vitest";
import { badgeSvg, alertsFeed, findCoin } from "@/web/share";

describe("badgeSvg (embeddable status badge, shields.io style)", () => {
  it("shows the symbol, status and chance in the IUCN colour", () => {
    const svg = badgeSvg({ symbol: "HEX", status: "EN", probability: 0.284 });
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain("Red List");
    expect(svg).toContain("HEX");
    expect(svg).toContain("Endangered 28%");
    expect(svg).toContain("#fc7f3f");
    expect(svg).toContain("<title>");
  });

  it("handles unassessed coins and unknown symbols", () => {
    expect(badgeSvg({ symbol: "USDT", status: "NE", probability: null })).toContain("Not Evaluated");
    expect(badgeSvg(null, "NOPE")).toContain("not in top 500");
  });

  it("escapes symbols so a badge can never inject markup", () => {
    const svg = badgeSvg(null, '<script>"&');
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;&quot;&amp;");
  });
});

describe("findCoin", () => {
  const coins = [
    { id: 7, symbol: "HEX", rank: 300 },
    { id: 9, symbol: "HEX", rank: 120 },
    { id: 1, symbol: "BTC", rank: 1 },
  ];
  it("matches symbols case-insensitively, preferring the higher-ranked coin, or an id", () => {
    expect(findCoin(coins, "hex")?.id).toBe(9);
    expect(findCoin(coins, "1")?.id).toBe(1);
    expect(findCoin(coins, "zzz")).toBeUndefined();
  });
});

describe("alertsFeed (RSS of uplisted and threatened coins)", () => {
  const items = [
    { id: 9, symbol: "HEX", name: "HEX & Co", status: "EN" as const, probability: 0.28, previous: "VU" as const, change: "uplisted" as const, reasons: ["Lost 80% of its exchange pairs in 6 months"] },
  ];
  it("is valid RSS 2.0 with one item per alert, linked to the assessment sheet", () => {
    const xml = alertsFeed(items, { site: "https://crypto-red-list.vercel.app", asOf: "2026-11-19T10:00:00Z" });
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<link>https://crypto-red-list.vercel.app/coin/9</link>");
    expect(xml).toContain("HEX &amp; Co uplisted to Endangered (28%)");
    expect(xml).toContain("Lost 80% of its exchange pairs in 6 months");
    expect(xml.match(/<item>/g)).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import { STATUS, criteriaCode, parsePortfolio, matchPortfolio, formatPct, statusChange } from "@/web/status";

describe("STATUS metadata", () => {
  it("uses IUCN category colours and plain-language names", () => {
    expect(STATUS.CR).toMatchObject({ name: "Critically Endangered", color: "#d81e05" });
    expect(STATUS.EN.color).toBe("#fc7f3f");
    expect(STATUS.LC.name).toBe("Least Concern");
    expect(STATUS.DD.name).toBe("Data Deficient");
    expect(STATUS.NE.name).toBe("Not Evaluated");
  });
});

describe("criteriaCode", () => {
  it("lists the criteria met, strongest first, like an IUCN listing", () => {
    expect(criteriaCode({ A: { value: 85, level: 3 }, B: null, D: { value: 0.005, level: 4 } })).toBe("D, A");
    expect(criteriaCode({ A: { value: 10, level: 0 }, B: { value: 5, level: 0 }, D: null })).toBe("");
  });
});

describe("parsePortfolio", () => {
  it("reads symbols separated by commas, spaces or new lines, ignoring case and duplicates", () => {
    expect(parsePortfolio("btc, eth\nHEX  hex ; sol")).toEqual(["BTC", "ETH", "HEX", "SOL"]);
    expect(parsePortfolio("  ")).toEqual([]);
  });

  it("caps the list so one paste cannot flood the page", () => {
    expect(parsePortfolio(Array.from({ length: 80 }, (_, i) => `C${i}`).join(","))).toHaveLength(50);
  });
});

describe("matchPortfolio", () => {
  const coins = [
    { id: 1, symbol: "BTC", rank: 1, status: "LC" as const, probability: 0.01 },
    { id: 9, symbol: "HEX", rank: 300, status: "EN" as const, probability: 0.3 },
    { id: 7, symbol: "HEX", rank: 900, status: "CR" as const, probability: 0.5 },
  ];

  it("picks the highest-ranked coin for a shared symbol and reports unknown ones", () => {
    const r = matchPortfolio(["BTC", "HEX", "NOPE"], coins);
    expect(r.found.map((c) => c.id)).toEqual([1, 9]);
    expect(r.missing).toEqual(["NOPE"]);
  });

  it("summarises how much of the portfolio is threatened (VU, EN, CR)", () => {
    expect(matchPortfolio(["BTC", "HEX"], coins).threatened).toBe(1);
  });
});

describe("formatPct", () => {
  it("formats probabilities for people", () => {
    expect(formatPct(0.2834)).toBe("28%");
    expect(formatPct(0.004)).toBe("<1%");
    expect(formatPct(null)).toBe("–");
  });
});

describe("statusChange (IUCN: uplisted = moved to a higher-risk category)", () => {
  it("compares assessed categories", () => {
    expect(statusChange("LC", "EN")).toBe("uplisted");
    expect(statusChange("CR", "VU")).toBe("downlisted");
    expect(statusChange("NT", "NT")).toBe("same");
  });
  it("cannot compare when either side was not assessed", () => {
    expect(statusChange(undefined, "EN")).toBe("new");
    expect(statusChange("DD", "EN")).toBe("new");
    expect(statusChange("EN", "NE")).toBe("same");
  });
});

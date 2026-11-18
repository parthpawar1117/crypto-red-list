import { describe, expect, it } from "vitest";
import { redListIndex, statusCounts } from "@/redlist/rli";

// IUCN Red List Index: RLI = 1 - sum(category weights) / (5 * N),
// weights LC 0, NT 1, VU 2, EN 3, CR 4 (EX 5). DD and NE are left out.
describe("redListIndex", () => {
  it("is 1 when every assessed coin is Least Concern", () => {
    expect(redListIndex(["LC", "LC", "LC"])).toBe(1);
  });

  it("uses IUCN category weights and ignores DD / NE", () => {
    // weights 0+1+2+3+4 = 10 over 5 coins -> 1 - 10/25 = 0.6
    expect(redListIndex(["LC", "NT", "VU", "EN", "CR", "DD", "NE"])).toBeCloseTo(0.6);
  });

  it("is null when nothing could be assessed", () => {
    expect(redListIndex(["DD", "NE"])).toBeNull();
  });
});

describe("statusCounts", () => {
  it("counts every status, including zeros", () => {
    expect(statusCounts(["LC", "LC", "EN", "DD"])).toEqual({ CR: 0, EN: 1, VU: 0, NT: 0, LC: 2, DD: 1, NE: 0 });
  });
});

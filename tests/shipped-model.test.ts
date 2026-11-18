import { describe, expect, it } from "vitest";
import { SHIPPED_MODEL, SHIPPED_WEIGHTS } from "@/redlist/shipped-model";
import { FEATURE_NAMES } from "@/redlist/model";

// Guards the model the site actually uses: if a retrain ever makes it worse
// on the years it never saw, these tests fail and the model is not shipped.
describe("shipped Red List model", () => {
  it("has one weight per feature", () => {
    expect(SHIPPED_WEIGHTS).toHaveLength(FEATURE_NAMES.length);
  });

  it("was tested on years after its training data", () => {
    expect(SHIPPED_MODEL.test.from > SHIPPED_MODEL.train.to).toBe(true);
  });

  it("beats a rank-only baseline clearly out of sample", () => {
    expect(SHIPPED_MODEL.test.auc).toBeGreaterThanOrEqual(0.7);
    expect(SHIPPED_MODEL.test.auc - SHIPPED_MODEL.test.aucRankOnly).toBeGreaterThanOrEqual(0.1);
    expect(SHIPPED_MODEL.test.riskiestTenth.lift).toBeGreaterThanOrEqual(3);
  });

  it("gives statuses whose real vanishing rates rise LC < NT < VU < EN out of sample", () => {
    const s = SHIPPED_MODEL.test.byStatus;
    expect(s.LC.rate!).toBeLessThan(s.NT.rate!);
    expect(s.NT.rate!).toBeLessThan(s.VU.rate!);
    expect(s.VU.rate!).toBeLessThan(s.EN.rate!);
  });

  it("learned that losing exchanges, thin trading and lagging the market all raise risk", () => {
    const w = Object.fromEntries(FEATURE_NAMES.map((n, i) => [n, SHIPPED_WEIGHTS[i]!]));
    expect(w.A).toBeGreaterThan(0);
    expect(w.B).toBeGreaterThan(0);
    expect(w.D).toBeGreaterThan(0);
  });
});

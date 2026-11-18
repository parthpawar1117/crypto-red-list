import { describe, expect, it } from "vitest";
import { auc, featuresOf, predict, statusFromProbability, train, STATUS_THRESHOLDS } from "@/redlist/model";

describe("featuresOf", () => {
  it("builds [bias, rank, A, B, D, young] scaled to roughly 0-1", () => {
    expect(featuresOf({ rank: 250, a: 4, b: 2, d: 4, young: false })).toEqual([1, 0.5, 1, 0.5, 1, 0]);
  });

  it("treats a missing signal as 0 (no evidence of decline) and flags coins under a year old", () => {
    expect(featuresOf({ rank: 500, a: null, b: null, d: null, young: true })).toEqual([1, 1, 0, 0, 0, 1]);
  });
});

describe("predict", () => {
  it("is the logistic function of the weighted features", () => {
    expect(predict([1, 0], [0, 5])).toBeCloseTo(0.5);
    expect(predict([1, 1], [-2, 2])).toBeCloseTo(0.5);
    expect(predict([1], [10])).toBeGreaterThan(0.99);
  });
});

describe("train (logistic regression by gradient descent)", () => {
  it("learns a positive weight for a feature that predicts the outcome", () => {
    const xs: number[][] = [];
    const ys: number[] = [];
    for (let i = 0; i < 400; i++) {
      const signal = i % 4 === 0 ? 1 : 0;
      xs.push([1, signal]);
      ys.push(signal === 1 ? (i % 8 === 0 ? 1 : 0) : i % 40 === 1 ? 1 : 0); // 50% vs ~3%
    }
    const w = train(xs, ys, { iterations: 3000, learningRate: 1 });
    expect(w[1]).toBeGreaterThan(1);
    expect(predict([1, 1], w)).toBeGreaterThan(predict([1, 0], w));
    expect(predict([1, 1], w)).toBeCloseTo(0.5, 1);
  });

  it("is deterministic", () => {
    const xs = [[1, 0], [1, 1], [1, 1], [1, 0]];
    const ys = [0, 1, 0, 0];
    expect(train(xs, ys)).toEqual(train(xs, ys));
  });
});

describe("statusFromProbability (IUCN criterion E style: status = measured chance of vanishing in 12 months)", () => {
  it("uses fixed probability thresholds", () => {
    expect(STATUS_THRESHOLDS).toEqual({ CR: 0.4, EN: 0.2, VU: 0.1, NT: 0.05 });
    expect(statusFromProbability(0.5)).toBe("CR");
    expect(statusFromProbability(0.4)).toBe("CR");
    expect(statusFromProbability(0.25)).toBe("EN");
    expect(statusFromProbability(0.12)).toBe("VU");
    expect(statusFromProbability(0.07)).toBe("NT");
    expect(statusFromProbability(0.01)).toBe("LC");
  });
});

describe("auc (Mann-Whitney)", () => {
  it("is 1 for a perfect ranking, 0.5 for ties, 0 for a reversed ranking", () => {
    expect(auc([0.9, 0.8, 0.2, 0.1], [1, 1, 0, 0])).toBe(1);
    expect(auc([0.5, 0.5, 0.5, 0.5], [1, 0, 1, 0])).toBe(0.5);
    expect(auc([0.1, 0.2, 0.8, 0.9], [1, 1, 0, 0])).toBe(0);
  });

  it("handles partial overlap", () => {
    // positives 0.9, 0.4 ; negatives 0.6, 0.1 -> pairs won: (0.9>0.6),(0.9>0.1),(0.4>0.1) = 3 of 4
    expect(auc([0.9, 0.4, 0.6, 0.1], [1, 1, 0, 0])).toBe(0.75);
  });
});

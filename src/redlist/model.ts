/**
 * The risk model: a small logistic regression that turns signal levels into
 * a probability that the coin vanishes from CoinMarketCap's top 3,000 within
 * 12 months. Logistic regression is used on purpose: six numbers anyone can
 * read and check, instead of a black box.
 */

export type Status = "CR" | "EN" | "VU" | "NT" | "LC";

/** [bias, rank, A, B, D, young] */
export type ModelWeights = number[];

export interface FeatureInput {
  rank: number;
  a: number | null;
  b: number | null;
  d: number | null;
  /** True when the coin has no snapshot 12 months back (so A is unknown). */
  young: boolean;
}

export const FEATURE_NAMES = ["bias", "rank", "A", "B", "D", "young"] as const;

export function featuresOf(f: FeatureInput): number[] {
  return [1, f.rank / 500, (f.a ?? 0) / 4, (f.b ?? 0) / 4, (f.d ?? 0) / 3, f.young ? 1 : 0];
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function predict(x: number[], w: ModelWeights): number {
  let z = 0;
  for (let i = 0; i < x.length; i++) z += x[i]! * (w[i] ?? 0);
  return sigmoid(z);
}

/** Batch gradient descent on log-loss. Deterministic: starts from zeros. */
export function train(xs: number[][], ys: number[], opts: { iterations?: number; learningRate?: number } = {}): ModelWeights {
  const iterations = opts.iterations ?? 3000;
  const lr = opts.learningRate ?? 1;
  const k = xs[0]?.length ?? 0;
  const w = new Array<number>(k).fill(0);
  for (let it = 0; it < iterations; it++) {
    const grad = new Array<number>(k).fill(0);
    for (let i = 0; i < xs.length; i++) {
      const err = predict(xs[i]!, w) - ys[i]!;
      for (let j = 0; j < k; j++) grad[j]! += err * xs[i]![j]!;
    }
    for (let j = 0; j < k; j++) w[j]! -= (lr * grad[j]!) / xs.length;
  }
  return w;
}

/**
 * IUCN criterion E style: status is a band of measured extinction
 * probability. The base rate in the backtest is ~5% a year, so NT starts at
 * the base rate and each step up roughly doubles the risk.
 */
export const STATUS_THRESHOLDS = { CR: 0.4, EN: 0.2, VU: 0.1, NT: 0.05 } as const;

export function statusFromProbability(p: number): Status {
  if (p >= STATUS_THRESHOLDS.CR) return "CR";
  if (p >= STATUS_THRESHOLDS.EN) return "EN";
  if (p >= STATUS_THRESHOLDS.VU) return "VU";
  if (p >= STATUS_THRESHOLDS.NT) return "NT";
  return "LC";
}

/**
 * Area under the ROC curve via Mann-Whitney U, with ties counted as half:
 * the chance that a random coin that vanished scored higher than a random
 * coin that survived. 0.5 = coin flip, 1 = perfect.
 */
export function auc(scores: number[], labels: number[]): number {
  const items = scores.map((s, i) => [s, labels[i]!] as const).sort((a, b) => a[0] - b[0]);
  let pos = 0;
  let rankSum = 0;
  for (let i = 0; i < items.length; ) {
    let j = i;
    while (j < items.length && items[j]![0] === items[i]![0]) j++;
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) if (items[k]![1]) { rankSum += avgRank; pos++; }
    i = j;
  }
  const neg = items.length - pos;
  if (pos === 0 || neg === 0) return 0.5;
  return (rankSum - (pos * (pos + 1)) / 2) / (pos * neg);
}

/**
 * One coin's Red List assessment: signals -> probability -> status -> reasons.
 *
 * Two IUCN categories keep the list honest:
 * - NE (Not Evaluated): stablecoins and tokenized real-world assets. They
 *   track something else, so "falling behind the market" means nothing for them.
 * - DD (Data Deficient): coins without a 6-month-old snapshot. Too new to
 *   judge, so we say so instead of guessing.
 */
import { signalA, signalB, signalD, type CoinSnapshot, type Signal } from "./criteria";
import { featuresOf, predict, statusFromProbability, type ModelWeights, type Status } from "./model";

export type RedListStatus = Status | "DD" | "NE";

export interface Assessment {
  status: RedListStatus;
  /** Chance of vanishing from the top 3,000 within 12 months; null for NE/DD. */
  probability: number | null;
  signals: { A: Signal | null; B: Signal | null; D: Signal | null };
  young: boolean;
  reasons: string[];
  /** Data-quality notes: what could not be judged, and why. */
  notes: string[];
}

export interface AssessInput {
  now: CoinSnapshot;
  halfAgo: CoinSnapshot | undefined;
  yearAgo: CoinSnapshot | undefined;
  marketRatio: number;
  weights: ModelWeights;
}

function reasonsFor(s: Assessment["signals"]): string[] {
  const out: string[] = [];
  if (s.A && s.A.level > 0) out.push(`Fell ${Math.round(s.A.value)}% behind the overall market in 12 months`);
  if (s.B && s.B.level > 0) out.push(`Lost ${Math.round(s.B.value)}% of its exchange pairs in 6 months`);
  if (s.D && s.D.level > 0) out.push(s.D.value < 0.01 ? "Trades less than 0.01% of its value per day" : `Trades only ${s.D.value.toFixed(2)}% of its value per day`);
  return out;
}

function notesFor(now: CoinSnapshot): string[] {
  return now.vol === 0 ? ["CoinMarketCap reports no trading volume for this coin, so trading activity could not be judged"] : [];
}

export function assessCoin({ now, halfAgo, yearAgo, marketRatio, weights }: AssessInput): Assessment {
  const signals = { A: signalA(now, yearAgo, marketRatio), B: signalB(now, halfAgo), D: signalD(now) };
  const young = !yearAgo;
  const base = { signals, young, reasons: reasonsFor(signals), notes: notesFor(now) };
  if (now.stable) return { ...base, status: "NE", probability: null, reasons: [] };
  if (!halfAgo) return { ...base, status: "DD", probability: null };
  const probability = predict(featuresOf({ rank: now.rank, a: signals.A?.level ?? null, b: signals.B?.level ?? null, d: signals.D?.level ?? null, young }), weights);
  return { ...base, status: statusFromProbability(probability), probability };
}

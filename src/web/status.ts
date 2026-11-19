/**
 * Presentation helpers shared by pages and client components: IUCN status
 * names and colours, criteria codes, and the portfolio "field check".
 */
import type { RedListStatus } from "../redlist/assess";
import type { Signal } from "../redlist/criteria";

export interface StatusMeta {
  name: string;
  /** IUCN category colour (as used in IUCN-style charts). */
  color: string;
  /** Text colour readable on `color`. */
  ink: string;
  /** What the status means here, in one line. */
  meaning: string;
}

export const STATUS: Record<RedListStatus, StatusMeta> = {
  CR: { name: "Critically Endangered", color: "#d81e05", ink: "#fff", meaning: "40% or higher chance of vanishing within 12 months" },
  EN: { name: "Endangered", color: "#fc7f3f", ink: "#1d1a16", meaning: "20–40% chance of vanishing within 12 months" },
  VU: { name: "Vulnerable", color: "#f9e814", ink: "#1d1a16", meaning: "10–20% chance of vanishing within 12 months" },
  NT: { name: "Near Threatened", color: "#cce226", ink: "#1d1a16", meaning: "5–10% chance, around the market's normal rate" },
  LC: { name: "Least Concern", color: "#60c659", ink: "#1d1a16", meaning: "Under 5% chance of vanishing within 12 months" },
  DD: { name: "Data Deficient", color: "#d1d1c6", ink: "#1d1a16", meaning: "Under 6 months of history: too new to judge" },
  NE: { name: "Not Evaluated", color: "#ffffff", ink: "#1d1a16", meaning: "Stablecoins are built to hold a peg, so they are not judged" },
};

export const THREATENED: RedListStatus[] = ["CR", "EN", "VU"];
export const ORDERED: RedListStatus[] = ["CR", "EN", "VU", "NT", "LC", "DD", "NE"];

export const CRITERIA = {
  A: { title: "Falling behind the market", detail: "Market-cap change over 12 months compared with the typical top-500 coin" },
  B: { title: "Exchanges leaving", detail: "Share of exchange trading pairs lost over 6 months" },
  D: { title: "Nobody trading", detail: "24h trading volume as a share of market cap" },
} as const;

export type SignalSet = { A: Signal | null; B: Signal | null; D: Signal | null };

/** Criteria met (level > 0), strongest first, e.g. "D, A". */
export function criteriaCode(signals: SignalSet): string {
  return (["A", "B", "D"] as const)
    .filter((k) => (signals[k]?.level ?? 0) > 0)
    .sort((x, y) => (signals[y]!.level - signals[x]!.level))
    .join(", ");
}

export function formatPct(p: number | null | undefined): string {
  if (p == null) return "–";
  if (p < 0.01) return "<1%";
  return `${Math.round(p * 100)}%`;
}

const MAX_PORTFOLIO = 50;

/** Symbols from free text: commas, semicolons, spaces or new lines; upper-cased, de-duplicated. */
export function parsePortfolio(text: string): string[] {
  const seen = new Set<string>();
  for (const raw of text.split(/[\s,;]+/)) {
    const s = raw.trim().toUpperCase().replace(/[^A-Z0-9.$-]/g, "");
    if (s) seen.add(s);
    if (seen.size >= MAX_PORTFOLIO) break;
  }
  return [...seen];
}

export interface PortfolioCoin {
  id: number;
  symbol: string;
  rank: number;
  status: RedListStatus;
  probability: number | null;
}

export function matchPortfolio<T extends PortfolioCoin>(symbols: string[], coins: T[]) {
  const best = new Map<string, T>();
  for (const c of coins) {
    const key = c.symbol.toUpperCase();
    const prev = best.get(key);
    if (!prev || c.rank < prev.rank) best.set(key, c);
  }
  const found: T[] = [];
  const missing: string[] = [];
  for (const s of symbols) {
    const c = best.get(s);
    if (c) found.push(c);
    else missing.push(s);
  }
  return { found, missing, threatened: found.filter((c) => THREATENED.includes(c.status)).length };
}

const SEVERITY: Partial<Record<RedListStatus, number>> = { LC: 0, NT: 1, VU: 2, EN: 3, CR: 4 };

/**
 * IUCN wording: "uplisted" = moved to a higher-risk category, "downlisted" =
 * lower. "new" = not assessed last quarter (or not listed), so no comparison.
 * A coin that is not assessed now (DD / NE) has nothing to report: "same".
 */
export function statusChange(prev: RedListStatus | undefined, now: RedListStatus): "uplisted" | "downlisted" | "same" | "new" {
  const n = SEVERITY[now];
  if (n === undefined) return "same";
  const p = prev === undefined ? undefined : SEVERITY[prev];
  if (p === undefined) return "new";
  return n > p ? "uplisted" : n < p ? "downlisted" : "same";
}

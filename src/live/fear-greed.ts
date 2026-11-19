/**
 * Market mood history from /v3/fear-and-greed/historical (CMC's daily Fear &
 * Greed Index, available from mid-2023). Shown next to the Red List Index so
 * people can see whether coin health moves with sentiment or on its own.
 */
import type { CmcClient } from "../cmc/client";

export interface FearGreedDay {
  date: string;
  value: number;
  label: string;
}

interface CmcFearGreed {
  timestamp: string;
  value: number;
  value_classification: string;
}

const PAGE = 500;
const MAX_PAGES = 6;

export async function fetchFearGreedHistory(client: CmcClient): Promise<FearGreedDay[]> {
  const days: FearGreedDay[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await client.get<CmcFearGreed[]>("/v3/fear-and-greed/historical", { start: page * PAGE + 1, limit: PAGE });
    if (!Array.isArray(data) || data.length === 0) break;
    for (const d of data) {
      days.push({ date: new Date(Number(d.timestamp) * 1000).toISOString().slice(0, 10), value: d.value, label: d.value_classification });
    }
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

/** The reading on `date`, or the closest earlier day; null before the history starts. */
export function fearGreedOn(history: FearGreedDay[], date: string): FearGreedDay | null {
  let best: FearGreedDay | null = null;
  for (const d of history) {
    if (d.date > date) break;
    best = d;
  }
  return best;
}

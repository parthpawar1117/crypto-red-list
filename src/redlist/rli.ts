/**
 * The Red List Index (RLI), the measure IUCN uses to track whether a group
 * of species is heading towards extinction (Butchart et al. 2004/2007):
 *
 *   RLI = 1 - sum(weight of each assessed member) / (5 * number assessed)
 *
 * with weights LC 0, NT 1, VU 2, EN 3, CR 4, EX 5. 1 means every coin is
 * Least Concern; 0 would mean every coin is extinct. DD and NE are excluded,
 * exactly as IUCN does.
 */
import type { RedListStatus } from "./assess";

const WEIGHT: Partial<Record<RedListStatus, number>> = { LC: 0, NT: 1, VU: 2, EN: 3, CR: 4 };

export function redListIndex(statuses: RedListStatus[]): number | null {
  let sum = 0;
  let n = 0;
  for (const s of statuses) {
    const w = WEIGHT[s];
    if (w === undefined) continue;
    sum += w;
    n++;
  }
  return n === 0 ? null : 1 - sum / (5 * n);
}

export type StatusCounts = Record<RedListStatus, number>;

export function statusCounts(statuses: RedListStatus[]): StatusCounts {
  const counts: StatusCounts = { CR: 0, EN: 0, VU: 0, NT: 0, LC: 0, DD: 0, NE: 0 };
  for (const s of statuses) counts[s]++;
  return counts;
}

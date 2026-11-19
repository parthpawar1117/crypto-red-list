/**
 * GET /api/redlist: today's Crypto Red List as JSON (all 500 coins, statuses,
 * probabilities, reasons, Red List Index, and a citation for every CMC call).
 * Cached and refreshed every 6 hours; a failed refresh keeps the last good list.
 */
import { getCachedRedList } from "@/live/cached";

// Must be a literal for Next.js to read it (= REFRESH_SECONDS).
export const revalidate = 21600;

export async function GET() {
  return Response.json(await getCachedRedList());
}

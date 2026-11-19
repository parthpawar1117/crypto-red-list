/** GET /badge/HEX.svg (or /badge/9.svg by CMC id): an embeddable Red List status badge. */
import { getCachedRedList } from "@/live/cached";
import { badgeSvg, findCoin } from "@/web/share";

export const revalidate = 21600;

export async function GET(_req: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const query = decodeURIComponent((await params).symbol).replace(/\.svg$/i, "").slice(0, 24);
  const list = await getCachedRedList();
  const coin = findCoin(list.coins, query);
  return new Response(badgeSvg(coin ? { symbol: coin.symbol, status: coin.status, probability: coin.probability } : null, query), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=21600",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
      "x-content-type-options": "nosniff",
    },
  });
}

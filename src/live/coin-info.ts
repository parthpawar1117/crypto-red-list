/**
 * Coin profile for the assessment sheet, from /v2/cryptocurrency/info:
 * logo, a two-sentence summary, website, launch date and host chain.
 * Batched 100 ids per call (1 credit each), so all 500 coins cost ~5 credits.
 */
import type { CmcClient } from "../cmc/client";

export interface CoinInfo {
  logo: string | null;
  about: string;
  website: string | null;
  /** YYYY-MM-DD when CMC first listed the coin. */
  dateAdded: string | null;
  /** Chain the token lives on, or null for a coin with its own chain. */
  platform: string | null;
}

interface CmcInfo {
  logo?: string;
  description?: string;
  date_added?: string;
  urls?: { website?: string[] };
  platform?: { name?: string } | null;
}

/** First two sentences, at most 280 characters. */
export function firstSentences(text: string | undefined): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+/g);
  const short = sentences ? sentences.slice(0, 2).map((s) => s.trim()).join(" ") : clean;
  return short.length > 280 ? `${short.slice(0, 280)}…` : short;
}

export async function fetchCoinInfo(client: CmcClient, ids: number[]): Promise<Map<number, CoinInfo>> {
  const out = new Map<number, CoinInfo>();
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { data } = await client.get<Record<string, CmcInfo>>("/v2/cryptocurrency/info", {
      id: batch.join(","),
      aux: "urls,logo,description,date_added,platform",
      skip_invalid: true,
    });
    for (const [id, d] of Object.entries(data ?? {})) {
      out.set(Number(id), {
        logo: d.logo ?? null,
        about: firstSentences(d.description),
        website: d.urls?.website?.[0] ?? null,
        dateAdded: d.date_added?.slice(0, 10) ?? null,
        platform: d.platform?.name ?? null,
      });
    }
  }
  return out;
}

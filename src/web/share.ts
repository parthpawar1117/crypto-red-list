/**
 * Ways the Red List travels beyond the site:
 * - badgeSvg: a shields.io-style status badge any project can embed in its README.
 * - alertsFeed: an RSS feed of coins moving to a higher-risk category, so people can follow changes.
 */
import type { RedListStatus } from "../redlist/assess";
import { formatPct, STATUS, type statusChange } from "./status";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Rough text width for Verdana 11px (what shields.io uses), so badges size themselves. */
const textWidth = (s: string) => Math.round(s.length * 6.6 + 10);

export function badgeSvg(coin: { symbol: string; status: RedListStatus; probability: number | null } | null, query = ""): string {
  const left = `Red List · ${coin ? coin.symbol : query}`;
  let right: string;
  let color: string;
  let ink: string;
  if (!coin) {
    right = "not in top 500";
    color = "#9f9f9f";
    ink = "#fff";
  } else {
    const m = STATUS[coin.status];
    right = coin.probability == null ? m.name : `${m.name} ${formatPct(coin.probability)}`;
    color = m.color === "#ffffff" ? "#e5e5e5" : m.color;
    ink = m.ink;
  }
  const lw = textWidth(left);
  const rw = textWidth(right);
  const w = lw + rw;
  const title = esc(`${left}: ${right}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${title}"><title>${title}</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#1d1a16"/><rect x="${lw}" width="${rw}" height="20" fill="${color}"/><rect width="${w}" height="20" fill="url(#s)"/></g><g font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle"><text x="${lw / 2}" y="14" fill="#fff">${esc(left)}</text><text x="${lw + rw / 2}" y="14" fill="${ink}">${esc(right)}</text></g></svg>`;
}

/** By numeric id, or by symbol (case-insensitive), preferring the higher-ranked coin. */
export function findCoin<T extends { id: number; symbol: string; rank: number }>(coins: T[], query: string): T | undefined {
  const q = query.trim();
  if (/^\d+$/.test(q)) return coins.find((c) => c.id === Number(q));
  return coins.filter((c) => c.symbol.toLowerCase() === q.toLowerCase()).sort((a, b) => a.rank - b.rank)[0];
}

export interface AlertItem {
  id: number;
  symbol: string;
  name: string;
  status: RedListStatus;
  probability: number | null;
  previous: RedListStatus | null;
  change: ReturnType<typeof statusChange>;
  reasons: string[];
}

export function alertsFeed(items: AlertItem[], { site, asOf }: { site: string; asOf: string }): string {
  const date = new Date(asOf).toUTCString();
  const entries = items
    .map((c) => {
      const verb = c.change === "uplisted" ? `uplisted to ${STATUS[c.status].name}` : `rated ${STATUS[c.status].name}`;
      const title = `${c.name} ${verb} (${formatPct(c.probability)})`;
      const body = [c.previous && c.change === "uplisted" ? `Previously ${STATUS[c.previous].name}.` : "", ...c.reasons].filter(Boolean).join(" ");
      return `<item><title>${esc(title)}</title><link>${site}/coin/${c.id}</link><guid isPermaLink="false">${c.id}-${c.status}-${asOf.slice(0, 10)}</guid><pubDate>${date}</pubDate><description>${esc(body)}</description></item>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Crypto Red List: extinction alerts</title><link>${site}</link><description>Coins moving to a higher extinction-risk category, from live CoinMarketCap data.</description><lastBuildDate>${date}</lastBuildDate>${entries}</channel></rss>`;
}

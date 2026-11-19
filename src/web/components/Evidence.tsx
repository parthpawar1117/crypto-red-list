import type { EvidenceSummary } from "../../live/redlist-live";

/** The receipts: every CoinMarketCap call behind what the page shows. */
export function Evidence({ entries, title = "API calls behind this page" }: { entries: EvidenceSummary[]; title?: string }) {
  const credits = entries.reduce((s, e) => s + (e.creditCount ?? 0), 0);
  return (
    <details>
      <summary className="mono small">
        {title}: {entries.length} CoinMarketCap calls, {credits} credits
      </summary>
      <ol className="evidence">
        {entries.map((e, i) => (
          <li key={`${e.id}-${i}`}>
            {e.endpoint} {Object.entries(e.params).map(([k, v]) => `${k}=${v}`).join("&")} · HTTP {e.httpStatus} · {e.creditCount ?? 0} cr · {e.timestamp}
          </li>
        ))}
      </ol>
    </details>
  );
}

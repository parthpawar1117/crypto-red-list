"use client";
/**
 * Field check: paste your coins, see their status. Runs entirely in the
 * browser against the list already on the page: nothing is sent anywhere.
 */
import Link from "next/link";
import { useState } from "react";
import { formatPct, matchPortfolio, parsePortfolio, STATUS } from "../status";
import type { CoinRow } from "../view";

export function FieldCheck({ coins }: { coins: CoinRow[] }) {
  const [text, setText] = useState("BTC, ETH, SOL, DOGE, ICX, LION");
  const result = matchPortfolio(parsePortfolio(text), coins);
  const found = [...result.found].sort((a, b) => (b.probability ?? -1) - (a.probability ?? -1));

  return (
    <div className="fieldcheck">
      <div>
        <label htmlFor="holdings" className="kicker">Your coins</label>
        <textarea id="holdings" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
        <p className="small muted">Symbols separated by commas or spaces. Checked in your browser; nothing leaves this page.</p>
      </div>
      <div aria-live="polite">
        {found.length ? (
          <p className="verdict">
            {result.threatened === 0
              ? `None of your ${found.length} coins is threatened.`
              : `${result.threatened} of your ${found.length} coins ${result.threatened === 1 ? "is" : "are"} threatened.`}
          </p>
        ) : (
          <p className="verdict muted">Type a few symbols to check them.</p>
        )}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {found.map((c) => (
            <li key={c.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderTop: "1px solid var(--rule)" }}>
              <span className="chip" style={{ background: STATUS[c.status].color, color: STATUS[c.status].ink }}>{c.status}</span>
              <Link href={`/coin/${c.id}`} style={{ color: "var(--ink)" }}>{c.name}</Link>
              <span className="mono small muted">{c.symbol}</span>
              <span className="num small" style={{ marginLeft: "auto" }}>{formatPct(c.probability)}</span>
            </li>
          ))}
        </ul>
        {result.missing.length ? <p className="small muted">Not in today&apos;s top 500: {result.missing.join(", ")}</p> : null}
      </div>
    </div>
  );
}

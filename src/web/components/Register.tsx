"use client";
/** The full register of 500 coins: search, filter by category, sort. Runs in the browser, no API calls. */
import Link from "next/link";
import { useMemo, useState } from "react";
import type { RedListStatus } from "../../redlist/assess";
import { formatPct, ORDERED, STATUS } from "../status";
import type { CoinRow } from "../view";

const PAGE = 60;

export function Register({ coins }: { coins: CoinRow[] }) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<RedListStatus | null>(null);
  const [sort, setSort] = useState<"risk" | "rank">("risk");
  const [limit, setLimit] = useState(PAGE);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = coins.filter((c) => (!only || c.status === only) && (!needle || c.symbol.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle)));
    return sort === "rank" ? [...filtered].sort((a, b) => a.rank - b.rank) : filtered;
  }, [coins, q, only, sort]);

  return (
    <div>
      <div className="controls">
        <input type="search" placeholder="Search a coin (name or symbol)" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} aria-label="Search coins" />
        <button type="button" className="filter" aria-pressed={sort === "risk"} onClick={() => setSort(sort === "risk" ? "rank" : "risk")}>
          Sort: {sort === "risk" ? "riskiest first" : "market rank"}
        </button>
      </div>
      <div className="controls" role="group" aria-label="Filter by category">
        {ORDERED.map((s) => (
          <button key={s} type="button" className="filter" aria-pressed={only === s} onClick={() => { setOnly(only === s ? null : s); setLimit(PAGE); }}>
            <span className="swatch" style={{ background: STATUS[s].color }} />
            {STATUS[s].name}
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Coin</th>
              <th className="r">Rank</th>
              <th className="r">Chance of vanishing</th>
              <th>Criteria</th>
              <th>Since Aug</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="chip" style={{ background: STATUS[c.status].color, color: STATUS[c.status].ink }} title={STATUS[c.status].name}>{c.status}</span>
                </td>
                <td>
                  <div className="coin-cell">
                    {c.logo ? <img src={c.logo} alt="" width={20} height={20} loading="lazy" /> : null}
                    <Link href={`/coin/${c.id}`}>{c.name}</Link>
                    <span className="mono small muted">{c.symbol}</span>
                  </div>
                </td>
                <td className="r num">{c.rank}</td>
                <td className="r num">{formatPct(c.probability)}</td>
                <td className="mono small">{c.criteria || <span className="muted">none</span>}</td>
                <td className="mono small">
                  {c.change === "uplisted" ? <span style={{ color: "var(--accent)" }}>▲ from {c.previous}</span> : c.change === "downlisted" ? <span>▼ from {c.previous}</span> : <span className="muted">–</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Showing {Math.min(limit, rows.length)} of {rows.length}.{" "}
        {limit < rows.length ? (
          <button type="button" className="filter" onClick={() => setLimit(limit + PAGE)}>Show more</button>
        ) : null}
      </p>
    </div>
  );
}

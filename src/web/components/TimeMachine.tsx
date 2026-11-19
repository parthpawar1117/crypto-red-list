"use client";
/** Pick a past quarter: what the Red List said then, and what actually happened. */
import { useState } from "react";
import type { RedListStatus } from "../../redlist/assess";
import { formatPct, STATUS } from "../status";

export interface TmCoin {
  id: number;
  symbol: string;
  rank: number;
  status: RedListStatus | string;
  probability: number | null;
  reasons: string[];
  vanished?: boolean;
  ret?: number | null;
}

export interface TmCohort {
  date: string;
  split: string;
  rli: number | null;
  riskiest: TmCoin[];
  outcome: null | {
    byStatus: Record<string, { n: number; vanished: number }>;
    portfolio: { holdAll: number; exitRed: number };
  };
  benchmark?: { cmc100: number | null };
}

const pct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
const label = (d: string) => new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

export function TimeMachine({ cohorts, initial }: { cohorts: TmCohort[]; initial: string }) {
  const [date, setDate] = useState(initial);
  const c = cohorts.find((x) => x.date === date) ?? cohorts[0]!;
  const gone = c.riskiest.filter((r) => r.vanished).length;
  const base = c.outcome ? Object.values(c.outcome.byStatus).reduce((s, b) => ({ n: s.n + b.n, v: s.v + b.vanished }), { n: 0, v: 0 }) : null;

  return (
    <div>
      <div className="quarters" role="group" aria-label="Choose a quarter">
        {cohorts.map((x) => (
          <button key={x.date} type="button" className={`quarter${x.split === "test" ? " test" : ""}`} aria-pressed={x.date === date} onClick={() => setDate(x.date)}>
            {label(x.date)}
          </button>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>
        Blue underline = test years the model never saw while it was trained. {c.split === "train" ? "This quarter was part of the training years." : null}
        {c.split === "no outcome yet" ? " Twelve months have not passed yet for this quarter, so there is no outcome to show." : null}
      </p>

      <div className="section-head" style={{ marginTop: 20 }}>
        <div>
          <h3>On {new Date(c.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}, the list named these coins most at risk</h3>
          {c.outcome ? (
            <p>
              <b>{gone} of {c.riskiest.length}</b> vanished within a year. Across all {base!.n} assessed coins that quarter, {(100 * base!.v / base!.n).toFixed(1)}% vanished.
            </p>
          ) : null}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Then</th>
              <th>Coin</th>
              <th className="r">Rank</th>
              <th className="r">Chance</th>
              <th>Why</th>
              <th>12 months later</th>
            </tr>
          </thead>
          <tbody>
            {c.riskiest.map((r) => {
              const meta = STATUS[r.status as RedListStatus];
              return (
                <tr key={r.id}>
                  <td><span className="chip" style={{ background: meta.color, color: meta.ink }}>{r.status}</span></td>
                  <td className="mono">{r.symbol}</td>
                  <td className="r num">{r.rank}</td>
                  <td className="r num">{formatPct(r.probability)}</td>
                  <td className="small">{r.reasons.join("; ")}</td>
                  <td>
                    {r.vanished === undefined ? <span className="muted small">not yet known</span> : r.vanished ? <span className="fate gone">VANISHED</span> : <span className="fate">survived {r.ret != null ? `(${pct(r.ret)})` : ""}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {c.outcome ? (
        <div className="stat-row" style={{ marginTop: 18 }}>
          {(["CR", "EN", "VU", "NT", "LC"] as const).map((s) => {
            const b = c.outcome!.byStatus[s]!;
            return (
              <div key={s} className="stat" style={{ borderTop: `5px solid ${STATUS[s].color}` }}>
                <span className="kicker">{STATUS[s].name}</span>
                <b>{b.n ? `${Math.round((100 * b.vanished) / b.n)}%` : "–"}</b>
                <span className="small muted">{b.vanished} of {b.n} vanished</span>
              </div>
            );
          })}
          <div className="stat">
            <span className="kicker">Holder of every coin</span>
            <b>{pct(c.outcome.portfolio.holdAll)}</b>
            <span className="small muted">selling EN/CR first: {pct(c.outcome.portfolio.exitRed)}</span>
          </div>
          {c.benchmark?.cmc100 != null ? (
            <div className="stat" style={{ borderTop: "5px solid var(--fg-line)" }}>
              <span className="kicker">CMC100 index, same 12 months</span>
              <b>{pct(c.benchmark.cmc100)}</b>
              <span className="small muted">CoinMarketCap&apos;s big-cap benchmark</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

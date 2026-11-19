import type { Metadata } from "next";
import { getCachedFearGreed, getCachedRedList } from "@/live/cached";
import backtest from "@/redlist/backtest-results.json";
import { Evidence } from "@/web/components/Evidence";
import { RliChart, type RliPoint } from "@/web/components/RliChart";
import { TimeMachine, type TmCohort } from "@/web/components/TimeMachine";

export const revalidate = 21600;
export const metadata: Metadata = { title: "Time machine" };

export default async function TimeMachinePage() {
  const [list, fg] = await Promise.all([getCachedRedList(), getCachedFearGreed()]);
  const points: RliPoint[] = [
    ...backtest.cohorts.filter((c) => c.rli != null).map((c) => ({ date: c.date, rli: c.rli! })),
    ...(list.rli != null ? [{ date: list.asOf.slice(0, 10), rli: list.rli, live: true }] : []),
  ];
  const p = backtest.portfolio;

  return (
    <main>
      <section className="hero">
        <div className="wrap narrow">
          <p className="kicker">Every quarter since November 2019, rated with today&apos;s code</p>
          <h1>Time machine</h1>
          <p className="lede">
            Go back to any quarter. See which coins the Red List would have flagged, using only data visible on that day, and what actually happened to them a year later.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2>The Crypto Red List Index, 2019 to today</h2>
              <p>
                Solid line: the index (1.0 = every coin Least Concern; red dot = live). Dashed blue: CoinMarketCap&apos;s Fear &amp; Greed Index (0–100, right axis), available from mid-2023.
              </p>
            </div>
          </div>
          <RliChart points={points} fg={fg.history} />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="stat-row" style={{ marginBottom: 24 }}>
            <div className="stat">
              <span className="kicker">Selling red coins helped</span>
              <b>{p.all.exitBetterIn} of {p.all.cohorts}</b>
              <span className="small muted">quarters ({p.test.exitBetterIn} of {p.test.cohorts} in test years)</span>
            </div>
            <div className="stat">
              <span className="kicker">Average edge per year</span>
              <b>{((p.all.avgExitRed - p.all.avgHoldAll) * 100).toFixed(1)} pts</b>
              <span className="small muted">small on purpose: it is insurance, not alpha</span>
            </div>
            <div className="stat">
              <span className="kicker">Worst year ({p.all.worstCohort.date.slice(0, 7)})</span>
              <b>{(p.all.worstCohort.holdAll * 100).toFixed(0)}% → {(p.all.worstCohort.exitRed * 100).toFixed(0)}%</b>
              <span className="small muted">holding everything vs selling EN/CR</span>
            </div>
          </div>
          <TimeMachine cohorts={backtest.cohorts as TmCohort[]} initial="2022-11-15" />
          <p className="small muted" style={{ marginTop: 16 }}>
            Assumptions: a coin that left CoinMarketCap&apos;s top 3,000 is counted as −95% (its price is unknown); single-coin gains are capped at +1000%. &ldquo;Vanished&rdquo; means
            outside the top 3,000 twelve months later; a few coins later return.
          </p>
          <div style={{ marginTop: 12 }}>
            <Evidence entries={fg.evidence} title="Fear & Greed history" />
          </div>
        </div>
      </section>
    </main>
  );
}

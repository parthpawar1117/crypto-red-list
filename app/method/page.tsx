import type { Metadata } from "next";
import { SHIPPED_MODEL } from "@/redlist/shipped-model";
import { FEATURE_NAMES } from "@/redlist/model";
import { STATUS } from "@/web/status";

export const metadata: Metadata = { title: "How it works" };

const pct = (v: number | null) => (v == null ? "–" : `${(v * 100).toFixed(1)}%`);

export default function Method() {
  const m = SHIPPED_MODEL;
  return (
    <main className="wrap narrow prose" style={{ padding: "36px 16px 48px" }}>
      <p className="kicker">Method · Crypto Red List v{m.version}</p>
      <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.2rem)" }}>How a coin gets its status</h1>
      <p className="lede">
        The IUCN Red List sorts species by their risk of extinction. This does the same for the top 500 cryptocurrencies, with one difference: every category is a measured probability, checked against what really happened.
      </p>

      <h2>1. Three warning signs</h2>
      <p>Each refresh pulls today&apos;s top 500 from CoinMarketCap (<code>/v1/cryptocurrency/listings/latest</code>) and CMC&apos;s own snapshots from 6 and 12 months ago (<code>/v1/cryptocurrency/listings/historical</code>).</p>
      <ul>
        <li><b>A: Falling behind the market.</b> How much market cap the coin lost over 12 months compared with the typical top-500 coin, so a market-wide crash does not paint everything red.</li>
        <li><b>B: Exchanges leaving.</b> The share of exchange trading pairs lost over 6 months. Exchanges tend to leave before a coin dies.</li>
        <li><b>D: Nobody trading.</b> Daily volume as a share of market cap. Below 0.01% a day, more than half of such coins vanished within a year in the training data.</li>
      </ul>
      <p>
        An earlier version also used rank drops (criterion C). Out of sample it made predictions worse, so it was removed. Exactly zero volume is treated as &ldquo;not reported&rdquo;: since late 2025 CoinMarketCap shows 0 for many healthy coins, and in the Nov 2025 cohort only 1 of 16 such coins vanished.
      </p>

      <h2>2. One probability</h2>
      <p>
        A small logistic regression turns the signals into a chance of leaving CoinMarketCap&apos;s top 3,000 within 12 months. It has six weights anyone can check:
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr>{FEATURE_NAMES.map((f) => <th key={f} className="r">{f}</th>)}</tr></thead>
          <tbody><tr>{m.weights.map((w, i) => <td key={i} className="r num">{w.toFixed(2)}</td>)}</tr></tbody>
        </table>
      </div>
      <p className="small muted">Thin trading (D) carries the most weight, then exchanges leaving (B), then falling behind the market (A).</p>

      <h2>3. Probability → category</h2>
      <p>Following IUCN criterion E, the category is a band of extinction probability:</p>
      <ul>
        {(["CR", "EN", "VU", "NT", "LC", "DD", "NE"] as const).map((s) => (
          <li key={s}><span className="chip" style={{ background: STATUS[s].color, color: STATUS[s].ink }}>{s}</span> <b>{STATUS[s].name}</b>: {STATUS[s].meaning}.</li>
        ))}
      </ul>

      <h2>4. Tested on years it never saw</h2>
      <p>
        Trained on quarterly cohorts from {m.train.from} to {m.train.to} ({m.train.coinQuarters.toLocaleString()} coin-quarters). Tested on {m.test.from} to {m.test.to} ({m.test.coinQuarters.toLocaleString()} coin-quarters). The weights that were tested are the weights the site uses; they were not refit on the test years. CMC&apos;s historical census includes coins that later died, so there is no survivorship bias.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Category</th><th className="r">Coins (test)</th><th className="r">Predicted</th><th className="r">Actually vanished</th></tr></thead>
          <tbody>
            {(["CR", "EN", "VU", "NT", "LC"] as const).map((s) => {
              const b = m.test.byStatus[s];
              return (
                <tr key={s}>
                  <td><span className="chip" style={{ background: STATUS[s].color, color: STATUS[s].ink }}>{s}</span></td>
                  <td className="r num">{b.n}</td>
                  <td className="r num">{pct(b.predicted)}</td>
                  <td className="r num">{pct(b.rate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul>
        <li><b>AUC {m.test.auc.toFixed(3)}</b> (0.5 is a coin flip, 1 is perfect), against {m.test.aucRankOnly.toFixed(3)} for market rank alone.</li>
        <li>The riskiest tenth vanished <b>{pct(m.test.riskiestTenth.rate)}</b> of the time, against a base rate of {pct(m.test.baseRate)}: {m.test.riskiestTenth.lift.toFixed(1)}×.</li>
      </ul>

      <h2>Honest limits</h2>
      <ul>
        <li>It predicts disappearance, not price. A coin can lose 90% and stay on the list.</li>
        <li>The model is slightly cautious: in the test years Vulnerable and Endangered coins vanished more often than predicted.</li>
        <li>Critically Endangered is rare, because it needs several signs at once.</li>
        <li>&ldquo;Vanished&rdquo; means outside the top 3,000 twelve months later. A few coins come back, and wrapped tokens can drop out of CMC&apos;s rankings for listing reasons.</li>
        <li>Stablecoins that CoinMarketCap did not tag are caught by a backup rule (a dollar-like name and a price within 2% of $1); one or two may still slip through.</li>
      </ul>

      <h2>Use it</h2>
      <p>The full list is open JSON at <a href="/api/redlist"><code>/api/redlist</code></a>, with a citation for every CoinMarketCap call behind it. Code and tests: see the GitHub repository.</p>
    </main>
  );
}

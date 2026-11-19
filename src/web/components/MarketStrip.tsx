/** The market around the list: totals, mood, altcoin season and the CMC100. Hidden piece by piece if CMC refuses an endpoint. */
import type { MarketContext } from "../../live/market";

const usd = (v: number) => (v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T` : `$${(v / 1e9).toFixed(0)}B`);

function Spark({ points }: { points: { date: string; value: number }[] }) {
  if (points.length < 2) return null;
  const w = 120;
  const h = 28;
  const d = points.map((p, i) => `${i ? "L" : "M"}${((i / (points.length - 1)) * w).toFixed(1)},${(h - (p.value / 100) * h).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="spark" role="img" aria-label={`Altcoin season index over 90 days, now ${points.at(-1)!.value}`}>
      <line x1="0" x2={w} y1={h * 0.25} y2={h * 0.25} className="spark-ref" />
      <path d={d} />
    </svg>
  );
}

export function MarketStrip({ market }: { market: MarketContext }) {
  const { global: g, mood, altSeason, cmc100 } = market;
  if (!g && !mood && !altSeason && !cmc100) return null;
  return (
    <div className="strip" aria-label="Market context">
      {g ? (
        <>
          <div><span className="kicker">Total market cap</span><b className="num">{usd(g.totalMarketCap)}</b></div>
          <div><span className="kicker">BTC dominance</span><b className="num">{g.btcDominance.toFixed(1)}%</b></div>
          <div><span className="kicker">Altcoin share</span><b className="num">{(g.altcoinShare * 100).toFixed(1)}%</b></div>
        </>
      ) : null}
      {mood ? (
        <div><span className="kicker">Fear &amp; Greed</span><b className="num">{mood.value} <small>{mood.label}</small></b></div>
      ) : null}
      {altSeason?.length ? (
        <div>
          <span className="kicker">Altcoin season · 90 days</span>
          <span className="spark-row"><b className="num">{altSeason.at(-1)!.value}</b><Spark points={altSeason} /></span>
        </div>
      ) : null}
      {cmc100 ? (
        <div><span className="kicker">CMC100 index</span><b className="num">{cmc100.value.toFixed(2)} <small className={cmc100.change24h < 0 ? "down" : "up"}>{cmc100.change24h >= 0 ? "+" : ""}{cmc100.change24h.toFixed(2)}%</small></b></div>
      ) : null}
    </div>
  );
}

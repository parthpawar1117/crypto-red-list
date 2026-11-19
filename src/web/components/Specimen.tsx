import Link from "next/link";
import { STATUS } from "../status";
import type { CoinRow } from "../view";
import { StatusChip } from "./Status";

/** A threatened coin as a field-guide specimen card. Risk shown as a natural frequency. */
export function Specimen({ coin }: { coin: CoinRow }) {
  const inHundred = coin.probability == null ? null : Math.round(coin.probability * 100);
  return (
    <Link href={`/coin/${coin.id}`} className="specimen" style={{ ["--status" as string]: STATUS[coin.status].color }}>
      <span className="specimen-no">No. {coin.rank}</span>
      <div className="specimen-top">
        {coin.logo ? <img src={coin.logo} alt="" width={28} height={28} loading="lazy" /> : null}
        <div>
          <div className="specimen-name">{coin.name}</div>
          <div className="mono small muted">{coin.symbol}</div>
        </div>
      </div>
      <div className="freq">
        {inHundred} <span className="small muted">in 100</span>
        <small>coins with this profile are expected to vanish within a year</small>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <StatusChip status={coin.status} />
        {coin.criteria ? <span className="mono small muted">criteria {coin.criteria}</span> : null}
        {coin.change === "uplisted" ? <span className="mono small" style={{ color: "var(--accent)" }}>▲ uplisted</span> : null}
      </div>
      <ul className="reasons">
        {coin.reasons.slice(0, 2).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </Link>
  );
}

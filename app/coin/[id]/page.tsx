import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCachedCoinInfo, getCachedRedList } from "@/live/cached";
import backtest from "@/redlist/backtest-results.json";
import type { RedListStatus } from "@/redlist/assess";
import { SHIPPED_MODEL } from "@/redlist/shipped-model";
import { Evidence } from "@/web/components/Evidence";
import { StatusChip, StatusScale } from "@/web/components/Status";
import { CRITERIA, criteriaCode, formatPct, STATUS, statusChange } from "@/web/status";
import { fmtDate, meterPosition } from "@/web/view";

export const revalidate = 21600;

export function generateStaticParams() {
  return []; // pages are rendered on first visit, then cached
}

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const [list, info] = await Promise.all([getCachedRedList(), getCachedCoinInfo()]);
  const coin = list.coins.find((c) => String(c.id) === id);
  return coin ? { list, coin, info: info.info[coin.id], infoEvidence: info.evidence } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).id);
  if (!data) return { title: "Coin not found" };
  return { title: `${data.coin.name ?? data.coin.symbol}: ${STATUS[data.coin.status].name}` };
}

const LINES = {
  A: { cuts: [45, 65, 80, 90], unit: "% behind" },
  B: { cuts: [15, 30, 50, 70], unit: "% lost" },
  D: { cuts: [1, 0.5, 0.2, 0.01], unit: "% / day" },
};

export default async function CoinPage({ params }: Props) {
  const data = await load((await params).id);
  if (!data) notFound();
  const { list, coin, info } = data;
  const meta = STATUS[coin.status];
  const prev = backtest.previousQuarter?.statuses[String(coin.id) as keyof typeof backtest.previousQuarter.statuses] as RedListStatus | undefined;
  const change = statusChange(prev, coin.status);
  const code = criteriaCode(coin.signals);
  const tested = SHIPPED_MODEL.test.byStatus[coin.status as keyof typeof SHIPPED_MODEL.test.byStatus];

  return (
    <main className="wrap" style={{ padding: "28px 16px 40px" }}>
      <p className="small"><Link href="/">← The list</Link></p>
      <article className="sheet">
        <p className="kicker" style={{ marginTop: 0 }}>Assessment sheet · Crypto Red List v{SHIPPED_MODEL.version} · assessed {fmtDate(list.asOf)}</p>
        <div className="sheet-head">
          {info?.logo ? <img src={info.logo} alt="" width={56} height={56} /> : null}
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>{coin.name ?? coin.symbol}</h1>
            <p className="mono muted" style={{ margin: "4px 0 0" }}>{coin.symbol} · CMC rank #{coin.rank}</p>
          </div>
          <StatusScale status={coin.status} />
        </div>

        <div className="sheet-grid">
          <div>
            <dl style={{ margin: 0 }}>
              <div className="field" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
                <dt>Category</dt>
                <dd style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <StatusChip status={coin.status} title />
                  {code ? <span className="mono">criteria {code}</span> : null}
                </dd>
                <dd className="small muted">{meta.meaning}.</dd>
              </div>
              {coin.probability != null ? (
                <div className="field">
                  <dt>Chance of vanishing within 12 months</dt>
                  <dd>
                    <span className="big-prob">{formatPct(coin.probability)}</span>
                    <div className="meter" aria-hidden="true">
                      <span className="meter-mark" style={{ left: `calc(${(meterPosition(coin.probability) * 100).toFixed(1)}% - 1.5px)` }} />
                    </div>
                    {tested?.n ? (
                      <p className="small muted" style={{ margin: 0 }}>
                        Track record: of {tested.n} coins rated {meta.name} in the 2022–2025 test years, {tested.vanished} vanished ({Math.round(tested.rate! * 100)}%).
                      </p>
                    ) : null}
                  </dd>
                </div>
              ) : null}
              <div className="field">
                <dt>Since last quarter ({backtest.previousQuarter?.date})</dt>
                <dd>
                  {change === "uplisted" ? <span style={{ color: "var(--accent)" }}>▲ Uplisted from {prev}</span> : change === "downlisted" ? <span>▼ Downlisted from {prev}</span> : change === "new" ? <span className="muted">Not assessed last quarter</span> : <span className="muted">No change</span>}
                </dd>
              </div>
              <div className="field">
                <dt>Rationale</dt>
                <dd>
                  {coin.reasons.length ? (
                    <ul className="reasons" style={{ fontSize: "0.95rem" }}>
                      {coin.reasons.map((r) => <li key={r}>{r}</li>)}
                    </ul>
                  ) : coin.status === "NE" ? (
                    <span>Stablecoins are designed to hold a peg, so they are not evaluated.</span>
                  ) : coin.status === "DD" ? (
                    <span>CoinMarketCap has under 6 months of history for this coin, so it is too new to judge.</span>
                  ) : (
                    <span>No warning signs met.</span>
                  )}
                  {coin.notes.map((n) => <p key={n} className="note">{n}</p>)}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3>Criteria</h3>
            <p className="small muted" style={{ marginTop: 4 }}>Measured from CoinMarketCap data today and 6 / 12 months ago. Tags show the danger lines; a dark tag is a line crossed.</p>
            {(["A", "B", "D"] as const).map((k) => {
              const s = coin.signals[k];
              const met = (s?.level ?? 0) > 0;
              return (
                <div key={k} className={`criterion${met ? " met" : ""}`}>
                  <span className="criterion-code">{k}</span>
                  <div>
                    <b>{CRITERIA[k].title}</b>
                    <div className="small muted">{CRITERIA[k].detail}</div>
                    <div className="lines">
                      {LINES[k].cuts.map((cut, i) => (
                        <span key={cut} className={`line${s && s.level >= i + 1 ? " hit" : ""}`}>{k === "D" ? "<" : "≥"}{cut}{LINES[k].unit}</span>
                      ))}
                    </div>
                  </div>
                  <span className="num">{s ? `${k === "D" ? (s.value < 0.01 ? "<0.01" : s.value.toFixed(2)) : Math.round(s.value)}${k === "D" ? "%" : "%"}` : <span className="muted small">no data</span>}</span>
                </div>
              );
            })}

            {info ? (
              <>
                <h3 style={{ marginTop: 24 }}>About</h3>
                {info.about ? <p className="small" style={{ color: "var(--ink-2)" }}>{info.about}</p> : null}
                <dl className="small" style={{ margin: 0 }}>
                  {info.dateAdded ? <div className="field"><dt>Listed on CoinMarketCap</dt><dd>{fmtDate(info.dateAdded)}</dd></div> : null}
                  {info.platform ? <div className="field"><dt>Token on</dt><dd>{info.platform}</dd></div> : null}
                  {info.website ? <div className="field"><dt>Website</dt><dd><a href={info.website} rel="noopener noreferrer nofollow" target="_blank">{info.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></dd></div> : null}
                </dl>
              </>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <Evidence entries={[...list.evidence, ...data.infoEvidence]} title="Receipts" />
        </div>
      </article>
      <p className="small muted">Not financial advice. A status estimates the chance a coin leaves CoinMarketCap&apos;s top 3,000 within 12 months; it does not predict price.</p>
    </main>
  );
}

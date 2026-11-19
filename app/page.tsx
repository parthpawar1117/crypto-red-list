import Link from "next/link";
import { getCachedCoinInfo, getCachedMarket, getCachedRedList } from "@/live/cached";
import backtest from "@/redlist/backtest-results.json";
import { SHIPPED_MODEL } from "@/redlist/shipped-model";
import { CensusBar } from "@/web/components/Status";
import { Evidence } from "@/web/components/Evidence";
import { FieldCheck } from "@/web/components/FieldCheck";
import { Register } from "@/web/components/Register";
import { RliChart, type RliPoint } from "@/web/components/RliChart";
import { Specimen } from "@/web/components/Specimen";
import { MarketStrip } from "@/web/components/MarketStrip";
import type { TmCoin } from "@/web/components/TimeMachine";
import { THREATENED } from "@/web/status";
import { fmtDate, toRows } from "@/web/view";

export const revalidate = 21600;

export default async function Home() {
  const [list, coinInfo, { market, evidence: marketEvidence }] = await Promise.all([getCachedRedList(), getCachedCoinInfo(), getCachedMarket()]);
  const cmc100Ids = new Set(market.cmc100?.members.map((m) => m.id) ?? []);
  const rows = toRows(list, coinInfo.info, backtest.previousQuarter?.statuses ?? null, cmc100Ids);
  const indexThreatened = rows.filter((r) => r.inCmc100 && THREATENED.includes(r.status));
  const threatened = rows.filter((r) => THREATENED.includes(r.status));
  const uplisted = rows.filter((r) => r.change === "uplisted");
  const history: RliPoint[] = backtest.cohorts.filter((c) => c.rli != null).map((c) => ({ date: c.date, rli: c.rli! }));
  const points: RliPoint[] = [...history, ...(list.rli != null ? [{ date: list.asOf.slice(0, 10), rli: list.rli, live: true }] : [])];
  const lastQuarter = backtest.cohorts.find((c) => c.date === backtest.previousQuarter?.date)?.rli ?? null;
  const delta = list.rli != null && lastQuarter != null ? list.rli - lastQuarter : null;
  const nov22 = backtest.cohorts.find((c) => c.date === "2022-11-15")!;
  const nov22Named = nov22.riskiest.length;
  const nov22Gone = (nov22.riskiest as TmCoin[]).filter((r) => r.vanished).length;
  const test = SHIPPED_MODEL.test;

  return (
    <main>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="kicker">Assessment of the top 500 cryptocurrencies · data as of {fmtDate(list.asOf)}</p>
            <h1>The Crypto Red List</h1>
            <p className="lede">
              Which coins are heading for extinction? Every coin gets a measured chance of vanishing within 12 months, and the method was tested on three years it never saw.
            </p>
          </div>
          <div className="index-panel">
            <p className="kicker" style={{ margin: 0 }}>Crypto Red List Index</p>
            <div className="index-row">
              <span className="index-value">{list.rli?.toFixed(3) ?? "–"}</span>
              {delta != null ? (
                <span className={`delta${delta < 0 ? " worse" : ""}`}>
                  {delta >= 0 ? "+" : ""}{delta.toFixed(3)} since Aug
                </span>
              ) : null}
            </div>
            <p className="small muted" style={{ margin: "6px 0 8px" }}>
              1.000 would mean every coin is Least Concern. IUCN&apos;s formula for species, applied to crypto.
            </p>
            <RliChart points={points} compact />
          </div>
        </div>
        <div className="wrap">
          <CensusBar counts={list.counts} />
          <MarketStrip market={market} />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2>Threatened right now</h2>
              <p>
                {threatened.length} coins are Vulnerable or worse. In the test years, coins rated Endangered vanished{" "}
                {Math.round(test.byStatus.EN.rate! * 100)}% of the time; Least Concern, {Math.round(test.byStatus.LC.rate! * 100)}%.
              </p>
            </div>
            <Link href="/method" className="small">How a status is decided →</Link>
          </div>
          <div className="cards">
            {threatened.map((c) => (
              <Specimen key={c.id} coin={c} />
            ))}
          </div>
        </div>
      </section>

      {market.cmc100 ? (
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <div>
                <h2>Threatened inside the CMC100</h2>
                <p>
                  {indexThreatened.length
                    ? `${indexThreatened.length} of the 100 coins in CoinMarketCap's own flagship index are rated Vulnerable or worse. Being big does not make a coin safe.`
                    : "None of the 100 coins in CoinMarketCap's flagship index is rated Vulnerable or worse today."}
                </p>
              </div>
            </div>
            {indexThreatened.length ? (
              <div className="cards">
                {indexThreatened.map((c) => (
                  <Specimen key={c.id} coin={c} />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {uplisted.length ? (
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <div>
                <h2>Uplisted since August</h2>
                <p>Coins that moved to a higher-risk category since the last quarterly assessment ({backtest.previousQuarter!.date}).</p>
              </div>
            </div>
            <div className="cards">
              {uplisted.slice(0, 8).map((c) => (
                <Specimen key={c.id} coin={c} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2>Field check</h2>
              <p>Paste the coins you hold and see how each one is rated today.</p>
            </div>
          </div>
          <FieldCheck coins={rows} />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2>Does it work?</h2>
              <p>
                On 15 November 2022 the list named {nov22Named} coins most at risk. <b>{nov22Gone} of them vanished</b> within a year, when only about 4% of coins normally do.
                Over all test years, the riskiest tenth of coins vanished {test.riskiestTenth.lift.toFixed(1)}× more often than average.
              </p>
            </div>
            <Link href="/time-machine" className="small">Open the time machine →</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2>The register</h2>
              <p>All 500 coins, riskiest first. Refreshed every 6 hours from CoinMarketCap.</p>
            </div>
          </div>
          <Register coins={rows} />
          <div style={{ marginTop: 16 }}>
            <Evidence entries={[...list.evidence, ...coinInfo.evidence, ...marketEvidence]} />
          </div>
        </div>
      </section>
    </main>
  );
}

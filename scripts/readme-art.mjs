// Generates the animated README art in docs/ from the published backtest results,
// so every number drawn in the README is the same number the site and tests use.
// Usage: node scripts/readme-art.mjs
//
// The SVGs animate with CSS only (GitHub strips scripts from README images but plays CSS animation).
// Every animated element's resting style is its final state, and prefers-reduced-motion turns the
// animation off, so a still viewer sees the finished picture, never a half-drawn one.
import { readFileSync, writeFileSync } from "node:fs";

const r = JSON.parse(readFileSync(new URL("../src/redlist/backtest-results.json", import.meta.url), "utf8"));
const test = r.model.test;
const latest = r.cohorts.at(-1);

const C = { paper: "#f4f0e6", ink: "#1d1a16", ink2: "#4a443b", muted: "#776f62", rule: "#d6cdb9", card: "#fbf8f1", red: "#b3261e" };
const IUCN = { CR: "#d81e05", EN: "#fc7f3f", VU: "#f9e814", NT: "#cce226", LC: "#60c659", DD: "#b9b2a3", NE: "#ffffff" };
const NAME = { CR: "Critically Endangered", EN: "Endangered", VU: "Vulnerable", NT: "Near Threatened", LC: "Least Concern", DD: "Data Deficient", NE: "Not Evaluated" };
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const month = (iso) => new Date(iso + "T00:00:00Z").toLocaleString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Shared CSS: entrance keyframes plus the reduced-motion switch. */
const base = `
  .t { font-family: ${SERIF}; fill: ${C.ink}; }
  .m { font-family: ${MONO}; fill: ${C.muted}; }
  .up   { animation: up .8s cubic-bezier(.2,.7,.2,1) both; }
  .fade { animation: fade 1s ease both; }
  .pop  { transform-box: fill-box; transform-origin: center; animation: pop .7s cubic-bezier(.3,1.6,.5,1) both; }
  .grow-x { transform-box: fill-box; transform-origin: left center; animation: growx 1.1s cubic-bezier(.2,.7,.2,1) both; }
  .grow-y { transform-box: fill-box; transform-origin: center bottom; animation: growy 1.2s cubic-bezier(.2,.7,.2,1) both; }
  @keyframes up    { from { opacity: 0; transform: translateY(14px); } }
  @keyframes fade  { from { opacity: 0; } }
  @keyframes pop   { from { opacity: 0; transform: scale(.3); } }
  @keyframes growx { from { transform: scaleX(0); } }
  @keyframes growy { from { transform: scaleY(0); } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } .motion { display: none; } }`;

const svg = (w, h, label, style, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
<style>${base}${style}</style>
<rect width="${w}" height="${h}" fill="${C.paper}"/>
<line x1="0" y1="2" x2="${w}" y2="2" stroke="${C.ink}" stroke-width="4"/>
${body}
</svg>
`;
const d = (s) => `style="animation-delay:${s.toFixed(2)}s"`;

/* ---------- 1. Banner ---------- */
function banner() {
  const W = 1280, H = 480;
  const order = ["CR", "EN", "VU", "NT", "LC"];
  const dots = order
    .map((s, i) => {
      const x = 100 + i * 74, r = s === "CR" ? 30 : 24, fg = s === "CR" ? "#fff" : C.ink;
      return `<g class="pop" ${d(1.1 + i * 0.14)}><circle cx="${x}" cy="300" r="${r}" fill="${IUCN[s]}" stroke="${C.ink}" stroke-opacity="${s === "CR" ? 1 : 0.4}" stroke-width="${s === "CR" ? 2.5 : 1}"/><text x="${x}" y="306" text-anchor="middle" font-family="${MONO}" font-size="17" font-weight="700" fill="${fg}">${s}</text></g>`;
    })
    .join("");

  // Census bar: the latest quarterly census in the published results.
  const cats = ["CR", "EN", "VU", "NT", "LC", "DD", "NE"];
  const total = cats.reduce((a, s) => a + latest.counts[s], 0);
  const bx = 70, by = 388, bw = 1140, bh = 22;
  let x = bx;
  const segs = cats
    .map((s, i) => {
      const w = (latest.counts[s] / total) * bw;
      const seg = `<rect class="grow-x" ${d(2.0 + i * 0.12)} x="${x.toFixed(1)}" y="${by}" width="${Math.max(w, 2.5).toFixed(1)}" height="${bh}" fill="${IUCN[s]}" stroke="${C.ink}" stroke-opacity=".35" stroke-width="1"/>`;
      x += w;
      return seg;
    })
    .join("");
  const threatened = latest.counts.CR + latest.counts.EN + latest.counts.VU;
  const legend = cats.map((s) => `${s} ${latest.counts[s]}`).join("  ·  ");

  const stats = [
    [`${test.riskiestTenth.lift.toFixed(1)}×`, "riskiest tenth vs base rate"],
    ["8 of 10", "Nov 2022 picks that vanished"],
    [test.auc.toFixed(3), "out-of-sample AUC"],
  ]
    .map(([big, small], i) => `<g class="up" ${d(1.6 + i * 0.18)}><text x="${540 + i * 270}" y="296" class="t" font-size="46" font-weight="700">${big}</text><text x="${540 + i * 270}" y="326" class="m" font-size="15">${small}</text></g>`)
    .join("");

  const style = `
  .wipe { animation: wipe 1.3s cubic-bezier(.7,0,.2,1) .25s both; }
  @keyframes wipe { from { transform: scaleX(0); } }
  .ring { transform-box: fill-box; transform-origin: center; animation: ring 2.4s ease-out 2s infinite; }
  @keyframes ring { 0% { opacity: .9; transform: scale(1); } 80%,100% { opacity: 0; transform: scale(2.1); } }
  .scan { animation: scan 6s linear 3s infinite; }
  @keyframes scan { from { transform: translateX(-80px); } to { transform: translateX(1220px); } }`;

  return svg(W, H, "The Crypto Red List: an IUCN-style extinction-risk list for the top 500 cryptocurrencies", style, `
<text x="70" y="86" class="m fade" font-size="19" letter-spacing="4">ASSESSMENT OF THE TOP 500 CRYPTOCURRENCIES · LIVE COINMARKETCAP DATA</text>
<clipPath id="title"><rect class="wipe" style="transform-box:fill-box;transform-origin:left" x="60" y="100" width="900" height="110"/></clipPath>
<text x="66" y="184" class="t" font-size="94" font-weight="700" letter-spacing="-3" clip-path="url(#title)">The Crypto Red List</text>
<text x="70" y="234" class="t up" ${d(0.9)} font-size="29" fill="${C.ink2}">Which coins are heading for extinction? Measured, not guessed.</text>
<circle class="ring motion" cx="100" cy="300" r="30" fill="none" stroke="${IUCN.CR}" stroke-width="3"/>
${dots}
${stats}
<text x="70" y="372" class="m fade" ${d(1.9)} font-size="15" letter-spacing="1">${month(latest.date).toUpperCase()} CENSUS · ${total} COINS · ${threatened} THREATENED</text>
${segs}
<rect class="scan motion" x="${bx}" y="${by - 4}" width="60" height="${bh + 8}" fill="#fff" opacity=".35"/>
<text x="70" y="440" class="m fade" ${d(2.9)} font-size="14">${legend}</text>`);
}

/* ---------- 2. Pipeline ---------- */
function pipeline() {
  const W = 1280, H = 600;
  const endpoints = [
    "listings/latest", "listings/historical", "v2 cryptocurrency/info", "fear-and-greed/historical", "fear-and-greed/latest",
    "global-metrics/quotes", "altcoin-season-index", "index/cmc100-latest", "index/cmc100-historical", "key/info",
  ];
  const ex = 40, ew = 236;
  const pills = endpoints
    .map((e, i) => `<g class="up" ${d(0.2 + i * 0.07)}><rect x="${ex}" y="${92 + i * 46}" width="${ew}" height="34" rx="17" fill="${C.card}" stroke="${C.ink}" stroke-opacity=".5"/><text x="${ex + 16}" y="${114 + i * 46}" font-family="${MONO}" font-size="13" fill="${C.ink}">${e}</text></g>`)
    .join("");

  const box = (x, y, w, h, title, lines, delay, cls = "") =>
    `<g class="up ${cls}" ${d(delay)}><rect class="stage" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${C.card}" stroke="${C.ink}" stroke-width="1.5"/>` +
    `<text x="${x + 16}" y="${y + 28}" class="t" font-size="19" font-weight="700">${title}</text>` +
    lines.map((l, i) => `<text x="${x + 16}" y="${y + 54 + i * 21}" font-family="${MONO}" font-size="12.5" fill="${C.ink2}">${esc(l)}</text>`).join("") +
    `</g>`;

  const cache = box(330, 230, 220, 140, "Cache + ledger", ["shared server cache, 6 h ISR", "stale copy if CMC fails", "every call logged as", "evidence: status, credits"], 1.0);
  const sig = [
    ["A · falling behind", "12-mo mcap vs median coin"],
    ["B · exchanges leaving", "pairs lost in 6 months"],
    ["D · nobody trading", "24h volume / market cap"],
  ]
    .map(([t, s], i) => `<g class="up" ${d(1.4 + i * 0.12)}><rect class="stage s${i}" x="610" y="${150 + i * 104}" width="230" height="80" rx="10" fill="${C.card}" stroke="${C.ink}" stroke-width="1.5"/><text x="626" y="${180 + i * 104}" class="t" font-size="18" font-weight="700">${t}</text><text x="626" y="${204 + i * 104}" font-family="${MONO}" font-size="12.5" fill="${C.ink2}">${s}</text></g>`)
    .join("");
  const model = box(900, 226, 160, 148, "Logistic", ["p = σ(w · x)", "6 weights, public", "x = [1, rank, A,", "     B, D, young]"], 1.9);

  const th = [["CR", "≥ 40%"], ["EN", "≥ 20%"], ["VU", "≥ 10%"], ["NT", "≥ 5%"], ["LC", "&lt; 5%"]];
  const cats = th
    .map(([s, t], i) => `<g class="pop" ${d(2.3 + i * 0.1)}><rect x="1110" y="${170 + i * 54}" width="130" height="40" rx="6" fill="${IUCN[s]}" stroke="${C.ink}" stroke-opacity=".45"/><text x="1124" y="${196 + i * 54}" font-family="${MONO}" font-size="15" font-weight="700" fill="${s === "CR" ? "#fff" : C.ink}">${s}</text><text x="1226" y="${196 + i * 54}" text-anchor="end" font-family="${MONO}" font-size="13" fill="${s === "CR" ? "#fff" : C.ink}">${t}</text></g>`)
    .join("");

  // Wires: each is a path that a data packet travels along (CSS offset-path).
  const wires = [
    ...endpoints.map((_, i) => `M ${ex + ew} ${109 + i * 46} C 300 ${109 + i * 46}, 300 300, 330 300`),
    "M 550 300 C 580 300, 580 190, 610 190",
    "M 550 300 C 580 300, 580 294, 610 294",
    "M 550 300 C 580 300, 580 398, 610 398",
    "M 840 190 C 870 190, 870 300, 900 300",
    "M 840 294 C 870 294, 870 300, 900 300",
    "M 840 398 C 870 398, 870 300, 900 300",
    "M 1060 300 L 1110 300",
  ];
  const lines = wires.map((p) => `<path d="${p}" fill="none" stroke="${C.rule}" stroke-width="2"/>`).join("");
  const packets = wires
    .map((p, i) => {
      const stage = i < 10 ? 0 : i < 13 ? 1 : i < 16 ? 2 : 3;
      const delay = stage * 1.0 + (i < 10 ? i * 0.09 : (i % 3) * 0.12);
      const fill = stage === 3 ? IUCN.CR : stage === 2 ? IUCN.EN : C.ink;
      return `<circle class="pk motion" r="4.5" fill="${fill}" style="offset-path:path('${p}');animation-delay:${(delay + 3).toFixed(2)}s"/>`;
    })
    .join("");

  const outs = ["the list + Red List Index", "assessment sheet per coin", "/api/redlist (JSON)", "badge SVG · RSS alerts"];
  const outRow = outs
    .map((o, i) => `<g class="up" ${d(2.9 + i * 0.1)}><rect x="${330 + i * 230}" y="${520}" width="214" height="40" rx="20" fill="${C.ink}"/><text x="${437 + i * 230}" y="${545}" text-anchor="middle" font-family="${MONO}" font-size="13" fill="${C.paper}">${o}</text></g>`)
    .join("");

  const style = `
  .pk { offset-rotate: 0deg; opacity: 0; animation: travel 5s cubic-bezier(.45,0,.3,1) infinite; }
  @keyframes travel { 0% { offset-distance: 0%; opacity: 0; } 4% { opacity: 1; } 18% { offset-distance: 100%; opacity: 1; } 20%,100% { offset-distance: 100%; opacity: 0; } }
  .stage { animation: glow 5s ease-in-out 3s infinite; }
  .s1 { animation-delay: 4s; } .s2 { animation-delay: 4s; } .s0 { animation-delay: 4s; }
  @keyframes glow { 0%,100% { stroke: ${C.ink}; } 20% { stroke: ${IUCN.CR}; } }`;

  return svg(W, H, "Data pipeline: 10 CoinMarketCap endpoints flow through a cached evidence ledger into three signals, a logistic model and an IUCN category", style, `
<text x="40" y="54" class="m fade" font-size="16" letter-spacing="3">HOW A STATUS IS DECIDED · DATA FLOWS LEFT TO RIGHT</text>
<text x="40" y="80" class="m fade" font-size="13">10 CoinMarketCap endpoints</text>
<text x="610" y="130" class="m fade" font-size="13">3 signals (today vs 6 and 12 months ago)</text>
<text x="1110" y="150" class="m fade" font-size="13">IUCN category</text>
${lines}
${pills}
${cache}
${sig}
${model}
${cats}
${packets}
<path d="M 1175 440 L 1175 500 L 437 500 L 437 520" fill="none" stroke="${C.rule}" stroke-width="2" stroke-dasharray="4 5"/>
<text x="445" y="492" class="m fade" font-size="13">rendered as</text>
${outRow}`);
}

/* ---------- 3. Calibration ---------- */
function calibration() {
  const W = 1280, H = 540;
  const order = ["LC", "NT", "VU", "EN", "CR"];
  const x0 = 110, y0 = 430, ph = 300, max = 0.8, gw = 150;
  const yv = (v) => y0 - (v / max) * ph;
  const grid = [0, 0.2, 0.4, 0.6, 0.8]
    .map((v) => `<line x1="${x0 - 10}" y1="${yv(v)}" x2="${x0 + gw * 5 + 10}" y2="${yv(v)}" stroke="${C.rule}" stroke-width="1"/><text x="${x0 - 18}" y="${yv(v) + 5}" text-anchor="end" class="m" font-size="13">${v * 100}%</text>`)
    .join("");
  const bars = order
    .map((s, i) => {
      const b = test.byStatus[s];
      const gx = x0 + i * gw + 22, bw = 46;
      const dl = 0.6 + i * 0.25;
      return `
<rect class="grow-y" ${d(dl)} x="${gx}" y="${yv(b.predicted)}" width="${bw}" height="${y0 - yv(b.predicted)}" fill="url(#hatch)" stroke="${C.ink}" stroke-width="1.2"/>
<rect class="grow-y" ${d(dl + 0.12)} x="${gx + bw + 8}" y="${yv(b.rate)}" width="${bw}" height="${y0 - yv(b.rate)}" fill="${IUCN[s]}" stroke="${C.ink}" stroke-width="1.2"/>
<g class="up" ${d(dl + 0.9)}><text x="${gx + bw / 2}" y="${yv(b.predicted) - 8}" text-anchor="middle" class="m" font-size="13">${pct(b.predicted)}</text>
<text x="${gx + bw * 1.5 + 8}" y="${yv(b.rate) - 8}" text-anchor="middle" class="t" font-size="17" font-weight="700">${pct(b.rate)}</text></g>
<text x="${gx + bw + 4}" y="${y0 + 26}" text-anchor="middle" font-family="${MONO}" font-size="15" font-weight="700" fill="${C.ink}">${s}</text>
<text x="${gx + bw + 4}" y="${y0 + 46}" text-anchor="middle" class="m" font-size="12">n = ${b.n.toLocaleString("en-US")}</text>`;
    })
    .join("");

  // Right panel: AUC against the rank-only baseline, and lift.
  const px = 960, pw = 270;
  const aucBar = (label, v, y, fill, dl) =>
    `<text x="${px}" y="${y - 8}" class="m" font-size="13">${label}</text><rect x="${px}" y="${y}" width="${pw}" height="20" fill="${C.card}" stroke="${C.rule}"/><rect class="grow-x" ${d(dl)} x="${px}" y="${y}" width="${(((v - 0.5) / 0.5) * pw).toFixed(1)}" height="20" fill="${fill}"/><text class="up" ${d(dl + 0.8)} x="${px + pw}" y="${y - 8}" text-anchor="end" font-family="${SERIF}" font-size="18" font-weight="700" fill="${C.ink}">${v.toFixed(3)}</text>`;

  return svg(W, H, `Backtest calibration on ${test.coinQuarters} unseen coin-quarters: predicted versus actual 12-month vanishing rate per category`, `
  .hl { animation: hl 3s ease-in-out 4s infinite; }
  @keyframes hl { 50% { opacity: .55; } }`, `
<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="${C.card}"/><line x1="0" y1="0" x2="0" y2="7" stroke="${C.muted}" stroke-width="2"/></pattern></defs>
<text x="40" y="54" class="m fade" font-size="16" letter-spacing="3">TESTED ON YEARS THE MODEL NEVER SAW · ${month(test.from).toUpperCase()} TO ${month(test.to).toUpperCase()}</text>
<text x="40" y="88" class="t fade" font-size="26" font-weight="700">Share of coins that actually left CMC's top 3,000 within 12 months</text>
<g class="fade" ${d(0.3)}><rect x="${x0}" y="104" width="16" height="12" fill="url(#hatch)" stroke="${C.ink}"/><text x="${x0 + 24}" y="115" class="m" font-size="13">predicted by the model</text>
<rect x="${x0 + 210}" y="104" width="16" height="12" fill="${IUCN.EN}" stroke="${C.ink}"/><text x="${x0 + 234}" y="115" class="m" font-size="13">actually vanished</text></g>
${grid}
${bars}
<line x1="${px - 40}" y1="130" x2="${px - 40}" y2="480" stroke="${C.rule}"/>
<text x="${px}" y="150" class="m fade" font-size="14" letter-spacing="2">RANKING POWER (AUC)</text><text x="${px}" y="300" class="m fade" font-size="12">bars start at 0.5 = a coin flip</text>
${aucBar("Red List model", test.auc, 190, IUCN.CR, 1.8)}
${aucBar("market rank alone", test.aucRankOnly, 250, C.muted, 2.0)}
<g class="up" ${d(2.6)}><text x="${px}" y="340" class="t hl" font-size="58" font-weight="700" fill="${IUCN.CR}">${test.riskiestTenth.lift.toFixed(1)}×</text>
<text x="${px}" y="366" class="m" font-size="13">riskiest tenth vanished ${pct(test.riskiestTenth.rate)}</text>
<text x="${px}" y="386" class="m" font-size="13">vs a ${pct(test.baseRate)} base rate</text></g>
<g class="up" ${d(3.0)}><text x="${px}" y="440" class="t" font-size="36" font-weight="700">8 of 10</text>
<text x="${px}" y="464" class="m" font-size="13">coins named on 15 Nov 2022 vanished</text></g>`);
}

/* ---------- 4. Red List Index ---------- */
function rli() {
  const W = 1280, H = 460;
  const pts = r.cohorts.map((c) => ({ t: Date.parse(c.date), v: c.rli, date: c.date }));
  const t0 = pts[0].t, t1 = pts.at(-1).t;
  const x0 = 90, x1 = 1190, ylo = 0.86, yhi = 1.0, yt = 120, yb = 380;
  const X = (t) => x0 + ((t - t0) / (t1 - t0)) * (x1 - x0);
  const Y = (v) => yb - ((v - ylo) / (yhi - ylo)) * (yb - yt);
  const path = pts.map((p, i) => `${i ? "L" : "M"} ${X(p.t).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(" ");
  const band = (from, to, label, fill, dl) => {
    const a = X(Date.parse(from)), b = X(Date.parse(to));
    return `<g class="fade" ${d(dl)}><rect x="${a}" y="${yt}" width="${b - a}" height="${yb - yt}" fill="${fill}"/><text x="${a + 8}" y="${yt + 18}" class="m" font-size="12" letter-spacing="1">${label}</text></g>`;
  };
  const years = [];
  for (let y = 2020; y <= 2026; y++) {
    const x = X(Date.parse(`${y}-01-01`));
    years.push(`<line x1="${x}" y1="${yb}" x2="${x}" y2="${yb + 6}" stroke="${C.muted}"/><text x="${x}" y="${yb + 24}" text-anchor="middle" class="m" font-size="13">${y}</text>`);
  }
  const grid = [0.88, 0.92, 0.96, 1.0]
    .map((v) => `<line x1="${x0}" y1="${Y(v)}" x2="${x1}" y2="${Y(v)}" stroke="${C.rule}"/><text x="${x0 - 12}" y="${Y(v) + 4}" text-anchor="end" class="m" font-size="12">${v.toFixed(2)}</text>`)
    .join("");
  const dots = pts.map((p, i) => `<circle class="pop" ${d(0.6 + (i / pts.length) * 2.6)} cx="${X(p.t).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.6" fill="${C.ink}"/>`).join("");
  const nov22 = pts.find((p) => p.date === "2022-11-15");
  const last = pts.at(-1);

  return svg(W, H, "The Crypto Red List Index, 2019 to today, with training and test periods marked", `
  .draw { stroke-dasharray: 1; stroke-dashoffset: 0; animation: draw 3.2s cubic-bezier(.4,0,.2,1) .6s both; }
  @keyframes draw { from { stroke-dashoffset: 1; } }
  .beat { transform-box: fill-box; transform-origin: center; animation: beat 2s ease-out 4s infinite; }
  @keyframes beat { 0% { opacity: .9; transform: scale(1); } 80%,100% { opacity: 0; transform: scale(3); } }`, `
<text x="40" y="54" class="m fade" font-size="16" letter-spacing="3">THE CRYPTO RED LIST INDEX · ONE HEALTH NUMBER FOR THE MARKET</text>
<text x="40" y="88" class="t fade" font-size="24" font-weight="700">1.000 = every coin Least Concern. Quarterly, ${month(pts[0].date)} to ${month(last.date)}.</text>
${band(r.model.train.from, r.model.train.to, "TRAINED ON", "#ebe4d3", 0.3)}
${band(test.from, test.to, "TESTED ON (UNSEEN)", "#f6dcd5", 0.45)}
${grid}
${years.join("")}
<path class="draw" pathLength="1" d="${path}" fill="none" stroke="${C.ink}" stroke-width="2.6" stroke-linejoin="round"/>
${dots}
<g class="up" ${d(3.2)}><line x1="${X(nov22.t)}" y1="${Y(nov22.v) + 8}" x2="${X(nov22.t)}" y2="${yb - 40}" stroke="${IUCN.CR}" stroke-width="1.5" stroke-dasharray="3 3"/>
<circle cx="${X(nov22.t)}" cy="${Y(nov22.v)}" r="6" fill="none" stroke="${IUCN.CR}" stroke-width="2"/>
<text x="${X(nov22.t) + 8}" y="${yb - 28}" font-family="${SERIF}" font-size="15" font-weight="700" fill="${IUCN.CR}">15 Nov 2022: 8 of the 10 coins it named vanished within a year</text></g>
<circle class="beat motion" cx="${X(last.t)}" cy="${Y(last.v)}" r="6" fill="${IUCN.CR}"/>
<g class="up" ${d(3.8)}><circle cx="${X(last.t)}" cy="${Y(last.v)}" r="6" fill="${IUCN.CR}"/>
<text x="${X(last.t) - 10}" y="${Y(last.v) + 30}" text-anchor="end" font-family="${MONO}" font-size="13" fill="${C.ink}">${month(last.date)}: ${last.v.toFixed(3)}</text></g>`);
}

const out = { "docs/banner.svg": banner(), "docs/pipeline.svg": pipeline(), "docs/calibration.svg": calibration(), "docs/rli.svg": rli() };
for (const [file, body] of Object.entries(out)) {
  writeFileSync(new URL(`../${file}`, import.meta.url), body);
  console.log(`${file}: ${(body.length / 1024).toFixed(1)} KB`);
}

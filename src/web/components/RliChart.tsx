/**
 * The Crypto Red List Index over time (like the UN's SDG 15.5.1 chart), with
 * CMC's Fear & Greed Index on a second axis from mid-2023. Server-rendered SVG.
 */
export interface RliPoint {
  date: string;
  rli: number;
  live?: boolean;
}

export interface FgPoint {
  date: string;
  value: number;
}

const W = 760;
const H = 260;
const PAD = { l: 44, r: 40, t: 16, b: 30 };

export function RliChart({ points, fg = [], compact = false }: { points: RliPoint[]; fg?: FgPoint[]; compact?: boolean }) {
  if (points.length < 2) return null;
  const t = (d: string) => Date.parse(d);
  const x0 = t(points[0]!.date);
  const x1 = t(points.at(-1)!.date);
  const vals = points.map((p) => p.rli);
  const lo = Math.floor((Math.min(...vals) - 0.01) * 50) / 50;
  const hi = Math.min(1, Math.ceil((Math.max(...vals) + 0.01) * 50) / 50);
  const h = compact ? 120 : H;
  const x = (d: string) => PAD.l + ((t(d) - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (h - PAD.t - PAD.b);
  const yFg = (v: number) => PAD.t + (1 - v / 100) * (h - PAD.t - PAD.b);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.rli).toFixed(1)}`).join(" ");
  const fgIn = fg.filter((f) => t(f.date) >= x0 && t(f.date) <= x1);
  const fgPath = fgIn.map((f, i) => `${i ? "L" : "M"}${x(f.date).toFixed(1)},${yFg(f.value).toFixed(1)}`).join(" ");
  const years = [];
  for (let yr = new Date(x0).getUTCFullYear() + 1; yr <= new Date(x1).getUTCFullYear(); yr++) years.push(yr);
  const ticks = compact ? [lo, hi] : [lo, (lo + hi) / 2, hi];

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={`Red List Index from ${points[0]!.date} (${vals[0]!.toFixed(3)}) to ${points.at(-1)!.date} (${vals.at(-1)!.toFixed(3)})`}>
      {ticks.map((v) => (
        <g key={v}>
          <line className="axis" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
          <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end">{v.toFixed(2)}</text>
        </g>
      ))}
      {years.map((yr) => (
        <text key={yr} x={x(`${yr}-01-01`)} y={h - 8} textAnchor="middle">{yr}</text>
      ))}
      {fgPath ? (
        <>
          <path className="fg-line" d={fgPath} />
          {!compact ? (
            <>
              <text x={W - PAD.r + 6} y={yFg(100) + 4}>100</text>
              <text x={W - PAD.r + 6} y={yFg(0) + 4}>0</text>
            </>
          ) : null}
        </>
      ) : null}
      <path className="rli-line" d={path} />
      {points.map((p) => (
        <circle key={p.date} className={`dot${p.live ? " live" : ""}`} cx={x(p.date)} cy={y(p.rli)} r={p.live ? 5 : compact ? 2 : 3}>
          <title>{`${p.date}: ${p.rli.toFixed(3)}${p.live ? " (live)" : ""}`}</title>
        </circle>
      ))}
    </svg>
  );
}

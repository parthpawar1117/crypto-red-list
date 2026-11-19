import type { RedListStatus } from "../../redlist/assess";
import type { StatusCounts } from "../../redlist/rli";
import { ORDERED, STATUS } from "../status";

export function StatusChip({ status, title }: { status: RedListStatus; title?: boolean }) {
  const m = STATUS[status];
  return (
    <span className="chip" style={{ background: m.color, color: m.ink }} title={m.name} aria-label={m.name}>
      {status}
      {title ? <span style={{ fontWeight: 400, marginLeft: 6 }}>{m.name}</span> : null}
    </span>
  );
}

/** The IUCN category scale with the coin's category highlighted. */
export function StatusScale({ status }: { status: RedListStatus }) {
  const steps: RedListStatus[] = ["CR", "EN", "VU", "NT", "LC"];
  const off = status === "DD" || status === "NE";
  return (
    <div className="scale" role="img" aria-label={`Status: ${STATUS[status].name}`}>
      {steps.map((s, i) => (
        <span key={s} style={{ display: "contents" }}>
          {i > 0 ? <span className="scale-line" /> : null}
          <span className={`scale-dot${s === status ? " on" : ""}`} style={{ background: STATUS[s].color, color: STATUS[s].ink }}>
            {s}
          </span>
        </span>
      ))}
      {off ? (
        <>
          <span className="scale-line" />
          <span className="scale-dot on" style={{ background: STATUS[status].color, color: STATUS[status].ink }}>
            {status}
          </span>
        </>
      ) : null}
    </div>
  );
}

/** One horizontal bar: how the 500 coins split across categories. */
export function CensusBar({ counts }: { counts: StatusCounts }) {
  const total = ORDERED.reduce((s, k) => s + counts[k], 0) || 1;
  return (
    <div className="census">
      <div className="census-bar" role="img" aria-label={ORDERED.map((k) => `${counts[k]} ${STATUS[k].name}`).join(", ")}>
        {ORDERED.map((k) =>
          counts[k] ? <span key={k} style={{ width: `${(100 * counts[k]) / total}%`, background: STATUS[k].color }} title={`${STATUS[k].name}: ${counts[k]}`} /> : null,
        )}
      </div>
      <div className="legend">
        {ORDERED.map((k) => (
          <span key={k} className="legend-item">
            <span className="swatch" style={{ background: STATUS[k].color }} />
            <span className="num">{counts[k]}</span> {STATUS[k].name}
          </span>
        ))}
      </div>
    </div>
  );
}

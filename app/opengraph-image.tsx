/** The share card (X, LinkedIn, DoraHacks): today's Index and census, generated from live data. */
import { ImageResponse } from "next/og";
import { getCachedRedList } from "@/live/cached";
import { ORDERED, STATUS } from "@/web/status";

export const revalidate = 21600;
export const alt = "The Crypto Red List: extinction-risk status for the top 500 cryptocurrencies";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const list = await getCachedRedList();
  const total = ORDERED.reduce((s, k) => s + list.counts[k], 0) || 1;
  const threatened = list.counts.CR + list.counts.EN + list.counts.VU;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f4f0e6", color: "#1d1a16", padding: "60px 70px", fontFamily: "Georgia, serif" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 24, letterSpacing: 4, color: "#776f62", fontFamily: "monospace" }}>ASSESSMENT OF THE TOP 500 CRYPTOCURRENCIES</div>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3, marginTop: 10 }}>The Crypto Red List</div>
          <div style={{ fontSize: 34, color: "#4a443b", marginTop: 6 }}>Which coins are heading for extinction? Measured, not guessed.</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 60 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, color: "#776f62", fontFamily: "monospace" }}>RED LIST INDEX</div>
            <div style={{ fontSize: 120, lineHeight: 1, fontWeight: 700 }}>{list.rli?.toFixed(3) ?? "–"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 30, marginBottom: 14 }}>{`${threatened} coins threatened today`}</div>
            <div style={{ display: "flex", height: 44, border: "2px solid #1d1a16", borderRadius: 6, overflow: "hidden" }}>
              {ORDERED.filter((k) => list.counts[k]).map((k) => (
                <div key={k} style={{ width: `${(100 * list.counts[k]) / total}%`, background: STATUS[k].color }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 22, fontFamily: "monospace", color: "#4a443b" }}>
              {(["CR", "EN", "VU", "NT", "LC"] as const).map((k) => (
                <span key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 8, background: STATUS[k].color, border: "1px solid #1d1a16" }} />
                  {`${k} ${list.counts[k]}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

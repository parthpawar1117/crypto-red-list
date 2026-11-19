import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"], display: "swap" });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Crypto Red List", template: "%s · Crypto Red List" },
  description:
    "An IUCN-style extinction-risk list for the top 500 cryptocurrencies: each coin's measured chance of vanishing within 12 months, built on CoinMarketCap data and tested on years the model never saw.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f0e6" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
};

function Mark() {
  // Five category dots, CR to LC: the IUCN scale in miniature.
  const colors = ["#d81e05", "#fc7f3f", "#f9e814", "#cce226", "#60c659"];
  return (
    <svg className="brand-mark" viewBox="0 0 26 26" aria-hidden="true">
      {colors.map((c, i) => (
        <circle key={c} cx={13 + 9 * Math.cos((i / 5) * 2 * Math.PI - Math.PI / 2)} cy={13 + 9 * Math.sin((i / 5) * 2 * Math.PI - Math.PI / 2)} r="3.6" fill={c} stroke="currentColor" strokeWidth="0.6" />
      ))}
    </svg>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <header className="site-head">
          <div className="wrap">
            <Link href="/" className="brand">
              <Mark />
              Crypto Red List
            </Link>
            <nav className="nav" aria-label="Main">
              <Link href="/">The list</Link>
              <Link href="/time-machine">Time machine</Link>
              <Link href="/method">How it works</Link>
              <a href="/api/redlist">API</a>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-foot">
          <div className="wrap">
            <span>
              Data: CoinMarketCap API (<code className="mono">listings/latest</code>, <code className="mono">listings/historical</code>,{" "}
              <code className="mono">cryptocurrency/info</code>, <code className="mono">fear-and-greed/historical</code>).
            </span>
            <span>An early-warning tool for coins that may disappear, not a price prediction and not financial advice.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

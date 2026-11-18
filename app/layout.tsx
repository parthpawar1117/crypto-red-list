import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crypto Red List",
  description:
    "Which cryptocurrencies are at risk of disappearing? An extinction-risk list for the top 500 coins, built on CoinMarketCap's historical census.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

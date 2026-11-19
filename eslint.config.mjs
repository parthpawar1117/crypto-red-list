import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    // Coin logos are 64px images served by CoinMarketCap's CDN; next/image
    // optimisation would add Vercel image costs for no visible gain.
    rules: { "@next/next/no-img-element": "off" },
  },
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "next-env.d.ts"],
  },
];

export default config;

# CoinMarketCap API feedback

Everything below was observed in real responses while building the Crypto Red List (Nov 2026), and each issue has a test or a code comment in this repo.

## What the API made possible

- **The historical listings census is the whole project.** `/v1/cryptocurrency/listings/historical` returns point-in-time snapshots *including coins that later died*. That is what makes an honest, survivorship-free backtest possible: 33 quarterly snapshots of the top 3,000 (2018–2026) for about 1,000 credits.
- **`num_market_pairs` over time is a powerful signal.** Losing exchange pairs turned out to be one of the strongest early warnings of a coin disappearing.
- **`status.credit_count` on every response** let us log the exact cost of each call as evidence, and prove the live site fits the free Basic plan (~8.2k credits/month worst case).
- **`/v1/key/info` costing 0 credits** made a live budget meter free.
- **CMC100 history with constituents** (`/v3/index/cmc100-historical`) enabled both a benchmark and the "threatened inside the CMC100" view.

## Where it got in the way

1. **Live and historical listings cover different universes, undocumented.** `/v1/cryptocurrency/listings/latest` now leaves out tokens tagged `rehypothecated-crypto` (stETH, WBTC, WETH, JitoSOL, USDT0…), but `/listings/historical` still includes them. A model trained on history silently rates ~80 extra tokens that the live list never shows. We now drop them everywhere (`isDerivative` in `src/redlist/census.ts`). *Request:* document the filter, or add a parameter to apply it to both.
2. **`volume_24h: 0` is ambiguous.** Since late 2025, many healthy coins (ICON, CoinEx Token, DAR…) report exactly 0 volume in both latest and historical listings. Until 2025, zero volume almost always meant a dying coin; in the Nov 2025 cohort only 1 of 16 vanished. *Request:* return `null` (or a flag) when volume is not tracked, instead of 0.
3. **Stablecoin tags are incomplete.** eUSD, USDon and USX trade at $1 without a `stablecoin` tag. We added a backup rule (dollar-like name and price within 2% of $1).
4. **`/v3/index/cmc100-historical` limits** are strict and only discoverable through errors: `count` must be 1–10, `interval` only `5m | 15m | daily`, and history starts Feb 2024. A date range with `count=1` works for point lookups.
5. **`/v1/altcoin-season-index/historical`** only offers 7 / 30 / 90-day windows, so it cannot be used for multi-year context.
6. **`/v2/cryptocurrency/market-pairs/latest` is not on Basic,** so the site cannot show *which* exchanges dropped a coin, only how many pairs it lost.
7. **DEX endpoints were unreliable during testing:** `/v4/dex/security/detail` and `/v1/dex/token` repeatedly answered "The system is busy, please try again later!" (HTTP 200 with no data), so we left DEX features out rather than risk a broken demo.
8. **No CORS and no read-only keys,** so every call must go through a server (we cache server-side and serve one shared copy).

## Small things that would help

- A `cryptocurrency_type` / `tag` exclusion parameter on `listings/historical`, matching `listings/latest`.
- A documented "first available date" per historical endpoint.
- A sandbox key with fixed responses, for tests and CI.

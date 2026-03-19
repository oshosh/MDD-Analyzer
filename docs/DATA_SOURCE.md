# Data Source

## Automatic ticker flow

- Input ticker in UI (e.g. `SPY`, `005930`, `GCW00`, `BTCUSD`)
- Client calls `GET /api/listing?symbol=...` and sets `from` to the listing date when ticker changes
- Server calls `/api/raw`
- `/api/raw` builds RAW rows and computes MDD / recovery / cumulative stats

## Provider priority

1. `INVESTING_PROXY_URL` (if set)
2. Yahoo Finance public chart/search endpoints (default fallback)

## Why proxy is needed for direct Investing

Direct requests to `www.investing.com` are often blocked by Cloudflare anti-bot challenge (`403`).  
If you need true Investing-origin data in production, provide a server-side proxy endpoint and set:

```bash
INVESTING_PROXY_URL=https://your-proxy.example.com
```

Proxy endpoint contract:

- `GET /search?q=...` -> `{ rows: Instrument[] }`
- `GET /prices?asset=...&symbol=...&from=...&to=...&interval=...` -> `{ rows: PriceCandle[] }`
- `GET /fx?pair=USDKRW&from=...&to=...&interval=...` -> `{ rows: FxPoint[] }`
- `GET /listing?asset=...&symbol=...` -> `{ listing_date: string }`

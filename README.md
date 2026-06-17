# trendlens-ai — Fashion Marketing Intelligence

A marketing analytics platform for fashion ecommerce. Upload campaign performance data and get
KPI analysis, statistically-tested channel comparisons, revenue forecasting with uncertainty
bands, and AI-generated recommendations.

Originally built in Lovable on a TanStack Start + Supabase stack; this is a portable rebuild that
keeps the exact KPI math and adds an analytics layer. It runs **fully client-side** (React + Vite +
Tailwind + Recharts + PapaParse) with no backend or cloud account required.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # run the analytics test suite (20 tests)
npm run build     # type-check + production build
```

Loads with a deterministic 70-row sample dataset (7 channels x 10 months of 2025, with built-in
seasonal spikes) so every page is populated immediately. Your own data persists in localStorage.

## Analytical features

### KPI engine
CTR, CPC, CPA, conversion rate, ROAS, ROI and profit, computed at portfolio and per-channel level,
with divide-by-zero guards and period-over-period deltas. Fully unit-tested.

### Statistical significance testing (/channels)
Each channel's conversion rate is compared against the rest of the portfolio with a
two-proportion z-test (leave-one-out, alpha = 0.05). The UI distinguishes:
- Significantly higher / lower (with p-value) - difference unlikely to be noise
- Not significant - directional only
- Too few clicks - sample fails the normal-approximation power check

This separates real performance gaps from random variation - the difference between "Influencer
converts better" and "Influencer converts significantly better (p < 0.001)."

### Forecasting (/forecasting)
OLS linear trend with a 95% prediction interval derived from historical residual standard error
(widening with horizon). Reports model fit (R2) and flags short histories as unreliable. A separate
seasonal index describes which calendar months over/under-index against trend - explicitly labeled
descriptive, because true seasonal modeling needs 2+ years of data.

### AI recommendations (/insights)
Two engines behind one interface:
- Deterministic rule engine (default, always available) - transparent, reproducible heuristics over
  the KPI and significance results.
- Live LLM engine (opt-in) - bring your own Groq, Anthropic, or OpenAI key in Settings (Groq is the default - free, fast, OpenAI-compatible). The model receives
  a compact numeric summary including the z-test results and is instructed to only call differences
  significant when the tests say so. Falls back to the rule engine on any error.

### Data import with validation (/upload)
A ready-to-test file, sample-campaigns.csv, is included in the project root. The importer is forgiving: Drag-and-drop CSV, parsed in-browser, with a validation report shown before committing: missing
columns, non-numeric values, malformed dates, negative values, and duplicate campaign IDs are all
surfaced. Nothing is imported until you review and confirm.

## Pages

| Route | Purpose |
|-------|---------|
| / | Executive dashboard - volume + efficiency KPIs, channel charts, monthly trends, top insights |
| /executive | Plain-language portfolio summary with top/bottom channels |
| /channels | Channel comparison + conversion-rate significance tests |
| /campaigns | Searchable, sortable campaign explorer with CSV export |
| /audience | Impression to click to lead to conversion funnel |
| /forecasting | Revenue projection with confidence bands + seasonal index |
| /insights | AI / rule-based recommendations with category filter + export |
| /upload | Validated CSV import with preview-and-confirm |
| /settings | AI provider config + data management |
| /about | Project overview |

## CSV format

Download the template from the Upload page, or match these headers:

```
CampaignID,StartDate,EndDate,Channel,Impressions,Clicks,Leads,Conversions,Cost_USD,Revenue_USD,ROI
CMP-001,2025-06-01,2025-06-30,Google Ads,20000,420,80,38,540.50,2300,325.5
```

## Project structure

```
src/
  lib/
    kpis.ts          KPI + rule-based insight engine (pure, tested)
    stats.ts         two-proportion z-test, normal CDF (pure, tested)
    forecast.ts      OLS trend, prediction intervals, seasonal index (pure, tested)
    llm.ts           BYOK LLM client (Anthropic + OpenAI) with JSON parsing
    llm-config.ts    provider/key/model in sessionStorage
    store.tsx        client-side data store + CSV parsing/validation
    filters.tsx      global channel + date filters
    format.ts        currency/number/percent formatters
    sample-data.ts   deterministic seed dataset
  components/         UI primitives, sidebar, layout, KPI card, filters
  pages/             one file per route
  lib/__tests__/     vitest suites (kpis, stats, forecast)
```

## Security note on BYOK

The LLM API key is stored only in sessionStorage (cleared when the tab closes) and sent directly
from the browser to the provider. This is fine for a local/demo tool, but browser-side calls expose
the key to the page and can hit CORS/rate limits. A production deployment should proxy LLM requests
through a backend so the key is never client-side.

## What changed from the Lovable original

- Supabase backend -> client-side store with sample data, localStorage, and a validated in-browser
  CSV importer (the original's upload was server/admin-only).
- File-based TanStack routing -> react-router-dom.
- Full shadcn/Radix component set -> a small set of Tailwind primitives (same visual design).
- Added: significance testing, forecast confidence bands + seasonality, live LLM insights, CSV
  validation, and a unit-test suite. The original KPI and rule-insight logic is reused unchanged.

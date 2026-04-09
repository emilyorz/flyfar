# SPEC.md — flyfar

> Flight search CLI — fly far, pay less.
> AI-friendly JSON output + human-friendly table display.

## Overview

TypeScript CLI tool that queries Google Flights via protobuf RPC, parses structured flight data, and outputs results as JSON (for AI agents) or formatted tables (for humans).

Replaces the Python `fast-flights` library with a more robust, maintainable implementation.

## Architecture

```
flyfar/
├── src/
│   ├── cli.ts          — CLI entry (commander)
│   ├── commands/
│   │   ├── search.ts   — search command handler
│   │   └── cheapest.ts — date range cheapest search
│   ├── core/
│   │   ├── query.ts    — protobuf query builder
│   │   ├── fetch.ts    — HTTP client + retry + timeout
│   │   └── parse.ts    — response parser (defensive index access)
│   ├── output/
│   │   ├── json.ts     — JSON output formatter
│   │   └── table.ts    — human-readable table formatter
│   └── types.ts        — all type definitions (zod schemas + TS types)
├── tests/
│   ├── parse.test.ts   — parser unit tests with fixture data
│   ├── query.test.ts   — query builder tests
│   └── cli.test.ts     — CLI integration tests
├── package.json
├── tsconfig.json
└── README.md
```

## CLI Interface

### search — Single route query

```bash
# Human mode (default): colored table output
flyfar search --from TPE --to NRT --date 2026-04-25

# AI mode: structured JSON to stdout
flyfar search --from TPE --to NRT --date 2026-04-25 --json

# Round trip
flyfar search --from TPE --to NRT --date 2026-04-25 --return 2026-05-01

# Multi-city
flyfar search --route TPE,NRT,KIX,TPE --dates 2026-04-25,2026-04-30,2026-05-03

# Filters
flyfar search --from TPE --to NRT --date 2026-04-25 --direct --airline EVA,Peach --seat economy --passengers 2
```

### cheapest — Date range lowest price scan

```bash
# Scan a date range, find cheapest departure dates
flyfar cheapest --from TPE --to NRT --range 2026-04-20 2026-04-30

# With return leg
flyfar cheapest --from TPE --to NRT --range 2026-04-20 2026-04-30 --stay 5

# JSON output
flyfar cheapest --from TPE --to NRT --range 2026-04-20 2026-04-30 --json
```

## Output Modes

### Human mode (default)

- Colored table via `chalk` + `cli-table3` or similar
- Progress spinner on stderr during fetch
- Price trend indicator (🟢 low / ⚪ typical / 🔴 high)
- Summary with cheapest combo + total price

### AI mode (`--json`)

- Structured JSON to stdout, logs/progress to stderr
- Schema:

```json
{
  "query": { "from": "TPE", "to": "NRT", "date": "2026-04-25" },
  "trend": "low",
  "flights": [
    {
      "airline": "EVA Air",
      "departure": { "time": "08:30", "date": "2026-04-25", "airport": "TPE" },
      "arrival": { "time": "12:45", "date": "2026-04-25", "airport": "NRT" },
      "duration_minutes": 195,
      "stops": 0,
      "price": { "amount": 6087, "currency": "TWD" },
      "segments": [...]
    }
  ],
  "metadata": { "fetched_at": "2026-04-09T21:48:00Z", "source": "google-flights" }
}
```

## Exit Codes

- `0` — success, flights found
- `1` — success, no flights matched filters
- `2` — network/parse error

## Technical Decisions

### Query Layer
- Use `protobufjs` to build Google Flights `tfs` parameter
- Proto definition reverse-engineered from fast-flights' Python protobuf
- Support: one-way, round-trip, multi-city

### Fetch Layer
- `undici` or native `fetch` for HTTP
- Browser impersonation via TLS fingerprint (same approach as primp in Python)
- Retry: 3 attempts, exponential backoff (1s, 2s, 4s)
- Timeout: 15s per request
- Optional proxy support (`--proxy`)

### Parse Layer
- Parse Google Flights' embedded JSON (script tag with class `ds:1`)
- **Defensive index access**: every array index wrapped in bounds check
- Meaningful error messages: "Google Flights response structure changed at payload[3][0]" instead of "TypeError: Cannot read undefined"
- Save raw response to `/tmp/flyfar-debug-{timestamp}.html` on parse failure for debugging

### Validation
- `zod` schemas for CLI input validation
- `zod` schemas for parsed response validation (catch structural changes early)

## Airline Aliases

Support Chinese + English aliases for common Taiwan routes:
EVA/長榮, CI/華航, starlux/星宇, peach/樂桃, scoot/酷航, tigerair/虎航, jal/日航, ana/全日空, jetstar/捷星, cathay/國泰

## Dependencies

- `commander` — CLI framework
- `protobufjs` — protobuf encoding
- `zod` — runtime validation
- `chalk` — terminal colors
- `cli-table3` — table formatting
- `undici` — HTTP client (if native fetch insufficient)

Dev:
- `typescript` — strict mode
- `vitest` — testing
- `tsup` — bundling

## Non-Goals (Phase 1)

- Price alert / monitoring (Phase 2: cron + SQLite + Telegram notify)
- Web UI
- Booking / redirect to airline
- Scraping Skyscanner / Kayak

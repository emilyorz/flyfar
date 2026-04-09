# FlyFar (飛太遠)

Flight search CLI — fly far, pay less. By Sam Lee / Emily.

Query Google Flights from the terminal. Outputs colored tables for humans, structured JSON for AI agents.

## Install

```bash
git clone https://github.com/emilyorz/flyfar.git
cd flyfar
npm install
npm run build
```

Or run directly without building:

```bash
npx tsx src/cli.ts search --from TPE --to NRT --date 2026-04-25
```

## Usage

### Search flights

```bash
# One-way
flyfar search --from TPE --to NRT --date 2026-04-25

# Round trip
flyfar search --from TPE --to NRT --date 2026-04-25 --return 2026-05-01

# Direct flights only
flyfar search --from TPE --to NRT --date 2026-04-25 --direct

# Filter by airline (supports aliases: EVA, CI, Peach, Scoot, etc.)
flyfar search --from TPE --to NRT --date 2026-04-25 --airline EVA,Peach

# Business class, 2 passengers
flyfar search --from TPE --to NRT --date 2026-04-25 --seat business --passengers 2

# JSON output (for AI agents / piping)
flyfar search --from TPE --to NRT --date 2026-04-25 --json
```

### Multi-city

```bash
flyfar multi --route TPE,NRT,KIX,TPE --dates 2026-04-25,2026-04-30,2026-05-03
```

### Cheapest dates

```bash
# Scan a date range for cheapest one-way
flyfar cheapest --from TPE --to NRT --range 2026-04-20 2026-04-30

# With return leg (5-day stay)
flyfar cheapest --from TPE --to NRT --range 2026-04-20 2026-04-30 --stay 5

# JSON output
flyfar cheapest --from TPE --to NRT --range 2026-04-20 2026-04-30 --json
```

### Common options

| Flag | Description | Default |
|------|-------------|---------|
| `--json` | Structured JSON output | `false` |
| `--currency <code>` | Currency (TWD, USD, JPY, etc.) | `TWD` |
| `--language <code>` | Language code | `en-US` |
| `--proxy <url>` | HTTP proxy URL | none |

### Airline aliases

Supports Chinese and English aliases for common Taiwan routes:

| Alias | IATA | Alias | IATA |
|-------|------|-------|------|
| EVA / 長榮 | BR | CI / 華航 | CI |
| starlux / 星宇 | JX | peach / 樂桃 | MM |
| scoot / 酷航 | TR | tigerair / 虎航 | IT |
| jal / 日航 | JL | ana / 全日空 | NH |
| jetstar / 捷星 | GK | cathay / 國泰 | CX |

## JSON output schema

When using `--json`, output goes to stdout (progress/errors to stderr):

```json
{
  "query": { "from": "TPE", "to": "NRT", "date": "2026-04-25" },
  "flights": [
    {
      "type": "BR",
      "airlines": ["EVA Air"],
      "price": { "amount": 9247, "currency": "TWD" },
      "durationMinutes": 200,
      "stops": 0,
      "segments": [
        {
          "airline": "EVA Air",
          "fromAirport": { "code": "TPE", "name": "Taiwan Taoyuan International Airport" },
          "toAirport": { "code": "NRT", "name": "Narita International Airport" },
          "departure": { "date": "2026-04-25", "time": "15:20" },
          "arrival": { "date": "2026-04-25", "time": "19:40" },
          "durationMinutes": 200,
          "planeType": "Boeing 787-9 Dreamliner"
        }
      ]
    }
  ],
  "metadata": {
    "fetchedAt": "2026-04-09T13:00:00Z",
    "source": "google-flights"
  }
}
```

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success, flights found |
| 1 | Success, no flights matched |
| 2 | Error (network, parse, validation) |

## How it works

1. Encodes search parameters as a protobuf binary (Google Flights' `tfs` URL parameter)
2. Fetches the Google Flights search results page with browser-like headers
3. Extracts the embedded JSON data from a `<script>` tag in the HTML response
4. Parses the deeply nested array structure into clean, typed objects
5. Outputs as either a colored table or structured JSON

Retry: 3 attempts with exponential backoff (1s, 2s, 4s). Timeout: 15s per request.

## Limitations

- Google may block requests without proper TLS fingerprinting. The CLI uses browser-like headers which works in practice, but Google could start blocking at any time.
- Response parsing depends on Google's internal data structure. If Google changes it, parsing will break with descriptive error messages and a debug HTML dump in `/tmp/`.
- The `cheapest` command makes one request per date, so scanning 30 days = 30 requests. Use responsibly.

## Development

```bash
# Run in dev mode
npx tsx src/cli.ts search --from TPE --to NRT --date 2026-04-25

# Build
npm run build

# Debug mode (shows stack traces)
DEBUG=1 npx tsx src/cli.ts search --from TPE --to NRT --date 2026-04-25
```

## License

ISC

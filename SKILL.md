# SKILL.md — flyfar

## Description

`flyfar` is a TypeScript CLI that searches Google Flights. It encodes queries as protobuf, fetches Google Flights HTML, parses the embedded JSON response, and outputs results as structured JSON or colored tables.

Primary use case: searching flights from Taiwan (TPE) to Japan and other destinations.

## Installation

```bash
cd /path/to/flyfar
npm install
npm run build
```

## Commands

### `flyfar search` — Search flights for a route

**Required flags:**
- `--from <IATA>` — Departure airport code (e.g., TPE)
- `--to <IATA>` — Arrival airport code (e.g., NRT, KIX, HND)
- `--date <YYYY-MM-DD>` — Departure date

**Optional flags:**
- `--return <YYYY-MM-DD>` — Return date (makes round-trip)
- `--direct` — Direct flights only
- `--airline <list>` — Comma-separated airline filter (e.g., `EVA,CI,Peach`)
- `--seat <type>` — economy | premium-economy | business | first (default: economy)
- `--passengers <n>` — Adult count, 1-9 (default: 1)
- `--json` — JSON output to stdout
- `--currency <code>` — Currency code (default: TWD)
- `--language <code>` — Language code (default: en-US)
- `--proxy <url>` — HTTP proxy

**Examples:**
```bash
# Basic one-way search
flyfar search --from TPE --to NRT --date 2026-04-25

# Round trip, JSON output
flyfar search --from TPE --to NRT --date 2026-04-25 --return 2026-05-01 --json

# Direct flights only, business class
flyfar search --from TPE --to NRT --date 2026-04-25 --direct --seat business

# Filter airlines
flyfar search --from TPE --to KIX --date 2026-04-25 --airline Peach,jetstar
```

### `flyfar multi` — Multi-city search

**Required flags:**
- `--route <codes>` — Comma-separated airport codes (e.g., TPE,NRT,KIX,TPE)
- `--dates <dates>` — Comma-separated dates, one per leg (N-1 dates for N airports)

**Optional flags:** `--seat`, `--passengers`, `--json`, `--currency`, `--language`, `--proxy`

**Example:**
```bash
flyfar multi --route TPE,NRT,KIX,TPE --dates 2026-04-25,2026-04-30,2026-05-03 --json
```

### `flyfar cheapest` — Find cheapest dates in a range

**Required flags:**
- `--from <IATA>` — Departure airport
- `--to <IATA>` — Arrival airport
- `--range <start> <end>` — Date range to scan

**Optional flags:**
- `--stay <days>` — Stay duration (adds return leg)
- `--json` — JSON output
- `--currency`, `--language`, `--proxy`

**Examples:**
```bash
# One-way cheapest dates
flyfar cheapest --from TPE --to NRT --range 2026-04-20 2026-04-30

# With 5-day return trip
flyfar cheapest --from TPE --to NRT --range 2026-04-20 2026-04-30 --stay 5 --json
```

## Output Format

### JSON output (`--json`)

All JSON goes to stdout. Progress and errors go to stderr.

**Search response:**
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
  "metadata": { "fetchedAt": "2026-04-09T13:00:00Z", "source": "google-flights" }
}
```

**Cheapest response:**
```json
{
  "query": { "from": "TPE", "to": "NRT", "rangeStart": "2026-04-20", "rangeEnd": "2026-04-30" },
  "dates": [
    { "date": "2026-04-20", "cheapestPrice": 5327, "currency": "TWD", "flightCount": 22 }
  ],
  "metadata": { "fetchedAt": "2026-04-09T13:00:00Z", "source": "google-flights" }
}
```

### Human output (default)

Colored table with airlines, departure/arrival times, duration, stops, and price. Prices are color-coded: green = cheap, white = mid, red = expensive.

## Exit Codes

- `0` — Flights found
- `1` — No flights matched
- `2` — Error (network, parse, or validation)

## Airline Aliases

Accepts these aliases in `--airline` flag (case-insensitive):

EVA/BR, CI/CI, starlux/JX, peach/MM, scoot/TR, tigerair/IT, jal/JL, ana/NH, jetstar/GK, cathay/CX

Also accepts Chinese: 長榮, 華航, 星宇, 樂桃, 酷航, 虎航, 日航, 全日空, 捷星, 國泰

## Common Workflows

**Find cheapest direct flight TPE to NRT next week:**
```bash
flyfar search --from TPE --to NRT --date 2026-04-25 --direct --json | jq '.flights | sort_by(.price.amount) | .[0]'
```

**Scan a month for cheapest round-trip with 5-day stay:**
```bash
flyfar cheapest --from TPE --to NRT --range 2026-05-01 2026-05-31 --stay 5 --json
```

**Compare multiple destinations:**
```bash
for dest in NRT KIX FUK OKA; do
  echo "=== TPE → $dest ==="
  flyfar search --from TPE --to $dest --date 2026-04-25 --json | jq '.flights[0].price'
done
```

## Development

```bash
# Run without building
npx tsx src/cli.ts search --from TPE --to NRT --date 2026-04-25

# Build
npm run build

# Run built version
node dist/cli.js search --from TPE --to NRT --date 2026-04-25
```

## Known Limitations

- Google may block requests without TLS fingerprinting. Works with plain fetch + browser headers in practice.
- Response parsing depends on Google's undocumented internal JSON structure.
- `cheapest` makes N sequential requests (one per date).

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
flyfar multi --route TPE,NRT,KIX,TPE --dates 2026-04-25,2026-04-30,2026-05-03

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

- `--range` 恰好接受兩個有效日曆日期，含起訖日；日期與 `--stay` 計算不受執行機器時區影響。

- `search --return` 不得早於出發日；`multi --dates` 數量須等於航段數，且日期不得倒退。

## Output Modes

### Human mode (default)

- Colored table via `chalk` + `cli-table3` or similar
- Progress spinner on stderr during fetch
- Price trend indicator (🟢 low / ⚪ typical / 🔴 high)
- Summary with cheapest combo + total price

### AI mode (`--json`)

- Structured JSON to stdout, logs/progress to stderr
- 現行 JSON 契約使用 camelCase，與 `src/types.ts`、README 及 CLI 保持相容；`--json` 優先於 `--output csv`、`--recommend`，不混入表格。
- Schema:

```json
{
  "query": { "from": "TPE", "to": "NRT", "date": "2026-04-25" },
  "flights": [
    {
      "type": "BR",
      "airlines": ["EVA Air"],
      "durationMinutes": 195,
      "stops": 0,
      "price": { "amount": 6087, "currency": "TWD" },
      "segments": [{
        "airline": "EVA Air",
        "fromAirport": { "code": "TPE", "name": "Taiwan Taoyuan International Airport" },
        "toAirport": { "code": "NRT", "name": "Narita International Airport" },
        "departure": { "time": "08:30", "date": "2026-04-25" },
        "arrival": { "time": "12:45", "date": "2026-04-25" },
        "durationMinutes": 195,
        "planeType": "Airbus A320"
      }]
    }
  ],
  "metadata": { "fetchedAt": "2026-04-09T21:48:00Z", "source": "google-flights" }
}
```

### 完整來回的相容契約

- `search --return` 保留 `flights[]` 原有去程資料與原始起價。每個候選新增 `returnOptions: FlightResult[]`，以 protobuf `FlightData.selected_flights`（field 4）選定去程的全部航段後查詢回程，不以獨立單程票價推算。

- `SelectedFlight` 編碼出發機場 field 1、出發日期 field 2、抵達機場 field 3、航空公司代碼 field 5、班號數字部分 field 6；其餘日期、座艙、旅客與篩選條件維持原查詢。

- 去程 `priceScope: "round-trip-from"` 表示 Google 來回起價；回程選項 `priceScope: "round-trip-total"` 的 `price` 為該去回程整組總價，不得相加。單程 search 為 `one-way`；既有 duration/stops 與排序／推薦語意不變，回程選項提供自己的航段時長與轉機數。

- 航段新增可靠解析的 `airlineCode`、`flightNumber`，保留完整日期與時間。每個候選的 `deepLink` 導向已選去程的回程選擇頁；不是保證可直接出票的訂位連結。

- 沒有已驗證的行李費用欄位時，JSON 為 `baggage: {"status":"unknown"}`，CSV 為 `baggage_status=unknown`，表格標示未知且不宣稱含行李總價。未知不得轉成零元或免費。

- CSV 原有前 14 欄及一個去程候選一列維持不變，新增 `price_scope,baggage_status,deep_link,segments,return_options`；後兩欄為 CSV 跳脫的 JSON。舊 `flight_number` 的 `type` 語意維持相容，不挪用該欄位。

- `cheapest` 每日結果新增 `returnDate`（有 stay 時）、`deepLink`、`priceScope`、`baggage`，保留原本日期／最低價／航班數。`--stay` 的連結包含去回程日期，但不額外逐候選展開回程。

- 每個去程候選新增一次回程請求，每批最多 5 個；任何回程請求失敗、缺可靠班號或回應機場／出發日期不符均退出 `2`。所有候選回程皆空則退出 `1`，保留原有去程與空選項，不虛構來回結果。

## Exit Codes

- `0` — success, flights found
- `1` — success, no flights matched filters
- `2` — network/parse/validation/usage error

- 三個命令共用此契約；`cheapest` 任一日期查詢失敗時以 `2` 結束，不把錯誤偽裝成「沒有航班」或輸出不完整的成功結果。

- Parser 同時讀取 `payload[2]` 與 `payload[3]`，整點時間缺少分鐘欄位代表 `00`，總時長採 Google 的行程時長（包含轉機等待）。

- 明確的空結果回傳空陣列；缺失或錯誤的容器、全部無法解析的航班屬解析錯誤，保存原始 HTML。個別壞資料會警告並略過，不丟棄其他有效航班。

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

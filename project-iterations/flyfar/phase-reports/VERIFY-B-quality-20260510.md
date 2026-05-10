# QUALITY-VERIFIER — flyfar v5 / 2026-05-10

**Status**: NEEDS_REWORK
**Abstract**: 兩個 P0 必要修復：CSV 輸出缺 Leg 欄位（csv.ts），recommend 評分演算法有 indexOf ranking bug（search.ts）。另有 P1 multi-city 回應缺少 deepLink，P2 buildFlightsParams 死碼。

---

## P0 — Must Fix

### P0-1: csv.ts 缺 Leg 欄位
- `csv.ts:18-37` flightToCsvRow() 只有首尾 segment，CSV 輸出無 Leg 欄位
- Feature 1 要求 CSV 也要有多 leg 支援

### P0-2: search.ts 評分 indexOf bug
- `search.ts:89-99` indexOf() 遇到相同價格/時間會錯誤計算 norm 值
- 相同 price 的多航班會得到錯誤的 normalized score

---

## P1 — Should Fix

### P1-1: multiCityCommand 缺少 deepLink
- `search.ts:180-186` multiCityCommand 的 output 分支沒有 deepLink
- JSON output 時無法取得多段行程的 Google Flights 連結

---

## P2 — Nice to Fix

### P2-1: query.ts:108-114 死碼
- buildFlightsParams 定義後從未呼叫

### P2-2: types.ts FlightResult.type
- 應為 union type 而非 string

---

**Verdict**: NEEDS_REWORK — 兩個 P0 必須修復才能 merge
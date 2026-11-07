# plan — kb-act-2543（A-002）

## 根因

`src/core/fetch.ts` 的 `fetchFlightsHtml`：

1. `options.proxy` 在函式內從未被讀取，`fetch()` 永遠直連。四個呼叫端（`cheapest.ts:53`、`search.ts:65,116,242`）都已傳入 `proxy`，缺口只在這一處。
2. `setTimeout(() => controller.abort(), TIMEOUT_MS)` 在 `await fetch()` 回來（檔頭到達）就 `clearTimeout`，之後 `await response.text()` 沒有任何計時保護，本文卡住會無限等。

RED（`repro-001`）：測試 1 `tunnels.length` 為 0（沒有任何 CONNECT 到假代理）；測試 2 本文卡住，10 秒測試逾時。兩者都是缺口，不是腳本錯。

## 修法（採用 patch `kb-act-2458-…patch` 的 `src`／依賴／文件部分，測試已先寫）

- `src/core/fetch.ts`：
  - `import { ProxyAgent } from "undici"`；`FetchOptions` 加可選 `timeoutMs`（預設 `TIMEOUT_MS` 15 秒，不加 CLI 旗標）。
  - `options.proxy` 有值時建一個 `ProxyAgent` 當 `fetch` 的 `dispatcher`；無效網址在建構時就丟錯，不重試三次；函式結束 `finally` 內 `destroy()`。不帶 proxy 時不傳 `dispatcher`，請求路徑與修前相同。
  - 每次嘗試一個 `AbortController` 與計時器，`finally` 才 `clearTimeout`，涵蓋連線、檔頭、`response.text()`；被 abort 時錯誤訊息固定 `Request timed out after Nms`。
- `package.json`／`package-lock.json`：加 `undici ^7.30.2`。
- `README.zh-TW.md`：刪掉「逾時未涵蓋本文」與「`--proxy` 尚未套用」兩句過時限制，改寫逾時與代理說明。
- `SPEC.md`：Fetch Layer 補 proxy 與逾時涵蓋範圍。

## 分析選用

how 否／why 否／architect 否／blast-radius 是：`fetchFlightsHtml` 有四個呼叫端，逾時與錯誤處理行為會變 → 依賴的單一事實：不帶 `--proxy` 時不傳 `dispatcher`、計時器只在 `finally` 清除且每次重試各一個 → 回歸整套 `vitest run` 與測試 2（不帶 proxy，直接呼叫 `fetchFlightsHtml`）證明；修法沒有因此改變。

## 對應 owner 原話

- 「`--proxy` 真的會用在查票請求上」→ 修法第 1 點，測試 1。
- 「逾時設定要涵蓋回應本文的下載」→ 修法第 3 點，測試 2。
- 「兩項都要有測試」→ `tests/fetch.test.ts` 兩案例。
- 文件與 `undici` 依賴屬 patch 原內容（原卡結論列明），是讓上述行為成立／不再自相矛盾所需。

## 不做

SOCKS／環境變數代理、新 CLI 旗標、來源報告問題 1 與 3、改 `src/commands`／`src/cli.ts`／`src/types.ts`。

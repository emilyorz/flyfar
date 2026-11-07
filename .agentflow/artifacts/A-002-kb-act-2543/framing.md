# framing — kb-act-2543（A-002）

## 原話

見 `.agentflow/features/kb-act-2543/kb-act-2543.devlog.md` Ask A-002（逐字存放，未改寫）。改善契約區塊如下，原樣貼入：

【改善契約 v1】
類別：一般改善
來源：回顧 act_2451 第 2 點；多模型審查 ar_185
歸屬：flyfar
問題：`--proxy` 沒套用、逾時沒涵蓋本文下載，兩個已知缺口一直沒排進工作
  出處：A-002 RUN-002（09-14）寫明這兩項「不在本輪」。A-003、A-004 沒有再提。我沒讀程式碼，不知道現在有沒有修掉。
預期行為：`--proxy` 真的會用在查票請求上；逾時設定要涵蓋回應本文的下載，不是只管連線。
驗收：用離線 fixture 測兩件事。一是帶 `--proxy` 時，請求真的走代理。二是回應本文下載卡住時，會在設定的逾時內以明確錯誤結束。兩項都要有測試。
基線：main 還沒有查證卡 kb-act-2458 的程式改動；那些改動在 patch /Users/leeabc/.omp/kanban/handover/kb-act-2458-56a01340c6526803e885a8c86f578576b3c84d50.patch（sha256 9d7f79c823397e61b7c33dd310c879917d430a57b2242812b2acf388f59fdf85，來源 tip 56a01340c6526803e885a8c86f578576b3c84d50）。
基線指令：["node_modules/.bin/vitest","run","tests/fetch.test.ts"]
【契約結束】

## 分流

分流：清楚 —— 範圍、驗收、授權都在原話；缺口事實（main 現況）查得到，已查證，不需問 owner。

## 補充

- patch sha256 已核對：`shasum -a 256` 得 `9d7f79c8…df85`，與契約一致（指令輸出）。
- main 現況：`src/core/fetch.ts` 的 `FetchOptions.proxy` 有宣告但函式內從未讀取；`setTimeout` 的計時器在 `fetch()` 回傳（檔頭到達）後就 `clearTimeout`，`response.text()` 不受計時器保護（`src/core/fetch.ts` 第 50–75 行附近，patch 的 `-` 行可對照）。
- 呼叫端：`src/commands/cheapest.ts:53`、`src/commands/search.ts:65,116,242` 四處都已把 `input.proxy` 傳進 `fetchFlightsHtml`；CLI 旗標 `--proxy` 在 `src/cli.ts:49,81,108`，schema 在 `src/types.ts`。所以缺口只在 `fetch.ts` 一處，呼叫端不用改。
- patch 內容（`/Users/leeabc/.omp/kanban/handover/kb-act-2458-…patch`）：改 `src/core/fetch.ts`、新增 `tests/fetch.test.ts` 與 `tests/fixtures/no-direct.mjs`、`package.json`／`package-lock.json` 加 `undici ^7.30.2`、`README.zh-TW.md`／`SPEC.md` 文字更新。
- main 全套測試目前 3 檔 26 案例全過（`node_modules/.bin/vitest run`），是回歸基線。
- 範圍外（原卡結論與來源報告）：SOCKS／環境變數代理、來源報告問題 1（未提交差異清單）、問題 3（行李費用）不做。

## 主控判定（agent 的判斷，不是原話）

- 採用 patch 的做法：`undici` `ProxyAgent` 當 `fetch` 的 `dispatcher`；每次嘗試一個 `AbortController` 計時器，`finally` 才清，涵蓋連線、檔頭、本文；逾時錯誤訊息固定 `Request timed out after Nms`。逾時預設仍 15 秒，不加 CLI 旗標。
- 先寫測試、取得紅燈，再套用 patch 的 `src`／依賴／文件部分，而不是整包 `git apply`，這樣 RED 對應的是修前的 main。測試內容照 patch 的 `tests/fetch.test.ts`，不另外擴充。
- 無效代理網址在 `ProxyAgent` 建構時就丟錯，不會白重試三次；這是 patch 附帶的行為，保留。

## 範圍與方法

- 改：`src/core/fetch.ts`、`package.json`、`package-lock.json`、`README.zh-TW.md`、`SPEC.md`。
- 新增：`tests/fetch.test.ts`、`tests/fixtures/no-direct.mjs`。
- 不改：`src/commands/*`、`src/cli.ts`、`src/types.ts`（已傳遞 proxy）。

## 分析選用

how 否／why 否／architect 否／blast-radius 是：`fetchFlightsHtml` 有四個呼叫端（cheapest 一處、search 三處），逾時與錯誤處理行為會變 → 安全依賴的單一事實是「不帶 `--proxy` 時請求路徑與修前相同（不傳 `dispatcher`），且 timer 只在 `finally` 清除，三次重試每次都有新計時器」→ 驗收加一個不帶 proxy 也要跑過的整套回歸（`vitest run` 全檔）與離線測試 2 直接呼叫 `fetchFlightsHtml` 不帶 proxy 驗證本文逾時；修法維持 patch 原樣，沒有改變。

## 有限驗收

必驗行為：

- B1：帶 `--proxy http://127.0.0.1:<port>` 跑 `search` 時，本機假代理收到 `CONNECT www.google.com:443`，且沒有任何不經代理的直接連線（離線守門 fixture 會拒絕沒有 `dispatcher` 的 fetch）；三次失敗後以 `Failed to fetch flights after 3 attempts` 結束，結束碼 2。
- B2：本機伺服器送出檔頭與部分本文後停住；`fetchFlightsHtml({ timeoutMs: 300 })` 在逾時內（<8 秒）以 `Request timed out after 300ms` 拒絕。
- B3：既有全套測試仍全過（3 檔原 26 案例 + 新 2 案例）。

測試入口：RED／GREEN 同一個 argv `node_modules/.bin/vitest run tests/fetch.test.ts`；回歸 `node_modules/.bin/vitest run`。

排除：SOCKS／環境變數代理、新增 CLI 逾時旗標、來源報告問題 1 與 3、改動呼叫端。

停止條件：RED 兩案例失敗且原因是缺口（不是腳本錯）、同 argv GREEN 通過、回歸全過、一次獨立結果審查通過即停。

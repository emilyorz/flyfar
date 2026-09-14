# A-002 主代理驗證證據

- **結果：** 22 項回歸測試、來源型別檢查、建置、實際 PTY 入口與三個命令均通過。以下為主代理直接執行，不是 worker 宣稱。

- **範圍：** 保留既有程式設計与 JSON camelCase，僅修實際重現缺陷。HTTP fixture 不是即時票價，也不證明 Google 回程／多城市訂位完整流程。

## 失敗到通過

- 初次 `npm test`：3 個測試檔，14 項失敗、6 項通過。失敗包括漏掉 5,141 TWD 航班群組、02:00 被解析成 unknown、825 分鐘變成 250、錯誤容器被當空結果、JSON 混入表格、range 被 Commander 當多餘參數、無效日期未攔截及錯誤退出碼。

- 初次 `npx tsc --noEmit`：TS2339，multi handler 存取 schema 不存在的 output。移除不可由 CLI 到達的 CSV 分支，而非新增 multi CSV 功能。

- `npx vitest run tests/cli.test.ts -t 'multi --open'`：修復前失敗，開啟 URL 數量為 0；修復後納入完整測試通過。

- 2026-09-14 23:03:04 +0800 執行 `npm test && npx tsc --noEmit && npm run build`：`Test Files 3 passed (3)`、`Tests 22 passed (22)`；TypeScript 退出 0；ESM/DTS build 成功，入口 dist/cli.js。

- 測試使用 Node 子程序執行實際 src/cli.ts；只有 HTTP 和外部瀏覽器啟動邊界受 fixture 控制。驗證 JSON/CSV/表格、查詢 wire、往返／多城市、Taipei／New York DST、空結果 1、解析錯誤 2、拒絕無效日期與錯誤參數。

## 真實網路查票

- `node --import tsx src/cli.ts search --from TPE --to NRT --date 2026-10-20 --json`：成功收到 2,545,524 bytes；stdout 為航班 JSON，stderr 為進度。Node 顯示 tsx 的 DEP0205，未隱藏或當成查票失敗。

- 查票結果出現整點 unknown 與漏算轉機時間；因此另抓一次相同路線的 payload 結構，確認 [2] 表示 02:00、Jetstar 行程 flight[9]=825（航段 160+90，等待 575），以及 payload[2] 的 Thai Lion Air 5,141 TWD 未被舊 parser 讀取。

- tests/fixtures/flights.html 僅保存上述三筆必要解析欄位與航空公司 metadata；移除訂位、追蹤 token。修正結果由固定 fixture 驗證，未宣稱修正後再次連線查票。

## 實際 PTY 操作

- 透過 hub 啟動 `/bin/zsh -f -i`，prompt `flyfar-smoke>`；輸入 `tty` 回傳 `/dev/ttys010`。可見命令輸入及下列完整表格輸出。

- `node dist/cli.js --help`：顯示 search、multi、cheapest；HELP_EXIT=0。

- `node --import ./tests/fixtures/http.mjs dist/cli.js search --from TPE --to NRT --date 2026-10-20 --recommend`：顯示 Thai Lion Air 5,141、Peach 02:00、Jetstar 13h 45m、Best 推薦；SEARCH_EXIT=0。

- `TZ=Asia/Taipei node --import ./tests/fixtures/http.mjs dist/cli.js cheapest --from TPE --to NRT --range 2026-10-20 2026-10-21 --stay 5`：顯示 10/20、10/21，沒有前移一天；CHEAPEST_EXIT=0。

- `node --import ./tests/fixtures/http.mjs dist/cli.js multi --route TPE,NRT,KIX,TPE --dates 2026-10-20,2026-10-22,2026-10-25`：進度列三個航段與三筆 fixture 航班；MULTI_EXIT=0。僅驗證 query 與既有輸出通路，不是三航段真實票價。

- 輸入 `exit`，shell 退出 0。上述命令可重複作為 PTY journey；沒有遺留 watcher、服務或一次性測試腳本。

## 範圍與限制

- 本輪產品變更限定 src/cli.ts、src/types.ts、src/core/parse.ts、src/commands/search.ts、src/commands/cheapest.ts、tests、SPEC.md、README.zh-TW.md。

- git status 已核對：其他既有 src/core/fetch.ts、src/core/query.ts、src/output/*、README.md、SKILL.md、project-iterations/*、.gitignore、ag.json 差異維持原狀，不納入本輪產品提交。

- 既有 --proxy 尚未套用、15 秒逾時未涵蓋本文下載；本輪沒有新增代理或傳輸功能，已在 README.zh-TW 明列。

- 無可用 LSP server，已用限定 src/tests 的符號搜尋檢查全部受影響呼叫端；未進行跨檔更名。

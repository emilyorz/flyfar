# A-004 驗證證據

- **結果：** 完整去回程與未知行李資訊已跑通；獨立審查與交付另外記錄。

- **原始需求：** `.agentflow/devlog.md` 的 A-003 五項目標及 Questions 第 1 題非空答案；已原文恢復於 A-004。留在本 checkout，不開另一個 coordinator，不動其他專案。

## 實作與相容性

- `search --return` 的每個去程候選新增 `returnOptions`；選定去程全部航段查詢回程，最多五個同時請求。Google 頁面實際選擇去程後的 URL 證明 protobuf field 4 的編碼方式；產品產生的最小編碼另以真實 HTTP 驗證。

- 原有 JSON flight 欄位、排序與推薦語意不變。CSV 保留前 14 欄及一個去程候選一列，新增欄位保存完整 segments／returnOptions；Python 標準 csv reader 實際解析編譯 CLI 輸出為 19 欄，後兩欄 JSON 與 `--json` 完全相等，價格仍為 8232/TWD。

- 尚未取得可驗證的行李費用欄位；不從航空公司名稱或不明陣列數字猜價。三種輸出明示未知，不產生含行李總價。

- `cheapest --stay` 保留原有日期價格與航班數，新增去回程日期連結，不為每天每個候選額外抓回程。

## 先失敗再修復

- 2026-09-15 07:08：先凍結 `tests/fixtures/roundtrip-outbound.html` 與 `roundtrip-return.html`。真實 TPE/NRT 2026-10-20/25 回應只保留班次、價格、航段、排放資料，去除追蹤與訂位 token。

- `npm test -- tests/cli.test.ts -t "expands paired|table and CSV expose|cheapest links"`：3 failed。分別缺班號／配對回程、table/CSV 沒回程、cheapest 沒連結。

- 修正後 `npm test && npx tsc --noEmit && npm run build`：25 tests passed，型別與建置通過。

- 新增無可用回程邊界：`npm test -- tests/cli.test.ts -t 'distinguishes an unavailable return'` 先失敗，退出碼 0 而非 1。修正後 `npm test -- tests/cli.test.ts && npx tsc --noEmit && npm run build`：13 CLI tests passed，型別與建置通過。既有 13 個 parser/query tests 的程式路徑未失效，不重複跑；目前合計 26 個 tests。

- 邊界同時驗證上游回傳錯誤方向的班次時退出 2、stdout 為空，不配成假回程。

## 真實網路與 CLI

- 初始真實 round-trip HTML 2,575,615 bytes，只有去程候選；瀏覽器選擇 MM620 後獨立 HTTP 收到 2,185,761 bytes 回程資料。瀏覽器顯示回程價格為 round trip total，證明不是回程單價。

- `node dist/cli.js search --from TPE --to NRT --date 2026-10-20 --return 2026-10-25 --airline MM --json`：退出 0；初始回應 1,915,229 bytes；MM620 與 MM626 各 3 個回程，共 6 組。

- MM620 起價 8,232 TWD；搭配 MM625 為 8,232、MM627 為 9,030、MM623 為 9,430 TWD。MM626 對應為 8,632／9,430／9,830 TWD。沒有把兩個來回價格相加。

- MM625 抵台為 2026-10-26 01:10，MM627 抵台為 2026-10-26 01:25；跨日日期保留。價格為本次觀察，不保證未來報價不變。

## 實際終端旅程

- `/bin/zsh -f` 真實 PTY `/dev/ttys005`，可見命令輸入、輸出與退出碼。HTTP 邊界使用固定 fixture，不冒稱即時報價。

- `node dist/cli.js --help`：HELP_EXIT=0。

- `FLYFAR_TEST_RESPONSE=roundtrip node --import ./tests/fixtures/http.mjs dist/cli.js search --from TPE --to NRT --date 2026-10-20 --return 2026-10-25`：SEARCH_EXIT=0。顯示 MM620 去程、MM625/GK11 回程、完整跨日日期、行李未知、整組總價與已選去程連結。

- `node --import ./tests/fixtures/http.mjs dist/cli.js cheapest --from TPE --to NRT --range 2026-10-20 2026-10-20 --stay 5`：CHEAPEST_EXIT=0，顯示 10/20→10/25 完整查詢連結與未知行李。

- `node --import ./tests/fixtures/http.mjs dist/cli.js multi --route TPE,NRT,KIX --dates 2026-10-20,2026-10-22`：MULTI_EXIT=0。既有表格仍能啟動；這是 fixture 入口驗證，非真實 multi 行程完整性宣稱。

- shell 正常退出 0，hub 確認程序已結束。最後新增的空回程退出碼由實際 CLI 子程序測試涵蓋。

## 範圍與主代理檢查

- 已檢查限定檔案差異；新功能只新增配對查詢與相容欄位，沒有重寫產品、加依賴、改代理設定或其他專案。

- src/core/query.ts、src/output/csv.ts、src/output/table.ts 的啟動前格式差異只留工作區，不提交；暫存版本與已測試工作區经 TypeScript AST 比對一致。初始 scanner／printer 比對受 template/source text 或排版影響，改以 AST 節點種類、文字與子節點作實際確認，三檔皆通過。

- 其他初始差異保留，未提交：.gitignore、README.md、SKILL.md、project-iterations/*、src/core/fetch.ts、ag.json。

- 提交前 `git fetch origin && git log --oneline HEAD..origin/main` 成功且無待整合 commit。

- Minimality check：只開連結無法滿足 search 直接呈現完整回程；把單程相加會偽造票價；逐候選查詢與新增欄位為必要最小方案。未知行李不用新定價抽象；cheapest 沿用現有日期查詢。

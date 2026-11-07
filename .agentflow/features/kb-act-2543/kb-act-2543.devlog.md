# STATUS

專案: flyfar

筆記本: .agentflow/features/kb-act-2543/kb-act-2543.devlog.md — 功能 kb-act-2543

工作目錄: /Users/leeabc/work/emilyorz/flyfar/.wts/ft-kb-act-2543

分支: feature/kb-act-2543

目前工作: A-003 等待下一個要求。

已驗證: A-002 修復完成：離線測試紅轉綠、整套測試通過、獨立審查通過（證據 .agentflow/artifacts/A-002-kb-act-2543/evidence.md）。

下一步: 可合回；等待要求。

封存紀錄: 無。

功能: open

清理: N/A

工作階段: active

---

# → 提問 / A-001 (emilyorz)

+ new-feature kb-act-2543

準備來源: /Users/leeabc/work/emilyorz/flyfar/.wts/ft-kb-act-2543; feature/kb-act-2543; 已提交的主線基準 `35de91b95d7fec1fc020276faf05cea4add79140`.

# → 回覆 / A-001

* _2026-11-07 12:11:07 +0000_

1. 已建立功能分支與工作目錄: `feature/kb-act-2543`, `/Users/leeabc/work/emilyorz/flyfar/.wts/ft-kb-act-2543`.

2. 在終端機執行下列指令繼續:

```text
cd -- '/Users/leeabc/work/emilyorz/flyfar/.wts/ft-kb-act-2543'
```

3. 在編輯器開啟功能筆記本（絕對路徑）: `/Users/leeabc/work/emilyorz/flyfar/.wts/ft-kb-act-2543/.agentflow/features/kb-act-2543/kb-act-2543.devlog.md`.

## 問題（批次列出；每題附建議預設值）

- 無。

---

# → 提問 / A-002 (emilyorz)

+ 【AI自我優化】修復：`--proxy` 沒套用、逾時沒涵蓋本文下載，兩個已知缺口一直沒排進工作
【改善契約 v1】
類別：一般改善
來源：回顧 act_2451 第 2 點；多模型審查 ar_185
歸屬：flyfar
問題：`--proxy` 沒套用、逾時沒涵蓋本文下載，兩個已知缺口一直沒排進工作
+   出處：A-002 RUN-002（09-14）寫明這兩項「不在本輪」。A-003、A-004 沒有再提。我沒讀程式碼，不知道現在有沒有修掉。
預期行為：`--proxy` 真的會用在查票請求上；逾時設定要涵蓋回應本文的下載，不是只管連線。
驗收：用離線 fixture 測兩件事。一是帶 `--proxy` 時，請求真的走代理。二是回應本文下載卡住時，會在設定的逾時內以明確錯誤結束。兩項都要有測試。
基線：main 還沒有查證卡 kb-act-2458 的程式改動；那些改動在 patch /Users/leeabc/.omp/kanban/handover/kb-act-2458-56a01340c6526803e885a8c86f578576b3c84d50.patch（sha256 9d7f79c823397e61b7c33dd310c879917d430a57b2242812b2acf388f59fdf85，來源 tip 56a01340c6526803e885a8c86f578576b3c84d50）。
【契約結束】

+ （Sam 在「需要你」對查證卡 kb-act-2458 選了「轉成修復卡接手」：那張卡查證時改了程式（查證卡不合回），看板把它在 .agentflow/ 以外的改動匯成 patch，開出這張卡後就把那張卡標成已轉交並收掉它的工作區（保留可復原的副本）。）
原卡結論（A-002 的回覆）：* _2026-11-06 22:29:14 +0800_

+ 1. 【AI自我優化】`--proxy` 沒套用、逾時沒涵蓋本文下載，兩個已知缺口一直沒排進工作 【改善契約 v1】 類別：待查證...

+    兩個缺口都還在，現已修好：

+    - `--proxy` 先前從未被讀取。現在帶 `--proxy` 時，search／cheapest／multi 的每個查票請求都走該 HTTP 代理；無效的代理網址會立即報錯，不再白重試三次。
+    - 逾時計時器先前在回應檔頭到達後就被清掉。現在同一個 15 秒計時器涵蓋連線、檔頭與本文下載；本文卡住時以「Request timed out after Nms」結束。逾時仍是每次嘗試 15 秒，沒新增 CLI 旗標。
+    - 兩項都有離線測試：`tests/fetch.test.ts`（本機假代理收到 `CONNECT www.google.com:443`；本機伺服器送出檔頭後停住本文）。修前兩案例皆失敗，修後同一指令全過。
+    - 新增 `undici` 依賴；`README.zh-TW.md` 刪掉兩句過時限制，`SPEC.md` 補述逾時範圍。

+    範圍外未動：SOCKS／環境變數代理，以及來源報告的問題 1（未提交差異清單）、問題 3（行李費用）。

+    Key Records — read these first
patch：/Users/leeabc/.omp/kanban/handover/kb-act-2458-56a01340c6526803e885a8c86f578576b3c84d50.patch
patch sha256：9d7f79c823397e61b7c33dd310c879917d430a57b2242812b2acf388f59fdf85
來源 tip：56a01340c6526803e885a8c86f578576b3c84d50
先核對 patch 的 sha256，再在這張卡的工作區套用（git apply），照上面的改善契約驗收。

+ 來源卡片：flyfar#stream:kb-act-2458
（以下只是背景：要做的是上面那件事，不要重做來源卡片原本的工作。）
來源卡片上的其他內容（owner 原話；改善契約已改寫在上面）：
【AI自我優化】`--proxy` 沒套用、逾時沒涵蓋本文下載，兩個已知缺口一直沒排進工作


+ （多模型審查 ar_185 審「回顧」報告的這一條時，兩位評審都同意另開一張卡；按「進行」或排程「自動挑待辦」挑中才會開工。）

+ 來源卡片：flyfar#task:act_2451
（以下只是背景：要做的是上面那件事，不要重做來源卡片原本的工作。）
來源報告（回顧）的全文：
## 現況
- 最近 7 天（10-30 到 11-06）flyfar 沒有新的產品工作。筆記本最後一次真正的工程是 A-004（09-15），最後一次動筆記本是 A-005（10-29 升級 v9）。A-005 剛好在 7 天窗口外一天。（devlog.md）
- A-005 是 Sam 要求升級 v9 並打開看板兩個排程。回覆說 9.1.0 已裝好，兩個排程已啟用，沒有碰 flyfar 的產品程式。（devlog.md、artifacts/A-005-v9-migration-recovery.md）
- STATUS 寫「A-006 等待新委託」。A-006 的 Ask 是空的，Questions 裡沒有空的 `ans:`，沒有在等 Sam 回話的事。（devlog.md）
- afp 收據一份都沒有。`.agentflow/artifacts/` 只有 A-002、A-004 的追蹤表和審查檔，沒有 `afp/` 資料夾，所以沒有進行中的 run。（glob 結果）
- 看板操作紀錄裡，flyfar 7 天內只有「回顧」和「優化 harness」自己，沒有看板開的卡，也沒有排隊中的事。（actions.jsonl；session 11-01、11-05、11-06）
- 我看不到 git，所以不知道現在工作區的未提交差異長什麼樣，也看不到最新 commit 狀態。能確定的只有 STATUS 寫的 commit 46bf3db。

+ ## 工作線
- [已完成 A-004] search 列出完整去回程，行李費用不確定時明寫「未知」。獨立審查全部 PASS，commit 46bf3db。（devlog.md Reply A-004）
- [已完成 A-005] 升級 v9，打開「挑待辦」和「自動合併」兩個排程。（devlog.md Reply A-005）
- [計畫好未開始] A-006 只有空 Ask，沒有內容，等新委託。（devlog.md STATUS）
- [計畫好未開始] 看板舊的暫停項目 kb-act-1057、kb-act-1118 和 pixel-office-poc 都沒恢復。A-005 明寫「原有 HOLD 不恢復」。（A-005-v9-migration-recovery.md）

+ ## 問題
1. 工作區長期放著沒人認領的未提交差異
+    類別：待查證
+    預期行為：每一份未提交差異都有人決定：提交、丟棄，或明確標成「刻意保留」，並寫在筆記本裡。
+    驗收：筆記本裡有一段清單，列出 `.gitignore`、`README.md`、`SKILL.md`、`project-iterations/*`、`fetch`、`ag.json`，以及 query／table／CSV 的排版差異。每一項都標上處理結果，之後的 Reply 不用再重複寫「保留原狀」。
+    出處：A-004 Reply（09-15）說這些差異留在工作區。A-005 復原檔說「Flyfar 未知產品差異不 commit／stash／reset」。我看不到 git，不確定現在還在不在。

+ 2. `--proxy` 沒套用、逾時沒涵蓋本文下載，兩個已知缺口一直沒排進工作
+    類別：待查證
+    預期行為：`--proxy` 真的會用在查票請求上；逾時設定要涵蓋回應本文的下載，不是只管連線。
+    驗收：用離線 fixture 測兩件事。一是帶 `--proxy` 時，請求真的走代理。二是回應本文下載卡住時，會在設定的逾時內以明確錯誤結束。兩項都要有測試。
+    出處：A-002 RUN-002（09-14）寫明這兩項「不在本輪」。A-003、A-004 沒有再提。我沒讀程式碼，不知道現在有沒有修掉。

+ 3. 行李費用一直是「未知」，使用者沒辦法比總價
+    類別：待查證
+    預期行為：Google Flights 回應裡若有可靠的行李費用欄位，就顯示含行李總價；沒有就維持「未知」，不猜價。
+    驗收：先用一份真實去識別的回應，確認有沒有可靠的行李欄位。有的話加 fixture 和測試，讓 JSON 的 `baggage.status`、CSV 的 `baggage_status` 和表格都顯示出來。沒有的話，把「資料源沒提供」寫進 SPEC，這點就結案。
+    出處：A-004 Reply 第 2 點。

+ ## 下一步
先決定 A-006 要做什麼。要是沒有新需求，就請 Sam 看一眼問題 1 的差異清單。只要把每一項標上「提交」或「丟棄」，工作區就乾淨了，之後的卡也不會再被這些舊差異卡住。

## [RUN-001] 修復完成並通過審查 — 2026-11-07 20:18:01 +0800 (A-002)

- 兩個缺口都在 main 上確認存在：`--proxy` 從未被讀取；逾時計時器在檔頭到達後就被清掉。
- 先寫離線測試取得紅燈，再套用 patch 的程式、依賴與文件部分；同一個指令轉綠，既有測試全過。
- 獨立審查（不同模型家族）通過，沒有 finding。證據與審查身分：`.agentflow/artifacts/A-002-kb-act-2543/evidence.md`。

# → 回覆 / A-002

* _2026-11-07 20:18:01 +0800_

1. 【AI自我優化】修復：`--proxy` 沒套用、逾時沒涵蓋本文下載，兩個已知缺口一直沒排進工作 【改善契約 v1】 類別：一般改善 來源：回顧 act_2451 第 2 點；多模型審查 ar_185...

   兩個缺口都已修好。`--proxy` 現在會用在 search／cheapest／multi 的每個查票請求（無效代理網址立即報錯，不再白重試三次）；15 秒逾時現在同一個計時器涵蓋連線、檔頭與回應本文下載，本文卡住時以「Request timed out after Nms」結束。逾時仍是每次嘗試 15 秒，沒新增 CLI 旗標。

   兩項都有離線測試（`tests/fetch.test.ts`：本機假代理收到 `CONNECT www.google.com:443`；本機伺服器送出檔頭後停住本文）。修前兩案例皆失敗，修後同一指令全過，整套測試也全過。

   新增 `undici` 依賴；`README.zh-TW.md` 刪掉兩句過時限制，`SPEC.md` 補述逾時範圍。範圍外未動：SOCKS／環境變數代理、來源報告問題 1（未提交差異清單）與問題 3（行李費用）。

   Key Records — read these first

   `.agentflow/artifacts/A-002-kb-act-2543/evidence.md`

   紅燈、綠燈、回歸與獨立審查（模型身分）的收據位置；要核對結果先讀這份。

   `.agentflow/artifacts/A-002-kb-act-2543/framing.md`

   需求整理與有限驗收範圍；說明為什麼採用 patch 並先寫測試。

## 問題（批次列出；每題附建議預設值）

- 無。

---

# → 提問 / A-003 (emilyorz)

+ agf merge-feature kb-act-2543 --cleanup

+ agf merge-feature kb-act-2543 --cleanup


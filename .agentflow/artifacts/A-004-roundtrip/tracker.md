# Tracker

## Identity

- **Work key:** A-004-roundtrip.

- **Active Ask:** A-004.

- **Goal:** 完成已授權 A-003 的完整來回班次、誠實行李資訊及候選導向，保留既有輸出欄位。

- **Last update:** 2026-09-15 07:12:38 +0800.

- **Evidence commit:** uncommitted.

## Overall state

- **State:** active.

- **Reason:** 實作、真實查票與終端驗證已完成；準備独立審查。

- **Total:** 5.

- **Completed:** 4.

- **Remaining:** 1.

## Accepted task checklist

- [x] **T-1:** src/types.ts、src/core/parse.ts、src/core/query.ts、proto/flights.proto、src/commands/search.ts 與輸出器：保留 flights 原有去程欄位，新增 returnOptions，逐一以已選去程查詢回程；回程價格是整組總價，不相加。缺少可靠班號或回程查詢失敗明確報錯，不偽造組合。Proof: 25 tests 通過；新增無回程退出碼案例先失敗後修復，13 項 CLI tests、tsc、build 通過；真實 MM620/MM626 各得到 3 個配對回程。Source: A-003 第 1 項；A-004 恢復授權。

- [x] **T-2:** parser/types/output：沒有已驗證的行李價格欄位時標示 unknown，不計算含行李總價；JSON/CSV/table 一致。Proof: CLI tests 與 /dev/ttys005 顯示「行李：未知」。Source: A-003 第 2 項。

- [x] **T-3:** search 與 cheapest：提供保留日期、航線、座艙、人數與篩選條件的 Google Flights 導向；search 展開每個候選回程，cheapest 每日結果提供完整來回查詢連結。Proof: CLI 解碼連結 tests 通過；真實 MM 篩選與配對回程正確。Source: A-003 第 3 項。

- [x] **T-4:** tests/fixtures 與 tests：先凍結真實去程／已選去程回程的去識別 fixture，先失敗再實作；執行測試、tsc、build、真實 CLI PTY 與真實查詢。Proof: 初始 3 個失敗案例，修正後 25 tests 通過；最後新增空回程案例，13 項 CLI tests 通過；/dev/ttys005 的 help/search/cheapest/multi 皆退出 0，shell 退出 0；實際查票得到 6 組。Source: A-003 第 4 項。

- [ ] **T-5:** README.zh-TW.md、SPEC.md 與本輪紀錄：同步契約及限制，限定路徑提交，fresh reviewer 唯讀審查、主代理驗收、推送與 Reply；既有差異不丟棄，不碰其他專案。Proof: review.md、cross-check.md、Git 交付。Source: A-003 第 5 項。

## Accepted scope changes

- None.

## Current recovery

- **Current item:** T-5.

- **Last proven result:** 真實 CLI 返回 2 個 MM 去程候選、各 3 個配對回程；MM620/MM625 總价 8,232 TWD，抵台 2026-10-26 01:10。離線與真實證據分開記錄。

- **Active blocker or running process:** None.

- **Next safe action:** 檢查限定差異、凍結實作 commit、啟動 fresh reviewer。

- **Expected changed files:** src/types.ts、src/core/parse.ts、src/core/query.ts、proto/flights.proto、src/commands/search.ts、src/commands/cheapest.ts、src/output/table.ts、src/output/csv.ts、tests、README.zh-TW.md、SPEC.md、.agentflow/devlog.md、.agentflow/artifacts/A-004-roundtrip/*。

## Completion proof

- **All accepted tasks checked:** no.

- **Blocking accepted decision:** none.

- **Operation running:** no.

- **Next action remaining:** T-5.

- **Evidence status:** current.

- **Judgment:** active.

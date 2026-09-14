# Tracker

## Identity

- **Work key:** A-002-reliability.

- **Active Ask:** A-002.

- **Goal:** 保留既有改進，補上離線測試並修復現有查票流程的實際缺陷。

- **Last update:** 2026-09-14 23:17:00 +0800.

- **Evidence commit:** e3d4d5e3906fcf89ebf5c39e7b55ece1978bbd35.

## Overall state

- **State:** complete.

- **Reason:** 五項要求的實作、驗證與獨立審查已完成，交由 closeout 保存 Reply 與交付紀錄。

- **Total:** 5.

- **Completed:** 5.

- **Remaining:** 0.

## Accepted task checklist

- [x] **T-1:** 以真實 parse/query/CLI 測試取代 placeholder；14 項失敗重現修至 22 項通過。Source: A-002. Proof: .agentflow/artifacts/A-002-reliability/verification.md

- [x] **T-2:** 修正重現缺陷；離線 CLI、型別、build 與真實 PTY 通過。Source: A-002. Proof: .agentflow/artifacts/A-002-reliability/verification.md

- [x] **T-3:** 保留既有改進，非本輪路徑維持未提交。Source: A-002. Proof: .agentflow/artifacts/A-002-reliability/verification.md

- [x] **T-4:** 真實查票收到 2,545,524 bytes；另抓結構證據修正 parser，離線驗證不依賴網路。Source: A-002. Proof: .agentflow/artifacts/A-002-reliability/verification.md

- [x] **T-5:** 22 tests、tsc、build、PTY 通過；獨立審查三項 PASS；原始報告與主代理驗收已保存，限定實作 commit 可追溯。Source: A-002. Proof: .agentflow/artifacts/A-002-reliability/cross-check.md

## Accepted scope changes

- None.

## Current recovery

- **Current item:** none.

- **Last proven result:** 獨立審查三項 PASS、worker 僅新增 review.md、無巢狀 worker；主代理驗收通過。

- **Active blocker or running process:** None.

- **Next safe action:** none.

- **Expected changed files:** tests/**、src/cli.ts、src/types.ts、src/core/parse.ts、src/commands/search.ts、src/commands/cheapest.ts、必要使用文件與 .agentflow/devlog.md、本 tracker、審查證據。

## Completion proof

- **All accepted tasks checked:** yes.

- **Blocking accepted decision:** none.

- **Operation running:** no.

- **Next action remaining:** none.

- **Evidence status:** complete.

- **Judgment:** complete.

## Update meaning

- Saving this tracker is a recovery checkpoint, not a stop signal.

- Work continues with the next unfinished item unless an independent stop condition applies.

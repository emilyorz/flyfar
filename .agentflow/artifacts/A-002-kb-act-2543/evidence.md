# 證據 — A-002（kb-act-2543）

- AFP run：`A-002-kb-act-2543`；收據在 `afp/`。
- 紅燈：`afp/effects/repro-001`（`node_modules/.bin/vitest run tests/fetch.test.ts`，兩案例都失敗：代理沒收到 CONNECT；本文卡住時測試 10 秒逾時）。
- 綠燈：`afp/effects/proof-001`（同 argv，2 案例通過）。回歸：`afp/effects/check-001`（`vitest run`，全部通過）。`tsc --noEmit` 無輸出（通過）。
- patch：sha256 `9d7f79c8…df85` 與契約一致；改動的 `src`／依賴／文件行與 patch 非測試部分逐行比對相同。
- 獨立結果審查：native `reviewer`，transcript `…/ReviewFetchFix.jsonl` 的 `model_change.model` = `openai-codex/gpt-6.1-sol`、`thinkingLevel` = `high`（不同於本 session 的 anthropic 家族）；結果 `FINDINGS: 0`、PASS。
- 系統不變量：此 checkout 沒有 `.agentflow/sys-invariants.md`，也沒有新增任何跨回合保證；N/A。
- backlog：沒有 `.agentflow/backlog.md`；本輪沒有新增待辦項目；N/A。
- 範圍外未動：SOCKS／環境變數代理、來源報告問題 1、3。

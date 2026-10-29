# flyfar — A-005 v9 遷移與復原

建立：2026-10-29T06:30:39.267238+08:00

- Owner 原話來源：Hermes session 20261027_073201_8c4e71f5, native user message 305246；原文已追加於本 Ask。
- 核准範圍：[既有完整計畫](/Users/leeabc/.hermes/artifacts/agentflow-v9-upgrade-20261028/execution/combined-plan-v2.json)，不再重問例行批准。
- 控制者：Elena，原生 session 20261027_073201_8c4e71f5；實體筆記本 /Users/leeabc/work/emilyorz/flyfar/.agentflow/devlog.md，Ask A-005。
- 私人原檔與預期輸出：/Users/leeabc/.hermes/artifacts/agentflow-v9-upgrade-20261028/execution/live-backup/manifest.json 與 /Users/leeabc/.hermes/artifacts/agentflow-v9-upgrade-20261028/execution/host-adoption/plan.json；正式效果前須再驗 hash／身分／claim。
- 原根筆記本最後 Ask 是空白；Board 根舊 claim 為 released A-141，Flyfar 沒有根舊 claim。保留所有舊 claim 原檔；不換 token、不採用舊 active claim。
- 本地規則目的地已由 Parent 在原授權內決定為 .agentflow/rules.md，原檔不存在；採用已審的 engineering-result-review.rule.md。工程結果使用與實作者不同家族的實際獨立 reviewer，無法取得時停止該結果，不 fallback、不加重複審查。
- 原放行條件：A1–A3 全數通過後才 resume act_300／act_595；現已依條件啟用，未放寬任何 HOLD 或名額限制。
- 舊 .worktrees、歷史、queue/control/receipt 與產品 dirty bytes 全保留。不轉換、重播、清理舊 stream。kb-act-1057 與 kb-act-1118 仍為 HOLD 且原 task suspended，claim 保留；pixel-office-poc 不啟動。本輪只明確交接根配置／全域升級，不取得舊產品功能權限。
- 已有封存不搬移、不重寫；Flyfar 未知產品差異不 commit／stash／reset。
- 已完成：正式 9.1.0 與相關整合、兩個專案設定的獨立提交、實際一般工程與自然續接、Board 同卡補齊審查身分後的官方合回／清理及原始證據保留。以 [最新執行狀態](/Users/leeabc/.hermes/artifacts/agentflow-v9-upgrade-20261028/STATUS.md) 及其綁定收據為準；最初失敗不改寫成通過。
- 本輪完成：名額修正已由正式 Board 載入，pick_room=1；act_300／act_595 已以原頻率／模型／範圍恢復並讀回。詳見 [交付結果](/Users/leeabc/.hermes/artifacts/agentflow-v9-upgrade-20261028/execution/runtime-final/FINAL.md) 及精確收據。原 pixel／hot-reload HOLD bytes 未變；本輪完成不代表後續正式產品卡已交付。
- 復原順序：先核對 /Users/leeabc/.hermes/artifacts/agentflow-v9-upgrade-20261028/execution/host-adoption/effects.json（若不存在，沒有該表證實的效果），核對 private original 與 expected-after bytes；已套用者只讀驗證，不重送。衝突／不明停止該步。

## 原有 STATUS 與未結線索（歷史原文，不當作本輪完成證據）

```text
# STATUS

Project: flyfar

Notebook: .agentflow/devlog.md — root.

Current commit: 46bf3db64b378b7321723d96aa3f57d0ee1e996e.

Tests/scenarios: 25 tests 通過；新增空回程案例後 13 CLI tests、tsc、build 通過；PTY 四個入口與真實 6 組來回驗證；fresh review PASS.

Configuration: ag.json — schema v7; validated for pi this round.

Proven: A-003/A-004 完整配對去回程、未知行李與候選導向已驗證，獨立審查通過.

Open: none.

Next: 等待新委託.

Artifacts: .agentflow/artifacts/A-004-roundtrip/{tracker,verification,review,cross-check}.md.

Archived eras: none.

Streams: none.
---

```

## 原話位元保存與檢查例外

本輪 Ask 內三行原始使用者輸入自帶行尾空白，完整保留原話；已逐行確認 git diff --check 只因這三行報 trailing whitespace。所有新撰回覆／STATUS／復原文字均無行尾空白；新 Ask 的額外檔尾空行已修正。僅原話三行列為 byte-preserved capture 例外，不豁免任何程式或新撰文字錯誤。

# 專案規則

## 子代理模型

- 主 session 用 `task` 派子代理時，照 `ag.json` 的 `pipeline-roles` 挑 `agent`；不要在 `task` 呼叫填 `model` 欄位（OMP 只准 `seance` agent 填，其他會回錯誤）。模型寫在 `.omp/agents/` 的 agent 檔頭，不寫在呼叫裡。

- 偵查、審查（`explore`、`codewalk`、`spike`、`acceptance`、`cross-check`，等級 `better`）：`agent: explorer`（模型與思考強度沿用 omp 預設，沒有寫死；只讀是靠簡報和檔內指示約束，不是工具層保證）。

- 實作、整理（`implementation`、`learn`，等級 `basic`）：`agent: implementer`（模型與思考強度沿用 omp 預設，沒有寫死）。簡報要列出可改的檔案，並附上這個專案的修改規則。

- 資安掃描、需求、規格（`security-scan`、`requirements`、`spec`，等級 `best`）：維持現狀，不用 `explorer`、`implementer`；資安掃描派內建 `security-reviewer`（沿用主 session 的模型），需求和規格由主 session 自己做。

- `cheap`（haiku）先不用。

- 這只管子代理。收尾的獨立審查仍照 `~/.agents/skills/agentflow-pstack/references/omp-adapter.md` 用不同家族的外部審查者，不派 `explorer`。

- 改這些對應時，同步改 `.omp/agents/explorer.md`、`.omp/agents/implementer.md` 的 `model`／`thinking-level`；不要改 `ag.json` 來做這件事。新建的檔和上面的說明是導入時照看板「設定」的子代理欄位一次產生的；沒設的欄位就不寫那一行，專案原本就有的檔不會被覆蓋（說明裡會寫以原檔為準），之後改設定也不會回頭改已建好的檔。

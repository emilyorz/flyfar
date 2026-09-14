* _2026-09-15 07:22:39 +0800 (xai-oauth/grok-4.6/high)_

Reviewed implementation commit: 46bf3db64b378b7321723d96aa3f57d0ee1e996e

Verdict: PASS

- **主代理驗收：** 原始報告 [review.md](review.md) SHA-256 85163562ba0fcb3d0168c1f2fd6ff59a5b68ed060bcf475aebfff7e533deb450 與 runner 一致；clone 僅新增 review.md，來源 commit 符合，無 remote、無巢狀 worker，程序群組已結束。原文保留，以下不是第二次審查。

- **範圍判斷：** 班號及 selectedFlights 已由 CLI 回歸直接驗證，不再重複新增 parser/query 同義測試。候選連結與完整回程已滿足目標；--open 與推薦維持原契約。報告部分行號是近似位置，不影響已實測的錯誤與空回程行為。

- **審查後差異：** README.zh-TW.md、SPEC.md 只移除行內範例引號前多餘反斜線，未知行李與價格語意未變；其餘新增檔僅封存同一份簡報、調度、報告與驗收證據。沿用已通過實作驗證與本次獨立審查。

- **結論：** 來源 `46bf3db64b378b7321723d96aa3f57d0ee1e996e` 已做到完整去回程、相容 JSON/CSV/table、誠實未知行李，以及 search 展開／cheapest 導向。主代理證據足夠，未重跑測試。

- **風險：** 無阻塞缺陷。CSV 19 欄與班號解析主要靠 CLI 與真實查票；`tests/parse.test.ts` 未釘 `segment[22]` identity。

- **下一步：** 主代理驗收本報告並完成 T-5 交付即可；不必再改產品。

## Ask 對應

- **去回程：** `src/commands/search.ts:94-134` 用已選去程全部航段查回程（`proto/flights.proto` field 4）。機場或回程日不符即丟錯（約 L105–107）；全部空 `returnOptions` 退出 1（L198–200）。

- **價格：** 去程 `round-trip-from`、回程 `round-trip-total`。CLI 測 MM620 起價與 MM625 總價皆 8232，不相加；真實查票同語意。

- **行李：** `src/core/parse.ts:261-264` 固定 `baggage.status=unknown`。table/CSV/JSON 明示未知，無猜價、無含行李總價。

- **導向：** search 展開 `returnOptions`；`cheapest.ts:72-76` 在 `--stay` 只加 `returnDate`／`deepLink`，符合「至少導向」。篩選經 `...queryParams` 保留。

- **相容：** 原 `flights[]` 欄位與一列去程仍在。CSV 前 14 欄順序不變，後加 `price_scope,baggage_status,deep_link,segments,return_options`。JSON 為附加欄位；`formatJson` 原樣序列化。

- **錯誤：** 缺班號或方向錯誤走 `cli.ts` `handleError` 退出 2、stdout 空。`empty-return` 退出 1 仍輸出空選項。

- **驗證（沿用、未重跑）：** 先 3 失敗再 25 通過；空回程先失敗後 13 CLI／tsc／build；真實 MM 2 去程各 3 回程；PTY help/search/cheapest/multi 退出 0；Python csv 19 欄與 JSON 相等。

## Minimality

- 只放 Google 連結：無法「呈現完整回程班次」。

- 兩段單程相加：偽造票價。

- cheapest 也逐候選抓回程：超出「至少導向」，本輪正確沒做。

- 較小設計無法同時滿足 Ask，故非 BLOCKING。

## 非阻塞

- `tests/query.test.ts` 未覆蓋 `selectedFlights`（CLI 已解碼）。

- `--open` 仍開未選去程總表；列上已有候選連結。

- 推薦分仍只看去程，SPEC 已寫明。

Outcome: PASS

Minimality: PASS

Conformance: PASS

Self-check: 僅寫入 clone/review.md；未改來源、未跑測試套件、未開網路或 worker；三項裁決各一次；Ask 概念已對應；清單項之間有空行。

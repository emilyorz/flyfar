# FlyFar (飛太遠)

航班搜尋 CLI — 飛得遠，花得少。By Sam Lee / Emily。

從終端機查詢 Google Flights。人類看彩色表格，AI 看結構化 JSON。

## 安裝

```bash
git clone https://github.com/emilyorz/flyfar.git
cd flyfar
npm install
npm run build
```

或直接執行（不需 build）：

```bash
npx tsx src/cli.ts search --from TPE --to NRT --date 2026-04-25
```

## 使用方式

### 搜尋航班

```bash
# 單程
flyfar search --from TPE --to NRT --date 2026-04-25

# 來回
flyfar search --from TPE --to NRT --date 2026-04-25 --return 2026-05-01

# 只看直飛
flyfar search --from TPE --to NRT --date 2026-04-25 --direct

# 篩選航空公司（支援別名：EVA/長榮、CI/華航、Peach/樂桃 等）
flyfar search --from TPE --to NRT --date 2026-04-25 --airline EVA,Peach

# 商務艙，2 位旅客
flyfar search --from TPE --to NRT --date 2026-04-25 --seat business --passengers 2

# JSON 輸出（給 AI agent 或程式串接用）
flyfar search --from TPE --to NRT --date 2026-04-25 --json
```

### 多城市

```bash
flyfar multi --route TPE,NRT,KIX,TPE --dates 2026-04-25,2026-04-30,2026-05-03
```

### 找最便宜日期

```bash
# 掃描日期範圍找最便宜單程
flyfar cheapest --from TPE --to NRT --range 2026-04-20 2026-04-30

# 加回程（住 5 天）
flyfar cheapest --from TPE --to NRT --range 2026-04-20 2026-04-30 --stay 5

# JSON 輸出
flyfar cheapest --from TPE --to NRT --range 2026-04-20 2026-04-30 --json
```

- `--range` 必須提供兩個有效日期，包含起訖日；`--stay` 與日期掃描不受電腦時區影響。

- `--json` 優先於 CSV 與推薦表格，適合程式串接；`search`、`multi` 的 `--open` 可開啟對應 Google Flights 查詢。

- `cheapest` 任一日期查詢失敗會以代碼 `2` 結束，不輸出偽裝成成功的部分結果；全程沒有航班則為 `1`。

### 通用選項

| 參數                | 說明                     | 預設值  |
| ------------------- | ------------------------ | ------- |
| `--json`            | 結構化 JSON 輸出         | `false` |
| `--currency <code>` | 幣別（TWD、USD、JPY 等） | `TWD`   |
| `--language <code>` | 語言代碼                 | `en-US` |
| `--proxy <url>`     | HTTP 代理 URL            | 無      |

### 航空公司別名

支援台灣常用航線的中英文別名：

| 別名           | IATA | 別名            | IATA |
| -------------- | ---- | --------------- | ---- |
| EVA / 長榮     | BR   | CI / 華航       | CI   |
| starlux / 星宇 | JX   | peach / 樂桃    | MM   |
| scoot / 酷航   | TR   | tigerair / 虎航 | IT   |
| jal / 日航     | JL   | ana / 全日空    | NH   |
| jetstar / 捷星 | GK   | cathay / 國泰   | CX   |

## 結束代碼

| 代碼 | 意義                       |
| ---- | -------------------------- |
| 0    | 成功，找到航班             |
| 1    | 成功，但沒有符合條件的航班 |
| 2    | 錯誤（網路、解析、驗證）   |

## 運作原理

1. 把搜尋參數編碼成 protobuf binary（Google Flights 的 `tfs` URL 參數）
2. 用瀏覽器 headers 抓取 Google Flights 搜尋結果頁面
3. 從 HTML 回應中的 `<script>` 標籤提取嵌入的 JSON 資料
4. 把深層巢狀陣列解析成乾淨的型別物件
5. 輸出彩色表格或結構化 JSON

最多嘗試 3 次，兩次重試前分別等待 1 秒、2 秒。請求設定 15 秒逾時；目前逾時未涵蓋回應本文下載。

## 限制

- Google 可能會封鎖沒有正確 TLS 指紋的請求。CLI 使用瀏覽器 headers，實測可用，但 Google 隨時可能開始封鎖。
- 回應解析依賴 Google 的內部資料結構。如果 Google 改了，解析會壞掉，但會給出清楚的錯誤訊息，並將原始 HTML 存到 `/tmp/` 供除錯。
- `cheapest` 指令每個日期發一次請求，掃 30 天 = 30 次請求。請合理使用。

- `--proxy` 目前雖出現在參數介面，HTTP 傳輸尚未套用代理設定；本輪未新增代理功能。

## 本機驗證與修正紀錄

- `npm test`：使用去識別化 Google Flights fixture，驗證 parser、protobuf query 與實際 CLI 子程序；不需連線。

- `npx tsc --noEmit && npm run build`：檢查來源型別並建置入口。`node dist/cli.js --help` 可確認程式啟動。

- 2026-09-14：補回最佳航班群組，修正整點時間、含轉機等待的總時長、`cheapest --range`、時區日期偏移、錯誤退出碼、JSON 輸出優先序及 `multi --open`。

- 真實網路查票另外執行，可能受 Google 封鎖或資料結構改動影響，不作為離線測試的唯一通過條件。

## 授權

ISC

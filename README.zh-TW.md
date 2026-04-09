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

### 通用選項

| 參數 | 說明 | 預設值 |
|------|------|--------|
| `--json` | 結構化 JSON 輸出 | `false` |
| `--currency <code>` | 幣別（TWD、USD、JPY 等） | `TWD` |
| `--language <code>` | 語言代碼 | `en-US` |
| `--proxy <url>` | HTTP 代理 URL | 無 |

### 航空公司別名

支援台灣常用航線的中英文別名：

| 別名 | IATA | 別名 | IATA |
|------|------|------|------|
| EVA / 長榮 | BR | CI / 華航 | CI |
| starlux / 星宇 | JX | peach / 樂桃 | MM |
| scoot / 酷航 | TR | tigerair / 虎航 | IT |
| jal / 日航 | JL | ana / 全日空 | NH |
| jetstar / 捷星 | GK | cathay / 國泰 | CX |

## 結束代碼

| 代碼 | 意義 |
|------|------|
| 0 | 成功，找到航班 |
| 1 | 成功，但沒有符合條件的航班 |
| 2 | 錯誤（網路、解析、驗證） |

## 運作原理

1. 把搜尋參數編碼成 protobuf binary（Google Flights 的 `tfs` URL 參數）
2. 用瀏覽器 headers 抓取 Google Flights 搜尋結果頁面
3. 從 HTML 回應中的 `<script>` 標籤提取嵌入的 JSON 資料
4. 把深層巢狀陣列解析成乾淨的型別物件
5. 輸出彩色表格或結構化 JSON

重試：3 次，指數退避（1s、2s、4s）。逾時：每次請求 15 秒。

## 限制

- Google 可能會封鎖沒有正確 TLS 指紋的請求。CLI 使用瀏覽器 headers，實測可用，但 Google 隨時可能開始封鎖。
- 回應解析依賴 Google 的內部資料結構。如果 Google 改了，解析會壞掉，但會給出清楚的錯誤訊息，並將原始 HTML 存到 `/tmp/` 供除錯。
- `cheapest` 指令每個日期發一次請求，掃 30 天 = 30 次請求。請合理使用。

## 授權

ISC

# English Vocab Quiz

英文單字隨機測驗網頁，支援匯入題庫、缺字單字卡、聽讀音作答、限時測驗與錯題重測。

Demo: https://siygle.github.io/english-vocab-quiz/

## Features

- CSV / JSON 題庫匯入
- 線上查詢英文單字並自動帶入中文意思
- 測驗標題、答題時間、抽題數、缺字比例自訂
- 兩種出題方式：
  - 缺字單字卡：填完整英文與中文
  - 讀音：聽英文發音後填英文與中文
- 優先使用線上字典 MP3 發音，失敗時退回瀏覽器 TTS
- 中文意思採寬鬆比對，題庫可用 `;` 補充同義詞
- 錯題重測
- 親近國小學童的遊戲化介面

## Tech Stack

- React
- TypeScript
- Vite
- oxlint
- oxfmt
- tsdown（預留給未來抽出 quiz engine / package）

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## 題庫格式

CSV：

```csv
apple,蘋果
beautiful,美麗的;漂亮的
library,圖書館
```

JSON：

```json
[
  { "english": "apple", "chinese": "蘋果" },
  { "word": "beautiful", "zh": "美麗的;漂亮的" }
]
```

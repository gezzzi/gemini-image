## Prism AI Studio（Gemini 画像生成テスト）

Google Gemini API の画像生成機能をネオ・ブルータリズム調 UI で体験できる Next.js アプリです。サーバー経由で API を呼び出し、生成した画像をブラウザ上に並べて再生成・ダウンロードできます。

## セットアップ

1. 依存関係をインストールします。
   ```bash
   npm install
   ```
2. プロジェクト直下に `.env.local` を作成し、Gemini API キーを設定します。
   ```bash
   GEMINI_API_KEY=あなたのAPIキー
   ```
3. 開発サーバーを起動します。
   ```bash
   npm run dev
   ```
4. ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 画面でできること

- 「TYPE SOMETHING LOUD HERE...」に自由なプロンプトを入力
- 512 / 768 / 1024px のスクエア出力サイズをボタンで切り替え
- `生成する` ボタンで `/api/generate-image` に POST し、Gemini の応答画像をカードとしてギャラリーに追加
- カードのオーバーレイから「再生成」「ダウンロード」を実行
- プロンプト例ボタンで雰囲気の近いテキストをすぐセット

UI はダイナミックな配色とハードな影を特徴にした Prism AI Studio のデザインを忠実に再現しています。

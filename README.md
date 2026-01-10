# Chrome Extension Starter Kit

これは，TypeScript と webpack を使用して Chrome 拡張機能を開発するためのスターターキットです．

## 特徴

- **TypeScript 対応**: 静的型付けにより，開発効率とコードの品質を向上させます．
- **webpack 導入済み**: TypeScript ファイルを JavaScript にコンパイルし，ファイルをバンドルします．
- **オートリロード機能**: 開発モードでファイルを変更すると自動的に拡張機能がリロードされます（WebSocket 使用）．
- **型安全な設定管理**: 設定の型定義とデフォルト値を一元管理できます．
- **ユーティリティ関数**: 日時フォーマット，DOM 操作，権限管理などの汎用関数を提供．- **Bootstrap UI**: モダンで使いやすいポップアップ UI をすぐに利用できます．
- **基本的なファイル構成**: 開発をすぐに開始できるよう，必要なファイルが揃っています．

## 必要条件

- [Node.js](https://nodejs.org/) (v18.x 以上を推奨)
- [npm](https://www.npmjs.com/) または [yarn](https://yarnpkg.com/)

## クイックスタート

```bash
# リポジトリをクローン
git clone https://github.com/yhotamos/chrome-extension-starter-kit
cd chrome-extension-starter-kit

# 依存関係をインストール
npm install

# 開発モード（ファイル変更を自動監視 + オートリロード）
npm run watch

# または，本番用ビルド
npm run build
```

**Chrome に読み込む:**

1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist/` ディレクトリを選択

## プロジェクト構成

```
chrome-extension-starter-kit/
├── src/
│   ├── background.ts        # バックグラウンドスクリプト
│   ├── content.ts           # コンテンツスクリプト
│   ├── popup.ts             # ポップアップスクリプト
│   ├── settings.ts          # 設定の型定義とデフォルト値
│   ├── dev/                 # 開発用機能
│   │   └── reload.ts        # オートリロード機能
│   ├── components/          # UI コンポーネント
│   │   └── popup-panel.ts
│   └── utils/               # ユーティリティ関数
│       ├── date.ts          # 日時関連
│       ├── dom.ts           # DOM操作関連
│       ├── permissions.ts   # 権限関連
│       └── settings.ts      # 設定管理ユーティリティ
├── public/
│   ├── manifest.json        # 拡張機能マニフェスト
│   ├── popup.html          # ポップアップ HTML
│   ├── popup.css           # ポップアップスタイル
│   └── icons/              # アイコン画像
├── scripts/
│   └── ext-reloader.js     # webpack プラグイン（オートリロード用）
├── docs/
│   └── SETTINGS.md         # 設定機能の詳細ガイド
└── dist/                   # ビルド成果物（自動生成）
```

## 開発ガイド

### 各ファイルの役割

#### コアスクリプト

- **`src/background.ts`**  
  バックグラウンドで常駐し，イベント処理や状態管理を行います．
  例: API 呼び出し，タブ管理，通知の送信など．

- **`src/content.ts`**  
  Web ページに挿入され，DOM 操作やページとのやり取りを行います．
  例: ページ内容の解析，要素の追加・変更，スクレイピングなど．

- **`src/popup.ts`**  
  ポップアップ（`popup.html`）に関連する処理を記述します．
  例: UI イベントハンドラー，設定の読み込み・保存など．

#### 設定管理

- **`src/settings.ts`**  
  拡張機能の設定の型定義とデフォルト値を定義します．

  ```typescript
  export interface Settings {
    theme?: "light" | "dark" | "system";
    fontSize?: number;
    notifications?: boolean;
  }

  export const DEFAULT_SETTINGS: Settings = {
    theme: "system",
    fontSize: 16,
    notifications: true,
  };
  ```

- **`src/utils/settings.ts`**  
  設定の読み書きを行うユーティリティ関数を提供します．

  ```typescript
  import { getSetting, saveSetting } from "./utils/settings";

  // 設定の取得
  const theme = await getSetting("theme");

  // 設定の保存
  await saveSetting("theme", "dark");
  ```

#### ユーティリティ関数

`src/utils/` 配下に汎用的な関数をまとめています．

| ファイル         | 説明     | 主な関数                                            |
| ---------------- | -------- | --------------------------------------------------- |
| `settings.ts`    | 設定管理 | `getSetting()`, `saveSetting()`, `getAllSettings()` |
| `date.ts`        | 日時処理 | `dateTime()` - 日時フォーマット                     |
| `dom.ts`         | DOM 操作 | `clickURL()` - 新しいタブで URL を開く              |
| `permissions.ts` | 権限管理 | `getSiteAccessText()` - 権限テキスト変換            |

**使用例:**

```typescript
import { dateTime } from "./utils/date";
import { clickURL } from "./utils/dom";

const timestamp = dateTime(); // "2024-03-15 14:30"
clickURL(linkElement); // 新しいタブで開く
```

**新しいユーティリティの追加:**

1. `src/utils/` に新しいファイルを作成（例: `api.ts`）
2. 関数をエクスポート（JSDoc を付けることを推奨）
3. 必要な場所でインポートして使用

#### コンポーネント

- **`src/components/`**  
  UI コンポーネントや共通処理をまとめる場所です．
  例: `popup-panel.ts` - ポップアップのメッセージパネル管理．

### 設定機能の使い方

拡張機能に設定画面を追加する詳しい方法については，[設定機能ガイド](docs/SETTINGS.md)を参照してください．

**クイックスタート:**

1. **設定の型を定義** (`src/settings.ts`)

   ```typescript
   export interface Settings {
     myOption?: string;
   }

   export const DEFAULT_SETTINGS: Settings = {
     myOption: "default",
   };
   ```

2. **HTML に設定項目を追加** (`public/popup.html`)

   ```html
   <input type="text" id="my-option" class="form-control" />
   ```

3. **イベントリスナーを設定** (`src/popup.ts`)

   ```typescript
   import { getSetting, saveSetting } from "./utils/settings";

   // 読み込み
   const value = await getSetting("myOption");
   inputElement.value = value || "";

   // 保存
   inputElement.addEventListener("change", async (e) => {
     await saveSetting("myOption", e.target.value);
   });
   ```

### 設定・UI を編集するファイル

- **マニフェストファイル**
  `public/manifest.json`
  拡張機能の名前，バージョン，権限（permissions），アイコンなどを定義します．

- **ポップアップの UI**

  - `public/popup.html` : ポップアップの HTML 構造を記述します．
  - `public/popup.css` : ポップアップのスタイルを定義します．
  - UI 開発については [Bootstrap](https://getbootstrap.com/) を利用しています．必要に応じて追加，変更してください．

- **アイコン**
  `public/icons/` にアイコンファイルを配置します．
  使用サイズを揃え，`manifest.json` で参照してください．

## 開発ワークフロー

### 日常的な開発サイクル

1. **Watch モードで起動**

   ```bash
   npm run watch
   ```

2. **コードを編集**

   - `src/` 配下のファイルを編集
   - 保存すると自動でビルドされ，拡張機能が自動リロードされます

3. **動作確認**
   - ポップアップやコンソールで確認
   - オートリロード機能により，手動でのリロードは不要です

### よくある開発タスク

#### 設定項目を追加する

1. `src/settings.ts` に型とデフォルト値を追加
2. `public/popup.html` に入力フォームを追加
3. `src/popup.ts` で読み込み・保存処理を実装

詳細: [設定機能ガイド](docs/SETTINGS.md)

#### API 通信を追加する

```typescript
// src/utils/api.ts を作成
export async function fetchData(url: string) {
  const response = await fetch(url);
  return response.json();
}

// background.ts で使用
import { fetchData } from "./utils/api";
const data = await fetchData("https://api.example.com/data");
```

#### 特定のサイトでコンテンツスクリプトを実行する

1. `src/content.ts` を編集
2. `public/manifest.json` で対象 URL を指定

```json
{
  "content_scripts": [
    {
      "matches": ["https://example.com/*"],
      "js": ["content.js"]
    }
  ]
}
```

## オートリロード機能について

開発モード（`npm run watch`）では，ファイルを保存すると自動的に拡張機能がリロードされます．

### 仕組み

- webpack が watch モードで起動し，ファイル変更を監視
- ビルド完了後，WebSocket サーバー（ポート 6571）にリロード信号を送信
- 拡張機能の background スクリプトが信号を受け取り，`chrome.runtime.reload()` を実行

### 注意事項

- オートリロード機能は **開発モードのみ** で動作します
- 本番ビルド（`npm run build`）では含まれません
- WebSocket サーバーはローカルホスト（localhost:6571）で動作します
- 拡張機能全体が再起動されるため，状態は保持されません
- **Service Worker が有効である必要があります**
  - `chrome://extensions/` で拡張機能の「Service Worker」の横に「無効」と表示されている場合，「ビューを検証」をクリックして有効化してください
  - Service Worker が無効だと WebSocket 接続ができず，オートリロードが動作しません

## トラブルシューティング

### オートリロードが動作しない

1. **Service Worker が有効か確認**
   - `chrome://extensions/` で拡張機能の詳細を開く
   - 「Service Worker」の横に「無効」と表示されている場合，「ビューを検証」をクリック
   - DevTools が開き，Service Worker が有効化されます
2. `npm run watch` が正常に起動しているか確認
3. ブラウザのコンソール（または Service Worker の DevTools）で WebSocket 接続エラーがないか確認
4. ポート 6571 が他のプロセスに使用されていないか確認

### ビルドエラーが出る

```bash
# node_modules を削除して再インストール
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 拡張機能が動作しない

1. `chrome://extensions/` でエラーメッセージを確認
2. ブラウザのコンソール（F12）でエラーを確認
3. `manifest.json` の permissions が正しいか確認
4. ビルドが成功しているか確認（`dist/` に成果物があるか）

### 設定が保存されない

1. `chrome.storage` の permissions が `manifest.json` にあるか確認
2. ブラウザのコンソールでエラーを確認
3. `src/settings.ts` の型定義が正しいか確認

## ドキュメント

- [設定機能の詳細ガイド](docs/SETTINGS.md) - 設定画面の実装方法

## ライセンス

MIT License

## 作者

- yhotta240 (https://github.com/yhotta240)

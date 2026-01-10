# Download Path Router

ダウンロードしたファイルの保存先を，指定した条件に応じて自動で振り分ける Chrome 拡張機能

## 特徴

- 指定した条件に応じて，ダウンロードしたファイルの保存先を自動で振り分け
- 拡張子・ファイル名・URL による柔軟なルール設定
- ユーザー操作不要の自動保存

## 必要条件

- [Node.js](https://nodejs.org/) (v18.x 以上を推奨)
- [npm](https://www.npmjs.com/) または [yarn](https://yarnpkg.com/)

## インストール

### Chrome Web Store からインストール

[Download Path Router - Chrome ウェブストア](https://chrome.google.com/webstore/detail/dhdbncbbbcfecaoagbcefnjjdkncaejm)

### 手動インストール

1. このリポジトリをクローン

   ```bash
   git clone https://github.com/yhotta240/download-path-router-extension
   cd download-path-router-extension
   ```

2. 依存関係をインストール

   ```bash
   npm install
   ```

3. ビルド

   ```bash
   npm run build
   ```

4. Chrome に読み込む
   - Chrome で `chrome://extensions/` を開く
   - 「デベロッパーモード」をオンにする
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `dist/` ディレクトリを選択

## ライセンス

MIT License

## 作者

- yhotta240 (https://github.com/yhotta240)

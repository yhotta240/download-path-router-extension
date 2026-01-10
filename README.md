# Download Path Router

ダウンロードしたファイルの保存先を，指定した条件に応じて自動で振り分ける Chrome 拡張機能

## 特徴

- 指定した条件に応じて，ダウンロードしたファイルの保存先を自動で振り分け
- 拡張子・ファイル名・URL による柔軟なルール設定
- ユーザー操作不要の自動保存

## 必要条件

- [Node.js](https://nodejs.org/) (v18.x 以上を推奨)
- [npm](https://www.npmjs.com/) または [yarn](https://yarnpkg.com/)

## クイックスタート

```bash
# リポジトリをクローン
git clone https://github.com/yhotta240/download-path-router-extension
cd download-path-router-extension

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

## ライセンス

MIT License

## 作者

- yhotta240 (https://github.com/yhotta240)

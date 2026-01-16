const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const ExtensionReloader = require("./scripts/ext-reloader");

const isDev = process.env.NODE_ENV !== "production";

module.exports = {
  mode: isDev ? "development" : "production",
  devtool: isDev ? "inline-source-map" : false,
  entry: {
    background: isDev ? "./src/background.dev.ts" : "./src/background.ts",
    content: "./src/content.ts",
    popup: "./src/popup.ts"
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  plugins: (() => {
    const plugins = [
      new CopyWebpackPlugin({
        patterns: [
          // public の静的ファイルをコピー（manifest.dev.json / manifest.prod.json は除外）
          {
            from: "./public",
            to: "./",
            globOptions: {
              ignore: ["**/manifest.dev.json", "**/manifest.prod.json"]
            }
          },
          // 適切な manifest を manifest.json として出力
          {
            from: `./public/manifest.${isDev ? "dev" : "prod"}.json`,
            to: "manifest.json"
          }
        ]
      })
    ];
    if (isDev) {
      plugins.unshift(new ExtensionReloader());
    }
    return plugins;
  })(),
  performance: {
    hints: isDev ? false : "warning"
  }
};

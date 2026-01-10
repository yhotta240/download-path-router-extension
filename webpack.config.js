const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const ExtensionReloader = require("./scripts/ext-reloader");

const isDev = process.env.NODE_ENV !== "production";

module.exports = {
  mode: isDev ? "development" : "production",
  devtool: isDev ? "inline-source-map" : false,
  entry: {
    background: "./src/background.ts",
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
          {
            from: "./public",
            to: "./",
            transform(content, absoluteFrom) {
              if (isDev) return content;
              // production ビルド時に manifest.json の "tabs"を "activeTab" に置き換え
              if (absoluteFrom.endsWith('manifest.json')) {
                const manifest = JSON.parse(content.toString());

                if (Array.isArray(manifest.permissions)) {
                  manifest.permissions = manifest.permissions.map(p => p === 'tabs' ? 'activeTab' : p);
                }

                const updated = JSON.stringify(manifest, null, 2);
                return Buffer.from(updated);
              }

              return content;
            }
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

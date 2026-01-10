import { reloadTargetTabs } from "./utils/reload-tabs";
import { reloadExtension } from "../scripts/reload";

// テスト用のターゲットURLパターン
const targetUrls = ["https://www.google.com/*"];
console.log("ターゲットURLパターン:", targetUrls);

/**
 * Background Script を初期化
 */
function initialize(): void {
  console.log("現在の環境：", process.env.NODE_ENV);

  if (process.env.NODE_ENV === "development") {
    reloadExtension();
  }

  // 拡張機能起動時にターゲットタブをリロード
  reloadTargetTabs(targetUrls);
}

initialize();
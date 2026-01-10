import { downloadPathRouter } from "./background/index";
import { reloadExtension } from "../scripts/reload";
import { reloadTargetTabs } from "./utils/reload-tabs";

const targetUrls: string[] = ["https://www.google.com/*", "https://github.com/*"];

/** 開発環境の場合，拡張機能をリロード */
function developExtension(env: string | undefined): void {
  if (env === "development") {
    console.log("開発環境：", env);
    console.log("ターゲットタブのリロードを開始します", targetUrls);
    reloadExtension();
    reloadTargetTabs(targetUrls);
  }
}

/**
 * Background Script を初期化
 */
function initialize(): void {
  developExtension(process.env.NODE_ENV);
  downloadPathRouter();
}

initialize();
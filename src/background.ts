import { downloadPathRouter } from "./background/index";

/**
 * Background Script を初期化
 */
function initialize(): void {
  downloadPathRouter();
}

initialize();
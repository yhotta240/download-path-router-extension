/**
 * 拡張機能のサイトアクセス権限を日本語テキストに変換する
 * @param origins - 権限が付与されているオリジンの配列
 * @returns サイトアクセス権限を表す日本語テキスト
 * @example
 * getSiteAccessText(['<all_urls>']); // "すべてのサイト"
 * getSiteAccessText(['https://example.com/*']); // "https://example.com/*"
 * getSiteAccessText(undefined); // "クリックされた場合のみ"
 */
export function getSiteAccessText(origins: string[] | undefined): string {
  if (origins && origins.length > 0) {
    if (origins.includes("<all_urls>")) {
      return "すべてのサイト";
    } else {
      return origins.join("<br>");
    }
  } else {
    return "クリックされた場合のみ";
  }
}

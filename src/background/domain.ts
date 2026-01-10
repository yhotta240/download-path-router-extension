/**
 * ドメイン処理ユーティリティ
 */

/**
 * URLからフルドメインを抽出
 * @param url URL文字列
 * @returns フルドメイン（例：docs.google.com）
 */
export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * URLから親ドメインを抽出
 * @param url URL文字列
 * @returns 親ドメイン（例：docs.google.com → google.com）
 */
export function extractParentDomain(url: string): string | null {
  const domain = extractDomain(url);
  if (!domain) return null;

  const parts = domain.split('.');

  // ローカルホストやIPは特別扱い
  if (parts.length <= 2 || domain === 'localhost') {
    return domain;
  }

  // 最後の2つを取得（TLD + ドメイン）
  return parts.slice(-2).join('.');
}

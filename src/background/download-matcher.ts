/**
 * ダウンロードのページURL特定ロジック
 */

import { extractDomain, extractParentDomain } from './domain';
import { getHistories } from './click-history';

/**
 * ダウンロード時のページURLを特定
 * @param downloadUrl ダウンロード元URL
 * @returns マッチしたページURL，またはnull
 */
export function findPageUrl(downloadUrl: string): string | null {
  const downloadDomain = extractDomain(downloadUrl);
  const downloadParentDomain = extractParentDomain(downloadUrl);

  if (!downloadParentDomain) {
    return getRecentFallback();
  }

  // 1. 親ドメイン一致を優先
  const parentMatch = findByParentDomain(downloadParentDomain);
  if (parentMatch) {
    return parentMatch;
  }

  // 2. 完全なドメイン一致
  if (downloadDomain) {
    const exactMatch = findByExactDomain(downloadDomain);
    if (exactMatch) {
      return exactMatch;
    }
  }

  // 3. 最新のクリック履歴をフォールバック
  return getRecentFallback();
}

/**
 * 親ドメインが一致するクリック履歴を検索
 */
function findByParentDomain(parentDomain: string): string | null {
  const match = getHistories().find(h => {
    const pageParent = extractParentDomain(h.pageUrl);
    return pageParent === parentDomain;
  });
  return match?.pageUrl || null;
}

/**
 * ドメインが完全一致するクリック履歴を検索
 */
function findByExactDomain(domain: string): string | null {
  const match = getHistories().find(h => {
    const pageDomain = extractDomain(h.pageUrl);
    return pageDomain === domain;
  });
  return match?.pageUrl || null;
}

/**
 * 最新のクリック履歴（10秒以内）をフォールバック
 */
function getRecentFallback(): string | null {
  const histories = getHistories();
  if (histories.length === 0) return null;

  const now = Date.now();
  const recent = histories[0];

  if ((now - recent.timestamp) < 10000) {
    return recent.pageUrl;
  }

  return null;
}

/**
 * クリック履歴管理
 */

export interface ClickHistory {
  pageUrl: string;
  timestamp: number;
}

const histories: ClickHistory[] = [];
const MAX_HISTORY = 50;
const HISTORY_TIMEOUT = 30000; // 30秒

/**
 * クリック履歴に記録
 */
export function recordClick(pageUrl: string, timestamp: number): void {
  histories.unshift({ pageUrl, timestamp });
  if (histories.length > MAX_HISTORY) {
    histories.pop();
  }
}

/**
 * 古い履歴をクリーンアップ
 */
export function cleanup(): void {
  const now = Date.now();
  const valid = histories.filter(h => (now - h.timestamp) < HISTORY_TIMEOUT);
  histories.length = 0;
  histories.push(...valid);
}

/**
 * 履歴を取得
 */
export function getHistories(): ClickHistory[] {
  return histories;
}

/**
 * 履歴数を取得
 */
export function getCount(): number {
  return histories.length;
}

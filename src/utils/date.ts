/**
 * 現在の日時をフォーマットして返す
 * @returns YYYY-MM-DD HH:MM形式の日時文字列
 * @example
 * const timestamp = dateTime(); // "2024-03-15 14:30"
 */
export function dateTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

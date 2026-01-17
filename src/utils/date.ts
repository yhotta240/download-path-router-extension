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

/**
 * ファイル名用の日時フォーマット情報を取得
 * @param date 対象の日付（省略時は現在時刻）
 * @returns 日時フォーマット情報
 * @example
 * const formats = getDateTimeFormats();
 * console.log(formats.date); // "20260117"
 * console.log(formats.time); // "143025"
 * console.log(formats.datetime); // "20260117-143025"
 */
export function getDateTimeFormats(date: Date = new Date()): {
  date: string;
  time: string;
  datetime: string;
} {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const timeStr = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  const datetimeStr = `${dateStr}-${timeStr}`;

  return {
    date: dateStr,
    time: timeStr,
    datetime: datetimeStr
  };
}

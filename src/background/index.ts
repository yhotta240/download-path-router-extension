import { Rule, Settings } from "../settings";
import { recordClick, cleanup } from "./click-history";
import { findPageUrl } from "./download-matcher";
import { getDateTimeFormats } from "../utils/date";

// ダウンロードIDとページURLのマッピング
const downloadPageUrlMap = new Map<number, string>();

/**
 * ファイルのダウンロードパスをルーティング
 */
export function downloadPathRouter(): void {

  // Content Script からのクリック通知を受信
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'PAGE_CLICK') {
      recordClick(message.pageUrl, message.timestamp);
    }
  });

  // ダウンロード開始時にページURLを特定
  chrome.downloads.onCreated.addListener((downloadItem) => {
    cleanup();
    const pageUrl = findPageUrl(downloadItem.url);

    if (pageUrl) {
      downloadPageUrlMap.set(downloadItem.id, pageUrl);
      console.log(`ダウンロード: ID=${downloadItem.id} → ${pageUrl}`);
    }
  });

  // ダウンロード完了/中断時にクリーンアップ
  chrome.downloads.onChanged.addListener((delta) => {
    if (delta.state?.current === 'complete' || delta.state?.current === 'interrupted') {
      downloadPageUrlMap.delete(delta.id);
    }
  });

  // ダウンロード時の名前確定イベント
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    handleDeterminingFilename(item, suggest);
    return true;
  });
}

/**
 * プレースホルダーを実際の値に置換する
 */
function replacePlaceholders(template: string, originalFilename: string): string {
  // ファイル名と拡張子を分離
  const lastDotIndex = originalFilename.lastIndexOf('.');
  const filenameWithoutExt = lastDotIndex > 0 ? originalFilename.substring(0, lastDotIndex) : originalFilename;
  const extension = lastDotIndex > 0 ? originalFilename.substring(lastDotIndex + 1) : '';

  // 日時フォーマットを取得
  const { date, time, datetime } = getDateTimeFormats();

  // プレースホルダーを置換
  let result = template
    .replace(/\[original\]/gi, filenameWithoutExt)
    .replace(/\[filename\]/gi, filenameWithoutExt)
    .replace(/\[ext\]/gi, extension)
    .replace(/\[date\]/gi, date)
    .replace(/\[time\]/gi, time)
    .replace(/\[datetime\]/gi, datetime);

  return result;
}

/**
 * ダウンロードファイル名決定処理
 */
function handleDeterminingFilename(item: chrome.downloads.DownloadItem, suggest: (suggestion?: chrome.downloads.FilenameSuggestion) => void): void {
  chrome.storage.local.get(["settings", "enabled"], (data) => {
    const enabled = data.enabled !== false;
    if (!enabled) {
      suggest();
      return;
    }

    const settings: Settings = data.settings || { rules: [] };
    const rules: Rule[] = settings.rules || [];

    // サイト別ルールを優先し，同カテゴリ内では優先度でソート
    const sortedRules = [...rules].sort((a, b) => {
      // まずカテゴリで分類（サイト別 > 通常）
      if (a.category === "site" && b.category === "general") return -1;
      if (a.category === "general" && b.category === "site") return 1;

      // 同じカテゴリ内では優先度でソート（小さいほど優先度が高い）
      const priorityA = a.priority ?? Number.MAX_VALUE;
      const priorityB = b.priority ?? Number.MAX_VALUE;
      return priorityA - priorityB;
    });

    const pageUrl = downloadPageUrlMap.get(item.id) || null;

    // ルールを順に確認
    for (const rule of sortedRules) {
      const matchResult = matchRule(rule, item, pageUrl);
      if (matchResult) {
        let filename = item.filename;

        // リネーム処理
        if (rule.rename && rule.renameFilename) {
          const originalFilename = item.filename;
          const newBasename = replacePlaceholders(rule.renameFilename, originalFilename);

          // 拡張子を追加（テンプレートに[ext]が含まれていない場合）
          const lastDotIndex = originalFilename.lastIndexOf('.');
          const extension = lastDotIndex > 0 ? originalFilename.substring(lastDotIndex) : '';

          // [ext]プレースホルダーが使われている場合は拡張子を手動追加しない
          if (rule.renameFilename.includes('[ext]')) {
            filename = `${newBasename}`;
          } else {
            filename = `${newBasename}${extension}`;
          }
        }

        const finalFilename = matchResult.folder ? `${matchResult.folder}/${filename}` : filename;

        // ファイル名の上書き設定に応じてconflictActionを変更
        const conflictAction = rule.overrideFilename ? "overwrite" : "uniquify";

        suggest({ filename: finalFilename, conflictAction: conflictAction });
        console.log(`ルール適用: ${rule.id} → ${finalFilename} (conflictAction: ${conflictAction})`);
        return;
      }
    }

    // ルール不一致はそのまま
    suggest();
  });
}

/**
 * ルール判定結果
 */
interface MatchResult {
  folder: string;
  originalFilename: string;
}

/**
 * ルール判定
 */
function matchRule(rule: Rule, item: chrome.downloads.DownloadItem, pageUrl: string | null): MatchResult | null {
  // サイト別ルールのサイト判定
  if (rule.category === "site" && rule.sitePattern) {
    const downloadUrlMatch = item.url.toLowerCase().includes(rule.sitePattern.toLowerCase());
    const pageUrlMatch = pageUrl?.toLowerCase().includes(rule.sitePattern.toLowerCase());
    if (!downloadUrlMatch && !pageUrlMatch) {
      return null;
    }
  }

  // 条件判定（拡張子、ファイル名、URL）
  const pattern = rule.pattern.toLowerCase();
  let matched = false;

  if (rule.condition === "extension") {
    const extension = item.filename.split(".").pop()?.toLowerCase() || "";
    matched = extension === pattern.replace(/^\./, "");
  } else if (rule.condition === "filename") {
    matched = item.filename.toLowerCase().includes(pattern);
  } else if (rule.condition === "url") {
    matched = item.url.toLowerCase().includes(pattern);
  }

  if (!matched) {
    return null;
  }

  return {
    folder: rule.folder.replace(/\/$/, ""),
    originalFilename: item.filename
  };
}

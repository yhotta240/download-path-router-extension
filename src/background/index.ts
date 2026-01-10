import { Rule, Settings } from "../settings";
import { recordClick, cleanup } from "./click-history";
import { findPageUrl } from "./download-matcher";

// ダウンロードIDとページURLのマッピング
const downloadPageUrlMap = new Map<number, string>();

/** ファイルのダウンロードパスをルーティング */
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

    // サイト別ルールを優先
    const sortedRules = [...rules].sort((a, b) => {
      if (a.category === "site" && b.category === "general") return -1;
      if (a.category === "general" && b.category === "site") return 1;
      return 0;
    });

    const pageUrl = downloadPageUrlMap.get(item.id) || null;

    // ルールを順に確認
    for (const rule of sortedRules) {
      const matchedFolder = matchRule(rule, item, pageUrl);
      if (matchedFolder) {
        const finalFilename = matchedFolder ? `${matchedFolder}/${item.filename}` : item.filename;
        suggest({ filename: finalFilename, conflictAction: "uniquify" });
        console.log(`ルール適用: ${rule.id} → ${finalFilename}`);
        return;
      }
    }

    // ルール不一致はそのまま
    suggest();
  });
}

/**
 * ルール判定
 */
function matchRule(rule: Rule, item: chrome.downloads.DownloadItem, pageUrl: string | null): string | null {
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

  return matched ? rule.folder.replace(/\/$/, "") : null;
}

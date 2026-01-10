import { reloadExtension } from "../scripts/reload";
import { Rule, Settings } from "./settings";

/**
 * Background Script を初期化
 */
function initialize(): void {
  console.log("現在の環境：", process.env.NODE_ENV);

  if (process.env.NODE_ENV === "development") {
    reloadExtension();
  }

  // ダウンロード時の名前確定イベントを監視
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    chrome.storage.local.get(["settings", "enabled"], (data) => {
      const enabled = data.enabled !== false; // デフォルトは有効
      if (!enabled) {
        suggest();
        return;
      }

      const settings: Settings = data.settings || { rules: [] };
      const rules: Rule[] = settings.rules || [];

      // サイト別ルールを優先するためにソート（site が先，general が後）
      // 同じカテゴリ内では登録順（あるいは後で登録したものを優先するなら逆順）
      const sortedRules = [...rules].sort((a, b) => {
        if (a.category === "site" && b.category === "general") return -1;
        if (a.category === "general" && b.category === "site") return 1;
        return 0;
      });

      for (const rule of sortedRules) {
        let match = false;

        // サイト別ルールのサイト判定（sitePatternがある場合）
        if (rule.category === "site" && rule.sitePattern) {
          if (!item.url.toLowerCase().includes(rule.sitePattern.toLowerCase())) {
            continue; // サイトがマッチしない場合は次のルールへ
          }
        }

        const pattern = rule.pattern.toLowerCase();
        if (rule.condition === "extension") {
          // 拡張子チェック (例: .pdf)
          const extension = item.filename.split(".").pop()?.toLowerCase() || "";
          match = extension === pattern.replace(/^\./, "");
        } else if (rule.condition === "filename") {
          // ファイル名チェック (部分一致)
          match = item.filename.toLowerCase().includes(pattern);
        } else if (rule.condition === "url") {
          // URLチェック (部分一致)
          match = item.url.toLowerCase().includes(pattern);
        }

        if (match) {
          // フォルダ名がある場合は，フォルダ名/ファイル名 として提案
          // フォルダ名の末尾の / は除去して結合
          const folder = rule.folder.replace(/\/$/, "");
          const finalFilename = folder ? `${folder}/${item.filename}` : item.filename;

          suggest({
            filename: finalFilename,
            conflictAction: "uniquify",
          });
          console.log(`Matched rule: ${rule.id}, moving to: ${finalFilename}`);
          return;
        }
      }

      // マッチするルールがない場合はそのまま
      suggest();
    });

    // 非同期で suggest を呼び出すために true を返す
    return true;
  });
}

initialize();
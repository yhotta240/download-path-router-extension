/**
 * ルールの条件タイプ
 */
export type ConditionType = "filename" | "url" | "extension";

/**
 * ルールの種類（通常設定かサイト別設定か）
 */
export type RuleCategory = "general" | "site";

/**
 * 振り分けルールの型定義
 */
export interface Rule {
  id: string;
  category: RuleCategory;
  sitePattern?: string; // 対象サイトのURLパターン（siteカテゴリの場合のみ使用）
  condition: ConditionType;
  pattern: string; // マッチングに使用する文字列
  folder: string; // 保存先フォルダ名（相対パス）
  overrideFilename?: boolean; // ファイル名を上書きするかどうか
  rename?: boolean; // リネーム機能を使用するかどうか
  renameFilename?: string; // リネーム時の新しいファイル名
  priority?: number; // カテゴリ内での優先順位（小さいほど優先度が高い）
}

/**
 * テーマの型定義
 */
export type Theme = 'system' | 'light' | 'dark';

/**
 * 設定の型定義
 */
export interface Settings {
  rules: Rule[];
  newRuleId?: string | null; // 新規ルール作成時に使用する一時的なID
}

/**
 * 設定のデフォルト値
 */
export const DEFAULT_SETTINGS: Settings = {
  rules: [],
  newRuleId: null,
};

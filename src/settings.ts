/**
 * 拡張機能の設定定義
 * ここにデフォルト値と型を定義することで，設定を一元管理できます
 */

/**
 * 設定の型定義
 * 実際のアプリケーションで使用する設定項目をここに追加してください
 */
export interface Settings {
  // ========== サンプル設定項目 ==========
  // 以下はサンプルです．実際の設定項目に置き換えてください

  // theme?: 'light' | 'dark' | 'system';
  // fontSize?: number;
  // notifications?: boolean;
  // apiKey?: string;
  // displayMode?: 'compact' | 'standard';
  // language?: 'ja' | 'en';

  // ========== 追加例 ==========
  // autoSave?: boolean;
  // refreshInterval?: number;
  // maxItems?: number;
}

/**
 * 設定のデフォルト値
 * 初回起動時や設定がリセットされた時に使用されます
 */
export const DEFAULT_SETTINGS: Settings = {
  // ========== サンプルのデフォルト値 ==========
  // 以下はサンプルです．実際の設定項目に置き換えてください

  // theme: 'system',
  // fontSize: 16,
  // notifications: true,
  // apiKey: '',
  // displayMode: 'standard',
  // language: 'ja',
};

/**
 * 設定の説明やバリデーションルール
 * オプション：設定値の制約を定義できます
 */
export const SETTINGS_CONFIG = {
  // ========== サンプルの設定制約 ==========
  // fontSize: {
  //   min: 12,
  //   max: 24,
  //   step: 1,
  // },
  // maxItems: {
  //   min: 1,
  //   max: 100,
  // },
};

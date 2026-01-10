import { Settings, DEFAULT_SETTINGS } from '../settings';

/**
 * Chrome拡張機能の設定管理ユーティリティ
 * chrome.storage.localを使用した設定の読み書きを簡単にするヘルパー関数群
 */

/**
 * 設定値を取得する
 * @param key - 設定のキー名
 * @param defaultValue - デフォルト値（省略時は設定定義のデフォルト値を使用）
 * @returns Promise<T> 設定値
 * @example
 * const theme = await getSetting('theme');
 */
export function getSetting<K extends keyof Settings>(
  key: K,
  defaultValue?: Settings[K]
): Promise<Settings[K]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (data) => {
      const settings = data.settings || {};
      const value = settings[key] !== undefined ? settings[key] : (defaultValue ?? DEFAULT_SETTINGS[key]);
      resolve(value);
    });
  });
}

/**
 * 設定値を保存する
 * @param key - 設定のキー名
 * @param value - 保存する値
 * @returns Promise<void>
 * @example
 * await saveSetting('theme', 'dark');
 */
export function saveSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (data) => {
      const settings = data.settings || {};
      settings[key] = value;
      chrome.storage.local.set({ settings }, () => {
        resolve();
      });
    });
  });
}

/**
 * すべての設定を取得する（デフォルト値とマージ）
 * @returns Promise<Settings> すべての設定値
 * @example
 * const allSettings = await getAllSettings();
 */
export function getAllSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (data) => {
      const settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
      resolve(settings);
    });
  });
}

/**
 * 複数の設定値を一度に保存する
 * @param settings - 保存する設定のオブジェクト
 * @returns Promise<void>
 * @example
 * await saveSettings({ theme: 'dark', fontSize: 16, notifications: true });
 */
export function saveSettings(settings: Partial<Settings>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (data) => {
      const currentSettings = data.settings || {};
      const updatedSettings = { ...currentSettings, ...settings };
      chrome.storage.local.set({ settings: updatedSettings }, () => {
        resolve();
      });
    });
  });
}

/**
 * 特定の設定を削除する（デフォルト値に戻す）
 * @param key - 削除する設定のキー名
 * @returns Promise<void>
 * @example
 * await removeSetting('theme');
 */
export function removeSetting<K extends keyof Settings>(key: K): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (data) => {
      const settings = data.settings || {};
      delete settings[key];
      chrome.storage.local.set({ settings }, () => {
        resolve();
      });
    });
  });
}

/**
 * すべての設定をクリアする（デフォルト値に戻す）
 * @returns Promise<void>
 * @example
 * await clearAllSettings();
 */
export function clearAllSettings(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ settings: {} }, () => {
      resolve();
    });
  });
}

/**
 * 設定をデフォルト値にリセットする
 * @returns Promise<void>
 * @example
 * await resetToDefaultSettings();
 */
export function resetToDefaultSettings(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ settings: DEFAULT_SETTINGS }, () => {
      resolve();
    });
  });
}

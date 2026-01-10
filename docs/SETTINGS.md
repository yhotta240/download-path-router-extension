# 設定機能の使い方

このスターターキットでは，Chrome 拡張機能の設定を簡単に管理するためのユーティリティを提供しています．

## 設定の定義

設定は `src/settings.ts` で一元管理されます．

### 1. 設定の型を定義する

```typescript
export interface Settings {
  theme?: "light" | "dark" | "system";
  fontSize?: number;
  notifications?: boolean;
}
```

### 2. デフォルト値を設定する

```typescript
export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  fontSize: 16,
  notifications: true,
};
```

これにより，型安全性が保証され，デフォルト値が一元管理されます．

## 基本的な使い方

### 1. HTML に設定項目を追加する

`public/popup.html`の設定タブに，必要な設定項目を追加します．
コメントアウトされているテンプレートを参考にしてください．

```html
<!-- セレクトボックスの例 -->
<li class="list-group-item">
  <div class="mb-3">
    <label for="theme-select" class="form-label d-flex">テーマ：</label>
    <select class="form-select" id="theme-select">
      <option value="light">ライト</option>
      <option value="dark">ダーク</option>
      <option value="system">システム</option>
    </select>
  </div>
</li>
```

### 2. TypeScript でイベントリスナーを設定する

`src/popup.ts`の`setupSettingsListeners()`メソッドに，設定項目のイベントリスナーを追加します．

```typescript
import { saveSetting } from './utils/settings';

private setupSettingsListeners(): void {
  const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
  if (themeSelect) {
    themeSelect.addEventListener('change', async (event) => {
      const value = (event.target as HTMLSelectElement).value as 'light' | 'dark' | 'system';
      await saveSetting('theme', value);
      this.showMessage(`テーマを「${value}」に変更しました`);
    });
  }
}
```

### 3. 設定値の読み込み

`loadInitialState()`メソッドで，保存された設定値を読み込みます．

```typescript
import { getSetting, getAllSettings } from './utils/settings';

private async loadInitialState(): Promise<void> {
  // 個別の設定値を取得
  const theme = await getSetting('theme');
  if (theme) {
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
    if (themeSelect) themeSelect.value = theme;
  }

  // または，すべての設定を一度に取得
  const settings = await getAllSettings();
  if (settings.theme) {
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
    if (themeSelect) themeSelect.value = settings.theme;
  }
}
```

## 設定ユーティリティ関数の使い方

`src/utils/settings.ts`には，設定管理を簡単にするヘルパー関数が用意されています．

### 設定値の取得

```typescript
import { getSetting } from "./utils/settings";

// デフォルト値は自動的に適用されます
const theme = await getSetting("theme");

// カスタムデフォルト値も指定可能
const fontSize = await getSetting("fontSize", 14);
```

### 設定値の保存

```typescript
import { saveSetting } from "./utils/settings";

// 型安全：定義された設定のみ保存可能
await saveSetting("theme", "dark");
```

### 複数の設定を一度に保存

```typescript
import { saveSettings } from "./utils/settings";

await saveSettings({
  theme: "dark",
  fontSize: 18,
  notifications: false,
});
```

### すべての設定を取得

```typescript
import { getAllSettings } from "./utils/settings";

// デフォルト値とマージされた完全な設定を取得
const allSettings = await getAllSettings();
console.log(allSettings);
```

### 設定をリセット

```typescript
import { resetToDefaultSettings, clearAllSettings } from "./utils/settings";

// デフォルト値にリセット
await resetToDefaultSettings();

// すべての設定をクリア（空にする）
await clearAllSettings();
```

## 設定項目のテンプレート例

### セレクトボックス

```html
<li class="list-group-item">
  <div class="mb-3">
    <label for="example-select" class="form-label d-flex">ラベル：</label>
    <select class="form-select" id="example-select">
      <option value="option1">選択肢1</option>
      <option value="option2">選択肢2</option>
    </select>
  </div>
</li>
```

### チェックボックス

```html
<li class="list-group-item">
  <div class="form-check mb-2">
    <input class="form-check-input" type="checkbox" id="example-checkbox" />
    <label class="form-check-label" for="example-checkbox"> チェックボックスのラベル </label>
  </div>
</li>
```

### スライダー

```html
<li class="list-group-item">
  <div class="mb-3">
    <label for="example-range" class="form-label d-flex">スライダー：</label>
    <input type="range" class="form-range" id="example-range" min="0" max="100" value="50" />
    <small class="text-muted">説明文</small>
  </div>
</li>
```

### テキスト入力

```html
<li class="list-group-item">
  <div class="mb-3">
    <label for="example-text" class="form-label d-flex">テキスト：</label>
    <input type="text" class="form-control" id="example-text" placeholder="プレースホルダー" />
  </div>
</li>
```

## content.ts や background.ts で設定を使う

他のスクリプトでも設定値を使用できます．

```typescript
import { getSetting, getAllSettings } from "./utils/settings";

// content.tsでの使用例
const theme = await getSetting("theme");
if (theme === "dark") {
  document.body.classList.add("dark-mode");
}

// background.tsでの使用例
const settings = await getAllSettings();
if (settings.notifications) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: "Notification",
    message: "Hello!",
  });
}
```

## 設定変更の監視

設定が変更されたときに処理を実行する場合：

```typescript
// 設定変更を監視
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.settings) {
    const newSettings = changes.settings.newValue;
    console.log("設定が変更されました:", newSettings);

    // 設定に応じた処理を実行
    if (newSettings.theme) {
      applyTheme(newSettings.theme);
    }
  }
});
```

## 注意事項

- 設定は`chrome.storage.local`に保存されます
- 設定値は拡張機能がアンインストールされると削除されます
- 大きなデータ（画像など）は保存しないでください（容量制限があります）
- デフォルト値は`src/settings.ts`で一元管理されます

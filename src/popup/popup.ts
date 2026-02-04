import './popup.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import Sortable from 'sortablejs';
import { PopupPanel } from './panel';
import { dateTime } from '../utils/date';
import { openLinkNewTab } from '../utils/dom';
import { getSiteAccessText } from '../utils/permissions';
import meta from '../../public/manifest.meta.json';
import { Rule, Settings, ConditionType, RuleCategory, DEFAULT_SETTINGS, Theme } from '../settings';
import { applyTheme, initThemeMenu } from './theme';
import { initShareMenu, SharePlatform } from './share';

class PopupManager {
  private panel: PopupPanel;
  private enabled: boolean = false;
  private enabledElement: HTMLInputElement | null;
  private manifestData: chrome.runtime.Manifest;
  private manifestMetadata: { [key: string]: any };
  private sortModeActive: { site: boolean; general: boolean } = { site: false, general: false };
  private sortableInstances: { site: Sortable | null; general: Sortable | null } = { site: null, general: null };

  constructor() {
    this.panel = new PopupPanel();
    this.enabledElement = document.getElementById('enabled') as HTMLInputElement;
    this.manifestData = chrome.runtime.getManifest();
    this.manifestMetadata = (meta as any) || {};

    this.loadInitialState();
    this.addEventListeners();
    this.initializeUI();
  }

  private loadInitialState(): void {
    chrome.storage.local.get(['settings', 'enabled', 'formCollapsed'], (data) => {
      if (this.enabledElement) {
        this.enabled = data.enabled !== false; // デフォルトは有効
        this.enabledElement.checked = this.enabled;
      }
      this.showMessage(`${this.manifestData.short_name} が起動しました`);

      const settings: Settings = data.settings || DEFAULT_SETTINGS;
      // newRuleId は無視して開いたときは表示しない
      this.renderRules(settings.rules, null);

      applyTheme(settings.theme || DEFAULT_SETTINGS.theme);

      // フォームの折りたたみ状態を復元
      const collapseEl = document.getElementById('collapseForm');
      if (collapseEl) {
        const isCollapsed = data.formCollapsed || false;
        if (isCollapsed) {
          collapseEl.classList.remove('show');
          const btn = document.querySelector('[data-bs-target="#collapseForm"]') as HTMLElement;
          if (btn) btn.classList.add('collapsed');
        }
      }
    });
  }

  private addEventListeners(): void {
    if (this.enabledElement) {
      this.enabledElement.addEventListener('change', (event) => {
        this.enabled = (event.target as HTMLInputElement).checked;
        chrome.storage.local.set({ enabled: this.enabled }, () => {
          this.showMessage(this.enabled ? `${this.manifestData.short_name} は有効になっています` : `${this.manifestData.short_name} は無効になっています`);
        });
      });
    }

    // テーマ設定メニュー
    initThemeMenu(async (value: Theme) => {
      chrome.storage.local.get(['settings'], (data) => {
        const settings: Settings = data.settings || DEFAULT_SETTINGS;
        if (settings.theme !== value) {
          settings.theme = value;
          chrome.storage.local.set({ settings });
          this.showMessage(`テーマを ${value} に変更しました`);
        }
      });
    });

    // シェアメニュー
    initShareMenu((platform: SharePlatform, success: boolean) => {
      const platformNames: Record<SharePlatform, string> = {
        twitter: 'X (Twitter)',
        facebook: 'Facebook',
        copy: 'クリップボード',
      };
      if (success) {
        if (platform === 'copy') {
          this.showMessage('URLをコピーしました');
        } else {
          this.showMessage(`${platformNames[platform]}でシェアしました`);
        }
      } else {
        this.showMessage('シェアに失敗しました');
      }
    });

    // フォームの折りたたみ状態を保存
    const collapseEl = document.getElementById('collapseForm');
    if (collapseEl) {
      collapseEl.addEventListener('shown.bs.collapse', () => {
        chrome.storage.local.set({ formCollapsed: false });
      });
      collapseEl.addEventListener('hidden.bs.collapse', () => {
        chrome.storage.local.set({ formCollapsed: true });
      });
    }

    // ルール追加/更新ボタン
    const addButton = document.getElementById('add-rule-button');
    if (addButton) {
      addButton.addEventListener('click', () => this.handleAddOrUpdateRule());
    }

    // 編集キャンセルボタン
    const cancelEditButton = document.getElementById('cancel-edit-button');
    if (cancelEditButton) {
      cancelEditButton.addEventListener('click', () => this.cancelEdit());
    }

    // 並び替えボタン
    const toggleSiteSortBtn = document.getElementById('toggle-site-sort-mode');
    if (toggleSiteSortBtn) {
      toggleSiteSortBtn.addEventListener('click', () => this.toggleSortMode('site'));
    }

    const toggleGeneralSortBtn = document.getElementById('toggle-general-sort-mode');
    if (toggleGeneralSortBtn) {
      toggleGeneralSortBtn.addEventListener('click', () => this.toggleSortMode('general'));
    }

    // カテゴリ選択による表示切り替え
    const categorySelect = document.getElementById('rule-category') as HTMLSelectElement;
    const sitePatternContainer = document.getElementById('site-pattern-container');
    if (categorySelect && sitePatternContainer) {
      categorySelect.addEventListener('change', () => {
        sitePatternContainer.style.display = categorySelect.value === 'site' ? 'block' : 'none';
      });
    }

    // 現在のサイトを取得するボタン
    const getCurrentSiteButton = document.getElementById('get-current-site-button');
    if (getCurrentSiteButton) {
      getCurrentSiteButton.addEventListener('click', () => this.fillCurrentSiteUrl());
    }

    // リネームチェックボックスによる入力フィールド表示制御
    const renameCheckbox = document.getElementById('rule-rename') as HTMLInputElement;
    const renameInputContainer = document.getElementById('rule-rename-input-container');
    if (renameCheckbox && renameInputContainer) {
      renameCheckbox.addEventListener('change', () => {
        renameInputContainer.style.display = renameCheckbox.checked ? 'block' : 'none';
      });
    }

    // ポップアップが閉じられる時に newRuleId をクリアしてバッジを消す
    const clearNewRuleId = () => {
      chrome.storage.local.get(['settings'], (data) => {
        const settings: Settings = data.settings || DEFAULT_SETTINGS;
        if (settings.newRuleId) {
          settings.newRuleId = null;
          chrome.storage.local.set({ settings });
        }
      });
    };

    document.addEventListener('visibilitychange', () => {
      console.log('Document visibility changed:', document.visibilityState);
      if (document.visibilityState === 'hidden') clearNewRuleId();
    });
  }

  private fillCurrentSiteUrl(): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].url) {
        const url = tabs[0].url;
        // URLからドメイン部分を抽出
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname; // www なしのドメインを取得
          const sitePatternInput = document.getElementById('rule-site-pattern') as HTMLInputElement;
          if (sitePatternInput) {
            sitePatternInput.value = domain;
          }
        } catch (error) {
          // console.error('URL parsing error:', error);
          // URLのパース失敗時は全URLを入力
          const sitePatternInput = document.getElementById('rule-site-pattern') as HTMLInputElement;
          if (sitePatternInput) {
            sitePatternInput.value = url;
          }
        }
      }
    });
  }

  private handleAddOrUpdateRule(): void {
    const idInput = document.getElementById('rule-id') as HTMLInputElement;
    const category = (document.getElementById('rule-category') as HTMLSelectElement).value as RuleCategory;
    const condition = (document.getElementById('rule-condition') as HTMLSelectElement).value as ConditionType;
    const pattern = (document.getElementById('rule-pattern') as HTMLInputElement).value.trim();
    const folder = (document.getElementById('rule-folder') as HTMLInputElement).value.trim();
    const sitePattern = (document.getElementById('rule-site-pattern') as HTMLInputElement).value.trim();
    const overrideFilename = (document.getElementById('rule-override-filename') as HTMLInputElement).checked;
    const rename = (document.getElementById('rule-rename') as HTMLInputElement).checked;
    const renameFilename = (document.getElementById('rule-rename-filename') as HTMLInputElement).value.trim();

    if (!pattern) {
      alert('パターンを入力してください');
      return;
    }

    if (category === 'site' && !sitePattern) {
      alert('対象サイトを入力してください');
      return;
    }

    const ruleId = idInput.value || Date.now().toString();
    const isEdit = !!idInput.value;

    const updatedRule: Rule = {
      id: ruleId,
      category,
      sitePattern: category === 'site' ? sitePattern : undefined,
      condition,
      pattern,
      folder,
      overrideFilename: overrideFilename || undefined,
      rename: rename || undefined,
      renameFilename: rename && renameFilename ? renameFilename : undefined,
      priority: undefined,
    };

    chrome.storage.local.get(['settings'], (data) => {
      const settings: Settings = data.settings || { rules: [] };

      if (isEdit) {
        // 既存ルールの更新
        const index = settings.rules.findIndex(r => r.id === ruleId);
        if (index === -1) {
          console.error('編集しようとしたルールが見つかりません:', ruleId);
          this.showMessage('ルールの編集に失敗しました．対象のルールが見つかりませんでした．');
          return;
        }

        const originalRule = settings.rules[index];

        if (originalRule.category === updatedRule.category) {
          // カテゴリ変更なし: 優先度を維持して上書き
          updatedRule.priority = originalRule.priority;
          settings.rules[index] = updatedRule;
        } else {
          // カテゴリ変更あり: 元ルールを削除し，新カテゴリの先頭に挿入
          settings.rules = settings.rules.filter(r => r.id !== ruleId);
          this.insertRuleAtCategoryHead(settings, updatedRule);
        }
        // 編集後は newRuleId をクリア
        if (settings.newRuleId === ruleId) settings.newRuleId = null;
      } else {
        // 新規ルール追加: 指定カテゴリの先頭に挿入して既存優先度を +1
        this.insertRuleAtCategoryHead(settings, updatedRule);
        settings.newRuleId = updatedRule.id; // 新規追加されたルールのIDを保存
      }

      // 優先度の連番を詰めてから保存
      this.normalizePriorities(settings);
      chrome.storage.local.set({ settings }, () => {
        if (chrome.runtime.lastError) {
          console.error('ルールの保存中にエラーが発生しました:', chrome.runtime.lastError);
          this.showMessage('ルールの保存に失敗しました．もう一度お試しください．');
          return;
        }
        this.renderRules(settings.rules, settings.newRuleId);
        this.showMessage(isEdit ? 'ルールを更新しました' : '新しいルールを追加しました');
        this.cancelEdit(); // フォームをクリアしてモードリセット
      });
    });
  }

  private cancelEdit(): void {
    const idInput = document.getElementById('rule-id') as HTMLInputElement;
    const addButton = document.getElementById('add-rule-button');
    const cancelButton = document.getElementById('cancel-edit-button');
    const formTitle = document.getElementById('form-title');
    const accordionItem = document.getElementById('form-accordion-item');
    const accordionButton = document.getElementById('form-accordion-button');

    idInput.value = '';

    // フォームをクリア
    (document.getElementById('rule-pattern') as HTMLInputElement).value = '';
    (document.getElementById('rule-folder') as HTMLInputElement).value = '';
    (document.getElementById('rule-site-pattern') as HTMLInputElement).value = '';
    (document.getElementById('rule-override-filename') as HTMLInputElement).checked = false;
    (document.getElementById('rule-rename') as HTMLInputElement).checked = false;
    (document.getElementById('rule-rename-filename') as HTMLInputElement).value = '';
    const renameInputContainer = document.getElementById('rule-rename-input-container');
    if (renameInputContainer) {
      renameInputContainer.style.display = 'none';
    }

    // ボタンとタイトルを元に戻す
    if (addButton) {
      addButton.textContent = 'ルールを追加';
      addButton.classList.remove('btn-success');
      addButton.classList.add('btn-primary');
    }
    if (cancelButton) cancelButton.style.display = 'none';
    if (formTitle) formTitle.textContent = '新規ルール追加';

    // スタイルをリセット
    if (accordionItem) {
      accordionItem.style.borderColor = '';
    }
    if (accordionButton) {
      accordionButton.style.backgroundColor = '';
      accordionButton.style.color = '';
    }
  }

  private handleEditRule(rule: Rule): void {
    this.populateRuleForm(rule, { setId: true, mode: 'edit' });
  }

  // 既存ルールの内容を新規追加フォームへコピーする
  private handleCopyRule(rule: Rule): void {
    this.populateRuleForm(rule, { setId: false, mode: 'new' });
  }

  // ルールオブジェクトからフォームへ値をセットする
  private populateRuleForm(rule: Rule, options: { setId: boolean; mode: 'edit' | 'new' }): void {
    const idInput = document.getElementById('rule-id') as HTMLInputElement;
    const categorySelect = document.getElementById('rule-category') as HTMLSelectElement;
    const conditionSelect = document.getElementById('rule-condition') as HTMLSelectElement;
    const patternInput = document.getElementById('rule-pattern') as HTMLInputElement;
    const folderInput = document.getElementById('rule-folder') as HTMLInputElement;
    const sitePatternInput = document.getElementById('rule-site-pattern') as HTMLInputElement;
    const overrideFilenameCheckbox = document.getElementById('rule-override-filename') as HTMLInputElement;
    const renameCheckbox = document.getElementById('rule-rename') as HTMLInputElement;
    const renameFilenameInput = document.getElementById('rule-rename-filename') as HTMLInputElement;
    const renameInputContainer = document.getElementById('rule-rename-input-container');
    const sitePatternContainer = document.getElementById('site-pattern-container');
    const addButton = document.getElementById('add-rule-button');
    const cancelButton = document.getElementById('cancel-edit-button');
    const formTitle = document.getElementById('form-title');
    const accordionItem = document.getElementById('form-accordion-item');
    const accordionButton = document.getElementById('form-accordion-button');

    // ID の扱い
    if (options.setId) {
      if (idInput) idInput.value = rule.id;
    } else {
      if (idInput) idInput.value = '';
    }

    // フォームに値をセット（ID, priority はコピーしない）
    if (categorySelect) categorySelect.value = rule.category;
    if (conditionSelect) conditionSelect.value = rule.condition;
    if (patternInput) patternInput.value = rule.pattern;
    if (folderInput) folderInput.value = rule.folder;
    if (sitePatternInput) sitePatternInput.value = rule.sitePattern || '';
    if (overrideFilenameCheckbox) overrideFilenameCheckbox.checked = rule.overrideFilename || false;
    if (renameCheckbox) renameCheckbox.checked = rule.rename || false;
    if (renameFilenameInput) renameFilenameInput.value = rule.renameFilename || '';
    if (renameInputContainer) {
      renameInputContainer.style.display = (rule.rename || false) ? 'block' : 'none';
    }

    // カテゴリによる表示切り替え
    if (sitePatternContainer) {
      sitePatternContainer.style.display = rule.category === 'site' ? 'block' : 'none';
    }

    // UI のモード切替
    if (options.mode === 'edit') {
      if (addButton) {
        addButton.textContent = 'ルールを編集';
        addButton.classList.remove('btn-primary');
        addButton.classList.add('btn-success');
      }
      if (cancelButton) cancelButton.style.display = 'block';
      if (formTitle) formTitle.textContent = 'ルールの編集';

      if (accordionItem) accordionItem.style.borderColor = '#badbcc';
      if (accordionButton) {
        accordionButton.style.backgroundColor = '#e2f0e9';
        accordionButton.style.color = '#0f5132';
      }
    } else {
      if (addButton) {
        addButton.textContent = 'ルールを追加';
        addButton.classList.remove('btn-success');
        addButton.classList.add('btn-primary');
      }
      if (cancelButton) cancelButton.style.display = 'none';
      if (formTitle) formTitle.textContent = '新規ルール追加';

      if (accordionItem) accordionItem.style.borderColor = '';
      if (accordionButton) {
        accordionButton.style.backgroundColor = '';
        accordionButton.style.color = '';
      }
    }

    // アコーディオンを開いてスクロール
    const collapseEl = document.getElementById('collapseForm');
    if (collapseEl && !collapseEl.classList.contains('show')) {
      const btn = document.querySelector('[data-bs-target="#collapseForm"]') as HTMLElement;
      if (btn) btn.click();
    }
    collapseEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private renderRules(rules: Rule[], newRuleId?: string | null): void {
    const siteList = document.getElementById('site-rules-list');
    const generalList = document.getElementById('general-rules-list');

    if (!siteList || !generalList) return;

    siteList.innerHTML = '';
    generalList.innerHTML = '';

    const siteRules = rules.filter(r => r.category === 'site');
    const generalRules = rules.filter(r => r.category === 'general');

    // 優先度でソート（小さいほど優先度が高い）
    const sortByPriority = (a: Rule, b: Rule) => {
      const priorityA = a.priority ?? Number.MAX_VALUE;
      const priorityB = b.priority ?? Number.MAX_VALUE;
      return priorityA - priorityB;
    };

    if (siteRules.length === 0) {
      siteList.innerHTML = '<div class="text-muted small text-center p-2 border rounded">登録されたルールはありません</div>';
    } else {
      siteRules.sort(sortByPriority).forEach((rule, index) => {
        const isNew = newRuleId === rule.id;
        siteList.appendChild(this.createRuleElement(rule, index + 1, isNew));
      });
      if (this.sortModeActive.site) {
        this.initSortable(siteList, 'site');
      }
    }

    if (generalRules.length === 0) {
      generalList.innerHTML = '<div class="text-muted small text-center p-2 border rounded">登録されたルールはありません</div>';
    } else {
      generalRules.sort(sortByPriority).forEach((rule, index) => {
        const isNew = newRuleId === rule.id;
        generalList.appendChild(this.createRuleElement(rule, index + 1, isNew));
      });
      if (this.sortModeActive.general) {
        this.initSortable(generalList, 'general');
      }
    }

    // 並び替えモードの表示状態を更新
    this.updateSortModeDisplay();
  }

  private createRuleElement(rule: Rule, priority: number, isNew?: boolean): HTMLElement {
    const div = document.createElement('div');
    div.className = 'list-group-item p-2 d-flex justify-content-between align-items-center';
    div.id = `rule-${rule.id}`;
    div.setAttribute('data-id', rule.id);

    const conditionLabels: { [key: string]: string } = {
      extension: '拡張子',
      filename: '名',
      url: 'URL'
    };

    // ファビコンの取得（Googleのサービスを利用）
    // rule.sitePattern がドメイン名であることを期待
    let faviconUrl = '';
    if (rule.category === 'site' && rule.sitePattern) {
      // http/httpsが付いていない場合は補完
      const domain = rule.sitePattern.includes('://') ? rule.sitePattern.split('/')[2] : rule.sitePattern;
      faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    }

    const iconHtml = faviconUrl
      ? `<img src="${faviconUrl}" class="me-2 rounded-circle" style="width: 16px; height: 16px; object-fit: contain;" onerror="this.src='/icons/icon.png'">`
      : `<i class="bi bi-file-earmark me-2" style="font-size: 14px;"></i>`;

    const siteInfo = rule.sitePattern
      ? `<div class="text-primary text-truncate d-flex align-items-center" style="font-size: 0.7rem;">
          ${iconHtml}
          ${rule.sitePattern}
        </div>`
      : '';

    const newBadgeHtml = `<span class="badge bg-danger ms-1 ${isNew ? '' : 'd-none'}" title="新規追加">NEW</span>`;

    div.innerHTML = `
      <div class="drag-handle" style="cursor: move; padding: 4px; margin-right: 8px;">
        <i class="bi bi-grip-vertical" style="font-size: 16px; color: #6c757d;"></i>
      </div>
      <div class="overflow-hidden me-2" style="font-size: 0.85rem; flex: 1;">
        <div class="fw-bold text-truncate d-flex align-items-center" title="${rule.pattern}">
          <span class="badge bg-info me-1">優先度: ${priority}</span>
          <span class="badge bg-secondary me-1">${conditionLabels[rule.condition]}</span>
          ${rule.pattern}
          ${newBadgeHtml}
        </div>
        ${siteInfo}
        <div class="text-muted text-truncate" style="font-size: 0.75rem;">
          <i class="bi bi-folder me-1"></i>${rule.folder || '(ルート)'}
        </div>
      </div>
      <div class="d-flex gap-1">
        <button class="btn btn-outline-success btn-sm p-1 edit-rule" style="width: 28px; height: 28px;" title="編集">
          <i class="bi bi-pencil-square" style="pointer-events: none;"></i>
        </button>
        <button class="btn btn-outline-secondary btn-sm p-1 copy-rule" style="width: 28px; height: 28px;" title="コピー">
          <i class="bi bi-clipboard" style="pointer-events: none;"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm p-1 delete-rule" style="width: 28px; height: 28px;" title="削除" data-id="${rule.id}">
          <i class="bi bi-trash" style="pointer-events: none;"></i>
        </button>
      </div>
    `;

    const editBtn = div.querySelector('.edit-rule');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.handleEditRule(rule));
    }

    const copyBtn = div.querySelector('.copy-rule');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.handleCopyRule(rule));
    }

    const deleteBtn = div.querySelector('.delete-rule');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.handleDeleteRule(rule.id));
    }

    return div;
  }

  private initSortable(element: HTMLElement, category: RuleCategory): void {
    // 既存のインスタンスがあれば破棄
    if (this.sortableInstances[category]) {
      this.sortableInstances[category]!.destroy();
    }

    this.sortableInstances[category] = Sortable.create(element, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      onEnd: (evt) => {
        if (evt.oldIndex === evt.newIndex) return;

        chrome.storage.local.get(['settings'], (data) => {
          const settings: Settings = data.settings || { rules: [] };
          const categoryRules = settings.rules
            .filter(r => r.category === category)
            .sort((a, b) => {
              const priorityA = a.priority ?? Number.MAX_VALUE;
              const priorityB = b.priority ?? Number.MAX_VALUE;
              return priorityA - priorityB;
            });

          // 移動先のインデックスに基づいて優先度を再計算
          const movedRule = categoryRules[evt.oldIndex!];
          categoryRules.splice(evt.oldIndex!, 1);
          categoryRules.splice(evt.newIndex!, 0, movedRule);

          // 新しい優先度を割り当て
          categoryRules.forEach((rule, index) => {
            rule.priority = index + 1;
          });

          // 全体を正規化して保存
          this.normalizePriorities(settings);
          chrome.storage.local.set({ settings }, () => {
            if (chrome.runtime.lastError) {
              console.error('ルールの並び替え中にエラーが発生しました:', chrome.runtime.lastError);
              this.showMessage('ルールの並び替えに失敗しました．もう一度お試しください．');
              return;
            }
            this.renderRules(settings.rules, settings.newRuleId);
            this.showMessage('ルールの優先度を変更しました');
          });
        });
      }
    });
  }

  // 各カテゴリごとに優先度を1..Nの連番に詰め直し，settings.rules をカテゴリ順に再構成する
  private normalizePriorities(settings: Settings): void {
    const categories = ['site', 'general'] as const;
    const normalized: Rule[] = [];

    categories.forEach((cat) => {
      const group = settings.rules
        .filter(r => r.category === cat)
        .sort((a, b) => (a.priority ?? Number.MAX_VALUE) - (b.priority ?? Number.MAX_VALUE));

      group.forEach((r, i) => { r.priority = i + 1; });
      normalized.push(...group);
    });

    settings.rules = normalized;
  }

  // 指定カテゴリの先頭にルールを挿入し，既存ルールの優先度を +1 する
  private insertRuleAtCategoryHead(settings: Settings, updatedRule: Rule): void {
    const currentCategoryRules = settings.rules.filter(r => r.category === updatedRule.category);
    const otherCategoryRules = settings.rules.filter(r => r.category !== updatedRule.category);

    const newRuleWithPriority: Rule = {
      ...updatedRule,
      priority: 1,
    };

    const categoryRulesWithUpdatedPriority: Rule[] = currentCategoryRules.map(r => {
      if (typeof r.priority === 'number') {
        return { ...r, priority: r.priority + 1 };
      }
      return r;
    });

    settings.rules = [newRuleWithPriority, ...categoryRulesWithUpdatedPriority, ...otherCategoryRules];
  }

  private toggleSortMode(category: RuleCategory): void {
    this.sortModeActive[category] = !this.sortModeActive[category];

    chrome.storage.local.get(['settings'], (data) => {
      const settings: Settings = data.settings || { rules: [] };
      this.renderRules(settings.rules, settings.newRuleId);
    });
  }

  private updateSortModeDisplay(): void {
    const siteList = document.getElementById('site-rules-list');
    const generalList = document.getElementById('general-rules-list');
    const toggleSiteSortBtn = document.getElementById('toggle-site-sort-mode');
    const toggleGeneralSortBtn = document.getElementById('toggle-general-sort-mode');

    siteList?.classList.toggle('sort-mode-active', this.sortModeActive.site);
    generalList?.classList.toggle('sort-mode-active', this.sortModeActive.general);

    toggleSiteSortBtn?.classList.toggle('btn-primary', this.sortModeActive.site);
    toggleSiteSortBtn?.classList.toggle('btn-outline-secondary', !this.sortModeActive.site);

    toggleGeneralSortBtn?.classList.toggle('btn-primary', this.sortModeActive.general);
    toggleGeneralSortBtn?.classList.toggle('btn-outline-secondary', !this.sortModeActive.general);
  }

  private handleDeleteRule(id: string): void {
    chrome.storage.local.get(['settings'], (data) => {
      const settings: Settings = data.settings || { rules: [] };
      settings.rules = settings.rules.filter(r => r.id !== id);
      // 削除対象が newRuleId の場合はクリア
      if (settings.newRuleId === id) settings.newRuleId = null;
      // 削除後に優先度を詰める
      this.normalizePriorities(settings);
      chrome.storage.local.set({ settings }, () => {
        if (chrome.runtime.lastError) {
          console.error('ルールの削除中にエラーが発生しました:', chrome.runtime.lastError);
          this.showMessage('ルールの削除に失敗しました．もう一度お試しください．');
          return;
        }
        this.renderRules(settings.rules, settings.newRuleId);
        this.showMessage('ルールを削除しました');
      });
    });
  }

  private initializeUI(): void {
    const short_name = this.manifestData.short_name || this.manifestData.name;
    const title = document.getElementById('title');
    if (title) title.textContent = short_name;

    const titleHeader = document.getElementById('title-header');
    if (titleHeader) titleHeader.textContent = short_name;

    const enabledLabel = document.getElementById('enabled-label');
    if (enabledLabel) enabledLabel.textContent = `${short_name} を有効にする`;

    this.setupMoreMenu();
    this.setupInfoTab();
  }

  private setupMoreMenu(): void {
    const moreButton = document.getElementById('more-button');
    const moreMenu = document.getElementById('more-menu');
    const themeButton = document.getElementById('theme-button');
    const newTabButton = document.getElementById('new-tab-button');

    if (!moreButton || !moreMenu) return;

    moreButton.addEventListener('click', (e) => {
      e.stopPropagation();
      moreMenu.classList.toggle('d-none');
    });

    document.addEventListener('click', (e) => {
      const target = e.target as Node;
      if (!moreMenu.contains(target) && !moreButton.contains(target)) {
        moreMenu.classList.add('d-none');
      }
    });

    themeButton?.addEventListener('click', () => {
      moreMenu.classList.add('d-none');
    });

    newTabButton?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'popup.html' });
      moreMenu.classList.add('d-none');
    });
  }

  private setupInfoTab(): void {
    const storeLink = document.getElementById('store-link') as HTMLAnchorElement;
    if (storeLink) {
      storeLink.href = `https://chrome.google.com/webstore/detail/${chrome.runtime.id}`;
      openLinkNewTab(storeLink);
    }

    const extensionLink = document.getElementById('extension-link') as HTMLAnchorElement;
    if (extensionLink) {
      extensionLink.href = `chrome://extensions/?id=${chrome.runtime.id}`;
      openLinkNewTab(extensionLink);
    }

    const issuesLink = document.getElementById('issues-link') as HTMLAnchorElement;
    const issuesHref = this.manifestMetadata.issues_url;
    if (issuesLink && issuesHref) {
      issuesLink.href = issuesHref;
      openLinkNewTab(issuesLink);
    }

    const setElementText = (id: string, text: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setElementText('extension-id', chrome.runtime.id);
    setElementText('extension-name', this.manifestData.name);
    setElementText('extension-version', this.manifestData.version);
    setElementText('extension-description', this.manifestData.description ?? '');

    chrome.permissions.getAll((result) => {
      const permissionInfo = document.getElementById('permission-info');
      if (permissionInfo && result.permissions) {
        permissionInfo.textContent = result.permissions.join(', ');
      }

      const siteAccessElement = document.getElementById('site-access');
      if (siteAccessElement) {
        siteAccessElement.innerHTML = getSiteAccessText(result.origins);
      }
    });

    chrome.extension.isAllowedIncognitoAccess((isAllowedAccess) => {
      setElementText('incognito-enabled', isAllowedAccess ? '有効' : '無効');
    });

    const languageMap: { [key: string]: string } = { 'en': '英語', 'ja': '日本語' };
    const language = document.getElementById('language');
    if (language) {
      const languages = this.manifestMetadata.languages || [];
      language.textContent = languages.map((lang: string) => languageMap[lang] || lang).join(', ');
    }

    setElementText('publisher-name', this.manifestMetadata.publisher || '不明');
    setElementText('developer-name', this.manifestMetadata.developer || '不明');

    const githubLink = document.getElementById('github-link') as HTMLAnchorElement;
    const githubHref = this.manifestMetadata.github_url;
    if (githubLink && githubHref) {
      githubLink.href = githubHref;
      githubLink.textContent = githubHref;
      openLinkNewTab(githubLink);
    }
  }

  private showMessage(message: string, timestamp: string = dateTime()) {
    this.panel.messageOutput(message, timestamp);
  }
}

document.addEventListener('DOMContentLoaded', () => new PopupManager());
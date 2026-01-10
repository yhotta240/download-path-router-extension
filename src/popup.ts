import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { PopupPanel } from './popup/panel';
import { dateTime } from './utils/date';
import { clickURL } from './utils/dom';
import { getSiteAccessText } from './utils/permissions';
import meta from '../public/manifest.meta.json';
import { Rule, Settings, ConditionType, RuleCategory } from './settings';

class PopupManager {
  private panel: PopupPanel;
  private enabled: boolean = false;
  private enabledElement: HTMLInputElement | null;
  private manifestData: chrome.runtime.Manifest;
  private manifestMetadata: { [key: string]: any } = (meta as any) || {};

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

      const settings: Settings = data.settings || { rules: [] };
      this.renderRules(settings.rules);

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
      folder
    };

    chrome.storage.local.get(['settings'], (data) => {
      const settings: Settings = data.settings || { rules: [] };

      if (isEdit) {
        const index = settings.rules.findIndex(r => r.id === ruleId);
        if (index !== -1) {
          settings.rules[index] = updatedRule;
        }
      } else {
        settings.rules.push(updatedRule);
      }

      chrome.storage.local.set({ settings }, () => {
        this.renderRules(settings.rules);
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
    const idInput = document.getElementById('rule-id') as HTMLInputElement;
    const categorySelect = document.getElementById('rule-category') as HTMLSelectElement;
    const conditionSelect = document.getElementById('rule-condition') as HTMLSelectElement;
    const patternInput = document.getElementById('rule-pattern') as HTMLInputElement;
    const folderInput = document.getElementById('rule-folder') as HTMLInputElement;
    const sitePatternInput = document.getElementById('rule-site-pattern') as HTMLInputElement;
    const sitePatternContainer = document.getElementById('site-pattern-container');
    const addButton = document.getElementById('add-rule-button');
    const cancelButton = document.getElementById('cancel-edit-button');
    const formTitle = document.getElementById('form-title');
    const accordionItem = document.getElementById('form-accordion-item');
    const accordionButton = document.getElementById('form-accordion-button');

    // フォームに値をセット
    idInput.value = rule.id;
    categorySelect.value = rule.category;
    conditionSelect.value = rule.condition;
    patternInput.value = rule.pattern;
    folderInput.value = rule.folder;
    sitePatternInput.value = rule.sitePattern || '';

    // コンテナの表示切り替え
    if (sitePatternContainer) {
      sitePatternContainer.style.display = rule.category === 'site' ? 'block' : 'none';
    }

    // UIの状態を変更
    if (addButton) {
      addButton.textContent = 'ルールを編集';
      addButton.classList.remove('btn-primary');
      addButton.classList.add('btn-success'); // 緑色
    }
    if (cancelButton) cancelButton.style.display = 'block';
    if (formTitle) formTitle.textContent = 'ルールの編集';

    // 編集時のみ緑のテーマを適用
    if (accordionItem) {
      accordionItem.style.borderColor = '#badbcc';
    }
    if (accordionButton) {
      accordionButton.style.backgroundColor = '#e2f0e9';
      accordionButton.style.color = '#0f5132';
    }

    // アコーディオンを開く
    const collapseEl = document.getElementById('collapseForm');
    if (collapseEl && !collapseEl.classList.contains('show')) {
      const btn = document.querySelector('[data-bs-target="#collapseForm"]') as HTMLElement;
      if (btn) btn.click();
    }

    // フォームへスクロール
    collapseEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private renderRules(rules: Rule[]): void {
    const siteList = document.getElementById('site-rules-list');
    const generalList = document.getElementById('general-rules-list');

    if (!siteList || !generalList) return;

    siteList.innerHTML = '';
    generalList.innerHTML = '';

    const siteRules = rules.filter(r => r.category === 'site');
    const generalRules = rules.filter(r => r.category === 'general');

    if (siteRules.length === 0) {
      siteList.innerHTML = '<div class="text-muted small text-center p-2 border rounded">登録されたルールはありません</div>';
    } else {
      siteRules.forEach(rule => siteList.appendChild(this.createRuleElement(rule)));
    }

    if (generalRules.length === 0) {
      generalList.innerHTML = '<div class="text-muted small text-center p-2 border rounded">登録されたルールはありません</div>';
    } else {
      generalRules.forEach(rule => generalList.appendChild(this.createRuleElement(rule)));
    }
  }

  private createRuleElement(rule: Rule): HTMLElement {
    const div = document.createElement('div');
    div.className = 'list-group-item p-2 d-flex justify-content-between align-items-center';

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

    div.innerHTML = `
      <div class="overflow-hidden me-2" style="font-size: 0.85rem;">
        <div class="fw-bold text-truncate" title="${rule.pattern}">
          <span class="badge bg-secondary me-1">${conditionLabels[rule.condition]}</span>
          ${rule.pattern}
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
        <button class="btn btn-outline-danger btn-sm p-1 delete-rule" style="width: 28px; height: 28px;" title="削除" data-id="${rule.id}">
          <i class="bi bi-trash" style="pointer-events: none;"></i>
        </button>
      </div>
    `;

    const editBtn = div.querySelector('.edit-rule');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.handleEditRule(rule));
    }

    const deleteBtn = div.querySelector('.delete-rule');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.handleDeleteRule(rule.id));
    }

    return div;
  }

  private handleDeleteRule(id: string): void {
    chrome.storage.local.get(['settings'], (data) => {
      const settings: Settings = data.settings || { rules: [] };
      settings.rules = settings.rules.filter(r => r.id !== id);
      chrome.storage.local.set({ settings }, () => {
        this.renderRules(settings.rules);
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

    const newTabButton = document.getElementById('new-tab-button');
    if (newTabButton) {
      newTabButton.addEventListener('click', () => {
        chrome.tabs.create({ url: 'popup.html' });
      });
    }

    this.setupInfoTab();
  }

  private setupInfoTab(): void {
    const storeLink = document.getElementById('store_link') as HTMLAnchorElement;
    if (storeLink) {
      storeLink.href = `https://chrome.google.com/webstore/detail/${chrome.runtime.id}`;
      clickURL(storeLink);
    }

    const extensionLink = document.getElementById('extension_link') as HTMLAnchorElement;
    if (extensionLink) {
      extensionLink.href = `chrome://extensions/?id=${chrome.runtime.id}`;
      clickURL(extensionLink);
    }

    clickURL(document.getElementById('issue-link'));
    clickURL(document.getElementById('github-link'));

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
    if (githubLink) {
      githubLink.href = this.manifestMetadata.github_url;
      githubLink.textContent = this.manifestMetadata.github_url;
    }
  }

  private showMessage(message: string, timestamp: string = dateTime()) {
    this.panel.messageOutput(message, timestamp);
  }
}

document.addEventListener('DOMContentLoaded', () => new PopupManager());
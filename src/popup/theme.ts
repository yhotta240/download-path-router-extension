import { Theme } from '../settings';

// テーマを適用
export function applyTheme(theme: Theme): void {
  const isSystem = theme === 'system';
  const themeColor = isSystem
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  document.body.classList.toggle('theme-light', themeColor === 'light');
  document.body.classList.toggle('theme-dark', themeColor === 'dark');
  document.documentElement.setAttribute('data-bs-theme', themeColor);

  document.querySelectorAll('#theme-menu .theme-option').forEach((el) => {
    const btn = el as HTMLButtonElement;
    btn.classList.toggle('active', (btn.dataset.theme || 'system') === theme);
  });
}

// テーマメニュー初期化
export function initThemeMenu(onChange: (theme: Theme) => Promise<void>): void {
  const btn = document.getElementById('theme-button');
  const menu = document.getElementById('theme-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('d-none');
  });

  menu.addEventListener('click', async (e) => {
    const opt = (e.target as HTMLElement).closest('.theme-option') as HTMLButtonElement | null;
    if (!opt) return;
    const value = (opt.dataset.theme || 'system') as Theme;
    applyTheme(value);
    try {
      await onChange(value);
    } catch (err) {
      console.error('persist theme failed', err);
    }
    menu.classList.add('d-none');
  });

  document.addEventListener('click', () => menu.classList.add('d-none'));
}

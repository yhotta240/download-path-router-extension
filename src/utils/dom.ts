/**
 * HTML要素にクリックイベントを追加し，新しいタブでURLを開く
 * @param link - URLを開くHTML要素または文字列
 * @example
 * const link = document.getElementById('my-link');
 * clickURL(link);
 */
export function clickURL(link: HTMLElement | string | null): void {
  if (!link) return;

  const url = (link instanceof HTMLElement && link.hasAttribute('href')) ? (link as HTMLAnchorElement).href : (typeof link === 'string' ? link : null);
  if (!url) return;

  if (link instanceof HTMLElement) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      chrome.tabs.create({ url });
    });
  }
}

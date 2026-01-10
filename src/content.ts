// ページ内のインタラクションをbackgroundに通知する
function recordPageInteraction() {
  chrome.runtime.sendMessage({
    type: 'PAGE_CLICK',
    pageUrl: window.location.href,
    timestamp: Date.now()
  });
}

// クリック直前の状態
document.addEventListener('mousedown', recordPageInteraction, true);

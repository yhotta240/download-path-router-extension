// ページ内のインタラクションをbackgroundに通知する
function recordPageInteraction() {
  try {
    chrome.runtime?.sendMessage({
      type: 'PAGE_CLICK',
      pageUrl: window.location.href,
      timestamp: Date.now()
    });
  } catch (error) {
    // console.error('Failed to send message to background:', error);
  }
}

// クリック直前の状態
document.addEventListener('mousedown', recordPageInteraction, true);

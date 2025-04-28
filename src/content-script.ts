/* Runs in every tab and waits for the popup to ask for text. */
function grabText(): string {
    // (A) highlighted text, if any
    const sel = window.getSelection()?.toString();
    if (sel?.trim()) return sel.trim();
  
    // (B) value in the currently-focused <input>/<textarea>
    const el = document.activeElement as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
  
    return el && 'value' in el ? el.value : '';
  }
  
  // Listen for the popup’s request
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      sendResponse({ text: grabText() });
  });
  
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
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    sendResponse({ text: grabText() });
});




// 1️⃣ Create & style the floating “Fix” button once:
const fixBtn = document.createElement("button");
console.log("[FixGrammerAI] contentScript loaded");
fixBtn.setAttribute("aria-label", "Fix grammar");
fixBtn.type = "button";                           // avoids form submission

fixBtn.innerHTML = `
  <svg viewBox="0 0 24 24" width="22" height="22"
       xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" fill="#7C3AED"/>
    <path d="M8 12l3 3 5-6" stroke="#fff" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

Object.assign(fixBtn.style, {
  position: "absolute",
  width: "24px",
  height: "24px",
  padding: "0",
  border: "none",
  borderRadius: "50%",
  background: "transparent",
  cursor: "pointer",
  zIndex: "2147483647",
  display: "none",
});

document.body.appendChild(fixBtn);


/***********************************************************************/
/* Helpers & type aliases                                              */
/***********************************************************************/
type EditableEl = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

function isEditable(el: EventTarget | null): el is EditableEl {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}

function placeButton(el: HTMLElement): void {
  const r = el.getBoundingClientRect();
  fixBtn.style.top  = `${window.scrollY + r.top  + 4}px`;
  fixBtn.style.left = `${window.scrollX + r.right - fixBtn.offsetWidth - 4}px`;
}

/***********************************************************************/
/*  Floating button (already created earlier)                          */
/***********************************************************************/


/***********************************************************************/
/* 2️⃣  Show & position on focusin                                      */
/***********************************************************************/
let activeEl: EditableEl | null = null;

document.addEventListener("focusin", (e: FocusEvent) => {
  const el = e.target as EventTarget | null;
  if (!isEditable(el)) return;

  activeEl = el;
  placeButton(el);
  fixBtn.style.display = "block";
});

/***********************************************************************/
/* 3️⃣  Hide when that element truly loses focus                        */
/***********************************************************************/
document.addEventListener("focusout", (e: FocusEvent) => {
  if (!activeEl) return;

  const movedInsideSameEl =
    activeEl.contains(e.relatedTarget as Node | null);

  if (e.target === activeEl && !movedInsideSameEl) {
    fixBtn.style.display = "none";
    activeEl = null;
  }
});

/***********************************************************************/
/* 4️⃣  Keep the button alive on SPA / React re-renders (optional)      */
/***********************************************************************/
const obs = new MutationObserver(() => {
  if (activeEl && !document.contains(activeEl)) {
    fixBtn.style.display = "none";
    activeEl = null;
  }
});
obs.observe(document, { childList: true, subtree: true });

/***********************************************************************/
/* 5️⃣  Re-position on scroll / resize                                  */
/***********************************************************************/
["scroll", "resize"].forEach((evt) =>
  window.addEventListener(evt, () => activeEl && placeButton(activeEl))
);



// 4️⃣ On click, grab text, send to background, and replace:
fixBtn.addEventListener("click", () => {
  const el = document.activeElement;
  if (!el) return;

  let originalText: string;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    originalText = el.value;
  } else if (el instanceof HTMLElement && el.isContentEditable) {
    originalText = el.innerText;
  } else {
    return;
  }

  chrome.runtime.sendMessage(
    { action: "fixText", text: originalText },
    (response) => {
      if (response?.text) {
        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement
        ) {
          el.value = response.text;
        } else if (el instanceof HTMLElement && el.isContentEditable) {
          el.innerText = response.text;
        }
      } else {
        console.error("LLM error:", response.error);
      }
    }
  );
});

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
    if (msg.action === 'grabText') {
      sendResponse({ text: grabText() });
      // no return ⇒ channel closes immediately, but that's fine
    }
    // otherwise do nothing and let your transformText listener run
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
  // document.addEventListener("focusout", (e: FocusEvent) => {
  //   if (!activeEl) return;
  
  //   const movedInsideSameEl =
  //     activeEl.contains(e.relatedTarget as Node | null);
  
  //   if (e.target === activeEl && !movedInsideSameEl) {
  //     fixBtn.style.display = "none";
  //     activeEl = null;
  //   }
  // });
  
  document.addEventListener("focusout", (e: FocusEvent) => {
    if (!activeEl) return;
  
    const related = e.relatedTarget as Node | null;
    // if focus is going to the fixBtn, don’t hide
    if (related === fixBtn || fixBtn.contains(related!)) {
      return;
    }
  
    if (e.target === activeEl) {
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
  
  
  
  // // 4️⃣ On click, grab text, send to background, and replace:
  // fixBtn.addEventListener("click", () => {
  //   const el = document.activeElement;
  //   if (!el) return;
  
  //   let originalText: string;
  //   if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
  //     originalText = el.value;
  //   } else if (el instanceof HTMLElement && el.isContentEditable) {
  //     originalText = el.innerText;
  //   } else {
  //     return;
  //   }
  
  //   chrome.runtime.sendMessage(
  //     { action: "fixText", text: originalText },
  //     (response) => {
  //       if (response?.text) {
  //         if (
  //           el instanceof HTMLInputElement ||
  //           el instanceof HTMLTextAreaElement
  //         ) {
  //           el.value = response.text;
  //         } else if (el instanceof HTMLElement && el.isContentEditable) {
  //           el.innerText = response.text;
  //         }
  //       } else {
  //         console.error("LLM error:", response.error);
  //       }
  //     }
  //   );
  // });

  function setNativeValue(el: HTMLInputElement|HTMLTextAreaElement, value: string) {
    // React hack: find the true setter on the prototype
    const proto = Object.getPrototypeOf(el);
    const valueSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;
    const protoSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    (protoSetter && valueSetter !== protoSetter
      ? protoSetter
      : valueSetter
    )!.call(el, value);
  }
  
  
  
  fixBtn.addEventListener("click", () => {
    // const el = document.activeElement as
    //   | HTMLInputElement
    //   | HTMLTextAreaElement
    //   | HTMLElement
    //   | null;
    console.log("button clicked")
    const el = activeEl;
    if (!el) return;
  
    // get original text
    let originalText: string;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      originalText = el.value;
    } else if (el instanceof HTMLElement && el.isContentEditable) {
      originalText = el.innerText;
    } else {
      return;
    }
  
    // read the transform type & options that we stored earlier
    chrome.storage.local.get(
      ["transformType", "fromLang", "toLang", "tone"],
      (opts) => {
        chrome.runtime.sendMessage({
            action: "transformText",
            text: originalText,
            type: opts.transformType,
            options: {
              fromLang: opts.fromLang,
              toLang: opts.toLang,
              tone: opts.tone,
            },
          },
          
          (response) => {
            console.log("response receiveds")
  
            if (chrome.runtime.lastError) {
              console.error("Messaging error:", chrome.runtime.lastError.message);
              return;
            }
  
            if (response && response.text) {
              // append the LLM output
              const newText = originalText + response.text;
              if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                const newValue = el.value + response.text;
                setNativeValue(el, newValue);
                // fire a “real” input event so React/onChange handlers run
                el.dispatchEvent(new Event('input', { bubbles: true }));
  
                // now auto-submit
                setTimeout(() => {
                  try {
                    el.form?.submit();
                  } catch {}
                }, 0);
                
              } else if (el instanceof HTMLElement && el.isContentEditable) {
                // for contentEditable, use execCommand which integrates with many editors
                el.focus();
                document.execCommand('insertText', false, response.text);
              }
              else {
                el.innerText = newText;
                // if you have a form wrapper around this contentEditable,
                // you can locate and submit it here too
                // e.g.: el.closest("form")?.submit();
              }
            }
            else if (response && response.error) {
              console.error("LLM error:", response.error);
            }  
            else {
              console.warn("No response or unknown response shape:", response);
            }
          }
        );
      }
    );
  });
  
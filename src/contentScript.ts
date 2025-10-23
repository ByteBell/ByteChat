// Import browser agent components for DOM automation
import { DomLocator, DOMActionMessage, DOMActionResult } from 'bytechat-browser-agent';

console.log('xAI Content script loaded');

// Initialize DomLocator for browser automation
const domLocator = new DomLocator();

// Prevent multiple injections
if (document.getElementById('xai-sidebar-host')) {
  console.log('xAI sidebar already exists');
} else {
  injectSidebar();
}

function injectSidebar() {
  // Create host element with shadow DOM
  const host = document.createElement('div');
  host.id = 'xai-sidebar-host';
  const shadow = host.attachShadow({ mode: 'open' });

  // Style the host for full-height right sidebar
  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    bottom: '0',
    width: '420px',
    zIndex: '2147483647',
    display: 'none' // Start hidden
  });

  // Create iframe for the extension UI
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('panel.html') + '?mode=sidebar';
  iframe.allow = 'microphone; clipboard-read; clipboard-write';

  Object.assign(iframe.style, {
    width: '100%',
    height: '100%',
    border: '0',
    display: 'block',
    borderRadius: '0'
  });

  shadow.appendChild(iframe);
  document.documentElement.appendChild(host);

  // Show sidebar with animation
  function showSidebar() {
    host.style.display = 'block';
    document.body.style.marginRight = '420px';
    document.body.style.transition = 'margin-right 0.15s ease-out';
    
    // Animate in
    host.animate([
      { transform: 'translateX(420px)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 }
    ], {
      duration: 150,
      easing: 'ease-out'
    });
  }

  // Hide sidebar with animation
  function hideSidebar() {
    const animation = host.animate([
      { transform: 'translateX(0)', opacity: 1 },
      { transform: 'translateX(420px)', opacity: 0 }
    ], {
      duration: 150,
      easing: 'ease-out'
    });

    animation.onfinish = () => {
      host.style.display = 'none';
      document.body.style.marginRight = '0';
    };
  }

  // Toggle function
  function toggleSidebar() {
    if (host.style.display === 'none') {
      showSidebar();
    } else {
      hideSidebar();
    }
  }

  // Keyboard shortcut: Ctrl/Cmd + M
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      toggleSidebar();
    }
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    if (host.style.display !== 'none') {
      const width = host.getBoundingClientRect().width;
      document.body.style.marginRight = `${width}px`;
    }
  });

  // Show reload notification
  function showReloadNotification() {
    // Remove existing notification
    const existingNotification = document.getElementById('xai-reload-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'xai-reload-notification';
    
    // Create the structure without inline handlers
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: '#1f2937',
      color: 'white',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      zIndex: '2147483647',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      maxWidth: '320px',
      border: '1px solid #374151'
    });

    // Header with logo and text
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    });

    const logo = document.createElement('img');
    logo.src = chrome.runtime.getURL('icons/new_logo_32.png');
    Object.assign(logo.style, {
      width: '24px',
      height: '24px',
      borderRadius: '4px'
    });

    const textContainer = document.createElement('div');
    const title = document.createElement('div');
    title.textContent = 'xAI Extension';
    Object.assign(title.style, {
      fontWeight: '600',
      marginBottom: '4px'
    });

    const subtitle = document.createElement('div');
    subtitle.textContent = 'Please reload the page to use the sidebar';
    Object.assign(subtitle.style, {
      color: '#d1d5db',
      fontSize: '13px'
    });

    textContainer.appendChild(title);
    textContainer.appendChild(subtitle);
    header.appendChild(logo);
    header.appendChild(textContainer);

    // Buttons container
    const buttonsContainer = document.createElement('div');
    Object.assign(buttonsContainer.style, {
      marginTop: '12px',
      display: 'flex',
      gap: '8px'
    });

    // Reload button
    const reloadButton = document.createElement('button');
    reloadButton.textContent = 'Reload Page';
    Object.assign(reloadButton.style, {
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      cursor: 'pointer',
      fontWeight: '500'
    });
    reloadButton.addEventListener('click', () => location.reload());

    // Later button
    const laterButton = document.createElement('button');
    laterButton.textContent = 'Later';
    Object.assign(laterButton.style, {
      background: 'transparent',
      color: '#9ca3af',
      border: '1px solid #374151',
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      cursor: 'pointer'
    });
    laterButton.addEventListener('click', () => notification.remove());

    buttonsContainer.appendChild(reloadButton);
    buttonsContainer.appendChild(laterButton);

    container.appendChild(header);
    container.appendChild(buttonsContainer);
    notification.appendChild(container);
    document.body.appendChild(notification);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (document.getElementById('xai-reload-notification')) {
        notification.remove();
      }
    }, 10000);
  }

  // Listen for extension icon click
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleSidebar') {
      toggleSidebar();
      sendResponse({ success: true });
    }

    if (request.action === 'showReloadNotification') {
      showReloadNotification();
      sendResponse({ success: true });
    }

    if (request.action === 'getSelectedText') {
      const selectedText = window.getSelection()?.toString().trim() || '';
      sendResponse({ selectedText });
    }

    if (request.action === 'insertText') {
      const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        activeElement.value = request.text;
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
      sendResponse({ success: true });
    }

    if (request.action === 'openWithText') {
      console.log('Opening sidebar with text:', request.text);

      // Store the text and tool selection for the sidebar
      chrome.storage.local.set({
        'pending_text': request.text,
        'pending_tool': request.tool,
        'pending_is_custom_prompt': request.isCustomPrompt || false,
        'pending_timestamp': Date.now()
      });

      // Show the sidebar
      showSidebar();
      sendResponse({ success: true });
    }

    // Handle DOM automation actions
    if (request.action === 'domAction') {
      handleDomAction(request as DOMActionMessage)
        .then(sendResponse)
        .catch((error) => {
          sendResponse({
            success: false,
            message: 'DOM action failed',
            error: error.message
          });
        });
      return true; // Keep channel open for async response
    }
  });

  console.log('xAI sidebar injected successfully');
}

// ============================================================================
// DOM Action Handlers for Browser Automation
// ============================================================================

/**
 * Utility function to wait/sleep
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute click action on element
 */
function executeClick(element: Element): DOMActionResult {
  try {
    (element as HTMLElement).click();
    return {
      success: true,
      message: `Clicked ${domLocator.describeElement(element)}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Click failed',
      error: error.message
    };
  }
}

/**
 * Execute type action on input element
 */
function executeType(element: Element, value?: string): DOMActionResult {
  try {
    if (!value) {
      return {
        success: false,
        message: 'No value provided for type action',
        error: 'Missing value parameter'
      };
    }

    const input = element as HTMLInputElement | HTMLTextAreaElement;

    // Focus the element
    input.focus();

    // Clear existing value
    input.value = '';

    // Set new value
    input.value = value;

    // Dispatch events for React/Vue/Angular compatibility
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      success: true,
      message: `Typed "${value}" into ${domLocator.describeElement(element)}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Type action failed',
      error: error.message
    };
  }
}

/**
 * Extract table data from HTML table element
 */
function extractTableData(table: HTMLTableElement): any[] {
  const rows: any[] = [];
  const headers: string[] = [];

  // Extract headers
  const headerRow = table.querySelector('thead tr, tr:first-child');
  if (headerRow) {
    headerRow.querySelectorAll('th, td').forEach(cell => {
      headers.push(cell.textContent?.trim() || '');
    });
  }

  // Extract data rows
  const dataRows = table.querySelectorAll('tbody tr, tr');
  dataRows.forEach((row, idx) => {
    if (idx === 0 && headerRow && headerRow.parentElement?.tagName === 'THEAD') {
      return; // Skip header row if it's in thead
    }

    const rowData: any = {};
    row.querySelectorAll('td, th').forEach((cell, cellIdx) => {
      const key = headers[cellIdx] || `col_${cellIdx}`;
      rowData[key] = cell.textContent?.trim();
    });
    rows.push(rowData);
  });

  return rows;
}

/**
 * Extract form data from HTML form element
 */
function extractFormData(form: HTMLFormElement): any {
  const formData = new FormData(form);
  const data: any = {};

  formData.forEach((value, key) => {
    data[key] = value;
  });

  return data;
}

/**
 * Execute extract action on element
 */
function executeExtract(element: Element): DOMActionResult {
  try {
    // Extract basic data
    let data: any = {
      text: element.textContent?.trim(),
      html: element.innerHTML,
      attributes: {}
    };

    // Extract all attributes
    Array.from(element.attributes).forEach(attr => {
      data.attributes[attr.name] = attr.value;
    });

    // Special handling for tables
    if (element.tagName === 'TABLE') {
      data.table = extractTableData(element as HTMLTableElement);
    }

    // Special handling for forms
    if (element.tagName === 'FORM') {
      data.form = extractFormData(element as HTMLFormElement);
    }

    // Special handling for lists
    if (element.tagName === 'UL' || element.tagName === 'OL') {
      data.listItems = Array.from(element.querySelectorAll('li')).map(li => li.textContent?.trim());
    }

    return {
      success: true,
      message: `Extracted data from ${domLocator.describeElement(element)}`,
      data
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Extract action failed',
      error: error.message
    };
  }
}

/**
 * Execute hover action on element
 */
function executeHover(element: Element): DOMActionResult {
  try {
    const mouseoverEvent = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    const mouseenterEvent = new MouseEvent('mouseenter', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    element.dispatchEvent(mouseoverEvent);
    element.dispatchEvent(mouseenterEvent);

    return {
      success: true,
      message: `Hovered over ${domLocator.describeElement(element)}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Hover action failed',
      error: error.message
    };
  }
}

/**
 * Execute checkbox check/uncheck action
 */
function executeCheckbox(element: Element, checked: boolean): DOMActionResult {
  try {
    const checkbox = element as HTMLInputElement;

    if (checkbox.type !== 'checkbox' && checkbox.getAttribute('role') !== 'checkbox') {
      return {
        success: false,
        message: 'Element is not a checkbox',
        error: 'Invalid element type'
      };
    }

    checkbox.checked = checked;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    checkbox.dispatchEvent(new Event('input', { bubbles: true }));

    return {
      success: true,
      message: `${checked ? 'Checked' : 'Unchecked'} ${domLocator.describeElement(element)}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Checkbox action failed',
      error: error.message
    };
  }
}

/**
 * Execute scroll action
 */
function executeScroll(value?: string): DOMActionResult {
  try {
    switch (value) {
      case 'top':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;

      case 'bottom':
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        break;

      default:
        // Scroll by pixel value
        const pixels = parseInt(value || '0');
        if (isNaN(pixels)) {
          return {
            success: false,
            message: 'Invalid scroll value',
            error: 'Scroll value must be "top", "bottom", or a number'
          };
        }
        window.scrollBy({ top: pixels, behavior: 'smooth' });
    }

    return {
      success: true,
      message: `Scrolled to ${value || 'position'}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Scroll action failed',
      error: error.message
    };
  }
}

/**
 * Main handler for DOM automation actions
 */
async function handleDomAction(message: DOMActionMessage): Promise<DOMActionResult> {
  console.log('[ContentScript] Handling DOM action:', message.type);

  try {
    const { type, target, value } = message;

    // Find element using DomLocator (except for scroll which doesn't need target)
    if (type !== 'scroll' && target) {
      const element = await domLocator.findElement(target);

      if (!element) {
        return {
          success: false,
          message: `Element not found`,
          error: 'No element matched any locator strategy'
        };
      }

      // Scroll element into view before action
      domLocator.scrollIntoView(element);
      await wait(300); // Brief wait for scroll animation

      // Execute the appropriate action
      switch (type) {
        case 'click':
          return executeClick(element);

        case 'type':
          return executeType(element, value);

        case 'extract':
          return executeExtract(element);

        case 'hover':
          return executeHover(element);

        case 'check':
        case 'uncheck':
          return executeCheckbox(element, type === 'check');

        default:
          return {
            success: false,
            message: `Unknown action type: ${type}`,
            error: 'Invalid action'
          };
      }
    }

    // Handle scroll (no target needed)
    if (type === 'scroll') {
      return executeScroll(value);
    }

    return {
      success: false,
      message: 'Invalid action configuration',
      error: 'No target specified for action that requires target'
    };

  } catch (error: any) {
    console.error('[ContentScript] DOM action failed:', error);
    return {
      success: false,
      message: 'Action execution failed',
      error: error.message || String(error)
    };
  }
}

// Store selected text automatically
document.addEventListener('mouseup', () => {
  const selectedText = window.getSelection()?.toString().trim();
  if (selectedText && selectedText.length > 3) {
    chrome.storage.local.set({ selectedText });
  }
});
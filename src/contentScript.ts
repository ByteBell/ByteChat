console.log('xAI Content script loaded');

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
  });

  console.log('xAI sidebar injected successfully');
}

// Store selected text automatically
document.addEventListener('mouseup', () => {
  const selectedText = window.getSelection()?.toString().trim();
  if (selectedText && selectedText.length > 3) {
    chrome.storage.local.set({ selectedText });
  }
});
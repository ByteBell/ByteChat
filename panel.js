// Panel script - CSP compliant
console.log('Panel script loaded');

// Add error handling
window.addEventListener('error', (e) => {
    console.error('Panel error:', e.error);
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h3>Error Loading Extension</h3>
                <p>Please check the console for details</p>
                <button id="reload-btn">Reload</button>
            </div>
        `;
        // Add event listener properly (CSP compliant)
        const reloadBtn = document.getElementById('reload-btn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => location.reload());
        }
    }
});

// Try to load the React app
try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('index.js');
    script.onerror = () => {
        console.error('Failed to load index.js');
        const root = document.getElementById('root');
        if (root) {
            root.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h3>Failed to Load App</h3>
                    <p>Extension files not found</p>
                </div>
            `;
        }
    };
    script.onload = () => {
        console.log('React app loaded successfully');
    };
    document.head.appendChild(script);
} catch (e) {
    console.error('Error loading script:', e);
}
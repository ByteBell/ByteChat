// Script to generate manifest.json with environment variables
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const manifestTemplate = {
  "manifest_version": 3,
  "name": "Byte Chat",
  "version": "1.0.0",
  "description": "All-purpose context copilot for independent users.",
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_icon": {
      "16": "icons/new_logo_16.png",
      "32": "icons/new_logo_32.png",
      "48": "icons/new_logo_48.png",
      "128": "icons/new_logo_128.png"
    }
  },
  "side_panel": {
    "default_path": "panel.html"
  },
  "icons": {
    "16": "icons/new_logo_16.png",
    "32": "icons/new_logo_32.png",
    "48": "icons/new_logo_48.png",
    "128": "icons/new_logo_128.png"
  },
  "oauth2": {
    "client_id": process.env.REACT_APP_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    "scopes": [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ]
  },
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "tabs",
    "identity",
    "contextMenus",
    "sidePanel",
    "tabCapture",
    "desktopCapture"
  ],
  "optional_host_permissions": [],
  "host_permissions": ["<all_urls>"]
};

// Validate required environment variables
if (!manifestTemplate.oauth2.client_id) {
  console.error('Error: GOOGLE_CLIENT_ID or REACT_APP_GOOGLE_CLIENT_ID environment variable is required');
  process.exit(1);
}

// Write the manifest file
const manifestPath = path.join(__dirname, '..', 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifestTemplate, null, 2));

console.log('✅ manifest.json generated successfully with environment variables');
console.log(`📍 Client ID: ${manifestTemplate.oauth2.client_id}`);
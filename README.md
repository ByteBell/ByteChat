# ByteChat - Free AI Access for Everyone 🚀

<div align="center">
  <img src="icons/ByteBellLogo.png" alt="ByteChat Logo" width="128" height="128">
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
  [![Version](https://img.shields.io/badge/version-1.0.0-brightgreen.svg)](manifest.json)
</div>

## 🎯 Mission

ByteChat's mission is to **democratize AI access** by providing a free and open way to interact with cutting-edge AI models through OpenRouter. No subscriptions, no vendor lock-in - just pure AI power at your fingertips.

## 🌟 Why ByteChat?

- **100% Free Access**: Use top-tier AI models like Llama, DeepSeek, Grok, and more without paying a cent
- **No Subscriptions**: Forget about ChatGPT Plus, Claude Pro, or other expensive subscriptions
- **Multi-Model Access**: Access multiple AI providers through a single OpenRouter API
- **Privacy-First**: Your API key, your data, your control
- **Cross-Platform** (Coming Soon): Android and iOS apps in development

## 🚀 Quick Start

### 1. Install the Extension
- Download ByteChat from Chrome Web Store (or load unpacked for development)
- Pin the extension to your toolbar for easy access

### 2. Get Your OpenRouter API Key
1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Create a free account
3. Generate an API key from your dashboard
4. Copy the API key

### 3. Configure ByteChat
1. Click the ByteChat extension icon
2. Paste your OpenRouter API key
3. Select a free model from the dropdown (e.g., Llama, DeepSeek, Grok-3-mini)
4. Start chatting!

## 💎 Features

### Core Capabilities

#### 🤖 **Multi-Model Support**
- Access 100+ AI models through a single interface
- Free models include:
  - **Meta Llama** (70B, 405B variants)
  - **DeepSeek R1**
  - **Grok-3-mini** (Default for text)
  - **Google Gemini Flash** (For images/documents)
  - And many more!

#### 📎 **Universal File Upload**
- Single button for all file types
- Supported formats:
  - **Documents**: PDF, Word, Excel, CSV, JSON, YAML
  - **Images**: JPG, PNG, GIF, WebP, SVG
  - **Text**: TXT, Markdown, RTF, HTML, XML
- Smart encoding based on file type
- Automatic model selection based on content

#### 🛠️ **Built-in Tools**
- **🌐 Translate**: Convert text between 20+ languages with source/target selection
- **📝 Summarize**: Create concise summaries of long content
- **💬 Reply**: Generate contextual social media responses
- **🔍 Fact Check**: Verify information with detailed analysis
- **✍️ Fix Grammar**: Correct grammar and spelling with explanations

#### 💬 **Chat Management**
- **Session Support**: Maintain multiple conversation threads
- **History Tracking**: Never lose your conversations
- **Context Retention**: AI remembers your conversation context
- **Auto-save**: All chats saved locally

#### 🎤 **Voice Input**
- Record audio directly in the browser
- Upload audio files
- Automatic transcription with AI models

#### 🖱️ **Context Menu Integration**
- Right-click on any selected text
- Access all tools directly from context menu
- Automatic text transfer to side panel
- Tool pre-selection for immediate use

### Advanced Features

#### 🔄 **Smart Model Selection**
- **Text**: x-ai/grok-3-mini (default)
- **Images**: google/gemini-2.5-flash-image-preview
- **PDFs/CSVs**: google/gemini-2.5-flash-image-preview with file-parser plugin
- **Audio**: google/gemini-2.5-flash-lite
- **Other Documents**: Converted to text and processed with Grok

#### 📊 **Balance Tracking & Validation**
- Real-time API key validation with balance checking
- Monitor your OpenRouter credit usage
- Color-coded indicators (green/yellow/red)
- Free tier detection
- Usage statistics
- Secure key management with change option

#### 🔧 **User Experience**
- **Zoom Controls**: Adjust interface text size (50% - 200%)
- **Responsive Design**: Works in popup and side panel modes
- **Error Handling**: Comprehensive error messages and recovery
- **Persistent Settings**: All preferences saved locally
- **Real-time Streaming**: Live response generation

## 💰 Pricing Tiers

### Free Tier (Current)
- **Cost**: $0
- **Access**: All free models on OpenRouter
- **Limits**: Based on OpenRouter's free tier limits
- **Setup**: Just need an OpenRouter API key

### Premium Tier (Coming Soon)
- **Login with Gmail**: OAuth authentication
- **100,000 free tokens/month**: Access to premium models
- **Pay-as-you-go**: Start with just $1
- **SOTA Models**: GPT-4, Claude, and more

## 🏗️ Project Architecture

```
ByteChat/
├── src/
│   ├── components/              # React components
│   │   ├── MainInterface.tsx        # Main chat interface with tools and models
│   │   ├── ApiKeySetup.tsx          # API key validation and setup
│   │   ├── ChatHistory.tsx          # Message display and streaming
│   │   ├── ChatPanel.tsx            # Chat panel component
│   │   ├── SessionSelector.tsx      # Session management dropdown
│   │   ├── ModelSelector.tsx        # Model selection component
│   │   ├── SettingsPanel.tsx        # Settings configuration
│   │   ├── TwitterPanel.tsx         # Social media integration
│   │   ├── FeedbackPanel.tsx        # User feedback component
│   │   ├── popup.tsx               # Extension popup entry point
│   │   ├── Select.tsx              # Custom select component
│   │   └── TabButton.tsx           # Tab navigation button
│   ├── services/                # API integrations
│   │   ├── openrouter.ts           # OpenRouter API integration
│   │   ├── balance.ts              # Credit balance management
│   │   ├── modelCategories.ts      # Model categorization logic
│   │   ├── api.ts                  # General API utilities
│   │   ├── claude.ts               # Claude API integration
│   │   ├── openai.ts               # OpenAI API integration
│   │   └── together.ts             # Together API integration
│   ├── utils/                   # Utility functions
│   │   ├── fileEncoder.ts          # File processing and encoding
│   │   ├── sessionManager.ts       # Session state management
│   │   └── utils.ts                # General utilities
│   ├── types/                   # TypeScript definitions
│   │   ├── types.ts                # Main type definitions
│   │   └── extension-env.d.ts      # Extension environment types
│   ├── background.ts            # Extension background service worker
│   ├── contentScript.ts         # Content script for page injection
│   ├── constants.ts             # Application constants
│   └── index.tsx               # React app entry point
├── public/                      # Static assets
├── icons/                       # Extension icons and branding
├── manifest.json                # Chrome extension manifest
├── panel.html                   # Side panel HTML template
├── webpack.config.js            # Build configuration
└── tailwind.css                # Compiled Tailwind styles
```

### Tech Stack
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Build**: Webpack 5
- **Extension**: Chrome Extensions Manifest V3
- **API**: OpenRouter REST API

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Getting Started
1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/BB-chat.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/amazing-feature`
5. Make your changes
6. Build and test: `npm run build`
7. Commit: `git commit -m 'Add amazing feature'`
8. Push: `git push origin feature/amazing-feature`
9. Open a Pull Request

### Development Setup
```bash
# Install dependencies
npm install

# Development build (with watch)
npm run dev

# Production build
npm run build

# Load unpacked extension in Chrome
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the project directory
```

### Areas for Contribution
- 🐛 Bug fixes
- ✨ New features
- 📱 Mobile app development (React Native)
- 🎨 UI/UX improvements
- 📝 Documentation
- 🌍 Translations
- ⚡ Performance optimizations

## 📬 Feature Requests & Support

### Request a Feature
- **GitHub Issues**: [Create an issue](https://github.com/yourusername/BB-chat/issues/new) with the "enhancement" label
- **Email**: bytechat.support@example.com

### Report a Bug
- **GitHub Issues**: [Create an issue](https://github.com/yourusername/BB-chat/issues/new) with the "bug" label
- Include:
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - Screenshots (if applicable)
  - Browser version


## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenRouter** for providing unified access to AI models
- **All Contributors** who help make AI accessible to everyone
- **Open Source Community** for the amazing tools and libraries

## 🔗 Links

- **Website**: [Coming Soon]
- **Chrome Web Store**: [Coming Soon]
- **Documentation**: [Coming Soon]
- **Discord Community**: [Coming Soon]

---

<div align="center">
  <b>Built with ❤️ for the community</b>
  <br>
  <i>Making AI accessible to everyone, everywhere</i>
</div>
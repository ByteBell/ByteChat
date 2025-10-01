# ByteChat - Free AI Access for Everyone 🚀

<div align="center">
  <img src="icons/ByteBellLogo.png" alt="ByteChat Logo" width="128" height="128">
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
  [![Version](https://img.shields.io/badge/version-1.0.0-brightgreen.svg)](manifest.json)
</div>

## Motivation for Starting Bytechat

ByteChat's mission is to **democratize AI access** by providing a free and open way to interact with cutting-edge AI models through OpenRouter. No subscriptions, no vendor lock-in - just pure AI power at your fingertips.

We began our journey with on-device AI because we realized early that most people would prefer local AI over cloud AI. We predicted that small domain-specific models, once quantized, could run effectively on personal machines. That is why we built an on-device coding copilot, packaged as a Rust binary that could automatically switch between models for tasks like code completion, generation, and test creation.

While working on this, we noticed all the popular tools like Llama, OpenLlama, LM Studio, and others lacked a solid retrieval-augmented system. We were ahead in experimenting with RAG, and we also heard from enterprises that they wanted an on-premises RAG engine to safely use their confidential data. They were scared of pushing data into systems like ChatGPT since it could leak into future training sets. That gave us the insight: instead of a private RAG only for individual enterprises, we should build a secure cloud-based context engine where data stays confidential. This is how Bytebell was born—a context compiler that ingests data across formats and serves the right chunks at the right time.

The key learning from our on-device phase was that context matters more than model size. A huge model with bad context produces garbage, while a smaller model with the right context gives great answers. That became the foundation of Bytebell.

Now, here is where the story shifts to Bytechat. As developers and heavy AI users ourselves, we hit a personal bottleneck. English is our second language, so even writing a tweet required copy-pasting into ChatGPT for corrections. For coding, we constantly copied code into ChatGPT or Claude, hunted bugs, then pasted results back into VS Code. For image generation, we used Together. For text, we switched between ChatGPT and Claude. For other experiments, we used OpenRouter and ElevenLabs. Each task meant endless tab-switching and context loss, breaking flow every few minutes.

To solve our own pain, we built a small Chrome extension. It stayed as a side panel, always open, always aware of the webpage we were on, and always linked with our chat history. Suddenly, instead of wasting time switching tools, we had one extension that unified all of them. If we were filling out a form, the extension could automatically use the context of the page to generate the right text without copy-paste. If we were debugging, it could help directly with context from our chats and files.

That experiment turned into Bytechat. It is a browser extension that brings AI directly into your workflow. Instead of jumping between copilots, Bytechat acts as your AI shadow—always present, always contextual, and always private. It saves hours by keeping coding copilots, ChatGPT, Claude, OpenRouter, Sora, Together, and ElevenLabs accessible in one panel with context-aware assistance.

The vision does not stop there. Bytechat will integrate with Bytebell’s enterprise RAG engine so that companies can provide employees with an AI copilot grounded in their private data—codebases, documentation, PDFs, research, and more. For enterprises, Bytechat becomes the interface for a secure context-aware AI shadow. For individuals, it is a free extension that lets them use multiple AI models faster, with the option of keeping their data encrypted and later tied to systems like Urbit for long-term privacy and control.

The motivation is simple: we were tired of wasting time, tired of losing context, and tired of switching between AI tools. We wanted one extension that could act as our permanent AI sidekick. That is why we built Bytechat.

## 🔍 The Problem We Solve

Teams waste time because knowledge sits in many places and AI tools ignore that context. People reupload files and paste snippets into every new chat, so answers are generic, slow, and often wrong, which hurts onboarding, support, and daily execution.

**ByteChat solves this with our context copilot approach** - an intelligent extension that understands your work environment and provides contextually aware AI assistance without the constant need to re-upload files or explain your setup repeatedly.

## 🌟 Why ByteChat?

- **Dual Authentication**: Login with Gmail for 1M free tokens OR use your own OpenRouter API key
- **100% Free Access**: Use top-tier AI models like Llama, DeepSeek, Grok, and more without subscriptions
- **No Vendor Lock-in**: Switch between models, providers, and authentication methods freely
- **Multi-Model Access**: Access 100+ AI models through OpenRouter integration
- **Page Context Awareness**: Intelligent content extraction from any webpage with structured formatting
- **Privacy-First**: Your API key, your data, your control - with optional backend token management
- **Context-Aware Tools**: Built-in utilities that understand your browsing context
- **Cross-Platform** (Coming Soon): Android and iOS apps in development

## 🚀 Quick Start

### Option 1: Login with Gmail (Recommended)
1. Install ByteChat from Chrome Web Store
2. Click the extension icon
3. Click "Login with Google"
4. Authorize the extension
5. Get **1,000,000 free tokens** to start chatting immediately!

### Option 2: Use Your Own API Key
1. Install ByteChat from Chrome Web Store
2. Visit [OpenRouter.ai](https://openrouter.ai) and create a free account
3. Generate an API key from your dashboard
4. Click the ByteChat extension icon
5. Enter "Use Your Own API Key"
6. Paste your OpenRouter API key
7. Start chatting with any available model!

### 3. Start Using
- Pin the extension to your toolbar for easy access
- Open the side panel for persistent chat
- Select tools like Translate, Summarize, or Fix Grammar
- Toggle "Include page content" to analyze current webpage
- Right-click any text for instant context menu access

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
- **✍️ Fix Grammar**: Correct grammar and spelling with explanations (priority tool)
- **🌐 Translate**: Convert text between 20+ languages with source/target selection
- **📝 Summarize**: Create concise summaries of long content
- **🔍 Fact Check**: Verify information with detailed analysis
- **💬 Reply**: Generate contextual social media responses
- **📄 Include Page Content**: Toggle to include current webpage context in your prompts

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
- Right-click on any selected text on any webpage
- Access Fix Grammar, Translate, Summarize, Reply, and Fact Check tools
- Automatic text transfer to side panel
- Tool pre-selection for immediate processing
- Custom prompt option for flexible workflows

### Advanced Features

#### 🔄 **Smart Model Selection**
- **Text**: x-ai/grok-3-mini (default)
- **Images**: google/gemini-2.5-flash-image-preview
- **PDFs/CSVs**: google/gemini-2.5-flash-image-preview with file-parser plugin
- **Audio**: google/gemini-2.5-flash-lite
- **Other Documents**: Converted to text and processed with Grok
- Dynamic model switching based on content type
- Support for 100+ models across all major providers

#### 📊 **Account Management**
- **Gmail Users**: 1M free tokens with real-time token tracking
- **API Key Users**: Balance tracking with color-coded indicators (green/yellow/red)
- Real-time API key validation
- Free tier detection
- Usage statistics and monitoring
- Secure logout option for both authentication methods
- Automatic token refresh and error handling

#### 🌐 **Page Content Intelligence**
- Smart content extraction from any webpage
- Preserves structure: headers, lists, tables, links
- Filters out hidden elements and scripts
- 50,000 character limit to prevent truncation
- Markdown-style formatting for better LLM comprehension
- Automatic reset on tab changes
- Works with Gmail, Twitter, documentation, articles, and more

#### 🔧 **User Experience**
- **Zoom Controls**: Adjust interface text size (50% - 200%)
- **Fully Responsive**: Adapts to panel width when dragged
- **Error Handling**: Comprehensive error messages with auto-recovery
- **Persistent Settings**: All preferences saved locally
- **Real-time Streaming**: Live response generation with token updates
- **Session Management**: Multiple chat sessions with history
- **File Attachments**: Displays attached files with preview badges

## 💰 Pricing & Authentication

### Gmail Authentication (Active)
- **Cost**: $0 to start
- **Free Tokens**: 1,000,000 tokens on signup
- **Models**: Access to free and premium models on OpenRouter
- **Backend**: Managed through ByteChat backend with token tracking
- **Auto-refresh**: Invalid tokens automatically prompt re-login
- **Benefits**: No API key management, usage tracking, seamless experience

### OpenRouter API Key (Active)
- **Cost**: Based on OpenRouter pricing
- **Access**: All models available on OpenRouter
- **Free Models**: Llama, DeepSeek, Grok-3-mini, and more
- **Paid Models**: GPT-4, Claude, Gemini Pro (with your own key)
- **Setup**: Just paste your OpenRouter API key
- **Benefits**: Full control, direct billing, no intermediary

### Coming Soon
- **Premium Plans**: Additional token packages for Gmail users
- **Enterprise**: Team management and private RAG integration with Bytebell
- **Mobile Apps**: Android and iOS with sync across devices

## 🏗️ Project Architecture

```
ByteChat/
├── src/
│   ├── components/              # React components
│   │   ├── MainInterface.tsx        # Main chat interface with tools, models, and page content
│   │   ├── ApiKeySetup.tsx          # Dual authentication: Gmail OAuth + API key setup
│   │   ├── ChatHistory.tsx          # Responsive message display with streaming
│   │   ├── ChatPanel.tsx            # Chat panel component
│   │   ├── SessionSelector.tsx      # Session management dropdown
│   │   ├── ModelSelector.tsx        # Model selection component
│   │   ├── SettingsPanel.tsx        # Settings configuration
│   │   ├── TwitterPanel.tsx         # Social media integration
│   │   ├── FeedbackPanel.tsx        # User feedback component
│   │   ├── popup.tsx               # Extension popup with auth routing
│   │   ├── Select.tsx              # Custom select component
│   │   └── TabButton.tsx           # Tab navigation button
│   ├── services/                # API integrations
│   │   ├── openrouter.ts           # OpenRouter API integration
│   │   ├── googleAuth.ts           # Gmail OAuth authentication service
│   │   ├── balance.ts              # Credit balance management
│   │   ├── modelCategories.ts      # Model categorization logic
│   │   ├── api.ts                  # General API utilities
│   │   ├── claude.ts               # Claude API integration
│   │   ├── openai.ts               # OpenAI API integration
│   │   └── together.ts             # Together API integration
│   ├── utils/                   # Utility functions
│   │   ├── fileEncoder.ts          # File processing and encoding
│   │   ├── sessionManager.ts       # Session state management
│   │   └── utils.ts                # General utilities, page content extraction, streaming
│   ├── config/                  # Configuration
│   │   └── env.ts                  # Environment variables (backend URL, client ID)
│   ├── types/                   # TypeScript definitions
│   │   ├── types.ts                # Main type definitions (User, Settings, etc.)
│   │   └── extension-env.d.ts      # Extension environment types
│   ├── background.ts            # Extension background service worker + context menus
│   ├── contentScript.ts         # Content script for page injection
│   ├── constants.ts             # Application constants
│   └── index.tsx               # React app entry point
├── backend/                     # Python FastAPI backend
│   ├── main.py                 # Main API with streaming and token tracking
│   ├── auth.py                 # Google OAuth token verification
│   ├── requirements.txt        # Python dependencies
│   └── users.db               # SQLite database for user tokens
├── public/                      # Static assets
├── icons/                       # Extension icons and branding
├── manifest.json                # Chrome extension manifest
├── panel.html                   # Side panel HTML template
├── webpack.config.js            # Build configuration
└── tailwind.css                # Compiled Tailwind styles
```

### Tech Stack
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with responsive design
- **Build**: Webpack 5 with environment-based configuration
- **Extension**: Chrome Extensions Manifest V3
- **Authentication**: Chrome Identity API + Google OAuth 2.0
- **Backend**: FastAPI (Python) with SQLite
- **APIs**: OpenRouter REST API for model access
- **Streaming**: Server-Sent Events (SSE) for real-time responses

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
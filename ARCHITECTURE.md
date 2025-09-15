# ByteChat Extension Architecture

## Overview

ByteChat is a Chrome extension that provides AI-powered chat capabilities with multiple model support, multimodal interactions, and context-aware conversations. Built with React, TypeScript, and modern web technologies.

## Core Architecture

### Extension Structure

```
├── manifest.json          # Chrome extension manifest (v3)
├── src/
│   ├── components/         # React UI components
│   ├── services/          # API integrations and business logic
│   ├── utils/             # Utility functions and helpers
│   ├── types/             # TypeScript type definitions
│   ├── background.ts      # Service worker for extension
│   ├── contentScript.ts   # Content script for webpage interaction
│   └── index.tsx          # Main React entry point
├── public/                # Static assets
└── icons/                 # Extension icons
```

## Component Architecture

### Main Components

#### 1. MainInterface (`src/components/MainInterface.tsx`)
**Purpose**: Primary chat interface with full AI capabilities

**Key Features**:
- Multi-model selection (text, image, file, audio)
- File attachments (images, PDFs, Excel, Word, audio)
- Voice recording and transcription
- Session management
- Tool selection for specialized tasks
- Real-time streaming responses

**State Management**:
- Model management (categorized by capability)
- Chat session state
- File attachment handling
- Audio recording state
- UI control state

#### 2. ChatPanel (`src/components/ChatPanel.tsx`)
**Purpose**: Simplified interface for text transformation tasks

**Key Features**:
- Translation between languages
- Tone modification
- Text summarization
- Session restoration for interrupted requests
- Auto-detection of selected text from webpages

#### 3. ApiKeySetup (`src/components/ApiKeySetup.tsx`)
**Purpose**: Initial onboarding for new users

**Key Features**:
- API key validation
- Secure storage in Chrome extension storage
- User-friendly setup experience

#### 4. Supporting Components
- **SessionSelector**: Manages chat session switching
- **ChatHistory**: Displays conversation history with streaming support
- **SettingsPanel**: Configuration and preferences
- **ModelSelector**: AI model selection interface

## Service Layer

### API Services

#### 1. OpenRouter Service (`src/services/openrouter.ts`)
**Purpose**: Primary AI model provider integration

**Capabilities**:
- Model discovery and caching
- Price calculation
- Balance checking
- Free model access

#### 2. OpenAI Service (`src/services/openai.ts`)
**Purpose**: Direct OpenAI API integration

**Features**:
- GPT model access
- Vision model support
- Audio transcription

#### 3. Claude Service (`src/services/claude.ts`)
**Purpose**: Anthropic Claude model integration

**Features**:
- Claude model access
- Long-context conversations

#### 4. Together AI Service (`src/services/together.ts`)
**Purpose**: Together AI platform integration

**Features**:
- Open-source model access
- Cost-effective alternatives

### Core Services

#### 1. API Service (`src/services/api.ts`)
**Purpose**: Unified API communication layer

**Responsibilities**:
- Request routing to appropriate providers
- Error handling and retries
- Response formatting
- Streaming support

#### 2. Balance Service (`src/services/balance.ts`)
**Purpose**: User balance and usage tracking

**Features**:
- Real-time balance monitoring
- Usage analytics
- Free tier management

#### 3. Model Categories (`src/services/modelCategories.ts`)
**Purpose**: Model classification and recommendation

**Features**:
- Automatic model categorization by capability
- Best model recommendations
- User preference storage

## Data Flow

### 1. User Input Processing
```
User Input → MainInterface → API Service → AI Provider → Streaming Response → UI Update
```

### 2. File Attachment Flow
```
File Selection → Base64 Encoding → MessageContent Creation → Multimodal API Call → Response
```

### 3. Session Management
```
User Message → Session Manager → Chrome Storage → UI State Update
```

### 4. Model Selection
```
Capability Detection → Model Categories → Best Model Selection → API Configuration
```

## Storage Strategy

### Chrome Extension Storage
- **Local Storage**: API keys, user preferences, session data
- **Sync Storage**: Cross-device settings synchronization
- **Session Storage**: Temporary streaming state

### State Management
- **React State**: Component-level UI state
- **Context**: Global application state
- **Refs**: Streaming response management

## Security Considerations

### API Key Protection
- Stored in Chrome extension local storage
- Never exposed in logs or network requests
- Validated before storage

### Data Privacy
- Local processing when possible
- Encrypted cloud storage for context layer
- On-demand decryption for context retrieval

### Content Security Policy
- Strict CSP for extension security
- Limited external resource access
- Secure communication channels

## Performance Optimizations

### Model Management
- Model caching to reduce API calls
- Lazy loading of model lists
- Smart model recommendations

### Streaming Responses
- Real-time UI updates during generation
- Chunked response processing
- Interruption and resumption support

### File Handling
- Efficient base64 encoding
- File type validation
- Size limitations

## Extension Integration

### Chrome APIs Used
- **chrome.storage**: Data persistence
- **chrome.identity**: OAuth authentication
- **chrome.tabs**: Tab interaction
- **chrome.contextMenus**: Right-click integration
- **chrome.sidePanel**: Side panel interface

### Content Script Integration
- Selected text extraction
- Context menu integration
- Page interaction capabilities

### Background Service Worker
- Extension lifecycle management
- API request coordination
- Authentication handling

## Build and Development

### Technology Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Build Tool**: Webpack with TypeScript loader
- **Package Manager**: npm
- **Extension API**: Chrome Extension Manifest V3

### Development Workflow
```bash
npm run dev     # Development build with watch mode
npm run build   # Production build for distribution
npm start       # Development server with hot reload
```

### Code Quality
- TypeScript for type safety
- ESLint for code standards
- Prettier for code formatting
- Component-based architecture

## Deployment

### Chrome Web Store
- Manifest V3 compliance
- Privacy policy compliance
- Store listing optimization
- Review process preparation

### Distribution Strategy
- Free tier with OpenRouter API key
- Premium tier with Gmail signup
- Pay-as-you-go for heavy users

## Future Architecture Considerations

### Scalability
- Microservice architecture for backend
- CDN for static assets
- Load balancing for API requests

### Mobile Support
- React Native app development
- Shared component library
- Cross-platform state management

### Advanced Features
- Real-time collaboration
- Advanced context management
- Plugin system for extensions

## Troubleshooting

### Common Issues
1. **API Key Validation Failures**: Network connectivity, invalid keys
2. **Streaming Interruptions**: Browser refreshes, network issues
3. **File Upload Failures**: Size limits, format restrictions
4. **Model Loading Issues**: API rate limits, service availability

### Debug Information
- Console logging for development
- Error tracking and reporting
- Performance monitoring
- User feedback collection

This architecture supports the goal of providing free AI access through OpenRouter while enabling premium features through ByteBank's universal context layer and advanced model access.
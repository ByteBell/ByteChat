import React, { useState, useEffect } from 'react';
import { OpenRouterModel, fetchOpenRouterModels } from '../services/openrouter';
import { SYSTEM_PROMPTS } from '../constants';
import { sendChatRequest } from '../services/api';
import { Settings } from '../types';

interface MainInterfaceProps {
  apiKey: string;
}

type Tool = {
  id: keyof typeof SYSTEM_PROMPTS;
  name: string;
  icon: string;
  description: string;
};

const tools: Tool[] = [
  {
    id: 'Grammar Fix',
    name: 'Grammar Fix',
    icon: '✏️',
    description: 'Fix grammar and improve writing'
  },
  {
    id: 'Translate',
    name: 'Translate',
    icon: '🌐',
    description: 'Translate between languages'
  },
  {
    id: 'Summarize',
    name: 'Summarize',
    icon: '📝',
    description: 'Create concise summaries'
  },
  {
    id: 'Reply',
    name: 'Reply',
    icon: '💬',
    description: 'Generate social media replies'
  },
  {
    id: 'Fact Check',
    name: 'Fact Check',
    icon: '🔍',
    description: 'Verify information accuracy'
  }
];

const MainInterface: React.FC<MainInterfaceProps> = ({ apiKey }) => {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);

  useEffect(() => {
    loadModels();
  }, [apiKey]);

  const loadModels = async () => {
    try {
      const fetchedModels = await fetchOpenRouterModels(apiKey);
      setModels(fetchedModels);
      if (fetchedModels.length > 0) {
        setSelectedModel(fetchedModels[0].id);
      }
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    setShowTools(false);
    setOutput('');
    setInput('');
  };

  const handleSubmit = async () => {
    if (!input.trim() || !selectedModel) return;

    setIsLoading(true);
    try {
      const settings: Settings = {
        provider: 'openrouter',
        apiKey,
        model: selectedModel,
        temperature: 0.1
      };

      let messages;
      if (selectedTool) {
        // Tool-based request with system prompt
        const systemPrompt = SYSTEM_PROMPTS[selectedTool.id];
        messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: input }
        ];
      } else {
        // Direct chat request without system prompt
        messages = [
          { role: 'user' as const, content: input }
        ];
      }

      const response = await sendChatRequest(messages, settings);
      setOutput(response.choices[0]?.message?.content || 'No response received');
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <img
            src={chrome.runtime.getURL("icons/test-logo-256.png")}
            alt="MaxAI"
            className="w-24 h-24 rounded-xl shadow-lg"
            style={{ minWidth: '96px', minHeight: '96px' }}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">xAI</h1>
            <p className="text-sm text-gray-500">AI Writing Assistant</p>
          </div>
        </div>
        
        {/* Model Selector */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={loadingModels}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-0 max-w-48"
          >
            {loadingModels ? (
              <option>Loading models...</option>
            ) : (
              models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name || model.id}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Chat and Tools Section */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        {/* Direct Chat Option */}
        <button
          onClick={() => {
            setSelectedTool(null);
            setShowTools(false);
          }}
          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
            selectedTool === null && !showTools
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">💬 Chat</span>
            {selectedTool === null && !showTools && <span className="text-blue-500">✓</span>}
          </div>
          <p className="text-xs text-gray-500 mt-1">Ask anything directly to the AI</p>
        </button>

        {/* Tools Option */}
        {!showTools ? (
          <button
            onClick={() => setShowTools(true)} 
            className="w-full text-left p-3 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">🛠️ Tools</span>
              <span className="text-gray-400">→</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Grammar Fix, Translate, Summarize, Reply, Fact Check</p>
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-700">🛠️ Tools</h2>
              <button
                onClick={() => setShowTools(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool)}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all text-xs ${
                    selectedTool?.id === tool.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="text-lg mb-1">{tool.icon}</span>
                  <span className="font-medium leading-tight text-center">{tool.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedTool || (!selectedTool && !showTools && (input || output)) ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            {selectedTool && (
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTool.name}</h3>
                  <button
                    onClick={() => {
                      setSelectedTool(null);
                      setShowTools(false);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">{selectedTool.description}</p>
              </div>
            )}

            {/* Input Section */}
            <div className="flex-1 flex flex-col p-4 space-y-4">
              <div className="flex-1 min-h-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedTool ? 'Input' : 'Message'}
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    selectedTool 
                      ? `Enter text to ${selectedTool.name.toLowerCase()}...`
                      : "Ask me anything..."
                  }
                  className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Action Button */}
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {isLoading ? 'Processing...' : (selectedTool ? selectedTool.name : 'Send')}
              </button>

              {/* Output Section */}
              {(output || isLoading) && (
                <div className="flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {selectedTool ? 'Output' : 'Response'}
                    </label>
                    {output && (
                      <button
                        onClick={copyToClipboard}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                  <div className="h-40 p-3 border border-gray-300 rounded-lg bg-gray-50 overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-gray-600">Processing...</span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">{output}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-6xl mb-6">🤖</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Welcome to xAI</h3>
              <p className="text-gray-600">Choose "Chat" for direct conversation or "Tools" for specialized tasks</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainInterface;
import React, { useState, useEffect } from 'react';
import { OpenRouterModel, fetchOpenRouterModels, refreshModelsCache, getModelPrice, getModelContextLength, getModelFeatures } from '../services/openrouter';
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
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [modelSearch, setModelSearch] = useState('');

  useEffect(() => {
    loadModels();
    checkForPendingText();
  }, [apiKey]);

  // Check for text sent from context menu
  const checkForPendingText = async () => {
    try {
      const result = await chrome.storage.local.get([
        'pending_text', 
        'pending_tool', 
        'pending_is_custom_prompt', 
        'pending_timestamp'
      ]);
      
      if (result.pending_text && result.pending_timestamp) {
        // Check if the pending text is recent (within 30 seconds)
        const isRecent = Date.now() - result.pending_timestamp < 30000;
        
        if (isRecent) {
          console.log('[MainInterface] Found pending text:', result.pending_text);
          
          // Set the text
          setInput(result.pending_text);
          
          // Handle custom prompt vs tool selection
          if (result.pending_is_custom_prompt) {
            // For custom prompt, clear any selected tool and show chat mode
            setSelectedTool(null);
            setShowTools(false);
            console.log('[MainInterface] Set up for custom prompt mode');
          } else if (result.pending_tool) {
            // Select the appropriate tool if specified
            const tool = tools.find(t => t.name === result.pending_tool);
            if (tool) {
              setSelectedTool(tool);
              setShowTools(false);
              console.log('[MainInterface] Selected tool:', result.pending_tool);
            }
          }
          
          // Clear the pending data
          chrome.storage.local.remove([
            'pending_text', 
            'pending_tool', 
            'pending_is_custom_prompt', 
            'pending_timestamp'
          ]);
        }
      }
    } catch (error) {
      console.error('[MainInterface] Failed to check pending text:', error);
    }
  };

  // Close model dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showModelDropdown) {
        const target = event.target as Element;
        if (!target.closest('.model-dropdown')) {
          setShowModelDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelDropdown]);

  const loadModels = async (forceRefresh = false) => {
    setLoadingModels(true);
    try {
      const fetchedModels = forceRefresh 
        ? await refreshModelsCache(apiKey)
        : await fetchOpenRouterModels(apiKey);
        
      setModels(fetchedModels);
      console.log(`[MainInterface] Loaded ${fetchedModels.length} models`);
      
      // Check if we have a saved model preference
      const savedModel = await getSavedSelectedModel();
      const modelExists = fetchedModels.some(m => m.id === savedModel);
      
      if (savedModel && modelExists) {
        setSelectedModel(savedModel);
        console.log(`[MainInterface] Restored saved model: ${savedModel}`);
      } else if (fetchedModels.length > 0) {
        setSelectedModel(fetchedModels[0].id);
        // Save the default model selection
        await saveSelectedModel(fetchedModels[0].id);
      }
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleRefreshModels = () => {
    loadModels(true);
  };

  // Helper functions for saving/loading selected model
  const saveSelectedModel = async (modelId: string) => {
    try {
      await chrome.storage.local.set({ 'selected_model': modelId });
      console.log(`[MainInterface] Saved selected model: ${modelId}`);
    } catch (error) {
      console.error('[MainInterface] Failed to save selected model:', error);
    }
  };

  const getSavedSelectedModel = async (): Promise<string | null> => {
    try {
      const result = await chrome.storage.local.get(['selected_model']);
      return result.selected_model || null;
    } catch (error) {
      console.error('[MainInterface] Failed to get saved model:', error);
      return null;
    }
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    await saveSelectedModel(modelId);
    setShowModelDropdown(false);
    setModelSearch('');
  };

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    setShowTools(false);
    setOutput('');
    setInput('');
  };

  const handleSubmit = async () => {
    if (!input.trim()) {
      setOutput('Please enter some text before submitting.');
      return;
    }
    
    if (!selectedModel) {
      setOutput('Please select a model before submitting.');
      return;
    }

    console.log('Starting request with input:', input);
    console.log('Selected model:', selectedModel);
    
    setIsLoading(true);
    setOutput(''); // Clear previous output
    
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
        console.log('Using tool:', selectedTool.name, 'with system prompt');
        messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: input }
        ];
      } else {
        // Direct chat request without system prompt
        console.log('Using direct chat without system prompt');
        messages = [
          { role: 'user' as const, content: input }
        ];
      }

      console.log('Sending request with messages:', messages);
      const response = await sendChatRequest(messages, settings);
      console.log('Full response received:', response);
      
      const content = response.choices?.[0]?.message?.content;
      console.log('Extracted content:', content);
      
      if (content) {
        setOutput(content);
        console.log('Output set successfully');
      } else {
        setOutput('No response content received');
        console.log('No content in response');
      }
    } catch (error) {
      console.error('Request failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setOutput(`Error: ${errorMessage}`);
      console.log('Error output set:', errorMessage);
    } finally {
      setIsLoading(false);
      console.log('Request completed, loading set to false');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
  };

  return (
    <div className="flex flex-col bg-white" style={{ height: '100%', position: 'relative' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <img
            src={chrome.runtime.getURL("icons/test-logo-256.png")}
            alt="MaxAI"
            className="w-10 h-10 rounded-lg shadow-lg"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900">xAI</h1>
            <p className="text-xs text-gray-500">AI Writing Assistant</p>
          </div>
        </div>
        
        {/* Model Selector and Refresh */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefreshModels}
            disabled={loadingModels}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="Refresh models"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          <div className="relative model-dropdown">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              disabled={loadingModels}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-0 max-w-44 flex items-center justify-between"
            >
              <span className="truncate">
                {loadingModels 
                  ? 'Loading...' 
                  : models.find(m => m.id === selectedModel)?.name || selectedModel || 'Select Model'
                }
              </span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

          {showModelDropdown && (
            <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Search models..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="max-h-60 overflow-y-auto">
                {models
                  .filter(model =>
                    (model.name ?? model.id).toLowerCase().includes(modelSearch.toLowerCase()) ||
                    model.id.toLowerCase().includes(modelSearch.toLowerCase())
                  )
                  .map((model) => {
                    const features = getModelFeatures(model);
                    const price = getModelPrice(model);
                    const contextLength = getModelContextLength(model);
                    
                    return (
                      <button
                        key={model.id}
                        onClick={() => handleModelChange(model.id)}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0 ${
                          selectedModel === model.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <div className="font-medium truncate">{model.name ?? model.id}</div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-xs text-gray-500 truncate flex-1">{contextLength}</div>
                          <div className="text-xs text-green-600 font-medium ml-2">{price}</div>
                        </div>
                        {features.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {features.slice(0, 3).map(feature => (
                              <span 
                                key={feature}
                                className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })
                }
                {models.filter(model =>
                  (model.name ?? model.id).toLowerCase().includes(modelSearch.toLowerCase()) ||
                  model.id.toLowerCase().includes(modelSearch.toLowerCase())
                ).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No models found</div>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Chat and Tools Section */}
      <div className="p-2 border-b border-gray-200 space-y-2">
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
      <div className="flex-1 flex flex-col">
        {selectedTool || (!selectedTool && !showTools) ? (
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
            <div className="flex flex-col p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedTool ? 'Input' : 'Message'}
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={
                    selectedTool 
                      ? `Enter text to ${selectedTool.name.toLowerCase()}... (Ctrl+Enter to submit)`
                      : "Ask me anything... (Ctrl+Enter to submit)"
                  }
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Action Button */}
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {isLoading ? 'Processing...' : (selectedTool ? selectedTool.name : 'Send')}
              </button>

              {/* Output Section */}
              <div>
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
                <div className="min-h-[200px] max-h-96 p-3 border border-gray-300 rounded-lg bg-gray-50 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-gray-600">Processing...</span>
                    </div>
                  ) : output ? (
                    <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{output}</div>
                  ) : (
                    <div className="text-sm text-gray-500">Response will appear here...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col p-4 space-y-4">
            {/* Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Type your message here... (Ctrl+Enter to submit)"
                className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-lg transition-colors"
            >
              {isLoading ? 'Processing...' : 'Send Message'}
            </button>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Response
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
              <div className="min-h-[200px] max-h-96 p-3 border border-gray-300 rounded-lg bg-gray-50 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">Processing...</span>
                  </div>
                ) : output ? (
                  <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{output}</div>
                ) : (
                  <div className="text-sm text-gray-500">Response will appear here...</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainInterface;
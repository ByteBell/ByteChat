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
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        {/* Logo and Title Row */}
        <div className="flex items-center space-x-3 mb-3">
          <img
            src={chrome.runtime.getURL("icons/ByteBellLogo.png")}
            alt="BB Chat"
            className="w-10 h-10 rounded-lg shadow-lg"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900">BB Chat</h1>
            <p className="text-xs text-gray-500">AI Writing Assistant</p>
          </div>
        </div>
        
        {/* Model Selector Row */}
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
          
          <div className="relative model-dropdown flex-1">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              disabled={loadingModels}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex items-center justify-between"
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
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-50">
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

      {/* Main Content - ChatGPT Style */}
      <div className="flex-1 flex flex-col">
        {/* Response Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-full">
            {output ? (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedTool ? `${selectedTool.name} Result` : 'AI Response'}
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Copy
                  </button>
                </div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {output}
                </div>
              </div>
            ) : isLoading ? (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Processing...</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-8">
                <h3 className="text-lg font-medium mb-2">Welcome to BB Chat</h3>
                <p className="text-sm">Start a conversation or choose a tool to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Centered in bottom section */}
        <div className="border-t border-gray-200 p-8 bg-white flex flex-col justify-center min-h-[200px]">
          {/* Selected Tool Indicator */}
          {selectedTool && (
            <div className="flex items-center justify-between mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{selectedTool.icon}</span>
                <span className="text-sm font-medium text-blue-700">{selectedTool.name}</span>
                <span className="text-xs text-blue-600">• {selectedTool.description}</span>
              </div>
              <button
                onClick={() => setSelectedTool(null)}
                className="text-blue-400 hover:text-blue-600"
              >
                ✕
              </button>
            </div>
          )}

          {/* Input Box with Tool Selector */}
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) {
                    handleSubmit();
                  }
                }
              }}
              placeholder={
                selectedTool 
                  ? `Enter text for ${selectedTool.name.toLowerCase()}... (Press Enter to send)`
                  : "Type your message here... (Press Enter to send, Shift+Enter for new line)"
              }
              className="w-full min-h-[120px] max-h-[300px] p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base leading-relaxed"
              style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              disabled={isLoading}
            />
            
            {/* Tools Button on Left - Outside textarea */}
            <button
              onMouseEnter={() => setShowTools(true)}
              onMouseLeave={() => setShowTools(false)}
              className="absolute left-3 bottom-3 flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-10"
              title="Select Tool"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Tools Dropdown */}
            {showTools && (
              <div 
                className="absolute bottom-12 left-3 mb-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50"
                onMouseEnter={() => setShowTools(true)}
                onMouseLeave={() => setShowTools(false)}
              >
                  <div className="p-3">
                    <div className="text-xs font-semibold text-gray-400 mb-3 px-2">SELECT TOOL</div>
                    
                    <button
                      onClick={() => {
                        setSelectedTool(null);
                        setShowTools(false);
                      }}
                      className={`w-full text-left px-3 py-3 rounded-lg text-sm hover:bg-gray-50 transition-colors ${
                        !selectedTool ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">💬</span>
                        <div>
                          <div className="font-medium">Chat</div>
                          <div className="text-xs text-gray-500 mt-0.5">Ask anything directly</div>
                        </div>
                      </div>
                    </button>

                    {tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          handleToolSelect(tool);
                          setShowTools(false);
                        }}
                        className={`w-full text-left px-3 py-3 rounded-lg text-sm hover:bg-gray-50 transition-colors ${
                          selectedTool?.id === tool.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{tool.icon}</span>
                          <div>
                            <div className="font-medium">{tool.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{tool.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            
            {/* Send Button on Right - Properly Aligned and Sized */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 bottom-3 flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainInterface;
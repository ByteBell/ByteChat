import React, { useState, useEffect } from 'react';
import { OpenRouterModel, fetchOpenRouterModels, refreshModelsCache, getModelPrice, getModelContextLength, getModelFeatures } from '../services/openrouter';
import { categorizeModels, getAllModelPreferences, getBestModelForCapability, saveModelPreference, type ModelsByCategory } from '../services/modelCategories';
import { getCachedBalanceInfo, type BalanceInfo } from '../services/balance';
import { SYSTEM_PROMPTS } from '../constants';
import { sendChatRequest } from '../services/api';
import { Settings, ModelCapability, MessageContent } from '../types';

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
  const [allModels, setAllModels] = useState<OpenRouterModel[]>([]);
  const [categorizedModels, setCategorizedModels] = useState<ModelsByCategory>({
    text: [], image: [], file: [], audio: []
  });
  const [selectedModels, setSelectedModels] = useState<Record<ModelCapability, string>>({
    text: '', image: '', file: '', audio: ''
  });
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<MessageContent[]>([]);

  useEffect(() => {
    loadModels();
    checkForPendingText();
    loadBalance();
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

  // No dropdown click outside handler needed for select elements

  const loadModels = async (forceRefresh = false) => {
    setLoadingModels(true);
    try {
      const fetchedModels = forceRefresh 
        ? await refreshModelsCache(apiKey)
        : await fetchOpenRouterModels(apiKey);
        
      setAllModels(fetchedModels);
      console.log(`[MainInterface] Loaded ${fetchedModels.length} models`);
      
      // Categorize models by capability
      const categorized = categorizeModels(fetchedModels);
      setCategorizedModels(categorized);
      
      // Load saved model preferences
      const preferences = await getAllModelPreferences();
      const newSelectedModels: Record<ModelCapability, string> = {
        text: '',
        image: '',
        file: '',
        audio: ''
      };
      
      // Set models for each capability
      for (const capability of (['text', 'image', 'file', 'audio'] as ModelCapability[])) {
        const bestModel = await getBestModelForCapability(capability, categorized);
        if (bestModel) {
          newSelectedModels[capability] = bestModel;
        }
      }
      
      setSelectedModels(newSelectedModels);
      console.log('[MainInterface] Loaded model preferences:', newSelectedModels);
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const loadBalance = async () => {
    try {
      const balanceInfo = await getCachedBalanceInfo(apiKey);
      setBalance(balanceInfo);
      console.log('[MainInterface] Loaded balance:', balanceInfo);
    } catch (error) {
      console.error('[MainInterface] Failed to load balance:', error);
    }
  };

  const handleRefreshModels = () => {
    loadModels(true);
  };

  const handleModelChange = async (capability: ModelCapability, modelId: string) => {
    const newSelectedModels = { ...selectedModels, [capability]: modelId };
    setSelectedModels(newSelectedModels);
    await saveModelPreference(capability, modelId);
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
    
    // Determine which model to use based on attached content
    let modelToUse = '';
    let capabilityNeeded: ModelCapability = 'text';
    
    if (attachedFiles.some(file => file.type === 'image_url')) {
      capabilityNeeded = 'image';
      modelToUse = selectedModels.image;
    } else if (attachedFiles.some(file => file.type === 'file')) {
      capabilityNeeded = 'file';
      modelToUse = selectedModels.file;
    } else if (attachedFiles.some(file => file.type === 'input_audio')) {
      capabilityNeeded = 'audio';
      modelToUse = selectedModels.audio;
    } else {
      capabilityNeeded = 'text';
      modelToUse = selectedModels.text;
    }
    
    if (!modelToUse) {
      setOutput(`Please select a ${capabilityNeeded} model before submitting.`);
      return;
    }

    console.log('Starting request with input:', input);
    console.log('Selected model:', modelToUse, 'for capability:', capabilityNeeded);
    
    setIsLoading(true);
    setOutput(''); // Clear previous output
    
    try {
      const settings: Settings = {
        provider: 'openrouter',
        apiKey,
        model: modelToUse,
        temperature: 0.1
      };

      // Prepare multimodal content
      const userContent: MessageContent[] = [
        { type: 'text', text: input }
      ];
      
      // Add attached files/media to content
      userContent.push(...attachedFiles);
      
      let messages;
      if (selectedTool) {
        // Tool-based request with system prompt
        const systemPrompt = SYSTEM_PROMPTS[selectedTool.id];
        console.log('Using tool:', selectedTool.name, 'with system prompt');
        messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userContent }
        ];
      } else {
        // Direct chat request without system prompt
        console.log('Using direct chat without system prompt');
        messages = [
          { role: 'user' as const, content: userContent }
        ];
      }
      
      console.log('Multimodal content:', userContent);

      console.log('Sending request with messages:', messages);
      const response = await sendChatRequest(messages, settings);
      console.log('Full response received:', response);
      
      const content = response.choices?.[0]?.message?.content;
      console.log('Extracted content:', content);
      
      if (content) {
        setOutput(content);
        clearAllAttachments(); // Clear attachments after successful submission
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

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = (e.target?.result as string)?.split(',')[1];
          if (base64) {
            console.log('Voice recording completed');
            console.log('Audio file size:', blob.size);
            
            const audioContent: MessageContent = {
              type: 'input_audio',
              input_audio: {
                data: base64,
                format: 'wav'
              }
            };
            
            addFileAttachment(audioContent);
            console.log('Audio recording attached for multimodal request');
          }
        };
        reader.readAsDataURL(blob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      console.log('Voice recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
      console.log('Voice recording stopped');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // File attachment helpers
  const addFileAttachment = (content: MessageContent) => {
    setAttachedFiles(prev => [...prev, content]);
  };

  const removeFileAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllAttachments = () => {
    setAttachedFiles([]);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        {/* Logo and Title Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
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
          
          {/* Balance Display */}
          {balance && (
            <div className="space-y-1">
              <div className={`text-sm font-medium ${
                balance.color === 'red' ? 'text-red-500' : 
                balance.color === 'yellow' ? 'text-yellow-600' : 
                'text-green-600'
              }`}>
                💰 {balance.display}
              </div>
              <div className="text-xs text-gray-500">
                {balance.usageDisplay}
              </div>
              {balance.isFreeAccount && (
                <div className="text-xs text-blue-600 font-medium">
                  🆓 Free Tier
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 4 Model Selectors - All Visible */}
        <div className="space-y-3">
          {/* Refresh Button */}
          <div className="flex justify-end">
            <button
              onClick={handleRefreshModels}
              disabled={loadingModels}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Refresh all models"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Text Model Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Text Model</label>
            <select
              value={selectedModels.text}
              onChange={(e) => handleModelChange('text', e.target.value)}
              disabled={loadingModels}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select text model</option>
              {categorizedModels.text.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name || model.id} - {getModelPrice(model)}
                </option>
              ))}
            </select>
          </div>

          {/* Image Model Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Image Model</label>
            <select
              value={selectedModels.image}
              onChange={(e) => handleModelChange('image', e.target.value)}
              disabled={loadingModels}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select image model</option>
              {categorizedModels.image.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name || model.id} - {getModelPrice(model)}
                </option>
              ))}
            </select>
          </div>

          {/* File Model Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">File Model</label>
            <select
              value={selectedModels.file}
              onChange={(e) => handleModelChange('file', e.target.value)}
              disabled={loadingModels}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select file model</option>
              {categorizedModels.file.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name || model.id} - {getModelPrice(model)}
                </option>
              ))}
            </select>
          </div>

          {/* Audio Model Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Audio Model</label>
            <select
              value={selectedModels.audio}
              onChange={(e) => handleModelChange('audio', e.target.value)}
              disabled={loadingModels}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select audio model</option>
              {categorizedModels.audio.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name || model.id} - {getModelPrice(model)}
                </option>
              ))}
            </select>
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
        <div className="border-t border-gray-200 p-4 sm:p-8 bg-white flex flex-col justify-center min-h-[160px] sm:min-h-[200px]">
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

          {/* Attached Files Display */}
          {attachedFiles.length > 0 && (
            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Attached Files ({attachedFiles.length})
                </span>
                <button
                  onClick={clearAllAttachments}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                  >
                    <span>
                      {file.type === 'image_url' ? '🖼️' : 
                       file.type === 'file' ? '📄' : 
                       file.type === 'input_audio' ? '🎤' : '📎'}
                    </span>
                    <span>{file.type.replace('_', ' ')}</span>
                    <button
                      onClick={() => removeFileAttachment(index)}
                      className="text-blue-500 hover:text-blue-700 ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
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
              className="w-full min-h-[100px] sm:min-h-[120px] max-h-[200px] sm:max-h-[300px] p-3 sm:p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm sm:text-base leading-relaxed"
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
            
            {/* File Upload Buttons - Properly Spaced */}
            {/* Image Upload */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const content = e.target?.result as string;
                      console.log('Image file:', file.name, 'Size:', file.size);
                      
                      const imageContent: MessageContent = {
                        type: 'image_url',
                        image_url: {
                          url: content
                        }
                      };
                      
                      addFileAttachment(imageContent);
                      console.log('Image attached for multimodal request');
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              className="absolute left-14 bottom-3 flex items-center justify-center w-8 h-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors z-10"
              title="Upload Image (JPG, PNG, GIF)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Excel Upload */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xlsx,.xls,.csv';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const arrayBuffer = e.target?.result as ArrayBuffer;
                      const base64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(arrayBuffer))));
                      console.log('Excel file:', file.name, 'Size:', file.size);
                      
                      const fileContent: MessageContent = {
                        type: 'file',
                        file: {
                          data: base64,
                          format: file.name.endsWith('.csv') ? 'csv' : 'xlsx'
                        }
                      };
                      
                      addFileAttachment(fileContent);
                      console.log('Excel/CSV attached for multimodal request');
                    };
                    reader.readAsArrayBuffer(file);
                  }
                };
                input.click();
              }}
              className="absolute left-24 bottom-3 flex items-center justify-center w-8 h-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors z-10"
              title="Upload Excel/CSV Spreadsheet"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>

            {/* PDF Upload */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const arrayBuffer = e.target?.result as ArrayBuffer;
                      const base64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(arrayBuffer))));
                      console.log('PDF file:', file.name, 'Size:', file.size);
                      
                      const fileContent: MessageContent = {
                        type: 'file',
                        file: {
                          data: base64,
                          format: 'pdf'
                        }
                      };
                      
                      addFileAttachment(fileContent);
                      console.log('PDF attached for multimodal request');
                    };
                    reader.readAsArrayBuffer(file);
                  }
                };
                input.click();
              }}
              className="absolute left-34 bottom-3 flex items-center justify-center w-8 h-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors z-10"
              title="Upload PDF Document"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>

            {/* Word Upload */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.docx,.doc';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const arrayBuffer = e.target?.result as ArrayBuffer;
                      const base64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(arrayBuffer))));
                      console.log('Word file:', file.name, 'Size:', file.size);
                      
                      const fileContent: MessageContent = {
                        type: 'file',
                        file: {
                          data: base64,
                          format: file.name.endsWith('.docx') ? 'docx' : 'doc'
                        }
                      };
                      
                      addFileAttachment(fileContent);
                      console.log('Word document attached for multimodal request');
                    };
                    reader.readAsArrayBuffer(file);
                  }
                };
                input.click();
              }}
              className="absolute left-44 bottom-3 flex items-center justify-center w-8 h-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors z-10"
              title="Upload Word Document"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>

            {/* Voice Recording Button */}
            <button
              onClick={toggleRecording}
              className={`absolute left-54 bottom-3 flex items-center justify-center w-8 h-8 rounded-lg transition-colors z-10 ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'
              }`}
              title={isRecording ? "Stop Recording" : "Start Voice Recording"}
            >
              {isRecording ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            {/* Send Button on Right - Same size as tool icon */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 bottom-3 flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainInterface;
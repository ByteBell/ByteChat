/**
 * AgentChat - Simple test component for Conversational Browser Agent
 * This is a minimal implementation to test the new browser automation features
 */

import React, { useState, useEffect, useRef } from 'react';
import { ConversationalAgent, AgentMessage, AgentConfig } from 'bytechat-browser-agent';
import { CustomPrompt } from 'prompt-library';
import { usePromptLibrary } from '../hooks/usePromptLibrary';
import { PromptManager } from './PromptManager';
import { loadStoredSettings } from '../utils';
import { Settings } from '../types';

const AgentChat: React.FC = () => {
  const [messages, setMessages] = useState<Array<{role: string, content: string, type?: string}>>([]);
  const [inputValue, setInputValue] = useState('');
  const [agent, setAgent] = useState<ConversationalAgent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Prompt library state
  const {
    prompts,
    createPrompt,
    updatePrompt,
    deletePrompt,
    error: promptError
  } = usePromptLibrary();
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);

  // Initialize agent
  useEffect(() => {
    const initAgent = async () => {
      try {
        const settings = await loadStoredSettings();

        if (!settings.apiKey) {
          setError('Please configure your OpenRouter API key in settings');
          return;
        }

        const config: AgentConfig = {
          openrouterKey: settings.apiKey,
          model: settings.model || 'openai/gpt-4o-mini',
          onMessage: (msg: AgentMessage) => {
            console.log('[AgentChat] Received message:', msg);
            setMessages(prev => [...prev, {
              role: 'agent',
              content: msg.content,
              type: msg.type
            }]);
            setIsLoading(false);
          },
          onProgress: (progress) => {
            console.log('[AgentChat] Progress:', progress);
          },
          onError: (err) => {
            console.error('[AgentChat] Error:', err);
            setError(err.message);
            setIsLoading(false);
          },
          confirmActions: true,
          autoSubmitForms: false
        };

        const newAgent = new ConversationalAgent(config);
        setAgent(newAgent);
        console.log('[AgentChat] Agent initialized');

        // Add welcome message
        setMessages([{
          role: 'agent',
          content: '👋 Hi! I can help you automate browser actions. Try saying "Fill this form" on a page with a form!',
          type: 'text'
        }]);

      } catch (err: any) {
        console.error('[AgentChat] Init failed:', err);
        setError(`Failed to initialize: ${err.message}`);
      }
    };

    initAgent();
  }, []);

  // Update agent's custom prompt when selection changes
  useEffect(() => {
    if (agent && selectedPromptId) {
      const selectedPrompt = prompts.find((p: CustomPrompt) => p.id === selectedPromptId);
      if (selectedPrompt) {
        agent.setCustomPrompt(selectedPrompt.prompt);
        console.log('[AgentChat] Custom prompt applied:', selectedPrompt.name);
      }
    } else if (agent) {
      agent.setCustomPrompt(undefined);
      console.log('[AgentChat] Custom prompt cleared');
    }
  }, [agent, selectedPromptId, prompts]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !agent || isLoading) {
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message to UI
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage
    }]);

    setIsLoading(true);
    setError(null);

    try {
      // Send to agent - it handles everything
      await agent.sendMessage(userMessage);
    } catch (err: any) {
      console.error('[AgentChat] Send failed:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Prompt management handlers
  const handlePromptSave = (input: { name: string; prompt: string }) => {
    let result;
    if (editingPrompt) {
      result = updatePrompt(editingPrompt.id, input);
    } else {
      result = createPrompt(input);
    }

    if (result.success) {
      setIsPromptModalOpen(false);
      setEditingPrompt(null);
    }
  };

  const handlePromptDelete = (id: string) => {
    const result = deletePrompt(id);
    if (result.success) {
      setIsPromptModalOpen(false);
      setEditingPrompt(null);
      if (selectedPromptId === id) {
        setSelectedPromptId(null);
      }
    }
  };

  const handleNewPrompt = () => {
    setEditingPrompt(null);
    setIsPromptModalOpen(true);
  };

  const handleEditPrompt = (prompt: CustomPrompt) => {
    setEditingPrompt(prompt);
    setIsPromptModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          🤖 Browser Agent
          <span className="text-xs font-normal text-gray-600">
            (Beta - AI-powered automation)
          </span>
        </h2>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : msg.type === 'error'
                  ? 'bg-red-50 text-red-900 border border-red-200'
                  : msg.type === 'progress'
                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                  : msg.type === 'completion'
                  ? 'bg-green-50 text-green-900 border border-green-200'
                  : msg.type === 'question'
                  ? 'bg-yellow-50 text-yellow-900 border border-yellow-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span className="text-sm text-gray-600">Agent is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        {/* Message Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (e.g., 'Fill this form')"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || !agent}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !agent || !inputValue.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>

        <p className="text-xs text-gray-500">
          💡 Tip: Navigate to a page with a form, then ask "Fill this form" or provide data directly
        </p>
      </div>

      {/* Prompt Manager Modal */}
      <PromptManager
        isOpen={isPromptModalOpen}
        onClose={() => {
          setIsPromptModalOpen(false);
          setEditingPrompt(null);
        }}
        onSave={handlePromptSave}
        onDelete={handlePromptDelete}
        editingPrompt={editingPrompt}
        errorMessage={promptError}
      />
    </div>
  );
};

export default AgentChat;

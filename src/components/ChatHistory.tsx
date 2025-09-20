import React, { useEffect, useRef } from 'react';
import { SessionMessage, MessageContent } from '../types';

interface ChatHistoryProps {
  messages: SessionMessage[];
  isLoading?: boolean;
  streamingResponse?: string;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, isLoading = false, streamingResponse = '' }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added or streaming response updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatMessageContent = (content: string | MessageContent[]): string => {
    if (typeof content === 'string') {
      return content;
    }

    // Extract text from multimodal content
    return content
      .filter((item) => item.type === 'text')
      .map((item) => (item as any).text)
      .join(' ');
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getReadableModelName = (modelId: string): string => {
    // Extract readable name from model ID
    const parts = modelId.split('/');
    const modelName = parts[parts.length - 1];

    // Convert common model names to more readable format
    if (modelName.includes('gemini')) {
      return 'Gemini';
    } else if (modelName.includes('gpt-4')) {
      return 'GPT-4';
    } else if (modelName.includes('gpt-3.5')) {
      return 'GPT-3.5';
    } else if (modelName.includes('claude')) {
      return 'Claude';
    } else if (modelName.includes('llama')) {
      return 'Llama';
    } else {
      // Fallback: capitalize first letter and remove dashes/underscores
      return modelName
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  };

  const renderAttachments = (attachments?: MessageContent[]) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map((attachment, index) => (
          <div
            key={index}
            className="flex items-center space-x-1 px-2 py-1 bg-gray-50 border border-gray-200 text-gray-700 rounded text-xs"
          >
            <span>
              {attachment.type === 'image_url' ? '🖼️' :
               attachment.type === 'file' ? '📄' :
               attachment.type === 'input_audio' ? '🎤' : '📎'}
            </span>
            <span>
              {attachment.type === 'file' && 'filename' in attachment
                ? attachment.filename
                : attachment.type.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <h3 className="text-lg font-medium mb-2">Start a Conversation</h3>
          <p className="text-sm">Type a message below to begin chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              message.role === 'user'
                ? 'bg-transparent border border-gray-200 text-gray-900 ml-12'
                : 'bg-gray-50 text-gray-900 mr-12'
            }`}
          >
            {/* Message Content */}
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {formatMessageContent(message.content)}
            </div>

            {/* Attachments */}
            {renderAttachments(message.attachments)}

            {/* Message Footer */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-xs opacity-70">
                <span>{formatTimestamp(message.timestamp)}</span>
                {message.model && message.model !== 'system' && (
                  <>
                    <span>•</span>
                    <span>{getReadableModelName(message.model)}</span>
                  </>
                )}
              </div>

              {/* Copy Button */}
              <button
                onClick={() => copyToClipboard(formatMessageContent(message.content))}
                className="text-xs px-2 py-1 rounded hover:bg-gray-50 transition-colors text-gray-500"
                title="Copy message"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Streaming Response */}
      {streamingResponse && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-50 text-gray-900 mr-12">
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {streamingResponse}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-xs opacity-70">
                <div className="flex items-center space-x-1">
                  <div className="animate-pulse w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span>Streaming...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && !streamingResponse && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-50 text-gray-900 mr-12">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
              <span className="text-sm">AI is thinking...</span>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatHistory;
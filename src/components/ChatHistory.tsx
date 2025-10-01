import React, { useEffect, useRef, useState } from 'react';
import { SessionMessage, MessageContent } from '../types';

interface ChatHistoryProps {
  messages: SessionMessage[];
  isLoading?: boolean;
  streamingResponse?: string;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, isLoading = false, streamingResponse = '' }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  // Auto-scroll to bottom when new messages are added or streaming response updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse]);

  // Auto-expand only the latest assistant message
  useEffect(() => {
    if (messages.length > 0) {
      // Find the latest assistant message
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          setExpandedMessages(new Set([messages[i].id]));
          break;
        }
      }
    }
  }, [messages]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const truncateText = (text: string, maxLength: number = 150): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              message.role === 'user'
                ? 'bg-transparent border border-gray-200 text-gray-900'
                : 'bg-gray-50 text-gray-900'
            }`}
          >
            {/* Message Content */}
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {(() => {
                const content = formatMessageContent(message.content);
                const isExpanded = expandedMessages.has(message.id);
                const shouldTruncate = content.length > 150;

                return shouldTruncate && !isExpanded ? truncateText(content) : content;
              })()}
            </div>

            {/* Expand/Collapse Button */}
            {(() => {
              const content = formatMessageContent(message.content);
              const shouldShowToggle = content.length > 150;
              const isExpanded = expandedMessages.has(message.id);

              return shouldShowToggle ? (
                <button
                  onClick={() => toggleMessageExpansion(message.id)}
                  className="mt-2 text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              ) : null;
            })()}

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

              <div className="flex items-center space-x-1">
                {/* Expand/Collapse Icon Button */}
                {(() => {
                  const content = formatMessageContent(message.content);
                  const shouldShowToggle = content.length > 150;
                  const isExpanded = expandedMessages.has(message.id);

                  return shouldShowToggle ? (
                    <button
                      onClick={() => toggleMessageExpansion(message.id)}
                      className="text-xs px-2 py-1 rounded hover:bg-gray-50 transition-colors text-gray-500"
                      title={isExpanded ? "Minimize message" : "Expand message"}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isExpanded ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    </button>
                  ) : null;
                })()}

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
                  <div className="animate-pulse w-2 h-2 bg-accent rounded-full"></div>
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
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
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
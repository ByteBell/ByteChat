import React, { useEffect, useRef } from 'react';
import { SessionMessage, MessageContent } from '../types';

interface ChatHistoryProps {
  messages: SessionMessage[];
  isLoading?: boolean;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, isLoading = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const renderAttachments = (attachments?: MessageContent[]) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map((attachment, index) => (
          <div
            key={index}
            className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
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
                ? 'bg-blue-600 text-white ml-12'
                : 'bg-gray-100 text-gray-900 mr-12'
            }`}
          >
            {/* Message Content */}
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {formatMessageContent(message.content)}
            </div>

            {/* Attachments */}
            {renderAttachments(message.attachments)}

            {/* Message Footer */}
            <div className={`flex items-center justify-between mt-2 pt-2 border-t ${
              message.role === 'user'
                ? 'border-blue-500/30'
                : 'border-gray-200'
            }`}>
              <div className="flex items-center space-x-2 text-xs opacity-70">
                <span>{formatTimestamp(message.timestamp)}</span>
                {message.model && (
                  <>
                    <span>•</span>
                    <span>{message.model.split('/').pop()}</span>
                  </>
                )}
              </div>

              {/* Copy Button */}
              <button
                onClick={() => copyToClipboard(formatMessageContent(message.content))}
                className={`text-xs px-2 py-1 rounded hover:bg-opacity-20 transition-colors ${
                  message.role === 'user'
                    ? 'text-blue-100 hover:bg-white'
                    : 'text-gray-500 hover:bg-gray-600'
                }`}
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

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 text-gray-900 mr-12">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
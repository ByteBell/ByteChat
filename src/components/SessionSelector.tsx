import React, { useState, useEffect, useRef } from 'react';
import { ChatSession } from '../types';
import {
  getAllSessions,
  createNewSession,
  setCurrentSession,
  deleteSession,
  getCurrentSession
} from '../utils/sessionManager';

interface SessionSelectorProps {
  currentSession: ChatSession | null;
  onSessionChange: (session: ChatSession) => void;
}

const SessionSelector: React.FC<SessionSelectorProps> = ({
  currentSession,
  onSessionChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load sessions on mount and when current session changes
  useEffect(() => {
    const loadedSessions = getAllSessions();
    setSessions(loadedSessions);
  }, [currentSession]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSessionSelect = (session: ChatSession) => {
    setCurrentSession(session.id);
    onSessionChange(session);
    setIsOpen(false);
  };

  const handleNewSession = () => {
    const newSession = createNewSession();
    setSessions(getAllSessions()); // Refresh sessions list
    onSessionChange(newSession);
    setIsOpen(false);
  };

  const handleDeleteSession = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (sessions.length === 1) {
      // Don't delete if it's the last session
      return;
    }

    deleteSession(sessionId);
    const updatedSessions = getAllSessions();
    setSessions(updatedSessions);

    // If we deleted the current session, switch to the first available session
    if (currentSession?.id === sessionId) {
      const newCurrentSession = updatedSessions[0];
      if (newCurrentSession) {
        onSessionChange(newCurrentSession);
      }
    }
  };

  const formatSessionTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return diffMinutes <= 1 ? 'Just now' : `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
          <span className="truncate font-medium">
            {currentSession?.name || 'No Session'}
          </span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {/* New Session Button */}
          <button
            onClick={handleNewSession}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100"
          >
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="font-medium text-blue-600">New Session</span>
          </button>

          {/* Sessions List */}
          <div className="py-1">
            {sessions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No sessions yet
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSessionSelect(session)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 ${
                    currentSession?.id === session.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      currentSession?.id === session.id ? 'bg-blue-500' : 'bg-gray-300'
                    }`}></div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {session.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {session.messages.length} messages • {formatSessionTime(session.updatedAt)}
                      </div>
                    </div>
                  </div>

                  {/* Delete Button - only show if more than 1 session */}
                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="ml-2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded flex-shrink-0"
                      title="Delete session"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionSelector;
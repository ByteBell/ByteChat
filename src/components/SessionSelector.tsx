import React, { useState, useEffect, useRef } from 'react';
import { ChatSession } from '../types';
import {
  getAllSessions,
  createNewSession,
  setCurrentSession
} from '../utils/sessionManager';

interface SessionSelectorProps {
  currentSession: ChatSession | null;
  onSessionChange: (session: ChatSession) => void;
}

const SessionSelector: React.FC<SessionSelectorProps> = ({
  currentSession,
  onSessionChange
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const dropdownRef = useRef<HTMLSelectElement>(null);

  // Load sessions on mount and when current session changes
  useEffect(() => {
    const loadedSessions = getAllSessions();
    setSessions(loadedSessions);
  }, [currentSession]);

  const handleSessionSelect = (session: ChatSession) => {
    setCurrentSession(session.id);
    onSessionChange(session);
  };

  const handleNewSession = () => {
    const newSession = createNewSession();
    setSessions(getAllSessions()); // Refresh sessions list
    onSessionChange(newSession);
  };


  return (
    <select
      ref={dropdownRef}
      value={currentSession?.id || ''}
      onChange={(e) => {
        if (e.target.value === 'new') {
          handleNewSession();
        } else if (e.target.value) {
          const session = sessions.find(s => s.id === e.target.value);
          if (session) {
            handleSessionSelect(session);
          }
        }
      }}
      className="flex-1 min-w-0 text-xs border border-gray-300 rounded-md px-1.5 sm:px-2 py-1 sm:py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white"
    >
      <option value="">Select session</option>
      <option value="new">+ New Session</option>
      {sessions.map((session) => (
        <option key={session.id} value={session.id}>
          {session.name} ({session.messages.length} msgs)
        </option>
      ))}
    </select>
  );
};

export default SessionSelector;
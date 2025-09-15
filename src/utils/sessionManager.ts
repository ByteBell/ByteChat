import { ChatSession, SessionMessage, SessionStorage, MessageContent } from '../types';

const STORAGE_KEY = 'chatSessions';

// Generate unique ID for sessions and messages
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Generate session name from first message (first 10 characters)
function generateSessionName(firstMessage: string): string {
  const text = typeof firstMessage === 'string'
    ? firstMessage
    : 'New Chat';
  return text.trim().slice(0, 10) || 'New Chat';
}

// Load all sessions from localStorage
export function loadAllSessions(): SessionStorage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        sessions: [],
        currentSessionId: null,
        lastSessionId: null
      };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load sessions:', error);
    return {
      sessions: [],
      currentSessionId: null,
      lastSessionId: null
    };
  }
}

// Save all sessions to localStorage
export function saveAllSessions(sessionStorage: SessionStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionStorage));
  } catch (error) {
    console.error('Failed to save sessions:', error);
    
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Try to free up space by removing old sessions
      const storage = sessionStorage;
      if (storage.sessions.length > 10) {
        // Keep only the 10 most recent sessions
        storage.sessions = storage.sessions.slice(0, 10);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
          alert('Storage full. Removed old chat sessions to make space.');
          return;
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError);
        }
      }
      
      alert('Storage quota exceeded. Please:\n1. Clear browser storage\n2. Use smaller files\n3. Delete old chat sessions');
    }
  }
}

// Create a new session
export function createNewSession(firstMessage?: string): ChatSession {
  const session: ChatSession = {
    id: generateId(),
    name: firstMessage ? generateSessionName(firstMessage) : 'New Chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const storage = loadAllSessions();
  storage.sessions.unshift(session); // Add to beginning
  storage.currentSessionId = session.id;
  storage.lastSessionId = session.id;
  saveAllSessions(storage);

  return session;
}

// Get current session
export function getCurrentSession(): ChatSession | null {
  const storage = loadAllSessions();
  if (!storage.currentSessionId) {
    return null;
  }

  return storage.sessions.find(s => s.id === storage.currentSessionId) || null;
}

// Set current session
export function setCurrentSession(sessionId: string): ChatSession | null {
  const storage = loadAllSessions();
  const session = storage.sessions.find(s => s.id === sessionId);

  if (session) {
    storage.currentSessionId = sessionId;
    storage.lastSessionId = sessionId;
    saveAllSessions(storage);
    return session;
  }

  return null;
}

// Add message to current session
export function addMessageToCurrentSession(
  role: 'user' | 'assistant',
  content: string | MessageContent[],
  model?: string,
  attachments?: MessageContent[]
): SessionMessage | null {
  const storage = loadAllSessions();
  const sessionId = storage.currentSessionId;

  if (!sessionId) {
    return null;
  }

  const sessionIndex = storage.sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex === -1) {
    return null;
  }

  const message: SessionMessage = {
    id: generateId(),
    role,
    content,
    timestamp: Date.now(),
    model,
    attachments
  };

  storage.sessions[sessionIndex].messages.push(message);
  storage.sessions[sessionIndex].updatedAt = Date.now();

  // Update session name if it's the first user message
  if (role === 'user' && storage.sessions[sessionIndex].messages.length === 1) {
    const messageText = typeof content === 'string' ? content : 'New Chat';
    storage.sessions[sessionIndex].name = generateSessionName(messageText);
  }

  saveAllSessions(storage);
  return message;
}

// Delete a session
export function deleteSession(sessionId: string): void {
  const storage = loadAllSessions();
  storage.sessions = storage.sessions.filter(s => s.id !== sessionId);

  // If deleting current session, switch to the most recent one
  if (storage.currentSessionId === sessionId) {
    storage.currentSessionId = storage.sessions.length > 0 ? storage.sessions[0].id : null;
  }

  saveAllSessions(storage);
}

// Get all sessions sorted by updatedAt - only return sessions with messages
export function getAllSessions(): ChatSession[] {
  const storage = loadAllSessions();
  return storage.sessions
    .filter(session => session.messages.length > 0) // Only sessions with messages
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

// Clear all sessions
export function clearAllSessions(): void {
  const storage: SessionStorage = {
    sessions: [],
    currentSessionId: null,
    lastSessionId: null
  };
  saveAllSessions(storage);
}

// Get or create current session
export function getOrCreateCurrentSession(firstMessage?: string): ChatSession {
  let currentSession = getCurrentSession();

  if (!currentSession) {
    currentSession = createNewSession(firstMessage);
  }

  return currentSession;
}

// Create new session on app refresh/restart
export function handleAppRefresh(): ChatSession {
  // Always create new session on refresh as per requirements
  const newSession = createNewSession();
  return newSession;
}

// Get storage usage info
export function getStorageInfo(): { used: number; total: number; percentage: number } {
  try {
    const total = 5 * 1024 * 1024; // Approximate localStorage limit (5MB)
    let used = 0;
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
    
    return {
      used,
      total,
      percentage: Math.round((used / total) * 100)
    };
  } catch (error) {
    return { used: 0, total: 0, percentage: 0 };
  }
}

// Clean up old sessions to free space
export function cleanupOldSessions(keepCount: number = 5): boolean {
  try {
    const storage = loadAllSessions();
    const originalCount = storage.sessions.length;
    
    if (originalCount <= keepCount) {
      return false; // Nothing to clean
    }
    
    // Keep only the most recent sessions
    storage.sessions = storage.sessions
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, keepCount);
    
    // Update current session if it was deleted
    if (storage.currentSessionId && !storage.sessions.find(s => s.id === storage.currentSessionId)) {
      storage.currentSessionId = storage.sessions.length > 0 ? storage.sessions[0].id : null;
    }
    
    saveAllSessions(storage);
    
    console.log(`Cleaned up ${originalCount - keepCount} old sessions`);
    return true;
  } catch (error) {
    console.error('Failed to cleanup sessions:', error);
    return false;
  }
}
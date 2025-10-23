import { ChatSession, SessionMessage, SessionStorage } from '../types';

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

// Load all sessions from chrome extension storage
export async function loadAllSessions(): Promise<SessionStorage> {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    if (!result[STORAGE_KEY]) {
      console.log('[SessionManager] No existing sessions found, initializing empty storage');
      return {
        sessions: [],
        currentSessionId: null,
        lastSessionId: null
      };
    }

    // Validate and sanitize loaded data
    const data = result[STORAGE_KEY];
    if (!data.sessions || !Array.isArray(data.sessions)) {
      console.warn('[SessionManager] Invalid sessions data structure, resetting');
      return {
        sessions: [],
        currentSessionId: null,
        lastSessionId: null
      };
    }

    console.log(`[SessionManager] ✅ Loaded ${data.sessions.length} sessions from storage`);
    return data;
  } catch (error) {
    console.error('[SessionManager] ❌ Failed to load sessions:', error);

    // Try to recover from sync storage as fallback
    try {
      console.log('[SessionManager] Attempting recovery from sync storage...');
      const syncResult = await chrome.storage.sync.get([STORAGE_KEY]);
      if (syncResult[STORAGE_KEY]) {
        console.log('[SessionManager] ✅ Recovered sessions from sync storage');
        return syncResult[STORAGE_KEY];
      }
    } catch (syncError) {
      console.error('[SessionManager] Sync storage recovery failed:', syncError);
    }

    // Return empty storage as last resort
    return {
      sessions: [],
      currentSessionId: null,
      lastSessionId: null
    };
  }
}

// Save all sessions to chrome extension storage
export async function saveAllSessions(sessionStorage: SessionStorage): Promise<void> {
  try {
    // Save to local storage (primary)
    await chrome.storage.local.set({ [STORAGE_KEY]: sessionStorage });
    console.log(`[SessionManager] ✅ Saved ${sessionStorage.sessions.length} sessions to local storage`);

    // Also backup to sync storage (for recovery and cross-device sync)
    try {
      // Sync storage has lower limits, so only save essential data
      const syncData = {
        sessions: sessionStorage.sessions.slice(0, 5), // Only save 5 most recent
        currentSessionId: sessionStorage.currentSessionId,
        lastSessionId: sessionStorage.lastSessionId
      };
      await chrome.storage.sync.set({ [STORAGE_KEY]: syncData });
      console.log('[SessionManager] ✅ Backup to sync storage successful');
    } catch (syncError) {
      // Sync storage failure is not critical
      console.warn('[SessionManager] Sync storage backup failed (non-critical):', syncError);
    }
  } catch (error) {
    console.error('[SessionManager] ❌ Failed to save sessions:', error);

    if (error instanceof Error && error.message.includes('QUOTA_BYTES')) {
      // Try to free up space by removing old sessions
      const storage = sessionStorage;
      if (storage.sessions.length > 10) {
        // Keep only the 10 most recent sessions
        storage.sessions = storage.sessions.slice(0, 10);
        try {
          await chrome.storage.local.set({ [STORAGE_KEY]: storage });
          console.warn('[SessionManager] Storage full - removed old sessions');
          alert('Storage full. Removed old chat sessions to make space.');
          return;
        } catch (retryError) {
          console.error('[SessionManager] Failed to save even after cleanup:', retryError);
        }
      }

      alert('Storage quota exceeded. Please:\n1. Clear browser storage\n2. Use smaller files\n3. Delete old chat sessions');
      throw error;
    }

    // Re-throw other errors
    throw error;
  }
}

// Create a new session
export function createNewSession(firstMessage?: string): ChatSession {
  const now = Date.now();
  const session: ChatSession = {
    id: generateId(),
    name: generateSessionName(firstMessage || 'New Chat'),
    messages: [],
    createdAt: now,
    updatedAt: now
  };
  return session;
}

// Add a new session
export async function addSession(session: ChatSession): Promise<void> {
  const storage = await loadAllSessions();
  storage.sessions.unshift(session); // Add to beginning
  storage.currentSessionId = session.id;
  storage.lastSessionId = session.id;
  await saveAllSessions(storage);
}

// Get current session
export async function getCurrentSession(): Promise<ChatSession | null> {
  const storage = await loadAllSessions();
  if (!storage.currentSessionId) return null;

  return storage.sessions.find(s => s.id === storage.currentSessionId) || null;
}

// Get all sessions
export async function getAllSessions(): Promise<ChatSession[]> {
  const storage = await loadAllSessions();
  return storage.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

// Set current session
export async function setCurrentSession(sessionId: string | null): Promise<void> {
  const storage = await loadAllSessions();
  storage.currentSessionId = sessionId;
  if (sessionId) {
    storage.lastSessionId = sessionId;
  }
  await saveAllSessions(storage);
}

// Update session
export async function updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<void> {
  const storage = await loadAllSessions();
  const sessionIndex = storage.sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex !== -1) {
    storage.sessions[sessionIndex] = { ...storage.sessions[sessionIndex], ...updates };
    await saveAllSessions(storage);
  }
}

// Delete session
export async function deleteSession(sessionId: string): Promise<void> {
  const storage = await loadAllSessions();
  storage.sessions = storage.sessions.filter(s => s.id !== sessionId);

  // If we deleted the current session, clear current session
  if (storage.currentSessionId === sessionId) {
    storage.currentSessionId = storage.sessions.length > 0 ? storage.sessions[0].id : null;
    storage.lastSessionId = storage.sessions.length > 0 ? storage.sessions[0].id : null;
  }

  await saveAllSessions(storage);
}

// Add message to session
export async function addMessageToSession(sessionId: string, message: SessionMessage): Promise<void> {
  const storage = await loadAllSessions();
  const session = storage.sessions.find(s => s.id === sessionId);
  if (session) {
    session.messages.push(message);
    session.updatedAt = Date.now();
    // Update session name if this is the first user message
    if (session.messages.length === 1 && message.role === 'user') {
      const content = Array.isArray(message.content)
        ? message.content.find(c => c.type === 'text')?.text || 'New Chat'
        : message.content;
      session.name = generateSessionName(content);
    }
    await saveAllSessions(storage);
  }
}

// Clear all sessions
export async function clearAllSessions(): Promise<void> {
  const storage: SessionStorage = {
    sessions: [],
    currentSessionId: null,
    lastSessionId: null
  };
  await saveAllSessions(storage);
}

// Get storage usage (for chrome.storage this is different from localStorage)
export async function getStorageUsage(): Promise<{ used: number; total: number; percentage: number }> {
  try {
    const usage = await chrome.storage.local.getBytesInUse();
    const total = chrome.storage.local.QUOTA_BYTES; // 5MB for local storage

    return {
      used: usage,
      total: total,
      percentage: (usage / total) * 100
    };
  } catch (error) {
    console.error('Failed to get storage usage:', error);
    return { used: 0, total: 5242880, percentage: 0 }; // 5MB default
  }
}

// Auto-cleanup old sessions if storage is getting full
export async function autoCleanupSessions(): Promise<void> {
  try {
    const usage = await getStorageUsage();
    if (usage.percentage > 80) { // If using more than 80% of storage
      const storage = await loadAllSessions();
      if (storage.sessions.length > 20) {
        // Keep only the 20 most recent sessions
        storage.sessions = storage.sessions
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 20);

        // Update current session if it was removed
        if (storage.currentSessionId && !storage.sessions.find(s => s.id === storage.currentSessionId)) {
          storage.currentSessionId = storage.sessions.length > 0 ? storage.sessions[0].id : null;
          storage.lastSessionId = storage.sessions.length > 0 ? storage.sessions[0].id : null;
        }

        await saveAllSessions(storage);
        console.log('Auto-cleanup: Removed old sessions to free up storage space');
      }
    }
  } catch (error) {
    console.error('Failed to auto-cleanup sessions:', error);
  }
}

// Helper function to get or create current session
export async function getOrCreateCurrentSession(): Promise<ChatSession> {
  let current = await getCurrentSession();
  if (!current) {
    current = createNewSession();
    await addSession(current);
  }
  return current;
}

// Helper function to add message to current session
export async function addMessageToCurrentSession(role: 'user' | 'assistant', content: string, model?: string, attachments?: any[]): Promise<void> {
  const session = await getOrCreateCurrentSession();
  const message: SessionMessage = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    role,
    content,
    timestamp: Date.now(),
    model,
    attachments
  };
  await addMessageToSession(session.id, message);
}

// Handle app refresh - keep for compatibility
export function handleAppRefresh(): void {
  // No-op for now, chrome.storage persists automatically
  console.log('[SessionManager] App refresh handled');
}
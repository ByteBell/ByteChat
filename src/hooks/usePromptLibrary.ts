import { useState, useEffect, useCallback } from 'react';
import { PromptLibrary, CustomPrompt, PromptInput } from 'prompt-library';

/**
 * React hook for managing prompts with automatic state updates
 */
export function usePromptLibrary() {
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load prompts on mount
  const loadPrompts = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      const loaded = PromptLibrary.loadAll();
      setPrompts(loaded);
    } catch (err) {
      console.error('[usePromptLibrary] Error loading prompts:', err);
      setError('Failed to load prompts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // Create a new prompt
  const createPrompt = useCallback((input: PromptInput) => {
    setError(null);
    const result = PromptLibrary.create(input);

    if (result.success) {
      loadPrompts(); // Refresh list
      return result;
    } else {
      setError(result.message || 'Failed to create prompt');
      return result;
    }
  }, [loadPrompts]);

  // Update an existing prompt
  const updatePrompt = useCallback((id: string, input: PromptInput) => {
    setError(null);
    const result = PromptLibrary.update(id, input);

    if (result.success) {
      loadPrompts(); // Refresh list
      return result;
    } else {
      setError(result.message || 'Failed to update prompt');
      return result;
    }
  }, [loadPrompts]);

  // Delete a prompt
  const deletePrompt = useCallback((id: string) => {
    setError(null);
    const result = PromptLibrary.delete(id);

    if (result.success) {
      loadPrompts(); // Refresh list
      return result;
    } else {
      setError(result.message || 'Failed to delete prompt');
      return result;
    }
  }, [loadPrompts]);

  // Get a prompt by ID
  const getPrompt = useCallback((id: string) => {
    return PromptLibrary.getById(id);
  }, []);

  // Search prompts
  const searchPrompts = useCallback((query: string) => {
    return PromptLibrary.search(query);
  }, []);

  return {
    prompts,
    loading,
    error,
    createPrompt,
    updatePrompt,
    deletePrompt,
    getPrompt,
    searchPrompts,
    refresh: loadPrompts
  };
}

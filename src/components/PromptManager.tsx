import React, { useState, useEffect } from 'react';
import { CustomPrompt, PromptInput } from 'prompt-library';

interface PromptManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: PromptInput) => void;
  onDelete?: (id: string) => void;
  editingPrompt?: CustomPrompt | null;
  errorMessage?: string | null;
}

/**
 * PromptManager - Modal component for creating and editing prompts
 * Simple two-field form: name and prompt text
 */
export const PromptManager: React.FC<PromptManagerProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingPrompt = null,
  errorMessage = null
}) => {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const isEditing = editingPrompt !== null;

  // Initialize form when editing
  useEffect(() => {
    if (editingPrompt) {
      setName(editingPrompt.name);
      setPrompt(editingPrompt.prompt);
    } else {
      setName('');
      setPrompt('');
    }
    setLocalError(null);
  }, [editingPrompt, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validate
    if (!name.trim()) {
      setLocalError('Please enter a prompt name');
      return;
    }

    if (!prompt.trim()) {
      setLocalError('Please enter the prompt text');
      return;
    }

    // Call parent save handler
    onSave({
      name: name.trim(),
      prompt: prompt.trim()
    });
  };

  const handleDelete = () => {
    if (editingPrompt && onDelete) {
      if (confirm(`Are you sure you want to delete "${editingPrompt.name}"?`)) {
        onDelete(editingPrompt.id);
      }
    }
  };

  const handleCancel = () => {
    setName('');
    setPrompt('');
    setLocalError(null);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  const displayError = errorMessage || localError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Edit Prompt' : 'Create New Prompt'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Create a custom prompt that will be prepended to your messages
          </p>
        </div>

        {/* Error Banner */}
        {displayError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{displayError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="prompt-name" className="block text-sm font-medium text-gray-700 mb-1">
                Prompt Name <span className="text-red-500">*</span>
              </label>
              <input
                id="prompt-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Code Review Assistant"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                A descriptive name to identify this prompt
              </p>
            </div>

            {/* Prompt Text Field */}
            <div>
              <label htmlFor="prompt-text" className="block text-sm font-medium text-gray-700 mb-1">
                Prompt Text <span className="text-red-500">*</span>
              </label>
              <textarea
                id="prompt-text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your custom prompt here. This will be prepended to all messages when this prompt is selected."
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-y"
              />
              <p className="text-xs text-gray-500 mt-1">
                This text will be added before your message when sending to the AI
              </p>
            </div>

            {/* Preview */}
            {prompt.trim() && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
                <div className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
                  {prompt.trim()}
                  <span className="text-gray-400">{'\n\nUser: [Your message here]'}</span>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div>
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Delete Prompt
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {isEditing ? 'Update Prompt' : 'Create Prompt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

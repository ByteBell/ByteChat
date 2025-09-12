import React, { useState } from 'react';
import { validateOpenRouterKey } from '../services/openrouter';

interface ApiKeySetupProps {
  onApiKeySet: (apiKey: string) => void;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onApiKeySet }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Please enter your OpenRouter API key');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const isValid = await validateOpenRouterKey(apiKey.trim());
      
      if (isValid) {
        // Store in local storage
        chrome.storage.local.set({ openRouterApiKey: apiKey.trim() });
        onApiKeySet(apiKey.trim());
      } else {
        setError('Invalid API key. Please check and try again.');
      }
    } catch (error) {
      setError('Failed to validate API key. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src={chrome.runtime.getURL("icons/ByteBellLogo.png")}
              alt="BB Chat"
              className="w-16 h-16 rounded-xl shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to BB Chat</h1>
          <p className="text-gray-600">Enter your OpenRouter API key to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
              OpenRouter API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={isValidating}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isValidating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isValidating ? 'Validating...' : 'Continue'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-2">Don't have an API key?</p>
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Get your free OpenRouter API key →
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetup;
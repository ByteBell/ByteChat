import React, { useState, useEffect } from 'react';
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
      const result = await validateOpenRouterKey(apiKey.trim());
      
      if (result.valid) {
        // Store in local storage
        chrome.storage.local.set({ openRouterApiKey: apiKey.trim() });
        onApiKeySet(apiKey.trim());
      } else {
        setError(result.error || 'Invalid API key. Please check and try again.');
      }
    } catch (error) {
      console.error('Validation error:', error);
      setError('Failed to validate API key. Please check your internet connection and try again.');
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
              alt="Byte Chat"
              className="w-16 h-16 rounded-xl shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Byte Chat</h1>
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
              onChange={(e) => {
                setApiKey(e.target.value);
                setError(''); // Clear error when user types
              }}
              placeholder="sk-or-v1-..."
              className={`w-full px-4 py-3 border ${error ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
              disabled={isValidating}
            />
            {error && (
              <div className="mt-2 flex items-start space-x-1">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {!error && apiKey && !apiKey.startsWith('sk-or-') && (
              <p className="mt-2 text-sm text-yellow-600">
                ⚠️ OpenRouter API keys typically start with "sk-or-"
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isValidating || !apiKey.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
          >
            {isValidating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Validating API Key...
              </>
            ) : 'Continue'}
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
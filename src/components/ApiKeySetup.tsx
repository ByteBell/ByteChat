import React, { useState, useEffect } from 'react';
import { validateOpenRouterKey } from '../services/openrouter';
import { getBalanceInfo } from '../services/balance';
import { googleAuthService, GoogleUser } from '../services/googleAuth';
import { useColors } from '../hooks/useColors';

interface ApiKeySetupProps {
  onApiKeySet: (apiKey: string) => void;
  onGoogleAuth?: (user: GoogleUser) => void;
  initialError?: string;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onApiKeySet, onGoogleAuth, initialError }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState(initialError || '');
  const [authMode, setAuthMode] = useState<'choose' | 'apikey' | 'google'>('choose');
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const colors = useColors();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim()) {
      setError('Please enter your OpenRouter API key');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      // First validate the key format
      const result = await validateOpenRouterKey(apiKey.trim());

      if (!result.valid) {
        setError(result.error || 'Invalid API key format. Please check and try again.');
        return;
      }

      // Then try to fetch balance to ensure the key actually works
      const balanceInfo = await getBalanceInfo(apiKey.trim());
      console.log('[ApiKeySetup] Balance validation successful:', balanceInfo);

      // If we reach here, the key is valid and working
      chrome.storage.local.set({ openRouterApiKey: apiKey.trim() });
      onApiKeySet(apiKey.trim());

    } catch (error) {
      console.error('API key validation error:', error);
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
          setError('Invalid API key. Please check your key and try again.');
        } else if (error.message.includes('403') || error.message.includes('forbidden')) {
          setError('API key access denied. Your key may not have the required permissions.');
        } else if (error.message.includes('429') || error.message.includes('rate')) {
          setError('Rate limited. Please wait a moment and try again.');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          setError('Network error. Please check your internet connection and try again.');
        } else {
          setError('Failed to validate API key. Please verify your key is correct and has proper permissions.');
        }
      } else {
        setError('Failed to validate API key. Please check your connection and try again.');
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    setError('');

    try {
      const { user } = await googleAuthService.signInWithGoogle();
      console.log('[ApiKeySetup] Google sign-in successful:', user);

      if (onGoogleAuth) {
        onGoogleAuth(user);
      }
    } catch (error) {
      console.error('Google sign-in failed:', error);
      if (error instanceof Error) {
        setError(`Google sign-in failed: ${error.message}`);
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-white p-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Byte Chat</h1>
          <p className="text-gray-600">Choose how you'd like to get started</p>
        </div>

        {/* Auth Mode Selection */}
        {authMode === 'choose' && (
          <div className="space-y-4">
            {/* Free Preview Option */}
            <button
              onClick={() => setAuthMode('google')}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-accent hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.405.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.357-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z"/>
                    </svg>
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-accent">Free Preview</h3>
                  <p className="text-gray-600 text-sm">Sign in with Gmail • Limited free usage • No credit card required</p>
                </div>
              </div>
            </button>

            {/* API Key Option */}
            <button
              onClick={() => setAuthMode('apikey')}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-accent hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-accent-light">
                    <svg className="w-6 h-6 text-gray-600 group-hover:text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-accent">OpenRouter API Key</h3>
                  <p className="text-gray-600 text-sm">Use your own API key • Unlimited usage • Pay per use</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Google Sign-in Mode */}
        {authMode === 'google' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Free Preview</h3>
              <p className="text-gray-600 text-sm mb-6">Start using Byte Chat immediately with limited free usage</p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleSigningIn}
              className="w-full bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-3"
            >
              {isGoogleSigningIn ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="text-center">
              <button
                onClick={() => setAuthMode('choose')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to options
              </button>
            </div>
          </div>
        )}

        {/* API Key Mode */}
        {authMode === 'apikey' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">OpenRouter API Key</h3>
              <p className="text-gray-600 text-sm">Enter your API key for unlimited usage</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setError('');
                  }}
                  placeholder="sk-or-v1-..."
                  className={`w-full px-4 py-3 border ${error ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all`}
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
                className="w-full gradient-primary hover:opacity-90 disabled:opacity-50 text-black font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center"
              >
                {isValidating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validating API Key...
                  </>
                ) : 'Continue'}
              </button>
            </form>

            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Don't have an API key?</p>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-hover text-sm font-medium"
                >
                  Get your free OpenRouter API key →
                </a>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setAuthMode('choose')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back to options
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiKeySetup;
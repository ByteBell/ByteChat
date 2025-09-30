import React, { useEffect, useState } from "react";
import "../tailwind.css";
import { loadStoredSettings, loadStoredUser, execInPage } from "../utils";
import ApiKeySetup from "./ApiKeySetup";
import MainInterface from "./MainInterface";
import { getBalanceInfo } from "../services/balance";
import { googleAuthService, GoogleUser } from "../services/googleAuth";

const Popup: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [keyValidationError, setKeyValidationError] = useState<string>('');
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [authMethod, setAuthMethod] = useState<'apikey' | 'google' | null>(null);
  const mode = new URLSearchParams(location.search).get('mode') || 'popup';
  const inIframe = window.top !== window;
  // Set styling based on mode
  useEffect(() => {
    if (mode === 'popup' && !inIframe) {
      // Popup mode - fixed dimensions
      document.body.style.width = "420px";
      document.body.style.height = "700px";
      document.body.style.minHeight = "700px";
      document.body.style.overflow = "auto";
    }
    // Side panel mode uses CSS from panel.html
    document.body.style.margin = "0";
    document.body.style.padding = "0";
      
    // Check for stored authentication (API key or Google)
    const checkAuthentication = async () => {
      console.log('[Popup] Starting authentication check...');
      try {
        // First check for Google authentication
        console.log('[Popup] Checking for Google authentication...');
        const googleAuthData = await googleAuthService.getStoredAuthData();
        if (googleAuthData) {
          console.log('[Popup] Found Google authentication, verifying...');
          const isSignedIn = await googleAuthService.isSignedIn();
          if (isSignedIn) {
            console.log('[Popup] Google authentication valid, setting up user...');
            setGoogleUser(googleAuthData.user);
            setAuthMethod('google');
            setIsLoading(false);
            return;
          } else {
            console.log('[Popup] Google authentication invalid, continuing to API key check...');
          }
        } else {
          console.log('[Popup] No Google authentication found, checking API key...');
        }

        // Then check for API key
        chrome.storage.local.get(['openRouterApiKey'], async (result) => {
          console.log('[Popup] Chrome storage result:', !!result.openRouterApiKey);
          if (result.openRouterApiKey) {
            console.log('[Popup] Found stored API key, validating...');
            try {
              // Validate by fetching balance (this ensures the key actually works)
              const balanceInfo = await getBalanceInfo(result.openRouterApiKey);
              console.log('[Popup] API key validation successful:', balanceInfo);
              setApiKey(result.openRouterApiKey);
              setAuthMethod('apikey');
              setKeyValidationError('');
            } catch (error) {
              console.error('[Popup] API key validation failed:', error);
              if (error instanceof Error) {
                if (error.message.includes('401') || error.message.includes('unauthorized')) {
                  setKeyValidationError('Invalid API key. Please enter a new one.');
                } else if (error.message.includes('403') || error.message.includes('forbidden')) {
                  setKeyValidationError('API key access denied. Your key may not have the required permissions.');
                } else {
                  setKeyValidationError('Unable to validate API key. Please check your connection and enter a new key.');
                }
              } else {
                setKeyValidationError('Unable to validate API key. Please enter a new key.');
              }
              setApiKey(''); // Clear invalid key
              // Remove invalid key from storage
              chrome.storage.local.remove(['openRouterApiKey']);
            }
          } else {
            console.log('[Popup] No API key found in storage');
          }
          console.log('[Popup] Setting loading to false');
          setIsLoading(false);
        });
      } catch (error) {
        console.error('[Popup] Authentication check failed:', error);
        setIsLoading(false);
      }
    };

    checkAuthentication();

    // Preload settings/user if needed by panels
    loadStoredSettings();
    loadStoredUser();

    // Optional: capture selected text for future use
    (async () => {
      await execInPage(() => {
        const sel = window.getSelection()?.toString().trim();
        if (sel) return sel;
        const el = document.activeElement as any;
        if (el && "value" in el) return el.value;
        if (el?.isContentEditable) return el.innerText;
        return "";
      });
    })();
  }, []);

  const handleApiKeySet = (newApiKey: string) => {
    setApiKey(newApiKey);
    setAuthMethod('apikey');
    setKeyValidationError('');
  };

  const handleGoogleAuth = (user: GoogleUser) => {
    setGoogleUser(user);
    setAuthMethod('google');
    setKeyValidationError('');
  };

  const handleApiKeyChange = () => {
    setApiKey('');
    setGoogleUser(null);
    setAuthMethod(null);
    setKeyValidationError('');
    // Clear stored auth data
    chrome.storage.local.remove(['openRouterApiKey']);
    googleAuthService.signOut();
  };

  if (isLoading) {
    console.log('[Popup] Still loading... Current state:', {
      apiKey: !!apiKey,
      googleUser: !!googleUser,
      authMethod,
      isLoading
    });
    return (
      <div className={`flex items-center justify-center bg-white ${mode === 'popup' ? 'h-screen' : 'h-full'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className={`overflow-auto ${mode === 'popup' ? 'min-h-screen' : 'h-full'}`}>
      {!authMethod ? (
        <ApiKeySetup
          onApiKeySet={handleApiKeySet}
          onGoogleAuth={handleGoogleAuth}
          initialError={keyValidationError}
        />
      ) : (
        <MainInterface
          apiKey={apiKey}
          googleUser={googleUser}
          authMethod={authMethod}
          onApiKeyChange={handleApiKeyChange}
        />
      )}
    </div>
  );
};

export default Popup;
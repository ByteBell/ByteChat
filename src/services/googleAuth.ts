// Google Authentication service for Chrome Extension
import { BACKEND_URL, GOOGLE_CLIENT_ID, validateEnvironment } from '../config/env';
import { User } from '../types';
import { setUser, loadStoredUser, removeUser } from '../utils';

export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
  id: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

class GoogleAuthService {
  private readonly BACKEND_URL = BACKEND_URL;
  private readonly CLIENT_ID = GOOGLE_CLIENT_ID;

  constructor() {
    // Validate environment variables on initialization
    const isValid = validateEnvironment();
    if (!isValid) {
      console.warn('GoogleAuthService: Some environment variables are missing, but continuing...');
    }
    console.log('GoogleAuthService initialized with:', {
      BACKEND_URL: this.BACKEND_URL,
      CLIENT_ID: this.CLIENT_ID || 'NOT_SET'
    });
  }

  /**
   * Initiate Google OAuth flow using Chrome Extension identity API
   */
  async signInWithGoogle(): Promise<{ user: GoogleUser; tokens: AuthTokens }> {
    try {
      // Get manifest data for OAuth configuration
      const manifest = chrome.runtime.getManifest() as any;
      const clientId = manifest.oauth2?.client_id;
      const scopes = (manifest.oauth2?.scopes || []).join(" ");
      const redirectUri = chrome.identity.getRedirectURL();

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}` +
        `&response_type=token` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}`;

      // Use launchWebAuthFlow for OAuth implicit grant flow
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        interactive: true,
        url: authUrl,
      });

      if (!responseUrl) {
        throw new Error('No response URL received from OAuth flow');
      }

      // Extract token from URL hash
      const hash = new URL(responseUrl).hash.substring(1);
      const token = new URLSearchParams(hash).get("access_token");

      if (!token) {
        throw new Error('No access token found in OAuth response');
      }

      // Call our backend to verify token and get user info
      const response = await fetch(`${this.BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: token })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend auth failed: ${errorText}`);
      }

      const userData = await response.json();

      // Create User object matching backend response
      const user: User = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        total_tokens: userData.total_tokens,
        tokens_used: userData.tokens_used,
        tokens_left: userData.tokens_left,
        access_token: token
      };

      const googleUser: GoogleUser = {
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        id: userData.email
      };

      const tokens: AuthTokens = {
        access_token: token,
        expires_in: 3600 // Default 1 hour
      };

      // Store user data using utils functions
      await setUser(user);

      return { user: googleUser, tokens };
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    }
  }


  /**
   * Verify Google access token and get user info
   */
  async verifyToken(accessToken: string): Promise<GoogleUser> {
    try {
      const response = await fetch(`${this.BACKEND_URL}/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken })
      });

      if (!response.ok) {
        throw new Error('Token verification failed');
      }

      const data = await response.json();

      if (!data.success || !data.user) {
        throw new Error('Invalid token or user data');
      }

      return {
        email: data.user.email,
        name: data.user.name,
        picture: data.user.picture,
        id: data.user.email // Use email as ID for simplicity
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      throw error;
    }
  }

  /**
   * Store authentication data in Chrome storage
   */
  private async storeAuthData(user: GoogleUser, tokens: AuthTokens): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({
        googleUser: user,
        googleTokens: tokens,
        authMethod: 'google',
        authTimestamp: Date.now()
      }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get stored authentication data
   */
  async getStoredAuthData(): Promise<{ user: GoogleUser; tokens: AuthTokens } | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['googleUser', 'googleTokens', 'authMethod'], (result) => {
        if (result.authMethod === 'google' && result.googleUser && result.googleTokens) {
          resolve({
            user: result.googleUser,
            tokens: result.googleTokens
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Sign out - clear stored auth data
   */
  async signOut(): Promise<void> {
    // Remove user using utils function
    await removeUser();

    // Also clear googleUser, googleTokens for backward compatibility
    return new Promise((resolve) => {
      chrome.storage.local.remove(['googleUser', 'googleTokens', 'authMethod', 'authTimestamp'], () => {
        resolve();
      });
    });
  }

  /**
   * Check if user is currently signed in
   */
  async isSignedIn(): Promise<boolean> {
    try {
      const authData = await this.getStoredAuthData();

      if (!authData) {
        return false;
      }

      // Verify the token is still valid
      await this.verifyToken(authData.tokens.access_token);
      return true;
    } catch (error) {
      // Token is invalid, clear stored data
      await this.signOut();
      return false;
    }
  }

  /**
   * Get Gmail messages for authenticated user
   */
  async getGmailMessages(): Promise<any[]> {
    try {
      const authData = await this.getStoredAuthData();

      if (!authData) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${this.BACKEND_URL}/api/gmail/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: authData.tokens.access_token })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Gmail messages');
      }

      const data = await response.json();
      return data.emails || [];
    } catch (error) {
      console.error('Failed to fetch Gmail messages:', error);
      throw error;
    }
  }
}

export const googleAuthService = new GoogleAuthService();
export default googleAuthService;
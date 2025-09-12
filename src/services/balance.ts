/* src/services/balance.ts */
import { checkKeyInfo, type OpenRouterKeyInfo } from "./openrouter";

export interface BalanceInfo {
  usage: number;
  limit: number | null;
  remaining: number;
  isUnlimited: boolean;
  isFreeAccount: boolean;
  isLow: boolean;
  color: 'green' | 'yellow' | 'red';
  display: string;
  usageDisplay: string;
}

/**
 * Get balance information with formatting and status
 */
export async function getBalanceInfo(apiKey: string): Promise<BalanceInfo> {
  try {
    const keyInfo = await checkKeyInfo(apiKey);
    const usage = keyInfo.data.usage || 0;
    const limit = keyInfo.data.limit;
    const isUnlimited = limit === null;
    

    
    // Calculate remaining credits
    let remaining: number;
    if (isUnlimited) {
      remaining = Infinity;
    } else {
      remaining = Math.max(0, (limit || 0) - usage);
    }
    
    // Determine if balance is low
    let isLow = false;
    let color: 'green' | 'yellow' | 'red' = 'green';
    
    if (!isUnlimited && limit !== null && limit > 0) {
      const usagePercentage = (usage / limit) * 100;
      if (remaining < 1) { // Less than $1 remaining
        isLow = true;
        color = 'red';
      } else if (usagePercentage >= 75) {
        color = 'yellow';
      }
    }
    
    // Format display strings
    const formatCredits = (amount: number) => `$${amount.toFixed(2)}`;
    
    let display: string;
    let usageDisplay: string;
    
    if (isUnlimited) {
      display = 'Unlimited Plan';
      usageDisplay = `Used: ${formatCredits(usage)}`;
    } else if (limit === 0) {
      display = 'No Credits';
      usageDisplay = 'Add credits to continue';
      color = 'red';
      isLow = true;
    } else {
      display = formatCredits(remaining);
      usageDisplay = `${formatCredits(usage)} of ${formatCredits(limit || 0)} used`;
    }
    
    return {
      usage,
      limit,
      remaining: isUnlimited ? Infinity : remaining,
      isUnlimited,
      isFreeAccount: keyInfo.data.is_free_tier,
      isLow,
      color,
      display,
      usageDisplay
    };
  } catch (error) {
    console.error('[Balance] Failed to get balance info:', error);
    throw error;
  }
}

/**
 * Cache balance for a short time to avoid too many API calls
 */
const BALANCE_CACHE_KEY = 'openrouter_balance_cache';
const BALANCE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedBalanceInfo(apiKey: string): Promise<BalanceInfo> {
  try {
    // Check cache first
    const result = await chrome.storage.local.get([BALANCE_CACHE_KEY]);
    const cached = result[BALANCE_CACHE_KEY];
    
    if (cached && 
        cached.apiKey === apiKey && 
        Date.now() - cached.timestamp < BALANCE_CACHE_DURATION) {
      return cached.balance;
    }
    
    // Fetch fresh balance
    const balance = await getBalanceInfo(apiKey);
    
    // Cache the result
    await chrome.storage.local.set({
      [BALANCE_CACHE_KEY]: {
        apiKey,
        balance,
        timestamp: Date.now()
      }
    });
    
    return balance;
  } catch (error) {
    console.error('[Balance] Failed to get balance info:', error);
    return {
      usage: 0,
      limit: 0,
      remaining: 0,
      isUnlimited: false,
      isFreeAccount: true,
      isLow: true,
      color: 'red',
      display: 'Error',
      usageDisplay: 'Unable to fetch balance'
    };
  }
}

/**
 * Clear balance cache (useful when API key changes)
 */
export async function clearBalanceCache(): Promise<void> {
  try {
    await chrome.storage.local.remove([BALANCE_CACHE_KEY]);
  } catch (error) {
    console.error('[Balance] Failed to clear balance cache:', error);
  }
}
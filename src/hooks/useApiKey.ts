import { useState } from 'react';

const STORAGE_KEY = 'gemini_api_key';

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    // Check local storage first (allow override)
    const localKey = localStorage.getItem(STORAGE_KEY);
    if (localKey) return localKey;
    
    // Fallback to environment variable
    return import.meta.env.VITE_GEMINI_API_KEY || null;
  });

  const saveApiKey = (key: string) => {
    if (!key) return;
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
  };

  const removeApiKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(import.meta.env.VITE_GEMINI_API_KEY || null);
  };

  return {
    apiKey,
    saveApiKey,
    removeApiKey,
    hasKey: !!apiKey,
    isEnvKey: !!import.meta.env.VITE_GEMINI_API_KEY,
  };
}

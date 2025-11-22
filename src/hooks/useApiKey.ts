import { useState } from 'react';

const STORAGE_KEY = 'gemini_api_key';

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    // Check environment variable first
    if (import.meta.env.VITE_GEMINI_API_KEY) {
      return import.meta.env.VITE_GEMINI_API_KEY;
    }
    return localStorage.getItem(STORAGE_KEY);
  });

  const saveApiKey = (key: string) => {
    if (!key) return;
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
  };

  const removeApiKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
  };

  return {
    apiKey,
    saveApiKey,
    removeApiKey,
    hasKey: !!apiKey,
    isEnvKey: !!import.meta.env.VITE_GEMINI_API_KEY,
  };
}

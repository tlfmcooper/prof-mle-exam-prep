import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/AuthContext';

const STORAGE_KEY = 'gemini_api_key';

export function useApiKey() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load API key from database on mount
  useEffect(() => {
    async function loadApiKey() {
      if (!user) {
        // Fallback to environment variable if not logged in
        setApiKey(import.meta.env.VITE_GEMINI_API_KEY || null);
        setIsLoading(false);
        return;
      }

      try {
        // First, try to migrate from localStorage
        const localKey = localStorage.getItem(STORAGE_KEY);
        if (localKey) {
          // Save to database
          const { error } = await (supabase.rpc as any)('set_encrypted_api_key', {
            user_id: user.id,
            api_key: localKey,
          });

          if (!error) {
            // Clear from localStorage after successful migration
            localStorage.removeItem(STORAGE_KEY);
            setApiKey(localKey);
            setIsLoading(false);
            return;
          }
        }

        // Load from database
        const { data, error } = await (supabase.rpc as any)('get_decrypted_api_key', {
          user_id: user.id,
        });

        if (error) {
          console.error('Error loading API key:', error);
          setApiKey(import.meta.env.VITE_GEMINI_API_KEY || null);
        } else {
          setApiKey(data || import.meta.env.VITE_GEMINI_API_KEY || null);
        }
      } catch (error) {
        console.error('Error in loadApiKey:', error);
        setApiKey(import.meta.env.VITE_GEMINI_API_KEY || null);
      } finally {
        setIsLoading(false);
      }
    }

    loadApiKey();
  }, [user]);

  const saveApiKey = async (key: string) => {
    if (!key || !user) return;

    try {
      const { error } = await (supabase.rpc as any)('set_encrypted_api_key', {
        user_id: user.id,
        api_key: key,
      });

      if (error) {
        console.error('Error saving API key:', error);
        // Fallback to localStorage if database save fails
        localStorage.setItem(STORAGE_KEY, key);
      }

      setApiKey(key);
    } catch (error) {
      console.error('Error in saveApiKey:', error);
      // Fallback to localStorage
      localStorage.setItem(STORAGE_KEY, key);
      setApiKey(key);
    }
  };

  const removeApiKey = async () => {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY);
      setApiKey(import.meta.env.VITE_GEMINI_API_KEY || null);
      return;
    }

    try {
      const { error } = await (supabase.rpc as any)('set_encrypted_api_key', {
        user_id: user.id,
        api_key: '',
      });

      if (error) {
        console.error('Error removing API key:', error);
      }

      // Also clear localStorage
      localStorage.removeItem(STORAGE_KEY);
      setApiKey(import.meta.env.VITE_GEMINI_API_KEY || null);
    } catch (error) {
      console.error('Error in removeApiKey:', error);
      localStorage.removeItem(STORAGE_KEY);
      setApiKey(import.meta.env.VITE_GEMINI_API_KEY || null);
    }
  };

  return {
    apiKey,
    saveApiKey,
    removeApiKey,
    hasKey: !!apiKey,
    isEnvKey: !!import.meta.env.VITE_GEMINI_API_KEY,
    isLoading,
  };
}

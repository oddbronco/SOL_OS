import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface UserSettings {
  id?: string;
  user_id: string;
  openai_api_key?: string;
  api_key_set_at?: string;
  created_at?: string;
  updated_at?: string;
}

export const useOpenAI = () => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load API key on component mount
  useEffect(() => {
    if (user) {
      loadApiKey();
    }
  }, [user]);

  const loadApiKey = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_settings')
        .select('openai_api_key, api_key_set_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw fetchError;
      }

      if (data?.openai_api_key) {
        setApiKey(data.openai_api_key);
        setHasApiKey(true);
      } else {
        setApiKey('');
        setHasApiKey(false);
      }
    } catch (err) {
      console.error('Error loading API key:', err);
      setError(err instanceof Error ? err.message : 'Failed to load API key');
      setHasApiKey(false);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async (newApiKey: string) => {
    if (!user) return false;

    try {
      setSaving(true);
      setError(null);

      // Validate API key format
      if (newApiKey && !newApiKey.startsWith('sk-')) {
        throw new Error('Invalid API key format. OpenAI API keys start with "sk-"');
      }

      const settingsData: Partial<UserSettings> = {
        user_id: user.id,
        openai_api_key: newApiKey || null,
        api_key_set_at: newApiKey ? new Date().toISOString() : null
      };

      const { data, error: saveError } = await supabase
        .from('user_settings')
        .upsert(settingsData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      setApiKey(newApiKey);
      setHasApiKey(!!newApiKey);
      
      return true;
    } catch (err) {
      console.error('Error saving API key:', err);
      setError(err instanceof Error ? err.message : 'Failed to save API key');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const clearApiKey = async () => {
    return await saveApiKey('');
  };

  const validateApiKey = (key: string): boolean => {
    return key.startsWith('sk-') && key.length > 20;
  };

  return {
    apiKey,
    hasApiKey,
    loading,
    saving,
    error,
    saveApiKey,
    clearApiKey,
    validateApiKey,
    refreshApiKey: loadApiKey
  };
};
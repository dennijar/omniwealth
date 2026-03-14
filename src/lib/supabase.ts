import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Strict URL validation to prevent throw 'Invalid URL' from createClient
export const isSupabaseConfigured = 
  Boolean(rawUrl && rawKey && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')));

const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawKey : 'placeholder_key';

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase URL or Anon Key is missing or invalid in your environment variables.',
    'Please check your .env.local file at the root of the project.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

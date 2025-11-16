import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create typed Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Helper types for easier access
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Typed table accessors
export type Profile = Tables<'profiles'>;
export type Question = Tables<'questions'>;
export type Topic = Tables<'topics'>;
export type UserAttempt = Tables<'user_attempts'>;
export type StudySession = Tables<'study_sessions'>;
export type Bookmark = Tables<'bookmarks'>;
export type StudyPlan = Tables<'study_plans'>;

// Helper to regenerate database types:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

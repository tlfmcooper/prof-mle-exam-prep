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

// Study Plan Helper Functions
export interface StudyPlanData {
  target_exam_date: Date;
  days_until_exam: number;
  hours_per_week: number;
  plan_items: Array<{
    topic_id: string;
    topic_name: string;
    priority: 'high' | 'medium' | 'low';
    recommended_questions: number;
    estimated_hours: number;
    target_accuracy: number;
    reason: string;
  }>;
  weekly_schedule: Array<{
    week_number: number;
    topics_to_focus: string[];
    daily_target_questions: number;
  }>;
}

/**
 * Save or update a user's study plan
 */
export async function saveStudyPlan(
  userId: string,
  examDate: string,
  hoursPerWeek: number,
  planData: StudyPlanData
): Promise<{ data: StudyPlan | null; error: Error | null }> {
  try {
    // Check if user already has a plan
    const { data: existing } = await supabase
      .from('study_plans')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing plan
      const { data, error } = await (supabase
        .from('study_plans') as any)
        .update({
          exam_date: examDate,
          hours_per_week: hoursPerWeek,
          plan_data: planData,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data: data as StudyPlan, error: null };
    } else {
      // Insert new plan
      const { data, error } = await (supabase
        .from('study_plans') as any)
        .insert({
          user_id: userId,
          exam_date: examDate,
          hours_per_week: hoursPerWeek,
          plan_data: planData,
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as StudyPlan, error: null };
    }
  } catch (error) {
    console.error('Error saving study plan:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Load a user's study plan
 */
export async function loadStudyPlan(
  userId: string
): Promise<{ data: StudyPlan | null; error: Error | null }> {
  try {
    const { data, error } = await (supabase
      .from('study_plans') as any)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // No plan found is not an error
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      throw error;
    }

    const typedData = data as StudyPlan;

    // Check if plan is still valid (exam date not passed)
    if (typedData && new Date(typedData.exam_date) <= new Date()) {
      // Delete expired plan
      await deleteStudyPlan(userId);
      return { data: null, error: null };
    }

    return { data: typedData, error: null };
  } catch (error) {
    console.error('Error loading study plan:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete a user's study plan
 */
export async function deleteStudyPlan(
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await (supabase
      .from('study_plans') as any)
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting study plan:', error);
    return { error: error as Error };
  }
}

// Helper to regenerate database types:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

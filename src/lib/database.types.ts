// TypeScript types generated from Supabase schema
// This file provides full type safety for database operations

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          target_exam_date: string | null
          study_goal_hours_per_week: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          target_exam_date?: string | null
          study_goal_hours_per_week?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          target_exam_date?: string | null
          study_goal_hours_per_week?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          question_text: string
          question_type: 'multiple_choice' | 'multiple_select' | 'case_study'
          options: Json
          explanation: string | null
          difficulty: 'easy' | 'medium' | 'hard' | null
          source: string | null
          source_page: number | null
          created_at: string
        }
        Insert: {
          id?: string
          question_text: string
          question_type: 'multiple_choice' | 'multiple_select' | 'case_study'
          options?: Json
          explanation?: string | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          source?: string | null
          source_page?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          question_text?: string
          question_type?: 'multiple_choice' | 'multiple_select' | 'case_study'
          options?: Json
          explanation?: string | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          source?: string | null
          source_page?: number | null
          created_at?: string
        }
      }
      topics: {
        Row: {
          id: string
          name: string
          description: string | null
          exam_weight: number | null
          parent_topic_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          exam_weight?: number | null
          parent_topic_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          exam_weight?: number | null
          parent_topic_id?: string | null
          created_at?: string
        }
      }
      question_topics: {
        Row: {
          question_id: string
          topic_id: string
        }
        Insert: {
          question_id: string
          topic_id: string
        }
        Update: {
          question_id?: string
          topic_id?: string
        }
      }
      user_attempts: {
        Row: {
          id: string
          user_id: string
          question_id: string
          selected_options: Json
          is_correct: boolean
          time_spent_seconds: number
          confidence_level: number
          attempted_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          selected_options: Json
          is_correct: boolean
          time_spent_seconds: number
          confidence_level: number
          attempted_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          selected_options?: Json
          is_correct?: boolean
          time_spent_seconds?: number
          confidence_level?: number
          attempted_at?: string
        }
      }
      study_sessions: {
        Row: {
          id: string
          user_id: string
          session_type: 'practice' | 'timed_exam' | 'review'
          started_at: string
          ended_at: string | null
          total_questions: number
          correct_answers: number
          score_percentage: number
        }
        Insert: {
          id?: string
          user_id: string
          session_type: 'practice' | 'timed_exam' | 'review'
          started_at?: string
          ended_at?: string | null
          total_questions: number
          correct_answers: number
          score_percentage: number
        }
        Update: {
          id?: string
          user_id?: string
          session_type?: 'practice' | 'timed_exam' | 'review'
          started_at?: string
          ended_at?: string | null
          total_questions?: number
          correct_answers?: number
          score_percentage?: number
        }
      }
      session_attempts: {
        Row: {
          session_id: string
          attempt_id: string
          sequence_number: number
        }
        Insert: {
          session_id: string
          attempt_id: string
          sequence_number: number
        }
        Update: {
          session_id?: string
          attempt_id?: string
          sequence_number?: number
        }
      }
      bookmarks: {
        Row: {
          user_id: string
          question_id: string
          notes: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          question_id: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          question_id?: string
          notes?: string | null
          created_at?: string
        }
      }
      study_plans: {
        Row: {
          id: string
          user_id: string
          exam_date: string
          hours_per_week: number
          plan_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exam_date: string
          hours_per_week?: number
          plan_data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exam_date?: string
          hours_per_week?: number
          plan_data?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_topic_performance: {
        Args: {
          p_user_id: string
        }
        Returns: {
          topic_id: string
          topic_name: string
          exam_weight: number
          attempted_count: number
          correct_count: number
          accuracy: number
          avg_confidence: number
          last_attempted: string | null
        }[]
      }
      calculate_difficulty_breakdown: {
        Args: {
          p_user_id: string
        }
        Returns: {
          difficulty: string
          attempted: number
          correct: number
          accuracy: number
        }[]
      }
      calculate_daily_trends: {
        Args: {
          p_user_id: string
          p_days: number
        }
        Returns: {
          date: string
          questions_attempted: number
          accuracy: number
          study_time_minutes: number
        }[]
      }
      get_study_calendar: {
        Args: {
          p_user_id: string
          p_days: number
        }
        Returns: {
          date: string
          activity_count: number
          total_time_minutes: number
        }[]
      }
      get_weak_topics: {
        Args: {
          p_user_id: string
          p_accuracy_threshold: number
          p_min_attempts: number
        }
        Returns: {
          topic_id: string
          topic_name: string
          accuracy: number
          questions_attempted: number
          recommended_focus_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

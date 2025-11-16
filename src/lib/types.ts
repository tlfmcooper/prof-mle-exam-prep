// Core types for the Professional ML Engineer Exam Prep application

export interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'multiple_select' | 'case_study';
  options: QuestionOption[];
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  source?: string;
  source_page?: number;
  created_at?: string;
  topics?: Topic[];
}

export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  exam_weight?: number;
  parent_topic_id?: string | null;
  created_at?: string;
  subtopics?: Topic[];
}

export interface UserAttempt {
  id: string;
  user_id: string;
  question_id: string;
  selected_options: string[];
  is_correct: boolean;
  time_spent_seconds: number;
  confidence_level: number;
  attempted_at: string;
  question?: Question;
}

export interface StudySession {
  id: string;
  user_id: string;
  session_type: 'practice' | 'timed_exam' | 'review';
  started_at: string;
  ended_at?: string;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  attempts?: UserAttempt[];
}

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  target_exam_date?: string;
  study_goal_hours_per_week?: number;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  user_id: string;
  question_id: string;
  notes?: string;
  created_at: string;
  question?: Question;
}

export interface StudyPlan {
  id: string;
  user_id: string;
  topic_id: string;
  target_date: string;
  target_mastery_percentage: number;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  topic?: Topic;
}

// Analytics and statistics types
export interface TopicStats {
  topic_id: string;
  topic_name: string;
  total_questions: number;
  attempted_questions: number;
  correct_answers: number;
  accuracy_percentage: number;
  exam_weight: number;
  mastery_level: 'novice' | 'learning' | 'proficient' | 'mastered';
}

export interface UserStats {
  total_attempts: number;
  total_correct: number;
  overall_accuracy: number;
  total_study_time_hours: number;
  questions_attempted: number;
  questions_remaining: number;
  weak_topics: string[];
  strong_topics: string[];
  current_streak_days: number;
}

export interface StudyPlanItem {
  topic: Topic;
  priority_score: number;
  recommended_questions: number;
  estimated_hours: number;
  current_accuracy: number;
  target_accuracy: number;
}

// Filter and query types
export interface QuestionFilters {
  difficulty?: 'easy' | 'medium' | 'hard';
  topicIds?: string[];
  excludeAnswered?: boolean;
  source?: string;
  limit?: number;
}

export interface SessionFilters {
  sessionType?: 'practice' | 'timed_exam' | 'review';
  startDate?: string;
  endDate?: string;
  limit?: number;
}

// UI component prop types
export interface QuestionCardProps {
  question: Question;
  onAnswer: (selectedOptions: string[]) => Promise<void>;
  showExplanation?: boolean;
  previousAttempt?: UserAttempt;
  showBookmark?: boolean;
  isBookmarked?: boolean;
  onBookmark?: () => void;
}

export interface ProgressChartData {
  date: string;
  accuracy: number;
  questionsAttempted: number;
}

export interface TopicBreakdownData {
  topic: string;
  accuracy: number;
  attempted: number;
  total: number;
  examWeight: number;
}

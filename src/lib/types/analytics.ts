// Analytics types for exam preparation application

export type MasteryLevel = 'novice' | 'learning' | 'proficient' | 'mastered';

export interface OverallMetrics {
  total_questions_attempted: number;
  total_correct: number;
  overall_accuracy: number; // percentage
  average_time_per_question: number; // seconds
  study_streak_days: number;
  total_study_hours: number;
  questions_remaining: number;
}

export interface TopicPerformance {
  topic_id: string;
  topic_name: string;
  exam_weight: number; // decimal
  questions_attempted: number;
  questions_correct: number;
  accuracy: number;
  mastery_level: MasteryLevel;
  avg_confidence: number; // 1-5
  recommended_practice_count: number;
  last_practiced: string | null;
}

export interface DifficultyMetrics {
  difficulty: 'easy' | 'medium' | 'hard';
  attempted: number;
  correct: number;
  accuracy: number;
}

export interface TrendData {
  date: string;
  questions_attempted: number;
  accuracy: number;
  study_time_minutes: number;
}

export interface CalendarData {
  date: string;
  activity_count: number;
  total_time_minutes: number;
}

export interface UserPerformanceMetrics {
  overall: OverallMetrics;
  by_topic: TopicPerformance[];
  by_difficulty: DifficultyMetrics[];
  trends: TrendData[];
  calendar: CalendarData[];
  readiness_score: number; // 0-100
}

export interface WeakArea {
  topic_id: string;
  topic_name: string;
  accuracy: number;
  attempted_count: number;
  exam_weight: number;
}

export interface StudyPlanItem {
  topic_id: string;
  topic_name: string;
  priority: 'high' | 'medium' | 'low';
  recommended_questions: number;
  estimated_hours: number;
  target_accuracy: number;
  reason: string;
}

export interface WeeklySchedule {
  week_number: number;
  topics_to_focus: string[];
  daily_target_questions: number;
}

export interface StudyPlan {
  target_exam_date: Date;
  days_until_exam: number;
  hours_per_week: number;
  plan_items: StudyPlanItem[];
  weekly_schedule: WeeklySchedule[];
}

export interface ExamPrediction {
  predicted_score: number;
  confidence_interval: [number, number];
  likelihood_of_passing: number; // percentage
}

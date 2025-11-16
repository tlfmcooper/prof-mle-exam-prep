import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  UserPerformanceMetrics,
  OverallMetrics,
  TopicPerformance,
  DifficultyMetrics,
  TrendData,
  CalendarData,
  MasteryLevel,
  WeakArea,
} from '@/lib/types/analytics';

/**
 * Main analytics hook - fetches all performance metrics for a user
 */
export function useUserAnalytics(userId?: string) {
  return useQuery({
    queryKey: ['analytics', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch all user attempts with questions
      const { data: attempts, error: attemptsError } = await supabase
        .from('user_attempts')
        .select('*, question:questions(*)')
        .eq('user_id', userId);

      if (attemptsError) throw attemptsError;
      if (!attempts) return null;

      // Get total questions count
      const { count: totalQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

      // Calculate overall metrics
      const overall = calculateOverallMetrics(attempts, totalQuestions || 0);

      // Get topic performance
      const topicPerformance = await fetchTopicPerformance(userId);

      // Get difficulty breakdown
      const difficultyMetrics = await fetchDifficultyBreakdown(userId);

      // Get trends (last 30 days)
      const trends = await fetchTrends(userId, 30);

      // Get calendar data (last 90 days)
      const calendar = await fetchCalendarData(userId, 90);

      // Calculate readiness score
      const readinessScore = calculateReadinessScore(topicPerformance, overall);

      return {
        overall,
        by_topic: topicPerformance,
        by_difficulty: difficultyMetrics,
        trends,
        calendar,
        readiness_score: readinessScore,
      } as UserPerformanceMetrics;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch weak areas for focused practice
 */
export function useWeakAreas(userId?: string, threshold = 75, minAttempts = 3) {
  return useQuery({
    queryKey: ['weak-areas', userId, threshold, minAttempts],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase.rpc('get_weak_topics', {
        p_user_id: userId,
        p_accuracy_threshold: threshold,
        p_min_attempts: minAttempts,
      });

      if (error) throw error;
      return (data || []) as WeakArea[];
    },
    enabled: !!userId,
  });
}

/**
 * Calculate overall performance metrics
 */
function calculateOverallMetrics(attempts: any[], totalQuestionsInBank: number): OverallMetrics {
  const total = attempts.length;
  const correct = attempts.filter((a) => a.is_correct).length;
  const totalTime = attempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);

  // Get unique questions attempted
  const uniqueQuestions = new Set(attempts.map((a) => a.question_id)).size;

  return {
    total_questions_attempted: uniqueQuestions,
    total_correct: correct,
    overall_accuracy: total > 0 ? (correct / total) * 100 : 0,
    average_time_per_question: total > 0 ? totalTime / total : 0,
    study_streak_days: 0, // This would be calculated from study sessions
    total_study_hours: totalTime / 3600,
    questions_remaining: Math.max(0, totalQuestionsInBank - uniqueQuestions),
  };
}

/**
 * Fetch topic performance using SQL function
 */
async function fetchTopicPerformance(userId: string): Promise<TopicPerformance[]> {
  const { data, error } = await supabase.rpc('calculate_topic_performance', {
    p_user_id: userId,
  });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    topic_id: row.topic_id,
    topic_name: row.topic_name,
    exam_weight: row.exam_weight || 0,
    questions_attempted: row.attempted_count || 0,
    questions_correct: row.correct_count || 0,
    accuracy: row.accuracy || 0,
    mastery_level: determineMasteryLevel(row.accuracy || 0, row.attempted_count || 0),
    avg_confidence: row.avg_confidence || 0,
    recommended_practice_count: calculateRecommendedPractice(
      row.accuracy || 0,
      row.attempted_count || 0,
      row.exam_weight || 0
    ),
    last_practiced: row.last_attempted,
  }));
}

/**
 * Determine mastery level based on accuracy and attempt count
 */
function determineMasteryLevel(accuracy: number, attemptCount: number): MasteryLevel {
  if (attemptCount < 3) return 'novice';
  if (accuracy >= 90 && attemptCount >= 10) return 'mastered';
  if (accuracy >= 75 && attemptCount >= 5) return 'proficient';
  if (attemptCount >= 3) return 'learning';
  return 'novice';
}

/**
 * Calculate recommended practice count based on performance
 */
function calculateRecommendedPractice(
  accuracy: number,
  attemptCount: number,
  examWeight: number
): number {
  // More practice for:
  // - Lower accuracy
  // - Higher exam weight
  // - Fewer attempts
  const accuracyFactor = Math.max(0, (100 - accuracy) / 10);
  const weightFactor = examWeight * 20;
  const attemptFactor = Math.max(0, 10 - attemptCount);

  return Math.ceil(accuracyFactor + weightFactor + attemptFactor);
}

/**
 * Fetch difficulty breakdown using SQL function
 */
async function fetchDifficultyBreakdown(userId: string): Promise<DifficultyMetrics[]> {
  const { data, error } = await supabase.rpc('calculate_difficulty_breakdown', {
    p_user_id: userId,
  });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    difficulty: row.difficulty as 'easy' | 'medium' | 'hard',
    attempted: row.attempted || 0,
    correct: row.correct || 0,
    accuracy: row.accuracy || 0,
  }));
}

/**
 * Fetch performance trends over time
 */
async function fetchTrends(userId: string, days: number): Promise<TrendData[]> {
  const { data, error } = await supabase.rpc('calculate_daily_trends', {
    p_user_id: userId,
    p_days: days,
  });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    date: row.date,
    questions_attempted: row.questions_attempted || 0,
    accuracy: row.accuracy || 0,
    study_time_minutes: row.study_time_minutes || 0,
  }));
}

/**
 * Fetch calendar/heatmap data
 */
async function fetchCalendarData(userId: string, days: number): Promise<CalendarData[]> {
  const { data, error } = await supabase.rpc('get_study_calendar', {
    p_user_id: userId,
    p_days: days,
  });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    date: row.date,
    activity_count: row.activity_count || 0,
    total_time_minutes: row.total_time_minutes || 0,
  }));
}

/**
 * Calculate exam readiness score (0-100)
 * Based on:
 * - Topic mastery weighted by exam importance (50%)
 * - Overall accuracy (30%)
 * - Coverage of question bank (20%)
 */
function calculateReadinessScore(
  topicPerformance: TopicPerformance[],
  overall: OverallMetrics
): number {
  if (topicPerformance.length === 0) return 0;

  // Topic mastery score
  const topicScore = topicPerformance.reduce((score, topic) => {
    const masteryPoints = {
      novice: 0,
      learning: 50,
      proficient: 75,
      mastered: 100,
    }[topic.mastery_level];

    const weight = topic.exam_weight || 0.1;
    return score + masteryPoints * weight;
  }, 0);

  // Overall accuracy score
  const accuracyScore = overall.overall_accuracy;

  // Coverage score (how much of the question bank has been attempted)
  const totalQuestions = overall.total_questions_attempted + overall.questions_remaining;
  const coverageScore = totalQuestions > 0
    ? Math.min(100, (overall.total_questions_attempted / totalQuestions) * 100)
    : 0;

  // Weighted combination
  const finalScore = topicScore * 0.5 + accuracyScore * 0.3 + coverageScore * 0.2;

  return Math.round(Math.min(100, Math.max(0, finalScore)));
}

/**
 * Hook to predict exam performance
 */
export function useExamPrediction(userId?: string) {
  const { data: analytics } = useUserAnalytics(userId);

  return useQuery({
    queryKey: ['exam-prediction', userId],
    queryFn: async () => {
      if (!analytics) return null;

      const weightedScore = analytics.by_topic.reduce((total, topic) => {
        return total + topic.accuracy * (topic.exam_weight || 0.1);
      }, 0);

      // Simple variance calculation (can be more sophisticated)
      const variance = 5; // ±5%
      const confidence_interval: [number, number] = [
        Math.max(0, weightedScore - variance),
        Math.min(100, weightedScore + variance),
      ];

      // Likelihood of passing (>70%)
      const passingThreshold = 70;
      const likelihood_of_passing = weightedScore >= passingThreshold
        ? Math.min(100, 50 + (weightedScore - passingThreshold) * 1.5)
        : Math.max(0, (weightedScore / passingThreshold) * 50);

      return {
        predicted_score: Math.round(weightedScore),
        confidence_interval,
        likelihood_of_passing: Math.round(likelihood_of_passing),
      };
    },
    enabled: !!analytics,
  });
}

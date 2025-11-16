import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TopicStats } from '@/lib/types';

/**
 * Hook to fetch topic-based statistics for a user
 * Returns stats for each topic including accuracy, attempts, and mastery level
 */
export function useTopicStats(userId?: string) {
  return useQuery({
    queryKey: ['topic_stats', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get all main topics (those without parent_topic_id)
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .is('parent_topic_id', null)
        .order('exam_weight', { ascending: false });

      if (topicsError) throw topicsError;

      // Get all questions with their topics
      const { data: allQuestions, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          question_topics!inner (
            topic:topics!inner (
              id,
              name,
              parent_topic_id
            )
          )
        `);

      if (questionsError) throw questionsError;

      // Get user attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('user_attempts')
        .select(`
          question_id,
          is_correct
        `)
        .eq('user_id', userId);

      if (attemptsError) throw attemptsError;

      // Calculate stats for each main topic
      const stats: TopicStats[] = topics.map((topic) => {
        // Find all questions for this topic or its subtopics
        const topicQuestions = allQuestions.filter((q: any) => {
          const questionTopics = q.question_topics || [];
          return questionTopics.some((qt: any) => {
            const qTopic = qt.topic;
            // Match if question is tagged with this topic or a subtopic of this topic
            return qTopic.id === topic.id || qTopic.parent_topic_id === topic.id;
          });
        });

        const questionIds = topicQuestions.map((q: any) => q.id);

        // Get user attempts for these questions
        const topicAttempts = attempts.filter((a: any) =>
          questionIds.includes(a.question_id)
        );

        // Get unique questions attempted
        const uniqueQuestionsAttempted = new Set(
          topicAttempts.map((a: any) => a.question_id)
        ).size;

        const correctAttempts = topicAttempts.filter((a: any) => a.is_correct).length;
        const totalAttempts = topicAttempts.length;
        const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

        // Determine mastery level based on accuracy and coverage
        let masteryLevel: 'novice' | 'learning' | 'proficient' | 'mastered' = 'novice';
        const coverage = questionIds.length > 0 ? (uniqueQuestionsAttempted / questionIds.length) * 100 : 0;

        if (accuracy >= 80 && coverage >= 75) {
          masteryLevel = 'mastered';
        } else if (accuracy >= 70 && coverage >= 50) {
          masteryLevel = 'proficient';
        } else if (accuracy >= 50 || coverage >= 25) {
          masteryLevel = 'learning';
        }

        return {
          topic_id: topic.id,
          topic_name: topic.name,
          total_questions: questionIds.length,
          attempted_questions: uniqueQuestionsAttempted,
          correct_answers: correctAttempts,
          accuracy_percentage: accuracy,
          exam_weight: topic.exam_weight || 0,
          mastery_level: masteryLevel,
        };
      });

      return stats;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch questions for a specific topic (including subtopics)
 */
export function useTopicQuestions(topicId: string, includeSubtopics = true) {
  return useQuery({
    queryKey: ['topic_questions', topicId, includeSubtopics],
    queryFn: async () => {
      let topicIds = [topicId];

      if (includeSubtopics) {
        // Get all subtopics
        const { data: subtopics, error: subtopicsError } = await supabase
          .from('topics')
          .select('id')
          .eq('parent_topic_id', topicId);

        if (subtopicsError) throw subtopicsError;

        if (subtopics && subtopics.length > 0) {
          topicIds = [...topicIds, ...subtopics.map((t: any) => t.id)];
        }
      }

      // Get questions for these topics
      const { data, error } = await supabase
        .from('question_topics')
        .select(`
          question:questions (
            *,
            question_topics!inner (
              topic:topics (*)
            )
          )
        `)
        .in('topic_id', topicIds);

      if (error) throw error;

      // Extract unique questions
      const uniqueQuestions = new Map();
      data.forEach((item: any) => {
        if (item.question && !uniqueQuestions.has(item.question.id)) {
          uniqueQuestions.set(item.question.id, {
            ...item.question,
            options: Array.isArray(item.question.options)
              ? item.question.options
              : JSON.parse(item.question.options || '[]'),
          });
        }
      });

      return Array.from(uniqueQuestions.values());
    },
    enabled: !!topicId,
  });
}

/**
 * Hook to get overall progress across all topics
 */
export function useOverallProgress(userId?: string) {
  return useQuery({
    queryKey: ['overall_progress', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get total questions count
      const { count: totalQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

      if (questionsError) throw questionsError;

      // Get user attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('user_attempts')
        .select('question_id, is_correct')
        .eq('user_id', userId);

      if (attemptsError) throw attemptsError;

      // Calculate unique questions attempted
      const uniqueQuestionsAttempted = new Set(
        attempts.map((a: any) => a.question_id)
      ).size;

      const totalAttempts = attempts.length;
      const correctAttempts = attempts.filter((a: any) => a.is_correct).length;

      return {
        total_questions: totalQuestions || 0,
        questions_attempted: uniqueQuestionsAttempted,
        questions_remaining: (totalQuestions || 0) - uniqueQuestionsAttempted,
        total_attempts: totalAttempts,
        correct_attempts: correctAttempts,
        overall_accuracy: totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0,
        progress_percentage: totalQuestions ? (uniqueQuestionsAttempted / totalQuestions) * 100 : 0,
      };
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

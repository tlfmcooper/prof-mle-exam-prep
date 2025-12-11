import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TopicStats } from '@/lib/types';

// Mapping of Official Topic IDs to their Duplicate/Orphan counterparts
const TOPIC_MAPPINGS: Record<string, string[]> = {
  // Architecting low-code AI solutions
  '550e8400-e29b-41d4-a716-446655440001': ['eb3efdfe-2acd-4890-9e32-f333100e3f70'], // Low Code Ai
  
  // Data and Model Collaboration
  '550e8400-e29b-41d4-a716-446655440002': ['5eb76235-a9e7-468e-a2a6-944398cf715e'], // Data Prep
  
  // Model Development
  '550e8400-e29b-41d4-a716-446655440003': ['71af905b-8cc5-43a2-aa44-8ce2dc97dc3b', '6b45e087-c586-4d25-8786-fe0df8fb5b0f'], // Model Dev, Model Interpretability
  
  // Model Serving
  '550e8400-e29b-41d4-a716-446655440004': ['4954d4a9-911f-492f-ac76-d05bbf69f720'], // Ab Testing
  
  // MLOps & Automation
  '550e8400-e29b-41d4-a716-446655440005': [
    '847b7dd0-05ed-44bb-aa2e-e2f0a041c1de', // Mlops
    '72179a26-c625-4f85-a906-419123a855db'  // Cicd
  ],
  
  // Monitoring & Optimization
  '550e8400-e29b-41d4-a716-446655440006': [
    'abd39a8f-9eb5-4924-adc8-6c197312f1b6', // Monitoring
    'd36ca108-3416-415b-bfd0-ae508450d7b6'  // Training Serving Skew
  ]
};

const OFFICIAL_TOPIC_NAMES = [
  'Architecting low-code AI solutions',
  'Data and Model Collaboration',
  'Model Development',
  'Model Serving',
  'MLOps & Automation',
  'Monitoring & Optimization'
];

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
      const { data: topics, error: topicsError } = await (supabase
        .from('topics')
        .select('*')
        .is('parent_topic_id', null)
        .order('exam_weight', { ascending: false }) as any);

      if (topicsError) throw topicsError;

      // Get all questions with their topics
      const { data: allQuestions, error: questionsError } = await (supabase
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
        `) as any);

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
      const stats: TopicStats[] = topics.map((topic: any) => {
        // Find mapped duplicate/orphan topic IDs for this official topic
        const mappedIds = TOPIC_MAPPINGS[topic.id] || [];

        // Find all questions for this topic or its subtopics OR its mapped orphan topics
        const topicQuestions = allQuestions.filter((q: any) => {
          const questionTopics = q.question_topics || [];
          return questionTopics.some((qt: any) => {
            const qTopic = qt.topic;
            // Match if:
            // 1. Question is directly tagged with this topic
            // 2. Question is tagged with a subtopic of this topic
            // 3. Question is tagged with a mapped orphan topic
            return (
              qTopic.id === topic.id || 
              qTopic.parent_topic_id === topic.id ||
              mappedIds.includes(qTopic.id)
            );
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

      // Filter to only include official exam sections
      // This removes the duplicate/orphan cards while their questions are preserved in the Official Topic stats
      return stats.filter((stat: TopicStats) => OFFICIAL_TOPIC_NAMES.includes(stat.topic_name));
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

      // Add mapped duplicate/orphan topics to the fetch list
      const mappedIds = TOPIC_MAPPINGS[topicId] || [];
      if (mappedIds.length > 0) {
        topicIds = [...topicIds, ...mappedIds];
      }

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

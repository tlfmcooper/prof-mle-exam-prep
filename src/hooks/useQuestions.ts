import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Question, QuestionFilters } from '@/lib/types';

export function useQuestions(filters?: QuestionFilters) {
  return useQuery({
    queryKey: ['questions', filters],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select(`
          *,
          question_topics (
            topic:topics (*)
          )
        `);

      if (filters?.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters?.source) {
        query = query.eq('source', filters.source);
      }

      if (filters?.topicIds?.length) {
        query = query.in('question_topics.topic_id', filters.topicIds);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      // @ts-expect-error - Supabase type inference issue
      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our Question type
      return (data || []).map((q: any) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'),
        topics: q.question_topics?.map((qt: any) => qt.topic) || []
      })) as Question[];
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useQuestion(questionId: string) {
  return useQuery({
    queryKey: ['question', questionId],
    queryFn: async () => {
      // @ts-expect-error - Supabase type inference issue
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          question_topics (
            topic:topics (*)
          )
        `)
        .eq('id', questionId)
        .single();

      if (error) throw error;

      return {
        ...data,
        options: Array.isArray(data.options) ? data.options : JSON.parse(data.options || '[]'),
        topics: data.question_topics?.map((qt: any) => qt.topic) || []
      } as Question;
    },
    enabled: !!questionId,
  });
}

export function useRandomQuestions(count: number, filters?: QuestionFilters) {
  return useQuery({
    queryKey: ['random-questions', count, filters],
    queryFn: async () => {
      // First, get the count of total questions
      let countQuery = supabase
        .from('questions')
        .select('id', { count: 'exact', head: true });

      if (filters?.difficulty) {
        countQuery = countQuery.eq('difficulty', filters.difficulty);
      }

      const { count: totalCount } = await countQuery;

      if (!totalCount || totalCount === 0) return [];

      // Generate random offsets
      const randomOffsets = Array.from(
        { length: Math.min(count, totalCount) },
        () => Math.floor(Math.random() * totalCount)
      );

      // Fetch questions at random offsets
      const promises = randomOffsets.map(async (offset) => {
        let query = supabase
          .from('questions')
          .select(`
            *,
            question_topics (
              topic:topics (*)
            )
          `)
          .range(offset, offset)
          .limit(1);

        if (filters?.difficulty) {
          query = query.eq('difficulty', filters.difficulty);
        }

        // @ts-expect-error - Supabase type inference issue
        const { data } = await query;
        return data?.[0];
      });

      const results = await Promise.all(promises);

      return results
        .filter(Boolean)
        .map((q: any) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'),
          topics: q?.question_topics?.map((qt: any) => qt.topic) || []
        })) as Question[];
    },
  });
}

/**
 * Hook to get exam questions with weighted distribution by topic
 * Selects questions proportionally to each topic's exam weight
 */
export function useExamQuestions(totalQuestions = 50) {
  return useQuery({
    queryKey: ['exam-questions', totalQuestions],
    queryFn: async () => {
      // Get all main topics with their weights
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id, name, exam_weight')
        .is('parent_topic_id', null)
        .order('exam_weight', { ascending: false });

      if (topicsError) throw topicsError;

      // Get all questions with their topic associations
      const { data: allQuestions, error: questionsError } = await supabase
        .from('questions')
        .select(`
          *,
          question_topics!inner (
            topic:topics!inner (
              id,
              name,
              parent_topic_id
            )
          )
        `);

      if (questionsError) throw questionsError;

      // Group questions by main topic
      const questionsByTopic = new Map<string, any[]>();

      topics.forEach((topic) => {
        const topicQuestions = allQuestions.filter((q: any) => {
          const questionTopics = q.question_topics || [];
          return questionTopics.some((qt: any) => {
            const qTopic = qt.topic;
            return qTopic.id === topic.id || qTopic.parent_topic_id === topic.id;
          });
        });

        // Remove duplicates
        const uniqueQuestions = Array.from(
          new Map(topicQuestions.map((q: any) => [q.id, q])).values()
        );

        questionsByTopic.set(topic.id, uniqueQuestions);
      });

      // Calculate number of questions per topic based on weight
      const selectedQuestions: any[] = [];
      const totalWeight = topics.reduce((sum: number, t: any) => sum + (t.exam_weight || 0), 0);

      topics.forEach((topic) => {
        const weight = topic.exam_weight || 0;
        const questionsForTopic = Math.round((weight / totalWeight) * totalQuestions);
        const availableQuestions = questionsByTopic.get(topic.id) || [];

        // Randomly select questions from this topic
        const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(questionsForTopic, shuffled.length));

        selectedQuestions.push(...selected);
      });

      // If we don't have enough questions, add more randomly
      if (selectedQuestions.length < totalQuestions) {
        const remaining = totalQuestions - selectedQuestions.length;
        const allAvailable = allQuestions.filter(
          (q: any) => !selectedQuestions.find((sq) => sq.id === q.id)
        );
        const shuffled = [...allAvailable].sort(() => Math.random() - 0.5);
        selectedQuestions.push(...shuffled.slice(0, remaining));
      }

      // Shuffle final selection and transform data
      const shuffledQuestions = selectedQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, totalQuestions)
        .map((q: any) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'),
          topics: q.question_topics?.map((qt: any) => qt.topic) || [],
        }));

      return shuffledQuestions as Question[];
    },
    staleTime: 0, // Always fetch fresh for each exam
    cacheTime: 0, // Don't cache exam questions
  });
}

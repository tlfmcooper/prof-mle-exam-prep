import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our Question type
      return (data || []).map(q => ({
        ...q,
        topics: q.question_topics?.map((qt: any) => qt.topic) || []
      })) as Question[];
    },
  });
}

export function useQuestion(questionId: string) {
  return useQuery({
    queryKey: ['question', questionId],
    queryFn: async () => {
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

        const { data } = await query;
        return data?.[0];
      });

      const results = await Promise.all(promises);

      return results
        .filter(Boolean)
        .map(q => ({
          ...q,
          topics: q.question_topics?.map((qt: any) => qt.topic) || []
        })) as Question[];
    },
  });
}

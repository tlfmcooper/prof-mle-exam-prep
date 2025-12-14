import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Inserts } from '@/lib/supabase';
import { UserAttempt } from '@/lib/types';

export function useUserAttempts(userId?: string) {
  return useQuery({
    queryKey: ['user_attempts', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_attempts')
        .select(`
          *,
          question:questions (*)
        `)
        .eq('user_id', userId)
        .order('attempted_at', { ascending: false });

      if (error) throw error;
      return data as UserAttempt[];
    },
    enabled: !!userId,
  });
}

export function useQuestionAttempts(questionId: string, userId?: string) {
  return useQuery({
    queryKey: ['question_attempts', questionId, userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_attempts')
        .select('*')
        .eq('question_id', questionId)
        .eq('user_id', userId)
        .order('attempted_at', { ascending: false });

      if (error) throw error;
      return data as UserAttempt[];
    },
    enabled: !!questionId && !!userId,
  });
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attempt: Omit<UserAttempt, 'id' | 'attempted_at'>) => {
      const insertData: Inserts<'user_attempts'> = {
        user_id: attempt.user_id,
        question_id: attempt.question_id,
        selected_options: attempt.selected_options as any,
        is_correct: attempt.is_correct,
        time_spent_seconds: attempt.time_spent_seconds,
        confidence_level: attempt.confidence_level,
      };

      const { data, error } = await supabase
        .from('user_attempts')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data as UserAttempt;
    },
    onSuccess: async (data) => {
      console.log('[useSubmitAttempt] Successfully saved attempt:', data.id);
      
      const keys = [
        ['user_attempts', data.user_id],
        ['question_attempts', data.question_id],
        ['user_stats', data.user_id],
        ['topic_stats', data.user_id],
        ['overall_progress', data.user_id],
        ['analytics', data.user_id],
        ['questions'], // Invalidate questions to ensure excludeAttempts works correctly
        ['exam-questions'], // Invalidate exam questions as well
      ];

      // Mark all related queries stale and force refetch
      await Promise.all(keys.map((key) => 
        queryClient.invalidateQueries({ 
          queryKey: key,
          refetchType: 'all' // Force refetch even if not active
        })
      ));
      
      console.log('[useSubmitAttempt] Invalidated all related queries');
    },
    onError: (error) => {
      console.error('[useSubmitAttempt] Failed to submit attempt:', error);
    },
  });
}

export function useUserStats(userId?: string) {
  return useQuery({
    queryKey: ['user_stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Paginate through all attempts since Supabase has a 1000 row limit
      const allAttempts: { is_correct: boolean; time_spent_seconds: number }[] = [];
      const pageSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('user_attempts')
          .select('is_correct, time_spent_seconds')
          .eq('user_id', userId)
          .range(offset, offset + pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allAttempts.push(...data);
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      const totalAttempts = allAttempts.length;
      const totalCorrect = allAttempts.filter((a: any) => a.is_correct).length;
      const totalTime = allAttempts.reduce((sum: number, a: any) => sum + (a.time_spent_seconds || 0), 0);

      return {
        total_attempts: totalAttempts,
        total_correct: totalCorrect,
        overall_accuracy: totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0,
        total_study_time_hours: totalTime / 3600,
      };
    },
    enabled: !!userId,
  });
}

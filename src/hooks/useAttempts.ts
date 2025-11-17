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
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['user_attempts', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['question_attempts', data.question_id] });
      queryClient.invalidateQueries({ queryKey: ['user_stats', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['topic_stats', data.user_id] });
    },
  });
}

export function useUserStats(userId?: string) {
  return useQuery({
    queryKey: ['user_stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_attempts')
        .select('is_correct, time_spent_seconds')
        .eq('user_id', userId);

      if (error) throw error;

      const totalAttempts = data.length;
      const totalCorrect = data.filter((a: any) => a.is_correct).length;
      const totalTime = data.reduce((sum: number, a: any) => sum + (a.time_spent_seconds || 0), 0);

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

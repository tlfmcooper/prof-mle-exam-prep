import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Inserts } from '@/lib/supabase';
import { StudySession } from '@/lib/types';

/**
 * Hook to fetch user's study sessions
 */
export function useStudySessions(userId?: string, limit = 10) {
  return useQuery({
    queryKey: ['study_sessions', userId, limit],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as StudySession[];
    },
    enabled: !!userId,
  });
}

/**
 * Hook to get a specific study session with its attempts
 */
export function useStudySession(sessionId: string) {
  return useQuery({
    queryKey: ['study_session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select(`
          *,
          session_attempts!inner (
            attempt:user_attempts (
              *,
              question:questions (*)
            )
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      // Transform the data
      const session = data as any;
      const attempts = session.session_attempts
        ?.map((sa: any) => sa.attempt)
        .filter(Boolean) || [];

      return {
        ...session,
        attempts,
      } as StudySession;
    },
    enabled: !!sessionId,
  });
}

/**
 * Hook to create a new study session
 */
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: Omit<StudySession, 'id' | 'started_at'>) => {
      const insertData: Inserts<'study_sessions'> = {
        user_id: session.user_id,
        session_type: session.session_type,
        total_questions: session.total_questions,
        correct_answers: session.correct_answers,
        score_percentage: session.score_percentage as any,
        ended_at: session.ended_at,
      };

      const { data, error } = await supabase
        .from('study_sessions')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as StudySession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study_sessions', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['user_stats', data.user_id] });
    },
  });
}

/**
 * Hook to update a study session (typically to end it and record results)
 */
export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      updates,
    }: {
      sessionId: string;
      updates: Partial<StudySession>;
    }) => {
      const { data, error } = await supabase
        .from('study_sessions')
        .update({
          ended_at: updates.ended_at,
          correct_answers: updates.correct_answers,
          score_percentage: updates.score_percentage as any,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as StudySession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study_sessions', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['study_session', data.id] });
      queryClient.invalidateQueries({ queryKey: ['user_stats', data.user_id] });
    },
  });
}

/**
 * Hook to link attempts to a session
 */
export function useLinkAttemptToSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      attemptId,
      sequenceNumber,
    }: {
      sessionId: string;
      attemptId: string;
      sequenceNumber: number;
    }) => {
      const { data, error } = await supabase
        .from('session_attempts')
        .insert({
          session_id: sessionId,
          attempt_id: attemptId,
          sequence_number: sequenceNumber,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['study_session', variables.sessionId] });
    },
  });
}

/**
 * Hook to get recent study activity
 */
export function useRecentActivity(userId?: string, days = 7) {
  return useQuery({
    queryKey: ['recent_activity', userId, days],
    queryFn: async () => {
      if (!userId) return [];

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('started_at', cutoffDate.toISOString())
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data as StudySession[];
    },
    enabled: !!userId,
  });
}

/**
 * Hook to calculate study streak
 */
export function useStudyStreak(userId?: string) {
  return useQuery({
    queryKey: ['study_streak', userId],
    queryFn: async () => {
      if (!userId) return { current_streak: 0, longest_streak: 0, last_study_date: null };

      // Get all sessions ordered by date
      const { data: sessions, error } = await supabase
        .from('study_sessions')
        .select('started_at')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error) throw error;

      if (!sessions || sessions.length === 0) {
        return { current_streak: 0, longest_streak: 0, last_study_date: null };
      }

      // Group sessions by date
      const studyDates = new Set(
        sessions.map((s: any) => new Date(s.started_at).toDateString())
      );

      const sortedDates = Array.from(studyDates)
        .map((d) => new Date(d))
        .sort((a, b) => b.getTime() - a.getTime());

      // Calculate current streak
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < sortedDates.length; i++) {
        const date = new Date(sortedDates[i]);
        date.setHours(0, 0, 0, 0);

        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);
        expectedDate.setHours(0, 0, 0, 0);

        if (date.getTime() === expectedDate.getTime()) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Calculate longest streak
      let longestStreak = 0;
      let tempStreak = 1;

      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);

        const diffDays = Math.floor(
          (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }

      longestStreak = Math.max(longestStreak, currentStreak);

      return {
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_study_date: sortedDates[0].toISOString(),
      };
    },
    enabled: !!userId,
  });
}

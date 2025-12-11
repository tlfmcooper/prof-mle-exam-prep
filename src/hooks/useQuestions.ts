import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Question, QuestionFilters } from '@/lib/types';

export function useQuestions(filters?: QuestionFilters, userId?: string, excludeAttempts = false) {
  return useQuery({
    queryKey: ['questions', filters, userId, excludeAttempts],
    queryFn: async () => {
      const totalQuestions = filters?.limit || 50;

      // Get all main topics with their weights
      const { data: topics, error: topicsError } = await (supabase
        .from('topics')
        .select('id, name, exam_weight')
        .is('parent_topic_id', null)
        .order('exam_weight', { ascending: false }) as any);

      if (topicsError) throw topicsError;

      // Get user attempts if needed
      let attemptedQuestionIds = new Set<string>();
      if (userId && excludeAttempts) {
        const { data: attempts, error: attemptsError } = await supabase
          .from('user_attempts')
          .select('question_id')
          .eq('user_id', userId);
        
        if (attemptsError) throw attemptsError;
        if (attempts) {
          attempts.forEach((a: any) => attemptedQuestionIds.add(a.question_id));
        }
      }

      // Get all questions with their topic associations
      // Re-constructing the query to properly handle topic filtering
      let query = supabase.from('questions').select(`
        *,
        question_topics!inner (
          topic:topics!inner (
            id,
            name,
            parent_topic_id
          )
        )
      `);

      if (filters?.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters?.source) {
        query = query.eq('source', filters.source);
      }

      if (filters?.topicIds && filters.topicIds.length > 0) {
        // This filters the questions based on the inner joined topics
        query = query.in('question_topics.topic_id', filters.topicIds);
      }

      const { data: allQuestions, error: questionsError } = await (query as any);

      if (questionsError) throw questionsError;
      if (!allQuestions || allQuestions.length === 0) return [];

      // If no topics or weights, fall back to random selection
      if (!topics || topics.length === 0) {
        // Filter out attempted questions first
        let finalSelection: any[] = [];
        
        if (excludeAttempts && attemptedQuestionIds.size > 0) {
          const unattempted = allQuestions.filter((q: any) => !attemptedQuestionIds.has(q.id));
          const attempted = allQuestions.filter((q: any) => attemptedQuestionIds.has(q.id));
          
          const shuffledUnattempted = [...unattempted].sort(() => Math.random() - 0.5);
          finalSelection = shuffledUnattempted.slice(0, totalQuestions);
          
          if (finalSelection.length < totalQuestions) {
             const remaining = totalQuestions - finalSelection.length;
             const shuffledAttempted = [...attempted].sort(() => Math.random() - 0.5);
             finalSelection = [...finalSelection, ...shuffledAttempted.slice(0, remaining)];
          }
        } else {
           // Normal logic without attempt exclusion
           finalSelection = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, totalQuestions);
        }

        return finalSelection.map((q: any) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'),
          topics: q.question_topics?.map((qt: any) => qt.topic) || []
        })) as Question[];
      }

      // Group questions by main topic
      const questionsByTopic = new Map<string, any[]>();

      topics.forEach((topic: any) => {
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

      topics.forEach((topic: any) => {
        const weight = topic.exam_weight || 0;
        const questionsForTopic = Math.round((weight / totalWeight) * totalQuestions);
        const availableQuestions = questionsByTopic.get(topic.id) || [];
        
        let shuffled: any[] = [];

        if (excludeAttempts && attemptedQuestionIds.size > 0) {
          // Split into unattempted and attempted
          const unattempted = availableQuestions.filter((q: any) => !attemptedQuestionIds.has(q.id));
          const attempted = availableQuestions.filter((q: any) => attemptedQuestionIds.has(q.id));
          
          // Prioritize unattempted
          const shuffledUnattempted = [...unattempted].sort(() => Math.random() - 0.5);
          
          if (shuffledUnattempted.length >= questionsForTopic) {
             shuffled = shuffledUnattempted;
          } else {
             // Fill remainder with attempted
             const shuffledAttempted = [...attempted].sort(() => Math.random() - 0.5);
             shuffled = [...shuffledUnattempted, ...shuffledAttempted];
          }
        } else {
          shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
        }

        const selected = shuffled.slice(0, Math.min(questionsForTopic, shuffled.length));

        selectedQuestions.push(...selected);
      });

      // If we don't have enough questions, add more randomly
      if (selectedQuestions.length < totalQuestions) {
        const remaining = totalQuestions - selectedQuestions.length;
        
        // Build pool of questions not yet selected
        const selectedIds = new Set(selectedQuestions.map(q => q.id));
        const allAvailable = allQuestions.filter((q: any) => !selectedIds.has(q.id));
        
        // Use logic similar to topic selection: prioritize unattempted
        let shuffledPool: any[] = [];
        
        if (excludeAttempts && attemptedQuestionIds.size > 0) {
            const unattempted = allAvailable.filter((q: any) => !attemptedQuestionIds.has(q.id));
            const attempted = allAvailable.filter((q: any) => attemptedQuestionIds.has(q.id));
            
            shuffledPool = [...unattempted].sort(() => Math.random() - 0.5);
            
            if (shuffledPool.length < remaining) {
                const remainderFromAttempted = [...attempted].sort(() => Math.random() - 0.5);
                shuffledPool = [...shuffledPool, ...remainderFromAttempted];
            }
        } else {
            shuffledPool = [...allAvailable].sort(() => Math.random() - 0.5);
        }

        selectedQuestions.push(...shuffledPool.slice(0, remaining));
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
    retry: 1,
    staleTime: 0, // Don't cache - we want fresh random selection each time
    gcTime: 0,
  });
}

export function useQuestion(questionId: string) {
  return useQuery({
    queryKey: ['question', questionId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('questions')
        .select(`
          *,
          question_topics (
            topic:topics (*)
          )
        `)
        .eq('id', questionId)
        .single() as any);

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
export function useExamQuestions(totalQuestions = 50, userId?: string, excludeAttempts = false) {
  return useQuery({
    queryKey: ['exam-questions', totalQuestions, userId, excludeAttempts],
    queryFn: async () => {
      // Get all main topics with their weights
      const { data: topics, error: topicsError } = await (supabase
        .from('topics')
        .select('id, name, exam_weight')
        .is('parent_topic_id', null)
        .order('exam_weight', { ascending: false }) as any);

      if (topicsError) throw topicsError;

      // Get user attempts if needed
      let attemptedQuestionIds = new Set<string>();
      if (userId && excludeAttempts) {
        const { data: attempts, error: attemptsError } = await supabase
          .from('user_attempts')
          .select('question_id')
          .eq('user_id', userId);
        
        if (attemptsError) throw attemptsError;
        if (attempts) {
          attempts.forEach((a: any) => attemptedQuestionIds.add(a.question_id));
        }
      }

      // Get all questions with their topic associations
      const { data: allQuestions, error: questionsError } = await (supabase
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
        `) as any);

      if (questionsError) throw questionsError;

      // Group questions by main topic
      const questionsByTopic = new Map<string, any[]>();

      topics.forEach((topic: any) => {
        const topicQuestions = allQuestions.filter((q: any) => {
          const questionTopics = q.question_topics || [];
          return questionTopics.some((qt: any) => {
            const qTopic = qt.topic;
            return qTopic.id === topic.id || qTopic.parent_topic_id === topic.id;
          });
        });

        // Remove duplicates within topic
        const uniqueQuestions = Array.from(
          new Map(topicQuestions.map((q: any) => [q.id, q])).values()
        );

        questionsByTopic.set(topic.id, uniqueQuestions);
      });

      // Calculate number of questions per topic based on weight
      const selectedQuestions: any[] = [];
      const globalSelectedIds = new Set<string>(); // Track ALL selected IDs to prevent cross-topic duplicates
      
      const totalWeight = topics.reduce((sum: number, t: any) => sum + (t.exam_weight || 0), 0);

      topics.forEach((topic: any) => {
        const weight = topic.exam_weight || 0;
        const questionsForTopic = Math.round((weight / totalWeight) * totalQuestions);
        let availableQuestions = questionsByTopic.get(topic.id) || [];
        
        // Filter out questions already selected by previous topics
        availableQuestions = availableQuestions.filter((q: any) => !globalSelectedIds.has(q.id));

        let shuffled: any[] = [];

        if (excludeAttempts && attemptedQuestionIds.size > 0) {
            // Split into unattempted and attempted
            const unattempted = availableQuestions.filter((q: any) => !attemptedQuestionIds.has(q.id));
            const attempted = availableQuestions.filter((q: any) => attemptedQuestionIds.has(q.id));
            
            // Prioritize unattempted
            const shuffledUnattempted = [...unattempted].sort(() => Math.random() - 0.5);
            
            if (shuffledUnattempted.length >= questionsForTopic) {
               shuffled = shuffledUnattempted;
            } else {
               // Fill remainder with attempted
               const shuffledAttempted = [...attempted].sort(() => Math.random() - 0.5);
               shuffled = [...shuffledUnattempted, ...shuffledAttempted];
            }
        } else {
            shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
        }

        const selected = shuffled.slice(0, Math.min(questionsForTopic, shuffled.length));
        
        selected.forEach((q: any) => globalSelectedIds.add(q.id));
        selectedQuestions.push(...selected);
      });

      // If we don't have enough questions, add more randomly
      if (selectedQuestions.length < totalQuestions) {
        const remaining = totalQuestions - selectedQuestions.length;
        
        // Build pool available from all questions not yet selected
        const allAvailable = allQuestions.filter(
          (q: any) => !globalSelectedIds.has(q.id)
        );
        
        let shuffledPool: any[] = [];
        
        if (excludeAttempts && attemptedQuestionIds.size > 0) {
             const unattempted = allAvailable.filter((q: any) => !attemptedQuestionIds.has(q.id));
             const attempted = allAvailable.filter((q: any) => attemptedQuestionIds.has(q.id));
             
             shuffledPool = [...unattempted].sort(() => Math.random() - 0.5);
             if (shuffledPool.length < remaining) {
                 const remainderAttempts = [...attempted].sort(() => Math.random() - 0.5);
                 shuffledPool = [...shuffledPool, ...remainderAttempts];
             }
        } else {
             shuffledPool = [...allAvailable].sort(() => Math.random() - 0.5);
        }

        const fallbackSelected = shuffledPool.slice(0, remaining);
        fallbackSelected.forEach((q: any) => globalSelectedIds.add(q.id));
        selectedQuestions.push(...fallbackSelected);
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
    gcTime: 0, // Don't cache exam questions (renamed from cacheTime in React Query v5)
  });
}

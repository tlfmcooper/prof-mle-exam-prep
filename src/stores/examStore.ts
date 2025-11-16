import { create } from 'zustand';
import { Question, StudySession } from '@/lib/types';

interface ExamState {
  // Current session
  currentSession: StudySession | null;
  currentQuestions: Question[];
  currentQuestionIndex: number;

  // Session state
  startTime: Date | null;
  answers: Record<string, string[]>; // questionId -> selectedOptions

  // UI state
  showExplanation: boolean;
  isPracticeMode: boolean;

  // Actions
  startSession: (questions: Question[], sessionType: 'practice' | 'timed_exam' | 'review') => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (index: number) => void;
  submitAnswer: (questionId: string, selectedOptions: string[]) => void;
  toggleExplanation: () => void;
  endSession: () => void;
  reset: () => void;
}

export const useExamStore = create<ExamState>((set, get) => ({
  currentSession: null,
  currentQuestions: [],
  currentQuestionIndex: 0,
  startTime: null,
  answers: {},
  showExplanation: false,
  isPracticeMode: true,

  startSession: (questions, sessionType) => set({
    currentQuestions: questions,
    currentQuestionIndex: 0,
    startTime: new Date(),
    answers: {},
    showExplanation: false,
    isPracticeMode: sessionType === 'practice',
    currentSession: {
      id: crypto.randomUUID(),
      user_id: '', // Will be set when saving
      session_type: sessionType,
      started_at: new Date().toISOString(),
      total_questions: questions.length,
      correct_answers: 0,
      score_percentage: 0,
    },
  }),

  nextQuestion: () => set((state) => ({
    currentQuestionIndex: Math.min(
      state.currentQuestionIndex + 1,
      state.currentQuestions.length - 1
    ),
    showExplanation: false,
  })),

  previousQuestion: () => set((state) => ({
    currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
    showExplanation: false,
  })),

  goToQuestion: (index) => set({
    currentQuestionIndex: index,
    showExplanation: false,
  }),

  submitAnswer: (questionId, selectedOptions) => set((state) => ({
    answers: {
      ...state.answers,
      [questionId]: selectedOptions,
    },
    showExplanation: state.isPracticeMode,
  })),

  toggleExplanation: () => set((state) => ({
    showExplanation: !state.showExplanation,
  })),

  endSession: () => {
    const state = get();
    const correctAnswers = Object.entries(state.answers).filter(([questionId, selected]) => {
      const question = state.currentQuestions.find(q => q.id === questionId);
      if (!question) return false;
      const correctOptions = question.options.filter(o => o.is_correct).map(o => o.id);
      return selected.length === correctOptions.length &&
        selected.every(opt => correctOptions.includes(opt));
    }).length;

    set({
      currentSession: state.currentSession ? {
        ...state.currentSession,
        ended_at: new Date().toISOString(),
        correct_answers: correctAnswers,
        score_percentage: (correctAnswers / state.currentQuestions.length) * 100,
      } : null,
    });
  },

  reset: () => set({
    currentSession: null,
    currentQuestions: [],
    currentQuestionIndex: 0,
    startTime: null,
    answers: {},
    showExplanation: false,
    isPracticeMode: true,
  }),
}));

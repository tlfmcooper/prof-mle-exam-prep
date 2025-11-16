import { describe, it, expect, beforeEach } from 'vitest';
import { useExamStore } from './examStore';
import { Question } from '@/lib/types';

const mockQuestions: Question[] = [
  {
    id: '1',
    question_text: 'Question 1',
    question_type: 'multiple_choice',
    options: [
      { id: 'A', text: 'Option A', is_correct: true },
      { id: 'B', text: 'Option B', is_correct: false },
    ],
    explanation: 'Explanation 1',
    difficulty: 'easy',
  },
  {
    id: '2',
    question_text: 'Question 2',
    question_type: 'multiple_select',
    options: [
      { id: 'A', text: 'Option A', is_correct: true },
      { id: 'B', text: 'Option B', is_correct: true },
      { id: 'C', text: 'Option C', is_correct: false },
    ],
    explanation: 'Explanation 2',
    difficulty: 'medium',
  },
  {
    id: '3',
    question_text: 'Question 3',
    question_type: 'multiple_choice',
    options: [
      { id: 'A', text: 'Option A', is_correct: false },
      { id: 'B', text: 'Option B', is_correct: true },
    ],
    explanation: 'Explanation 3',
    difficulty: 'hard',
  },
];

describe('examStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useExamStore.getState().reset();
  });

  it('initializes with default values', () => {
    const state = useExamStore.getState();

    expect(state.currentSession).toBe(null);
    expect(state.currentQuestions).toEqual([]);
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.answers).toEqual({});
    expect(state.showExplanation).toBe(false);
    expect(state.isPracticeMode).toBe(true);
  });

  it('starts a practice session correctly', () => {
    const { startSession } = useExamStore.getState();

    startSession(mockQuestions, 'practice');

    const state = useExamStore.getState();

    expect(state.currentQuestions).toEqual(mockQuestions);
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.isPracticeMode).toBe(true);
    expect(state.currentSession).toBeDefined();
    expect(state.currentSession?.session_type).toBe('practice');
    expect(state.currentSession?.total_questions).toBe(3);
  });

  it('starts a timed exam session correctly', () => {
    const { startSession } = useExamStore.getState();

    startSession(mockQuestions, 'timed_exam');

    const state = useExamStore.getState();

    expect(state.isPracticeMode).toBe(false);
    expect(state.currentSession?.session_type).toBe('timed_exam');
  });

  it('navigates to next question', () => {
    const { startSession, nextQuestion } = useExamStore.getState();

    startSession(mockQuestions, 'practice');
    nextQuestion();

    const state = useExamStore.getState();
    expect(state.currentQuestionIndex).toBe(1);
    expect(state.showExplanation).toBe(false);
  });

  it('does not exceed last question when going next', () => {
    const { startSession, nextQuestion } = useExamStore.getState();

    startSession(mockQuestions, 'practice');

    // Go to last question
    nextQuestion();
    nextQuestion();

    const state1 = useExamStore.getState();
    expect(state1.currentQuestionIndex).toBe(2);

    // Try to go beyond
    nextQuestion();

    const state2 = useExamStore.getState();
    expect(state2.currentQuestionIndex).toBe(2);
  });

  it('navigates to previous question', () => {
    const { startSession, nextQuestion, previousQuestion } = useExamStore.getState();

    startSession(mockQuestions, 'practice');
    nextQuestion();
    nextQuestion();

    const state1 = useExamStore.getState();
    expect(state1.currentQuestionIndex).toBe(2);

    previousQuestion();

    const state2 = useExamStore.getState();
    expect(state2.currentQuestionIndex).toBe(1);
  });

  it('does not go below first question when going previous', () => {
    const { startSession, previousQuestion } = useExamStore.getState();

    startSession(mockQuestions, 'practice');

    previousQuestion();

    const state = useExamStore.getState();
    expect(state.currentQuestionIndex).toBe(0);
  });

  it('goes to specific question by index', () => {
    const { startSession, goToQuestion } = useExamStore.getState();

    startSession(mockQuestions, 'practice');
    goToQuestion(2);

    const state = useExamStore.getState();
    expect(state.currentQuestionIndex).toBe(2);
    expect(state.showExplanation).toBe(false);
  });

  it('submits answer and shows explanation in practice mode', () => {
    const { startSession, submitAnswer } = useExamStore.getState();

    startSession(mockQuestions, 'practice');
    submitAnswer('1', ['A']);

    const state = useExamStore.getState();
    expect(state.answers['1']).toEqual(['A']);
    expect(state.showExplanation).toBe(true);
  });

  it('submits answer but does not show explanation in exam mode', () => {
    const { startSession, submitAnswer } = useExamStore.getState();

    startSession(mockQuestions, 'timed_exam');
    submitAnswer('1', ['A']);

    const state = useExamStore.getState();
    expect(state.answers['1']).toEqual(['A']);
    expect(state.showExplanation).toBe(false);
  });

  it('toggles explanation visibility', () => {
    const { startSession, toggleExplanation } = useExamStore.getState();

    startSession(mockQuestions, 'practice');

    const state1 = useExamStore.getState();
    expect(state1.showExplanation).toBe(false);

    toggleExplanation();

    const state2 = useExamStore.getState();
    expect(state2.showExplanation).toBe(true);

    toggleExplanation();

    const state3 = useExamStore.getState();
    expect(state3.showExplanation).toBe(false);
  });

  it('ends session and calculates results correctly', () => {
    const { startSession, submitAnswer, endSession } = useExamStore.getState();

    startSession(mockQuestions, 'practice');

    // Answer Q1 correctly
    submitAnswer('1', ['A']);

    // Answer Q2 correctly
    submitAnswer('2', ['A', 'B']);

    // Answer Q3 incorrectly
    submitAnswer('3', ['A']);

    endSession();

    const state = useExamStore.getState();
    expect(state.currentSession?.correct_answers).toBe(2);
    expect(state.currentSession?.score_percentage).toBeCloseTo(66.67, 1);
    expect(state.currentSession?.ended_at).toBeDefined();
  });

  it('resets store to initial state', () => {
    const { startSession, submitAnswer, reset } = useExamStore.getState();

    startSession(mockQuestions, 'practice');
    submitAnswer('1', ['A']);

    reset();

    const state = useExamStore.getState();
    expect(state.currentSession).toBe(null);
    expect(state.currentQuestions).toEqual([]);
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.answers).toEqual({});
    expect(state.showExplanation).toBe(false);
  });

  it('preserves answers when navigating between questions', () => {
    const { startSession, submitAnswer, nextQuestion, previousQuestion } =
      useExamStore.getState();

    startSession(mockQuestions, 'practice');

    submitAnswer('1', ['A']);
    nextQuestion();
    submitAnswer('2', ['A', 'B']);
    nextQuestion();
    submitAnswer('3', ['B']);

    previousQuestion();
    previousQuestion();

    const state = useExamStore.getState();
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.answers['1']).toEqual(['A']);
    expect(state.answers['2']).toEqual(['A', 'B']);
    expect(state.answers['3']).toEqual(['B']);
  });
});

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuestions } from '@/hooks/useQuestions';
import { useSubmitAttempt } from '@/hooks/useAttempts';
import { useExamStore } from '@/stores/examStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { QuestionCard } from '@/components/exam/QuestionCard';
import { Button } from '@/components/ui/button';
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';
import { checkAnswer } from '@/lib/utils';

export default function Practice() {
  const { user } = useAuth();
  const { data: questions, isLoading } = useQuestions({ limit: 15 });
  const submitAttempt = useSubmitAttempt();

  const {
    currentQuestions,
    currentQuestionIndex,
    startSession,
    nextQuestion,
    previousQuestion,
    submitAnswer,
    showExplanation,
    toggleExplanation,
    reset,
  } = useExamStore();

  const [startTime, setStartTime] = useState<Date | null>(null);

  // Initialize session when questions load
  useEffect(() => {
    if (questions && questions.length > 0 && currentQuestions.length === 0) {
      startSession(questions, 'practice');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions?.length, currentQuestions.length]);

  const currentQuestion = currentQuestions[currentQuestionIndex];

  const handleAnswer = async (selectedOptions: string[]) => {
    if (!user || !currentQuestion) return;

    const questionStartTime = startTime || new Date();
    const timeSpent = Math.floor((new Date().getTime() - questionStartTime.getTime()) / 1000);

    const correctOptions = currentQuestion.options.filter(o => o.is_correct).map(o => o.id);
    const isCorrect = checkAnswer(selectedOptions, correctOptions);

    // Save to local state
    submitAnswer(currentQuestion.id, selectedOptions);

    // Submit to database
    try {
      await submitAttempt.mutateAsync({
        user_id: user.id,
        question_id: currentQuestion.id,
        selected_options: selectedOptions,
        is_correct: isCorrect,
        time_spent_seconds: timeSpent,
        confidence_level: 3, // Default
      });
    } catch (error) {
      // Silently fail - user can continue practicing
    }

    // Reset timer for next question
    setStartTime(new Date());
  };

  const handleNext = () => {
    nextQuestion();
    setStartTime(new Date());
  };

  const handlePrevious = () => {
    previousQuestion();
    setStartTime(new Date());
  };

  // Keyboard shortcuts
  const shortcuts = useMemo(() => [
    {
      key: 'ArrowRight',
      description: 'Next question',
      action: handleNext,
      preventDefault: true,
    },
    {
      key: 'ArrowLeft',
      description: 'Previous question',
      action: handlePrevious,
      preventDefault: true,
    },
    {
      key: 'e',
      description: 'Toggle explanation',
      action: toggleExplanation,
      preventDefault: true,
    },
    {
      key: 'r',
      description: 'Reset practice session',
      action: reset,
      preventDefault: true,
    },
  ], [handleNext, handlePrevious, toggleExplanation, reset]);

  useKeyboardShortcuts({ shortcuts });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  // Show loading if questions loaded but session not initialized yet
  if (!isLoading && questions && questions.length > 0 && currentQuestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing practice session...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">No questions available</p>
          <p className="text-sm text-muted-foreground mb-4">
            Questions loaded: {questions?.length || 0} |
            Session questions: {currentQuestions.length}
          </p>
          <Link to="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-2">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <span className="hidden sm:inline">← Back to Dashboard</span>
                <span className="sm:hidden">← Back</span>
              </Button>
            </Link>
            <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
              <span className="hidden xs:inline">Question </span>
              {currentQuestionIndex + 1}/{currentQuestions.length}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <KeyboardShortcutsHelp shortcuts={shortcuts} />
              <Button variant="outline" size="sm" onClick={reset}>
                Reset
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <QuestionCard
          question={currentQuestion}
          onAnswer={handleAnswer}
          showExplanation={showExplanation}
          questionNumber={currentQuestionIndex + 1}
        />

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {showExplanation && (
              <Button variant="outline" onClick={toggleExplanation}>
                Hide Explanation
              </Button>
            )}
            {!showExplanation && currentQuestionIndex > 0 && (
              <Button variant="outline" onClick={toggleExplanation}>
                Show Explanation
              </Button>
            )}
          </div>

          <Button
            onClick={handleNext}
            disabled={currentQuestionIndex === currentQuestions.length - 1}
          >
            Next
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mt-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.round(((currentQuestionIndex + 1) / currentQuestions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%` }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

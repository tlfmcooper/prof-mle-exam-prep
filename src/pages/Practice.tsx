import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuestions } from '@/hooks/useQuestions';
import { useSubmitAttempt } from '@/hooks/useAttempts';
import { useExamStore } from '@/stores/examStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { QuestionCard } from '@/components/exam/QuestionCard';
import { ExamChatWidget } from '@/components/exam/ExamChatWidget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';
import { checkAnswer } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function Practice() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const topicIds = searchParams.get('topics')?.split(',').filter(Boolean);
  
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [customCount, setCustomCount] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [isFinished, setIsFinished] = useState(false);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatQuestionId, setActiveChatQuestionId] = useState<string | null>(null);

  const { data: questions, isLoading, refetch } = useQuestions({ 
    limit: questionCount,
    topicIds: topicIds
  }, user?.id, true);
  const submitAttempt = useSubmitAttempt();

  // Get total questions count on mount
  useEffect(() => {
    async function fetchTotal() {
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });
      setTotalQuestions(count || 0);
    }
    fetchTotal();
  }, []);

  const presetCounts = [5, 10, 20, 50];

  const handlePresetSelect = (count: number) => {
    setQuestionCount(count);
    setCustomCount('');
  };

  const handleCustomChange = (value: string) => {
    setCustomCount(value);
    const num = parseInt(value);
    if (num >= 1 && num <= totalQuestions) {
      setQuestionCount(num);
    }
  };

  const handleStartPractice = () => {
    reset(); // Clear any previous session
    setIsConfigured(true);
    setIsFinished(false);
    refetch();
  };

  const handleReset = () => {
    reset();
    setIsConfigured(false);
    setIsFinished(false);
  };

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
    answers,
  } = useExamStore();

  const [startTime, setStartTime] = useState<Date | null>(null);

  // Initialize session when questions load and configured
  useEffect(() => {
    if (isConfigured && questions && questions.length > 0 && currentQuestions.length === 0) {
      startSession(questions, 'practice');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions?.length, currentQuestions.length, isConfigured]);

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
    if (currentQuestionIndex === currentQuestions.length - 1) {
      setIsFinished(true);
    } else {
      nextQuestion();
      setStartTime(new Date());
    }
  };

  const handlePrevious = () => {
    previousQuestion();
    setStartTime(new Date());
  };

  const handleOpenChat = (questionId: string) => {
    setActiveChatQuestionId(questionId);
    setIsChatOpen(true);
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
      action: handleReset,
      preventDefault: true,
    },
  ], [handleNext, handlePrevious, toggleExplanation, handleReset]);

  useKeyboardShortcuts({ shortcuts });

  // Show configuration screen if not configured
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configure Practice Session</h1>
            <p className="mt-2 text-muted-foreground">
              {topicIds && topicIds.length > 0 
                ? `Practicing ${topicIds.length} specific topic${topicIds.length > 1 ? 's' : ''}. ` 
                : 'Select the number of questions for your practice set. Questions will be proportionally distributed across all domains.'}
            </p>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground">Number of Questions</label>
            <div className="grid grid-cols-4 gap-2">
              {presetCounts.map((count) => (
                <button
                  key={count}
                  onClick={() => handlePresetSelect(count)}
                  className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                    questionCount === count && !customCount
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-foreground'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder={`Custom (1-${totalQuestions || 500})`}
                value={customCount}
                onChange={(e) => handleCustomChange(e.target.value)}
                min={1}
                max={totalQuestions || 500}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                or enter a custom number
              </span>
            </div>

            {totalQuestions > 0 && (
              <p className="text-xs text-muted-foreground">
                Total questions available: {totalQuestions}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Link to="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button onClick={handleStartPractice} className="flex-1">
              Start Practice
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

  const activeChatQuestion = activeChatQuestionId 
    ? currentQuestions.find(q => q.id === activeChatQuestionId) 
    : null;
  
  const activeUserAnswer = activeChatQuestionId
    ? answers[activeChatQuestionId]
    : undefined;

  const activeCorrectAnswer = activeChatQuestion
    ? activeChatQuestion.options.filter(o => o.is_correct).map(o => o.text)
    : undefined;

  // Summary View
  if (isFinished) {
    const totalCorrect = currentQuestions.filter(q => {
      const selected = answers[q.id] || [];
      const correct = q.options.filter(o => o.is_correct).map(o => o.id);
      return checkAnswer(selected, correct);
    }).length;

    return (
      <div className="min-h-screen bg-background p-4">
        <ExamChatWidget
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          activeQuestion={activeChatQuestion}
          userAnswer={activeUserAnswer}
          correctAnswer={activeCorrectAnswer}
        />

        <div className="max-w-4xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">Practice Session Complete</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-3xl font-bold">
                    {Math.round((totalCorrect / currentQuestions.length) * 100)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Score</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{totalCorrect}/{currentQuestions.length}</p>
                  <p className="text-sm text-muted-foreground">Correct Answers</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Link to="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Back to Dashboard
                  </Button>
                </Link>
                <Button onClick={handleStartPractice} className="flex-1">
                  Start New Session
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-8">
            {currentQuestions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                question={q}
                onAnswer={() => Promise.resolve()}
                showExplanation={true}
                previousAttempt={{
                  id: '',
                  user_id: user?.id || '',
                  question_id: q.id,
                  selected_options: answers[q.id] || [],
                  is_correct: false, // Not used for display logic here
                  time_spent_seconds: 0,
                  confidence_level: 3,
                  attempted_at: new Date().toISOString(),
                }}
                questionNumber={idx + 1}
                onAskAI={() => handleOpenChat(q.id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ExamChatWidget
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        activeQuestion={activeChatQuestion}
        userAnswer={activeUserAnswer}
        correctAnswer={activeCorrectAnswer}
      />

      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
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
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <QuestionCard
          key={currentQuestion.id} // Force re-mount to reset internal state
          question={currentQuestion}
          onAnswer={handleAnswer}
          showExplanation={showExplanation}
          questionNumber={currentQuestionIndex + 1}
          onAskAI={showExplanation ? () => handleOpenChat(currentQuestion.id) : undefined}
        />

        {/* Navigation */}
        <div className="mt-2 flex items-center justify-between">
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
          >
            {currentQuestionIndex === currentQuestions.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mt-2">
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

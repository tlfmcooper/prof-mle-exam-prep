import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useExamQuestions } from '@/hooks/useQuestions';
import { useSubmitAttempt } from '@/hooks/useAttempts';
import { useCreateSession, useUpdateSession, useLinkAttemptToSession } from '@/hooks/useStudySession';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { QuestionCard } from '@/components/exam/QuestionCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';
import { ExamChatWidget } from '@/components/exam/ExamChatWidget';
import { checkAnswer } from '@/lib/utils';

const EXAM_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export default function ExamSim() {
  const { user } = useAuth();
  // Randomly select between 50 and 60 questions
  const [targetQuestionCount] = useState(() => Math.floor(Math.random() * 11) + 50);
  const { data: questions, isLoading } = useExamQuestions(targetQuestionCount);
  const submitAttempt = useSubmitAttempt();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const linkAttempt = useLinkAttemptToSession();

  // Exam state
  const [hasStarted, setHasStarted] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(EXAM_DURATION_MS);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attemptIds, setAttemptIds] = useState<Record<string, string>>({});
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, Date>>({});

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatQuestionId, setActiveChatQuestionId] = useState<string | null>(null);

  const handleOpenChat = (questionId: string) => {
    setActiveChatQuestionId(questionId);
    setIsChatOpen(true);
  };

  const currentQuestion = questions?.[currentQuestionIndex];
  const totalQuestions = questions?.length || 0;

  // Timer countdown
  useEffect(() => {
    if (!hasStarted || hasEnded || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime.getTime();
      const remaining = Math.max(0, EXAM_DURATION_MS - elapsed);

      setTimeRemaining(remaining);

      if (remaining === 0) {
        handleEndExam();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, hasEnded, startTime]);

  // Format time for display
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate results
  const results = useMemo(() => {
    if (!questions || !hasEnded) return null;

    const scored = questions.map((q) => {
      const selectedOptions = answers[q.id] || [];
      const correctOptions = q.options.filter((o) => o.is_correct).map((o) => o.id);
      const isCorrect = checkAnswer(selectedOptions, correctOptions);

      return {
        question: q,
        selectedOptions,
        correctOptions,
        isCorrect,
      };
    });

    const totalAnswered = Object.keys(answers).length;
    const totalCorrect = scored.filter((s) => s.isCorrect).length;
    const score = (totalCorrect / questions.length) * 100;

    return {
      scored,
      totalAnswered,
      totalCorrect,
      totalQuestions: questions.length,
      score,
    };
  }, [questions, answers, hasEnded]);

  const handleStartExam = async () => {
    if (!user || !questions) return;

    const now = new Date();
    setStartTime(now);
    setHasStarted(true);

    // Create session
    try {
      const session = await createSession.mutateAsync({
        user_id: user.id,
        session_type: 'timed_exam',
        total_questions: questions.length,
        correct_answers: 0,
        score_percentage: 0,
      });

      setSessionId(session.id);

      // Track start time for first question
      if (questions[0]) {
        setQuestionStartTimes({ [questions[0].id]: now });
      }
    } catch (error) {
      // Continue even if session creation fails
    }
  };

  const handleAnswer = async (questionId: string, selectedOptions: string[]) => {
    if (!user || !currentQuestion) return;

    const questionStartTime = questionStartTimes[questionId] || new Date();
    const timeSpent = Math.floor((new Date().getTime() - questionStartTime.getTime()) / 1000);

    const correctOptions = currentQuestion.options.filter((o) => o.is_correct).map((o) => o.id);
    const isCorrect = checkAnswer(selectedOptions, correctOptions);

    // Save answer locally
    setAnswers((prev) => ({
      ...prev,
      [questionId]: selectedOptions,
    }));

    // Submit to database
    try {
      const attempt = await submitAttempt.mutateAsync({
        user_id: user.id,
        question_id: questionId,
        selected_options: selectedOptions,
        is_correct: isCorrect,
        time_spent_seconds: timeSpent,
        confidence_level: 3,
      });

      // Link to session
      if (sessionId && attempt.id) {
        setAttemptIds((prev) => ({ ...prev, [questionId]: attempt.id }));
        await linkAttempt.mutateAsync({
          sessionId,
          attemptId: attempt.id,
          sequenceNumber: currentQuestionIndex + 1,
        });
      }
    } catch (error) {
      // Continue even if submission fails
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);

      // Track start time for next question
      if (questions && questions[nextIndex]) {
        setQuestionStartTimes((prev) => ({
          ...prev,
          [questions[nextIndex].id]: new Date(),
        }));
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleGoToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  // Keyboard shortcuts (only active during exam)
  const shortcuts = useMemo(() => {
    if (!hasStarted || hasEnded) return [];

    return [
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
    ];
  }, [hasStarted, hasEnded, currentQuestionIndex, totalQuestions]);

  useKeyboardShortcuts({ enabled: hasStarted && !hasEnded, shortcuts });

  const handleEndExam = async () => {
    if (!user || !questions || !sessionId) {
      setHasEnded(true);
      return;
    }

    // Calculate final results
    const totalCorrect = Object.entries(answers).filter(([questionId, selected]) => {
      const question = questions.find((q) => q.id === questionId);
      if (!question) return false;
      const correctOptions = question.options.filter((o) => o.is_correct).map((o) => o.id);
      return checkAnswer(selected, correctOptions);
    }).length;

    const score = (totalCorrect / questions.length) * 100;

    // Update session
    try {
      await updateSession.mutateAsync({
        sessionId,
        updates: {
          ended_at: new Date().toISOString(),
          correct_answers: totalCorrect,
          score_percentage: score,
        },
      });
    } catch (error) {
      // Continue even if update fails
    }

    setHasEnded(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Preparing your exam...</p>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Not enough questions available for exam simulation.
            </p>
            <Link to="/dashboard">
              <Button className="w-full mt-4">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Start screen
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Exam Simulation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-accent/50 border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Exam Instructions:</h3>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>You have <strong>2 hours</strong> to complete {totalQuestions} questions</li>
                <li>Once started, the timer cannot be paused</li>
                <li>You can navigate between questions freely</li>
                <li>No explanations will be shown during the exam</li>
                <li>Your answers are automatically saved</li>
                <li>Results will be shown after submission</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Link to="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button onClick={handleStartExam} className="flex-1">
                Start Exam
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }



  // Results screen
  if (hasEnded && results) {
    const passScore = 70;
    const passed = results.score >= passScore;

    const activeChatQuestion = activeChatQuestionId 
      ? questions.find(q => q.id === activeChatQuestionId) 
      : null;
    
    const activeUserAnswer = activeChatQuestionId
      ? answers[activeChatQuestionId]
      : undefined;

    const activeCorrectAnswer = activeChatQuestion
      ? activeChatQuestion.options.filter(o => o.is_correct).map(o => o.text)
      : undefined;

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
              <CardTitle className="text-2xl">Exam Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{results.score.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{results.totalCorrect}</div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{results.totalAnswered}</div>
                  <div className="text-sm text-muted-foreground">Answered</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                    {passed ? 'PASS' : 'FAIL'}
                  </div>
                  <div className="text-sm text-muted-foreground">Status</div>
                </div>
              </div>

              <div className="flex gap-4">
                <Link to="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Back to Dashboard
                  </Button>
                </Link>
                <Button
                  onClick={() => {
                    setHasEnded(false);
                    setCurrentQuestionIndex(0);
                  }}
                  className="flex-1"
                >
                  Review Answers
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Question Review */}
          <div className="space-y-4">
            {results.scored.map((item, index) => (
              <QuestionCard
                key={item.question.id}
                question={item.question}
                onAnswer={() => Promise.resolve()}
                showExplanation={true}
                previousAttempt={{
                  id: attemptIds[item.question.id] || '',
                  user_id: user?.id || '',
                  question_id: item.question.id,
                  selected_options: item.selectedOptions,
                  is_correct: item.isCorrect,
                  time_spent_seconds: 0,
                  confidence_level: 3,
                  attempted_at: new Date().toISOString(),
                }}
                questionNumber={index + 1}
                onAskAI={() => handleOpenChat(item.question.id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Exam in progress
  return (
    <div className="min-h-screen bg-background">
      {/* Header with timer */}
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                Q {currentQuestionIndex + 1}/{totalQuestions}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap hidden xs:inline">
                {Object.keys(answers).length} done
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <KeyboardShortcutsHelp shortcuts={shortcuts} />
              <div className={`font-mono text-sm sm:text-lg font-bold ${timeRemaining < 600000 ? 'text-red-600' : ''}`}>
                {formatTime(timeRemaining)}
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEndExam}
              >
                End
              </Button>
            </div>
          </div>

          {/* Question navigator */}
          <div className="mt-4 flex flex-wrap gap-2">
            {questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => handleGoToQuestion(index)}
                className={`w-8 h-8 rounded text-sm font-medium transition-all ${
                  index === currentQuestionIndex
                    ? 'bg-primary text-primary-foreground'
                    : answers[q.id]
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            onAnswer={(selected) => handleAnswer(currentQuestion.id, selected)}
            showExplanation={false}
            previousAttempt={
              answers[currentQuestion.id]
                ? {
                    id: '',
                    user_id: user?.id || '',
                    question_id: currentQuestion.id,
                    selected_options: answers[currentQuestion.id],
                    is_correct: false,
                    time_spent_seconds: 0,
                    confidence_level: 3,
                    attempted_at: new Date().toISOString(),
                  }
                : undefined
            }
            questionNumber={currentQuestionIndex + 1}
          />
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>

          <Button
            onClick={handleNext}
            disabled={currentQuestionIndex === totalQuestions - 1}
          >
            Next
          </Button>
        </div>
      </main>
    </div>
  );
}

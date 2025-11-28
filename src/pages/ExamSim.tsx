import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useExamQuestions } from '@/hooks/useQuestions';
import { useSubmitAttempt } from '@/hooks/useAttempts';
import { useCreateSession, useUpdateSession, useLinkAttemptToSession, useStudySessions, useStudySession, useDeleteSession } from '@/hooks/useStudySession';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { QuestionCard } from '@/components/exam/QuestionCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';
import { Flag, Filter, History, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
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
  const deleteSession = useDeleteSession();

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

  // New features state
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong'>('all');
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);

  const { data: pastSessions } = useStudySessions(user?.id);
  const { data: viewingSession, isLoading: isLoadingSession, error: sessionError } = useStudySession(viewingSessionId || '');

  const handleOpenChat = (questionId: string) => {
    setActiveChatQuestionId(questionId);
    setIsChatOpen(true);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    console.log('Delete clicked for session:', sessionId);
    
    if (!confirm('Are you sure you want to delete this exam session?')) {
      console.log('Delete cancelled by user');
      return;
    }
    
    console.log('Starting deletion...');
    try {
      const result = await deleteSession.mutateAsync(sessionId);
      console.log('Delete successful:', result);
      alert('Session deleted successfully!');
    } catch (error) {
      console.error('Delete failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert(`Failed to delete session: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
  };

  const handleFlagQuestion = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
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

  // Derived state for viewing past session
  const displayData = useMemo(() => {
    if (viewingSessionId && viewingSession) {
      const sessionQuestions = viewingSession.attempts?.map((a: any) => ({
        ...a.question,
        options: Array.isArray(a.question.options) ? a.question.options : JSON.parse(a.question.options || '[]'),
        topics: a.question.topics || [] // Assuming topics are joined or we need to fetch them. For now let's hope they are there or we handle missing topics.
        // Note: useStudySession joins question but might not join topics deeply. 
        // Let's check useStudySession query. It selects question:questions (*). 
        // Questions table has topics? No, many-to-many. 
        // For now, let's assume basic question data is enough for review.
      })) || [];

      const sessionAnswers = viewingSession.attempts?.reduce((acc: any, a: any) => ({
        ...acc,
        [a.question_id]: a.selected_options
      }), {}) || {};

      const scored = sessionQuestions.map((q: any) => {
        const selectedOptions = sessionAnswers[q.id] || [];
        const correctOptions = q.options.filter((o: any) => o.is_correct).map((o: any) => o.id);
        const isCorrect = checkAnswer(selectedOptions, correctOptions);
        return {
          question: q,
          selectedOptions,
          correctOptions,
          isCorrect,
        };
      });

      return {
        questions: sessionQuestions,
        answers: sessionAnswers,
        results: {
          scored,
          totalAnswered: Object.keys(sessionAnswers).length,
          totalCorrect: viewingSession.correct_answers,
          totalQuestions: viewingSession.total_questions,
          score: viewingSession.score_percentage,
        },
        isReview: true
      };
    }

    return {
      questions,
      answers,
      results,
      isReview: false
    };
  }, [questions, answers, results, viewingSessionId, viewingSession]);

  const activeQuestions = displayData.questions;
  const activeResults = displayData.results;

  const handleStartExam = async () => {
    if (!user || !questions) return;

    const now = new Date();
    setStartTime(now);
    setHasStarted(true);
    setFlaggedQuestions(new Set());
    setViewingSessionId(null);

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
  if (!hasStarted && !viewingSessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-4xl w-full space-y-6">
          <Card>
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

          {/* Past Exams History */}
          {pastSessions && pastSessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Past Exams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pastSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {format(new Date(session.started_at), 'PPP p')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Score: {session.score_percentage?.toFixed(1)}% ({session.correct_answers}/{session.total_questions})
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setViewingSessionId(session.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Results
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteSession(e, session.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }



  // Results screen
  // Results screen (or viewing past session)
  if ((hasEnded && activeResults) || viewingSessionId) {
    if (viewingSessionId && isLoadingSession) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (viewingSessionId && sessionError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-destructive mb-4">Failed to load session results.</p>
              <Button onClick={() => setViewingSessionId(null)}>Back to Exam</Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    const resultsToDisplay = activeResults || results;
    if (!resultsToDisplay) return null;

    const passScore = 70;
    const passed = resultsToDisplay.score >= passScore;

    const activeChatQuestion = activeChatQuestionId 
      ? activeQuestions?.find((q: any) => q.id === activeChatQuestionId) 
      : null;
    
    const activeUserAnswer = activeChatQuestionId
      ? displayData.answers[activeChatQuestionId]
      : undefined;

    const activeCorrectAnswer = activeChatQuestion
      ? activeChatQuestion.options.filter((o: any) => o.is_correct).map((o: any) => o.text)
      : undefined;

    // Apply filter only when viewing results (not during review mode)
    const filteredScored = (hasEnded || viewingSessionId) 
      ? resultsToDisplay.scored.filter((item: any) => {
          if (filter === 'correct') return item.isCorrect;
          if (filter === 'wrong') return !item.isCorrect;
          return true;
        })
      : resultsToDisplay.scored;

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
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">
                  {viewingSessionId ? 'Past Exam Results' : 'Exam Results'}
                </CardTitle>
                {viewingSessionId && (
                  <Button variant="ghost" onClick={() => setViewingSessionId(null)}>
                    Close
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{resultsToDisplay.score.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{resultsToDisplay.totalCorrect}</div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{resultsToDisplay.totalAnswered}</div>
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
                {!viewingSessionId && (
                  <Link to="/dashboard" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Back to Dashboard
                    </Button>
                  </Link>
                )}
                {!viewingSessionId && (
                  <Button
                    onClick={() => {
                      setHasEnded(false);
                      setCurrentQuestionIndex(0);
                      setFlaggedQuestions(new Set());
                    }}
                    className="flex-1"
                  >
                    Review Answers
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              All Questions
            </Button>
            <Button 
              variant={filter === 'correct' ? 'default' : 'outline'}
              onClick={() => setFilter('correct')}
              size="sm"
              className="text-green-600"
            >
              Correct Only
            </Button>
            <Button 
              variant={filter === 'wrong' ? 'default' : 'outline'}
              onClick={() => setFilter('wrong')}
              size="sm"
              className="text-red-600"
            >
              Incorrect Only
            </Button>
          </div>

          {/* Question Review */}
          <div className="space-y-4">
            {filteredScored.map((item: any, index: number) => (
              <QuestionCard
                key={`${item.question.id}-${index}`}
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
            {filteredScored.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No questions match the selected filter.
              </div>
            )}
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
                {Object.keys(answers).length} answered
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                variant={flaggedQuestions.has(currentQuestion?.id || '') ? "default" : "outline"}
                size="sm"
                onClick={() => currentQuestion && handleFlagQuestion(currentQuestion.id)}
                className={flaggedQuestions.has(currentQuestion?.id || '') ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
              >
                <Flag className="h-4 w-4 mr-1" />
                {flaggedQuestions.has(currentQuestion?.id || '') ? 'Flagged' : 'Flag'}
              </Button>
              
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
            {questions.map((q, index) => {
              const isFlagged = flaggedQuestions.has(q.id);
              const isAnswered = !!answers[q.id];
              const isCurrent = index === currentQuestionIndex;

              let className = "w-8 h-8 rounded text-sm font-medium transition-all relative ";
              
              if (isCurrent) {
                className += "bg-primary text-primary-foreground";
              } else if (isFlagged) {
                className += "bg-yellow-100 text-yellow-800 border-2 border-yellow-400";
              } else if (isAnswered) {
                className += "bg-green-100 text-green-800 hover:bg-green-200";
              } else {
                className += "bg-gray-100 text-gray-600 hover:bg-gray-200";
              }

              return (
                <button
                  key={q.id}
                  onClick={() => handleGoToQuestion(index)}
                  className={className}
                >
                  {index + 1}
                  {isFlagged && !isCurrent && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" />
                  )}
                </button>
              );
            })}
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
            autoSave={true}
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

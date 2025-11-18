import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserAnalytics, useExamPrediction } from '@/hooks/useAnalytics';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';
import { ReadinessGauge } from '@/components/analytics/ReadinessGauge';
import { WeakAreasAlert } from '@/components/analytics/WeakAreasAlert';
import { PerformanceChart } from '@/components/analytics/PerformanceChart';
import { AccuracyBySection } from '@/components/analytics/AccuracyBySection';
import { TimeDistributionChart } from '@/components/analytics/TimeDistributionChart';
import { StudyHeatmap } from '@/components/analytics/StudyHeatmap';
import { StudyPlanGenerator } from '@/components/analytics/StudyPlanGenerator';
import { TrendingUp, BarChart3, PieChart, Calendar, Award } from 'lucide-react';

export default function Analytics() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: analytics, isLoading } = useUserAnalytics(user?.id);
  const { data: prediction } = useExamPrediction(user?.id);

  // Keyboard shortcuts
  const shortcuts = useMemo(() => [
    {
      key: 'd',
      description: 'Go to Dashboard',
      action: () => navigate('/dashboard'),
      preventDefault: true,
    },
    {
      key: 'p',
      description: 'Go to Practice Mode',
      action: () => navigate('/practice'),
      preventDefault: true,
    },
  ], [navigate]);

  useKeyboardShortcuts({ shortcuts });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics || analytics.overall.total_questions_attempted === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Analytics</h1>
              <div className="flex items-center gap-4">
                <Link to="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <Button variant="outline" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-bold mb-2">No Analytics Data Yet</h2>
              <p className="text-muted-foreground mb-6">
                Start practicing to see your performance analytics and personalized insights.
              </p>
              <Link to="/practice">
                <Button size="lg">Start Practicing</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Performance Analytics</h1>
            <div className="flex items-center gap-1 sm:gap-2">
              <KeyboardShortcutsHelp shortcuts={shortcuts} />
              <Link to="/dashboard" className="hidden sm:inline-block">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Link to="/practice" className="hidden sm:inline-block">
                <Button variant="outline" size="sm">Practice</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Readiness Score */}
        <ReadinessGauge
          score={analytics.readiness_score}
          predictedScore={prediction?.predicted_score}
        />

        {/* Weak Areas Alert */}
        {analytics.by_topic.length > 0 && (
          <WeakAreasAlert topics={analytics.by_topic} threshold={75} minAttempts={3} />
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Questions Attempted
              </CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics.overall.total_questions_attempted}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.overall.questions_remaining} remaining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overall Accuracy
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics.overall.overall_accuracy.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.overall.total_correct} / {analytics.overall.total_questions_attempted +
                  analytics.overall.questions_remaining} correct
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Study Time
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics.overall.total_study_hours.toFixed(1)}h
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ~{analytics.overall.average_time_per_question.toFixed(0)}s per question
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Predicted Score
              </CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {prediction?.predicted_score || '--'}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {prediction && (
                  <>
                    Range: {prediction.confidence_interval[0].toFixed(0)}-
                    {prediction.confidence_interval[1].toFixed(0)}%
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Trends (Last 30 Days)
            </CardTitle>
            <CardDescription>
              Track your progress with daily questions attempted and accuracy percentage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceChart data={analytics.trends} />
          </CardContent>
        </Card>

        {/* Accuracy by Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Accuracy by Exam Section
            </CardTitle>
            <CardDescription>
              Compare your performance across all exam topics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccuracyBySection topics={analytics.by_topic} />
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Time Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Time Distribution by Topic
              </CardTitle>
              <CardDescription>
                See where you've spent the most study time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimeDistributionChart
                topics={analytics.by_topic}
                totalTime={analytics.overall.total_study_hours}
              />
            </CardContent>
          </Card>

          {/* Difficulty Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Difficulty</CardTitle>
              <CardDescription>
                How you perform on easy, medium, and hard questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.by_difficulty.map((diff) => (
                  <div key={diff.difficulty} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{diff.difficulty}</span>
                      <span className="text-sm text-muted-foreground">
                        {diff.accuracy.toFixed(1)}% ({diff.correct}/{diff.attempted})
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          diff.difficulty === 'easy'
                            ? 'bg-green-500'
                            : diff.difficulty === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${diff.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Study Calendar Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Study Calendar
            </CardTitle>
            <CardDescription>
              Your study activity over the last 90 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StudyHeatmap data={analytics.calendar} days={90} />
          </CardContent>
        </Card>

        {/* Study Plan Generator */}
        <StudyPlanGenerator
          topics={analytics.by_topic}
          currentAccuracy={analytics.overall.overall_accuracy}
          userId={user?.id}
        />

        {/* Exam Prediction Details */}
        {prediction && (
          <Card>
            <CardHeader>
              <CardTitle>Exam Score Prediction</CardTitle>
              <CardDescription>
                Based on your current performance across all topics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Predicted Score:</span>
                  <span className="text-2xl font-bold">{prediction.predicted_score}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Confidence Range:</span>
                  <span className="text-sm">
                    {prediction.confidence_interval[0].toFixed(0)}% -{' '}
                    {prediction.confidence_interval[1].toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pass Likelihood:</span>
                  <span className="text-sm font-semibold">
                    {prediction.likelihood_of_passing.toFixed(0)}%
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    This prediction is based on your weighted accuracy across all exam sections.
                    Continue practicing weak areas to improve your score.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

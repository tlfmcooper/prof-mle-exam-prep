# Analytics Dashboard Skill

## Overview
Comprehensive patterns for building progress tracking, performance analytics, study plan algorithms, and weak area identification for exam preparation applications.

## Dashboard Objectives

1. **Progress Tracking**: Visualize study progress over time
2. **Performance Analysis**: Identify strengths and weaknesses by topic
3. **Study Plan Generation**: Create personalized study schedules
4. **Weak Area Detection**: Automatically identify areas needing more practice
5. **Exam Readiness**: Predict readiness based on performance metrics

## Key Metrics

### Performance Metrics

```typescript
// types/analytics.ts
export interface UserPerformanceMetrics {
  overall: OverallMetrics;
  by_topic: TopicMetrics[];
  by_difficulty: DifficultyMetrics[];
  trends: TrendData[];
  readiness_score: number; // 0-100
}

export interface OverallMetrics {
  total_questions_attempted: number;
  total_correct: number;
  overall_accuracy: number; // percentage
  average_time_per_question: number; // seconds
  study_streak_days: number;
  total_study_hours: number;
  questions_remaining: number;
}

export interface TopicMetrics {
  topic_id: string;
  topic_name: string;
  exam_weight: number; // percentage of exam
  questions_attempted: number;
  questions_correct: number;
  accuracy: number;
  mastery_level: MasteryLevel;
  avg_confidence: number; // 1-5
  recommended_practice_count: number;
  last_practiced: string | null;
}

export type MasteryLevel = 'novice' | 'learning' | 'proficient' | 'mastered';

export interface DifficultyMetrics {
  difficulty: 'easy' | 'medium' | 'hard';
  attempted: number;
  correct: number;
  accuracy: number;
}

export interface TrendData {
  date: string;
  questions_attempted: number;
  accuracy: number;
  study_time_minutes: number;
}
```

## Data Queries

### Supabase Queries for Analytics

```typescript
// hooks/useAnalytics.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { UserPerformanceMetrics } from '@/types/analytics';

export function useUserAnalytics(userId: string) {
  return useQuery({
    queryKey: ['analytics', userId],
    queryFn: async () => {
      // Overall metrics
      const { data: attempts } = await supabase
        .from('user_attempts')
        .select('*, question:questions(*)')
        .eq('user_id', userId);

      if (!attempts) return null;

      const overallMetrics = calculateOverallMetrics(attempts);
      const topicMetrics = await calculateTopicMetrics(userId);
      const difficultyMetrics = calculateDifficultyMetrics(attempts);
      const trends = await calculateTrends(userId, 30); // Last 30 days
      const readinessScore = calculateReadinessScore(topicMetrics, overallMetrics);

      return {
        overall: overallMetrics,
        by_topic: topicMetrics,
        by_difficulty: difficultyMetrics,
        trends,
        readiness_score: readinessScore,
      } as UserPerformanceMetrics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

function calculateOverallMetrics(attempts: any[]): OverallMetrics {
  const total = attempts.length;
  const correct = attempts.filter((a) => a.is_correct).length;
  const totalTime = attempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);

  return {
    total_questions_attempted: total,
    total_correct: correct,
    overall_accuracy: total > 0 ? (correct / total) * 100 : 0,
    average_time_per_question: total > 0 ? totalTime / total : 0,
    study_streak_days: 0, // Calculate separately
    total_study_hours: totalTime / 3600,
    questions_remaining: 0, // Calculate from total questions in bank
  };
}

async function calculateTopicMetrics(userId: string): Promise<TopicMetrics[]> {
  const { data } = await supabase.rpc('calculate_topic_performance', {
    p_user_id: userId,
  });

  return (data || []).map((row: any) => ({
    topic_id: row.topic_id,
    topic_name: row.topic_name,
    exam_weight: row.exam_weight,
    questions_attempted: row.attempted_count,
    questions_correct: row.correct_count,
    accuracy: row.accuracy,
    mastery_level: determineMasteryLevel(row.accuracy, row.attempted_count),
    avg_confidence: row.avg_confidence,
    recommended_practice_count: calculateRecommendedPractice(
      row.accuracy,
      row.attempted_count,
      row.exam_weight
    ),
    last_practiced: row.last_attempted,
  }));
}

function determineMasteryLevel(accuracy: number, attemptCount: number): MasteryLevel {
  if (attemptCount < 3) return 'novice';
  if (accuracy >= 90 && attemptCount >= 10) return 'mastered';
  if (accuracy >= 75 && attemptCount >= 5) return 'proficient';
  return 'learning';
}

function calculateRecommendedPractice(
  accuracy: number,
  attemptCount: number,
  examWeight: number
): number {
  // More practice for:
  // - Lower accuracy
  // - Higher exam weight
  // - Fewer attempts
  const accuracyFactor = Math.max(0, (100 - accuracy) / 10);
  const weightFactor = examWeight * 20;
  const attemptFactor = Math.max(0, 10 - attemptCount);

  return Math.ceil(accuracyFactor + weightFactor + attemptFactor);
}

function calculateReadinessScore(
  topicMetrics: TopicMetrics[],
  overall: OverallMetrics
): number {
  // Weighted score based on:
  // 1. Topic mastery (weighted by exam importance)
  // 2. Overall accuracy
  // 3. Coverage (questions attempted vs total)

  const topicScore = topicMetrics.reduce((score, topic) => {
    const masteryPoints = {
      novice: 0,
      learning: 50,
      proficient: 75,
      mastered: 100,
    }[topic.mastery_level];

    return score + masteryPoints * (topic.exam_weight || 0.1);
  }, 0);

  const accuracyScore = overall.overall_accuracy;
  const coverageScore = Math.min(100, (overall.total_questions_attempted / 100) * 100);

  return Math.round(topicScore * 0.5 + accuracyScore * 0.3 + coverageScore * 0.2);
}
```

### Supabase SQL Functions

```sql
-- Function to calculate topic performance
CREATE OR REPLACE FUNCTION calculate_topic_performance(p_user_id UUID)
RETURNS TABLE (
  topic_id UUID,
  topic_name TEXT,
  exam_weight DECIMAL,
  attempted_count BIGINT,
  correct_count BIGINT,
  accuracy DECIMAL,
  avg_confidence DECIMAL,
  last_attempted TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS topic_id,
    t.name AS topic_name,
    t.exam_weight,
    COUNT(ua.id) AS attempted_count,
    COUNT(*) FILTER (WHERE ua.is_correct = true) AS correct_count,
    ROUND(
      (COUNT(*) FILTER (WHERE ua.is_correct = true)::DECIMAL / NULLIF(COUNT(ua.id), 0) * 100),
      2
    ) AS accuracy,
    ROUND(AVG(ua.confidence_level), 2) AS avg_confidence,
    MAX(ua.attempted_at) AS last_attempted
  FROM topics t
  LEFT JOIN question_topics qt ON qt.topic_id = t.id
  LEFT JOIN user_attempts ua ON ua.question_id = qt.question_id AND ua.user_id = p_user_id
  GROUP BY t.id, t.name, t.exam_weight
  ORDER BY t.exam_weight DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate daily trends
CREATE OR REPLACE FUNCTION calculate_daily_trends(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  questions_attempted BIGINT,
  accuracy DECIMAL,
  study_time_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(ua.attempted_at) AS date,
    COUNT(ua.id) AS questions_attempted,
    ROUND(
      (COUNT(*) FILTER (WHERE ua.is_correct = true)::DECIMAL / NULLIF(COUNT(ua.id), 0) * 100),
      2
    ) AS accuracy,
    ROUND(SUM(ua.time_spent_seconds) / 60.0)::INTEGER AS study_time_minutes
  FROM user_attempts ua
  WHERE ua.user_id = p_user_id
    AND ua.attempted_at >= CURRENT_DATE - p_days
  GROUP BY DATE(ua.attempted_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get weak topics
CREATE OR REPLACE FUNCTION get_weak_topics(
  p_user_id UUID,
  p_accuracy_threshold DECIMAL DEFAULT 70.0,
  p_min_attempts INTEGER DEFAULT 3
)
RETURNS TABLE (
  topic_id UUID,
  topic_name TEXT,
  accuracy DECIMAL,
  attempted_count BIGINT,
  exam_weight DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH topic_stats AS (
    SELECT * FROM calculate_topic_performance(p_user_id)
  )
  SELECT
    ts.topic_id,
    ts.topic_name,
    ts.accuracy,
    ts.attempted_count,
    ts.exam_weight
  FROM topic_stats ts
  WHERE ts.attempted_count >= p_min_attempts
    AND ts.accuracy < p_accuracy_threshold
  ORDER BY ts.exam_weight DESC, ts.accuracy ASC;
END;
$$ LANGUAGE plpgsql;
```

## Visualization Components

### Performance Dashboard

```typescript
// components/analytics/PerformanceDashboard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserAnalytics } from '@/hooks/useAnalytics';
import { OverallStatsCard } from './OverallStatsCard';
import { TopicBreakdown } from './TopicBreakdown';
import { ProgressChart } from './ProgressChart';
import { WeakAreasAlert } from './WeakAreasAlert';
import { ReadinessGauge } from './ReadinessGauge';

interface PerformanceDashboardProps {
  userId: string;
}

export function PerformanceDashboard({ userId }: PerformanceDashboardProps) {
  const { data: analytics, isLoading } = useUserAnalytics(userId);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!analytics) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Readiness Score */}
      <ReadinessGauge score={analytics.readiness_score} />

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <OverallStatsCard
          title="Questions Attempted"
          value={analytics.overall.total_questions_attempted}
          icon="📝"
        />
        <OverallStatsCard
          title="Overall Accuracy"
          value={`${analytics.overall.overall_accuracy.toFixed(1)}%`}
          icon="🎯"
        />
        <OverallStatsCard
          title="Study Hours"
          value={analytics.overall.total_study_hours.toFixed(1)}
          icon="⏱️"
        />
        <OverallStatsCard
          title="Study Streak"
          value={`${analytics.overall.study_streak_days} days`}
          icon="🔥"
        />
      </div>

      {/* Weak Areas Alert */}
      <WeakAreasAlert topics={analytics.by_topic} />

      {/* Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Study Progress (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressChart data={analytics.trends} />
        </CardContent>
      </Card>

      {/* Topic Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Topic</CardTitle>
        </CardHeader>
        <CardContent>
          <TopicBreakdown topics={analytics.by_topic} />
        </CardContent>
      </Card>

      {/* Difficulty Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Difficulty</CardTitle>
        </CardHeader>
        <CardContent>
          <DifficultyChart difficulties={analytics.by_difficulty} />
        </CardContent>
      </Card>
    </div>
  );
}
```

### Charts with Recharts

```typescript
// components/analytics/ProgressChart.tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendData } from '@/types/analytics';

interface ProgressChartProps {
  data: TrendData[];
}

export function ProgressChart({ data }: ProgressChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(date) => new Date(date).toLocaleDateString()}
        />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip
          labelFormatter={(date) => new Date(date).toLocaleDateString()}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="questions_attempted"
          stroke="#8884d8"
          name="Questions Attempted"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="accuracy"
          stroke="#82ca9d"
          name="Accuracy %"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Topic Breakdown with Progress Bars

```typescript
// components/analytics/TopicBreakdown.tsx
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TopicMetrics, MasteryLevel } from '@/types/analytics';

const masteryColors: Record<MasteryLevel, string> = {
  novice: 'bg-red-500',
  learning: 'bg-yellow-500',
  proficient: 'bg-blue-500',
  mastered: 'bg-green-500',
};

interface TopicBreakdownProps {
  topics: TopicMetrics[];
}

export function TopicBreakdown({ topics }: TopicBreakdownProps) {
  // Sort by exam weight
  const sortedTopics = [...topics].sort((a, b) =>
    (b.exam_weight || 0) - (a.exam_weight || 0)
  );

  return (
    <div className="space-y-4">
      {sortedTopics.map((topic) => (
        <div key={topic.topic_id} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{topic.topic_name}</span>
              <Badge
                variant="outline"
                className={masteryColors[topic.mastery_level]}
              >
                {topic.mastery_level}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({(topic.exam_weight * 100).toFixed(0)}% of exam)
              </span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">{topic.accuracy.toFixed(1)}%</span>
              <span className="text-muted-foreground">
                {' '}({topic.questions_correct}/{topic.questions_attempted})
              </span>
            </div>
          </div>
          <Progress value={topic.accuracy} className="h-2" />
          {topic.recommended_practice_count > 0 && (
            <p className="text-sm text-muted-foreground">
              Recommended: {topic.recommended_practice_count} more questions
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Readiness Gauge

```typescript
// components/analytics/ReadinessGauge.tsx
import { Card, CardContent } from '@/components/ui/card';

interface ReadinessGaugeProps {
  score: number; // 0-100
}

export function ReadinessGauge({ score }: ReadinessGaugeProps) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMessage = (score: number) => {
    if (score >= 85) return 'You\'re ready for the exam!';
    if (score >= 70) return 'Almost there! Keep practicing.';
    if (score >= 50) return 'Good progress. Focus on weak areas.';
    return 'Keep studying. You\'ll get there!';
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center">
          <div className={`text-6xl font-bold ${getColor(score)}`}>
            {score}%
          </div>
          <p className="text-xl font-semibold mt-2">Exam Readiness</p>
          <p className="text-muted-foreground mt-1">{getMessage(score)}</p>
          <div className="w-full mt-4">
            <Progress value={score} className="h-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Study Plan Algorithm

### Intelligent Study Plan Generation

```typescript
// lib/studyPlan.ts
import { TopicMetrics } from '@/types/analytics';

export interface StudyPlanItem {
  topic_id: string;
  topic_name: string;
  priority: 'high' | 'medium' | 'low';
  recommended_questions: number;
  estimated_hours: number;
  target_accuracy: number;
  reason: string;
}

export interface StudyPlan {
  target_exam_date: Date;
  days_until_exam: number;
  hours_per_week: number;
  plan_items: StudyPlanItem[];
  weekly_schedule: WeeklySchedule[];
}

export interface WeeklySchedule {
  week_number: number;
  topics_to_focus: string[];
  daily_target_questions: number;
}

export function generateStudyPlan(
  topicMetrics: TopicMetrics[],
  targetExamDate: Date,
  hoursPerWeek: number
): StudyPlan {
  const daysUntilExam = Math.ceil(
    (targetExamDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const weeksUntilExam = Math.ceil(daysUntilExam / 7);

  // Prioritize topics
  const planItems = prioritizeTopics(topicMetrics);

  // Create weekly breakdown
  const weeklySchedule = createWeeklySchedule(
    planItems,
    weeksUntilExam,
    hoursPerWeek
  );

  return {
    target_exam_date: targetExamDate,
    days_until_exam: daysUntilExam,
    hours_per_week: hoursPerWeek,
    plan_items: planItems,
    weekly_schedule: weeklySchedule,
  };
}

function prioritizeTopics(topics: TopicMetrics[]): StudyPlanItem[] {
  return topics
    .map((topic) => {
      // Calculate priority score
      const accuracyGap = 100 - topic.accuracy;
      const examImportance = (topic.exam_weight || 0.1) * 100;
      const masteryFactor = {
        novice: 4,
        learning: 3,
        proficient: 2,
        mastered: 1,
      }[topic.mastery_level];

      const priorityScore = accuracyGap * examImportance * masteryFactor;

      // Determine priority level
      let priority: 'high' | 'medium' | 'low';
      if (priorityScore > 5000 || topic.mastery_level === 'novice') {
        priority = 'high';
      } else if (priorityScore > 2000 || topic.mastery_level === 'learning') {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      // Calculate recommended questions
      const baseQuestions = topic.recommended_practice_count || 10;
      const bonusForImportance = Math.ceil(examImportance / 10);
      const recommended_questions = baseQuestions + bonusForImportance;

      // Estimate time (assuming 2 minutes per question + review)
      const estimated_hours = (recommended_questions * 3) / 60;

      // Target accuracy based on current level
      const target_accuracy = Math.min(95, topic.accuracy + 15);

      // Generate reason
      const reason = generateReason(topic, priority);

      return {
        topic_id: topic.topic_id,
        topic_name: topic.topic_name,
        priority,
        recommended_questions,
        estimated_hours,
        target_accuracy,
        reason,
      };
    })
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

function generateReason(topic: TopicMetrics, priority: 'high' | 'medium' | 'low'): string {
  const reasons: string[] = [];

  if (topic.mastery_level === 'novice') {
    reasons.push('Limited practice');
  }

  if (topic.accuracy < 70) {
    reasons.push('Low accuracy');
  }

  if ((topic.exam_weight || 0) > 0.15) {
    reasons.push(`High exam weight (${((topic.exam_weight || 0) * 100).toFixed(0)}%)`);
  }

  if (topic.last_practiced) {
    const daysSince = Math.ceil(
      (Date.now() - new Date(topic.last_practiced).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince > 7) {
      reasons.push(`Not practiced in ${daysSince} days`);
    }
  }

  return reasons.join('; ') || 'Maintain proficiency';
}

function createWeeklySchedule(
  planItems: StudyPlanItem[],
  weeksUntilExam: number,
  hoursPerWeek: number
): WeeklySchedule[] {
  const schedule: WeeklySchedule[] = [];
  const questionsPerHour = 20; // Approximate
  const questionsPerWeek = hoursPerWeek * questionsPerHour;

  // Distribute topics across weeks
  const highPriority = planItems.filter((p) => p.priority === 'high');
  const mediumPriority = planItems.filter((p) => p.priority === 'medium');
  const lowPriority = planItems.filter((p) => p.priority === 'low');

  // First half: Focus on high priority
  const firstHalf = Math.ceil(weeksUntilExam / 2);
  for (let week = 1; week <= firstHalf; week++) {
    schedule.push({
      week_number: week,
      topics_to_focus: highPriority.slice(0, 3).map((p) => p.topic_name),
      daily_target_questions: Math.ceil(questionsPerWeek / 5), // 5 study days
    });
  }

  // Second half: Medium priority + review
  for (let week = firstHalf + 1; week <= weeksUntilExam; week++) {
    schedule.push({
      week_number: week,
      topics_to_focus: [...mediumPriority.slice(0, 2), ...highPriority.slice(0, 1)]
        .map((p) => p.topic_name),
      daily_target_questions: Math.ceil(questionsPerWeek / 5),
    });
  }

  return schedule;
}
```

### Study Plan UI

```typescript
// components/analytics/StudyPlanGenerator.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateStudyPlan } from '@/lib/studyPlan';
import { useUserAnalytics } from '@/hooks/useAnalytics';

export function StudyPlanGenerator({ userId }: { userId: string }) {
  const { data: analytics } = useUserAnalytics(userId);
  const [examDate, setExamDate] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [plan, setPlan] = useState<StudyPlan | null>(null);

  const handleGenerate = () => {
    if (!analytics || !examDate) return;

    const plan = generateStudyPlan(
      analytics.by_topic,
      new Date(examDate),
      hoursPerWeek
    );

    setPlan(plan);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Study Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Target Exam Date</label>
          <Input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Study Hours per Week</label>
          <Input
            type="number"
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(Number(e.target.value))}
            min={1}
            max={40}
          />
        </div>

        <Button onClick={handleGenerate} className="w-full">
          Generate Personalized Study Plan
        </Button>

        {plan && (
          <div className="mt-6 space-y-4">
            <div className="text-sm">
              <p>Days until exam: <strong>{plan.days_until_exam}</strong></p>
              <p>Weeks of preparation: <strong>{plan.weekly_schedule.length}</strong></p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Priority Topics</h3>
              {plan.plan_items.map((item) => (
                <div
                  key={item.topic_id}
                  className="flex items-center justify-between py-2 border-b"
                >
                  <div>
                    <div className="font-medium">{item.topic_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.reason}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      item.priority === 'high' ? 'destructive' :
                      item.priority === 'medium' ? 'default' : 'secondary'
                    }>
                      {item.priority}
                    </Badge>
                    <div className="text-sm mt-1">
                      {item.recommended_questions} questions
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Weekly Breakdown</h3>
              {plan.weekly_schedule.map((week) => (
                <div key={week.week_number} className="py-2 border-b">
                  <div className="font-medium">Week {week.week_number}</div>
                  <div className="text-sm">
                    Focus: {week.topics_to_focus.join(', ')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Daily target: {week.daily_target_questions} questions
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## Weak Area Detection

### Automatic Weak Area Identification

```typescript
// hooks/useWeakAreas.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useWeakAreas(userId: string) {
  return useQuery({
    queryKey: ['weak-areas', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weak_topics', {
        p_user_id: userId,
        p_accuracy_threshold: 75,
        p_min_attempts: 3,
      });

      if (error) throw error;
      return data;
    },
  });
}
```

### Weak Areas Alert Component

```typescript
// components/analytics/WeakAreasAlert.tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TopicMetrics } from '@/types/analytics';
import { useRouter } from 'next/router'; // or react-router

interface WeakAreasAlertProps {
  topics: TopicMetrics[];
}

export function WeakAreasAlert({ topics }: WeakAreasAlertProps) {
  const router = useRouter();

  const weakTopics = topics.filter(
    (t) => t.accuracy < 75 && t.questions_attempted >= 3
  );

  if (weakTopics.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>Areas Needing Attention</AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          You have {weakTopics.length} topic(s) with accuracy below 75%:
        </p>
        <ul className="list-disc list-inside mb-3">
          {weakTopics.map((topic) => (
            <li key={topic.topic_id}>
              <strong>{topic.topic_name}</strong>: {topic.accuracy.toFixed(1)}%
              ({topic.questions_correct}/{topic.questions_attempted})
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const topicIds = weakTopics.map((t) => t.topic_id).join(',');
            router.push(`/practice?topics=${topicIds}`);
          }}
        >
          Practice These Topics
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

## Performance Optimizations

### Caching Strategy

```typescript
// React Query configuration
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### Database Materialized Views

```sql
-- Create materialized view for faster analytics
CREATE MATERIALIZED VIEW user_topic_performance AS
SELECT
  ua.user_id,
  t.id AS topic_id,
  t.name AS topic_name,
  t.exam_weight,
  COUNT(ua.id) AS attempted_count,
  COUNT(*) FILTER (WHERE ua.is_correct = true) AS correct_count,
  ROUND(
    (COUNT(*) FILTER (WHERE ua.is_correct = true)::DECIMAL / NULLIF(COUNT(ua.id), 0) * 100),
    2
  ) AS accuracy,
  MAX(ua.attempted_at) AS last_attempted
FROM topics t
LEFT JOIN question_topics qt ON qt.topic_id = t.id
LEFT JOIN user_attempts ua ON ua.question_id = qt.question_id
GROUP BY ua.user_id, t.id, t.name, t.exam_weight;

-- Create index
CREATE INDEX idx_user_topic_perf_user ON user_topic_performance(user_id);

-- Refresh schedule (can be automated with pg_cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY user_topic_performance;
```

## Testing

### Analytics Tests

```typescript
// __tests__/analytics/studyPlan.test.ts
import { generateStudyPlan, prioritizeTopics } from '@/lib/studyPlan';
import { TopicMetrics } from '@/types/analytics';

describe('Study Plan Generation', () => {
  const mockTopics: TopicMetrics[] = [
    {
      topic_id: '1',
      topic_name: 'Data Preparation',
      exam_weight: 0.25,
      questions_attempted: 10,
      questions_correct: 5,
      accuracy: 50,
      mastery_level: 'learning',
      avg_confidence: 3,
      recommended_practice_count: 15,
      last_practiced: new Date().toISOString(),
    },
    // ... more topics
  ];

  it('prioritizes low accuracy topics', () => {
    const items = prioritizeTopics(mockTopics);
    expect(items[0].priority).toBe('high');
    expect(items[0].topic_name).toBe('Data Preparation');
  });

  it('generates appropriate weekly schedule', () => {
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 56); // 8 weeks

    const plan = generateStudyPlan(mockTopics, examDate, 10);

    expect(plan.weekly_schedule).toHaveLength(8);
    expect(plan.days_until_exam).toBe(56);
  });
});
```

## Common Pitfalls

1. **Not caching analytics queries**: Analytics can be expensive - use caching
2. **Calculating on every render**: Use React Query or useMemo
3. **Not considering exam weights**: Higher weight topics need more attention
4. **Ignoring confidence levels**: Low confidence even with correct answers is a red flag
5. **Not tracking study streaks**: Motivation is important

## Integration Checklist

- [ ] SQL functions created for analytics
- [ ] React Query hooks implemented
- [ ] Chart components built with Recharts
- [ ] Weak area detection working
- [ ] Study plan algorithm tested
- [ ] Caching configured properly
- [ ] Performance optimized (materialized views if needed)
- [ ] Mobile responsive design
- [ ] Accessibility tested
- [ ] Analytics tracking (optional: mixpanel, posthog)

## Advanced Features

### Spaced Repetition

```typescript
// Implement spaced repetition algorithm
function calculateNextReviewDate(
  lastAttempt: Date,
  wasCorrect: boolean,
  repetitionNumber: number
): Date {
  // SM-2 algorithm simplified
  const intervals = [1, 3, 7, 14, 30, 60, 120]; // days
  const nextDate = new Date(lastAttempt);

  if (wasCorrect) {
    const daysToAdd = intervals[Math.min(repetitionNumber, intervals.length - 1)];
    nextDate.setDate(nextDate.getDate() + daysToAdd);
  } else {
    // Reset if incorrect
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return nextDate;
}
```

### Predictive Analytics

```typescript
// Predict exam score based on current performance
function predictExamScore(topicMetrics: TopicMetrics[]): {
  predicted_score: number;
  confidence_interval: [number, number];
} {
  const weightedScore = topicMetrics.reduce((total, topic) => {
    return total + topic.accuracy * (topic.exam_weight || 0.1);
  }, 0);

  // Simple confidence interval (can be more sophisticated)
  const variance = 5; // ±5%
  const confidence_interval: [number, number] = [
    Math.max(0, weightedScore - variance),
    Math.min(100, weightedScore + variance),
  ];

  return {
    predicted_score: Math.round(weightedScore),
    confidence_interval,
  };
}
```

## References

- [Recharts Documentation](https://recharts.org/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Spaced Repetition Algorithms](https://en.wikipedia.org/wiki/Spaced_repetition)
- [PostgreSQL Materialized Views](https://www.postgresql.org/docs/current/sql-creatematerializedview.html)

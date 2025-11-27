import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { generateStudyPlan, estimateStudyHours } from '@/lib/studyPlan';
import { StudyPlan } from '@/lib/types/analytics';
import { TopicPerformance } from '@/lib/types/analytics';
import { Calendar, Clock, Target, TrendingUp, RefreshCw, Edit3, Loader2 } from 'lucide-react';
import { saveStudyPlan, loadStudyPlan, StudyPlanData } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface StudyPlanGeneratorProps {
  topics: TopicPerformance[];
  currentAccuracy: number;
  userId?: string;
}

export function StudyPlanGenerator({ topics, currentAccuracy }: StudyPlanGeneratorProps) {
  const { user } = useAuth();
  const [examDate, setExamDate] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved plan on mount
  useEffect(() => {
    if (!user?.id) return;

    const loadPlan = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await loadStudyPlan(user.id);
        
        if (error) {
          console.error('Failed to load study plan:', error);
          return;
        }
        
        if (data) {
          // Parse the stored plan data
          const planData = data.plan_data as unknown as StudyPlanData;
          setPlan(planData);
          setExamDate(data.exam_date);
          setHoursPerWeek(data.hours_per_week);
        }
      } catch (e) {
        console.error('Failed to load study plan:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlan();
  }, [user?.id]);

  // Save plan to database
  const savePlanToDb = async (newPlan: StudyPlan) => {
    if (!user?.id) {
      console.error('User not authenticated');
      alert('Please sign in to save your study plan');
      return false;
    }

    setIsSaving(true);
    try {
      console.log('💾 Saving study plan to database...', {
        userId: user.id,
        examDate,
        hoursPerWeek
      });
      
      const { data, error } = await saveStudyPlan(
        user.id,
        examDate,
        hoursPerWeek,
        newPlan as StudyPlanData
      );
      
      if (error) {
        console.error('❌ Failed to save study plan:', error);
        alert('Failed to save study plan. Please try again.');
        return false;
      }
      
      console.log('✅ Study plan saved successfully!', data);
      return true;
    } catch (e) {
      console.error('❌ Exception saving study plan:', e);
      alert('Failed to save study plan. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!user?.id) {
      alert('Please sign in to save your study plan');
      return;
    }

    if (!examDate) {
      alert('Please select an exam date');
      return;
    }

    const targetDate = new Date(examDate);
    if (targetDate <= new Date()) {
      alert('Please select a future date');
      return;
    }

    console.log('🎯 Generating study plan...');
    const studyPlan = generateStudyPlan(topics, targetDate, hoursPerWeek);
    console.log('📊 Study plan generated:', studyPlan);
    
    setPlan(studyPlan);
    const saved = await savePlanToDb(studyPlan);
    
    if (saved) {
      setIsEditing(false);
      // Optional: Show success toast
      console.log('🎉 Study plan is now available across all your devices!');
    }
  };

  const handleModify = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
    }
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
    }
  };

  // Estimate hours needed to reach 80%
  const estimatedHoursTo80 = estimateStudyHours(currentAccuracy, 80, topics.length);

  return (
    <Card id="study-plan-generator">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Personalized Study Plan Generator
        </CardTitle>
        <CardDescription>
          Get a customized study schedule based on your performance and target exam date
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading your study plan...</span>
          </div>
        )}

        {/* Show inputs if no plan or editing */}
        {!isLoading && (!plan || isEditing) && (
          <>
            {/* Input Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Target Exam Date
                </label>
                <DatePicker
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Study Hours per Week
                </label>
                <Input
                  type="number"
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Math.max(1, Number(e.target.value)))}
                  min={1}
                  max={40}
                  className="w-full"
                />
              </div>
            </div>

            {/* Estimate hint */}
            {currentAccuracy < 80 && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                <p className="text-blue-900 dark:text-blue-100">
                  <TrendingUp className="inline h-4 w-4 mr-1" />
                  Based on your current accuracy ({currentAccuracy.toFixed(1)}%), you may need
                  approximately <strong>{estimatedHoursTo80} hours</strong> to reach 80% readiness.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleGenerate} 
                className="flex-1" 
                size="lg"
                disabled={isSaving || !user?.id}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {plan ? 'Regenerate Plan' : 'Generate Personalized Study Plan'}
                  </>
                )}
              </Button>
              {isEditing && (
                <Button variant="outline" onClick={handleCancelEdit} size="lg" disabled={isSaving}>
                  Cancel
                </Button>
              )}
            </div>
            {!user?.id && (
              <p className="text-sm text-destructive text-center">
                Please sign in to save your study plan
              </p>
            )}
          </>
        )}

        {/* Show modify button when plan exists and not editing */}
        {!isLoading && plan && !isEditing && (
          <Button variant="outline" onClick={handleModify} className="w-full" size="lg" disabled={isSaving}>
            <Edit3 className="h-4 w-4 mr-2" />
            Modify Plan Settings
          </Button>
        )}

        {/* Plan Display */}
        {!isLoading && plan && (
          <div className="space-y-6 mt-8 pt-6 border-t">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted rounded-lg p-3">
                <div className="text-2xl font-bold">{plan.days_until_exam}</div>
                <div className="text-xs text-muted-foreground">Days to Exam</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-2xl font-bold">{plan.weekly_schedule.length}</div>
                <div className="text-xs text-muted-foreground">Weeks of Prep</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-2xl font-bold">{plan.hours_per_week}</div>
                <div className="text-xs text-muted-foreground">Hours/Week</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-2xl font-bold">
                  {plan.plan_items.filter((p) => p.priority === 'high').length}
                </div>
                <div className="text-xs text-muted-foreground">High Priority</div>
              </div>
            </div>

            {/* Priority Topics */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Focus Areas by Priority
              </h3>
              <div className="space-y-2">
                {plan.plan_items.map((item) => (
                  <div
                    key={item.topic_id}
                    className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getPriorityIcon(item.priority)}</span>
                        <div className="font-medium truncate">{item.topic_name}</div>
                        <Badge variant={getPriorityColor(item.priority)} className="flex-shrink-0">
                          {item.priority}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{item.reason}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="text-sm font-medium">
                        {item.recommended_questions} questions
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ~{item.estimated_hours}h • Target: {item.target_accuracy}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Breakdown */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Study Schedule
              </h3>
              <div className="space-y-3">
                {plan.weekly_schedule.map((week) => {
                  const isCurrentWeek = week.week_number === 1;
                  const isReviewWeek = week.week_number > plan.weekly_schedule.length - 2;

                  return (
                    <div
                      key={week.week_number}
                      className={`p-4 rounded-lg border-2 ${
                        isCurrentWeek
                          ? 'bg-primary/5 border-primary'
                          : isReviewWeek
                          ? 'bg-green-50 border-green-300'
                          : 'bg-background border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">
                          Week {week.week_number}
                          {isCurrentWeek && (
                            <Badge variant="default" className="ml-2">
                              Start Here
                            </Badge>
                          )}
                          {isReviewWeek && (
                            <Badge variant="secondary" className="ml-2">
                              Review Week
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {week.daily_target_questions} questions/day
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Focus: </span>
                        <span>{week.topics_to_focus.join(', ')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Success Tips */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">Study Tips for Success:</h4>
              <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                <li>Start with high-priority topics to maximize impact</li>
                <li>Practice consistently - aim for 5 days per week</li>
                <li>Review explanations thoroughly, even for correct answers</li>
                <li>Take practice exams in the final weeks to simulate test conditions</li>
                <li>Focus on understanding concepts, not just memorizing answers</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

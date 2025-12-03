import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TopicPerformance } from '@/lib/types/analytics';
import { AlertTriangle } from 'lucide-react';

interface WeakAreasAlertProps {
  topics: TopicPerformance[];
  threshold?: number;
  minAttempts?: number;
}

export function WeakAreasAlert({
  topics,
  threshold = 75,
  minAttempts = 3,
}: WeakAreasAlertProps) {
  const navigate = useNavigate();

  const weakTopics = topics.filter(
    (t) => t.accuracy < threshold && t.questions_attempted >= minAttempts
  );

  if (weakTopics.length === 0) {
    return null;
  }

  // Sort by exam weight (prioritize important topics)
  const sortedWeakTopics = [...weakTopics].sort(
    (a, b) => (b.exam_weight || 0) - (a.exam_weight || 0)
  );

  const totalWeakWeight = sortedWeakTopics.reduce(
    (sum, t) => sum + (t.exam_weight || 0),
    0
  );

  return (
    <Alert variant="destructive" className="border-2">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-lg font-semibold">
        {weakTopics.length} Area{weakTopics.length > 1 ? 's' : ''} Needing Attention
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          Topics below {threshold}% accuracy (representing{' '}
          <strong>{(totalWeakWeight * 100).toFixed(0)}%</strong> of the exam):
        </p>

        <div className="space-y-2 mb-4">
          {sortedWeakTopics.slice(0, 5).map((topic) => (
            <div
              key={topic.topic_id}
              className="flex items-center justify-between bg-background/50 rounded p-2"
            >
              <div className="flex-1">
                <div className="font-medium">{topic.topic_name}</div>
                <div className="text-sm text-muted-foreground">
                  {topic.accuracy.toFixed(1)}% ({topic.questions_correct}/
                  {topic.questions_attempted}) •{' '}
                  {((topic.exam_weight || 0) * 100).toFixed(0)}% of exam
                </div>
              </div>
              <div className="text-sm font-medium text-destructive">
                {topic.recommended_practice_count} questions needed
              </div>
            </div>
          ))}
          {weakTopics.length > 5 && (
            <div className="text-sm text-muted-foreground italic">
              +{weakTopics.length - 5} more...
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              // Navigate to practice with weak topics
              const topicIds = weakTopics.map(t => t.topic_id).join(',');
              navigate(`/practice?topics=${topicIds}`);
            }}
          >
            Practice These Topics
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Scroll to study plan generator
              document.getElementById('study-plan-generator')?.scrollIntoView({
                behavior: 'smooth',
              });
            }}
          >
            Generate Study Plan
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

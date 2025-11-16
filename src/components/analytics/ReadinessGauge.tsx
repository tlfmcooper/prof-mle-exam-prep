import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ReadinessGaugeProps {
  score: number; // 0-100
  predictedScore?: number;
}

export function ReadinessGauge({ score, predictedScore }: ReadinessGaugeProps) {
  const getColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 85) return 'bg-green-600';
    if (score >= 70) return 'bg-yellow-600';
    if (score >= 50) return 'bg-orange-600';
    return 'bg-red-600';
  };

  const getMessage = (score: number) => {
    if (score >= 85) return "You're ready for the exam!";
    if (score >= 70) return 'Almost there! Keep practicing weak areas.';
    if (score >= 50) return 'Good progress. Focus on high-priority topics.';
    if (score >= 30) return 'Keep studying. You\'re making progress!';
    return 'Start with fundamentals and practice regularly.';
  };

  const getRecommendation = (score: number) => {
    if (score >= 85) return 'Consider taking a practice exam to validate your readiness.';
    if (score >= 70) return 'Focus on topics below 75% accuracy for the next 1-2 weeks.';
    if (score >= 50) return 'Create a study plan targeting high-priority topics.';
    return 'Begin with topics that have the highest exam weight.';
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Main score display */}
          <div className={`text-7xl font-bold ${getColor(score)} tabular-nums`}>
            {Math.round(score)}
          </div>

          <div className="space-y-1">
            <p className="text-2xl font-semibold">Exam Readiness Score</p>
            {predictedScore !== undefined && (
              <p className="text-sm text-muted-foreground">
                Predicted Exam Score: <span className="font-semibold">{predictedScore}%</span>
              </p>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full space-y-2">
            <div className="relative w-full">
              <Progress value={score} className="h-4" />
              <div
                className={`absolute top-0 left-0 h-4 rounded-full transition-all ${getProgressColor(
                  score
                )}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Not Ready</span>
              <span>Ready</span>
            </div>
          </div>

          {/* Message and recommendation */}
          <div className="space-y-3 w-full">
            <p className="text-lg font-medium">{getMessage(score)}</p>
            <div className="bg-muted/50 rounded-lg p-4 text-left">
              <p className="text-sm font-medium mb-1">Recommendation:</p>
              <p className="text-sm text-muted-foreground">{getRecommendation(score)}</p>
            </div>
          </div>

          {/* Readiness breakdown */}
          <div className="w-full grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {score >= 85 ? '✓' : score >= 70 ? '○' : '×'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Topic Mastery</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {score >= 75 ? '✓' : score >= 60 ? '○' : '×'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {score >= 70 ? '✓' : score >= 50 ? '○' : '×'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Coverage</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

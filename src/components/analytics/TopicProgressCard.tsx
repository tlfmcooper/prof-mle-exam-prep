import { TopicStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface TopicProgressCardProps {
  stat: TopicStats;
  onClick?: () => void;
}

export function TopicProgressCard({ stat, onClick }: TopicProgressCardProps) {
  const getMasteryColor = (level: string) => {
    switch (level) {
      case 'mastered':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'proficient':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'learning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMasteryLabel = (level: string) => {
    switch (level) {
      case 'mastered':
        return 'Mastered';
      case 'proficient':
        return 'Proficient';
      case 'learning':
        return 'Learning';
      default:
        return 'Not Started';
    }
  };

  const coverage = stat.total_questions > 0
    ? (stat.attempted_questions / stat.total_questions) * 100
    : 0;

  return (
    <Card
      className={`border-2 transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : ''} ${getMasteryColor(stat.mastery_level)}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight">
            {stat.topic_name}
          </CardTitle>
          {stat.exam_weight > 0 && (
            <span className="text-xs font-medium opacity-75 flex-shrink-0">
              {Math.round(stat.exam_weight * 100)}%
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Circular Progress */}
        <div className="flex items-center justify-center">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="opacity-20"
              />
              {/* Progress circle */}
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - stat.accuracy_percentage / 100)}`}
                className="transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold">
                {Math.round(stat.accuracy_percentage)}%
              </span>
              <span className="text-xs opacity-75">accuracy</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-75">Questions</span>
            <span className="font-medium">
              {stat.attempted_questions} / {stat.total_questions}
            </span>
          </div>

          {/* Coverage Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-75">Coverage</span>
              <span className="font-medium">{Math.round(coverage)}%</span>
            </div>
            <Progress value={coverage} className="h-1.5" />
          </div>

          {/* Mastery Badge */}
          <div className="flex items-center justify-center pt-1">
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/50">
              {getMasteryLabel(stat.mastery_level)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for smaller displays
 */
export function TopicProgressCompact({ stat, onClick }: TopicProgressCardProps) {
  const getMasteryColor = (level: string) => {
    switch (level) {
      case 'mastered':
        return 'border-green-500';
      case 'proficient':
        return 'border-blue-500';
      case 'learning':
        return 'border-yellow-500';
      default:
        return 'border-gray-300';
    }
  };

  const coverage = stat.total_questions > 0
    ? (stat.attempted_questions / stat.total_questions) * 100
    : 0;

  return (
    <div
      className={`border-l-4 p-3 bg-white rounded shadow-sm hover:shadow transition-all ${onClick ? 'cursor-pointer' : ''} ${getMasteryColor(stat.mastery_level)}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">{stat.topic_name}</h4>
        <div className="flex items-center gap-2">
          {stat.exam_weight > 0 && (
            <span className="text-xs text-muted-foreground">
              {Math.round(stat.exam_weight * 100)}%
            </span>
          )}
          <span className="text-lg font-bold">
            {Math.round(stat.accuracy_percentage)}%
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {stat.attempted_questions} / {stat.total_questions} questions
          </span>
          <span>{Math.round(coverage)}% covered</span>
        </div>
        <Progress value={coverage} className="h-1.5" />
      </div>
    </div>
  );
}

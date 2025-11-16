import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TopicPerformance } from '@/lib/types/analytics';

interface AccuracyBySectionProps {
  topics: TopicPerformance[];
}

const COLORS = {
  high: 'hsl(var(--chart-1))', // >= 80%
  medium: 'hsl(var(--chart-2))', // 60-80%
  low: 'hsl(var(--destructive))', // < 60%
};

export function AccuracyBySection({ topics }: AccuracyBySectionProps) {
  if (!topics || topics.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No section data available yet.
      </div>
    );
  }

  // Sort by exam weight
  const sortedTopics = [...topics]
    .filter((t) => t.questions_attempted > 0)
    .sort((a, b) => (b.exam_weight || 0) - (a.exam_weight || 0));

  const data = sortedTopics.map((topic) => ({
    name: topic.topic_name.length > 20
      ? topic.topic_name.substring(0, 20) + '...'
      : topic.topic_name,
    fullName: topic.topic_name,
    accuracy: Math.round(topic.accuracy),
    attempted: topic.questions_attempted,
    examWeight: Math.round((topic.exam_weight || 0) * 100),
  }));

  const getColor = (accuracy: number) => {
    if (accuracy >= 80) return COLORS.high;
    if (accuracy >= 60) return COLORS.medium;
    return COLORS.low;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={100}
          tick={{ fontSize: 11 }}
        />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-semibold text-sm mb-1">{data.fullName}</p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Accuracy:</span>{' '}
                    <span className="font-medium">{data.accuracy}%</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Questions:</span>{' '}
                    <span className="font-medium">{data.attempted}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Exam Weight:</span>{' '}
                    <span className="font-medium">{data.examWeight}%</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          content={() => (
            <div className="flex justify-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.high }} />
                <span>≥80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.medium }} />
                <span>60-80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.low }} />
                <span>&lt;60%</span>
              </div>
            </div>
          )}
        />
        <Bar dataKey="accuracy" name="Accuracy %">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.accuracy)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

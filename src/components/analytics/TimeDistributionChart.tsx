import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TopicPerformance } from '@/lib/types/analytics';

interface TimeDistributionChartProps {
  topics: TopicPerformance[];
  totalTime: number; // in hours
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export function TimeDistributionChart({ topics, totalTime }: TimeDistributionChartProps) {
  if (!topics || topics.length === 0 || totalTime === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No time distribution data available yet.
      </div>
    );
  }

  // Calculate estimated time per topic based on questions attempted
  // Assuming avg 2.5 minutes per question
  const minutesPerQuestion = 2.5;

  const data = topics
    .filter((t) => t.questions_attempted > 0)
    .map((topic) => ({
      name: topic.topic_name,
      value: topic.questions_attempted,
      hours: (topic.questions_attempted * minutesPerQuestion) / 60,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6); // Top 6 topics

  const totalQuestions = data.reduce((sum, d) => sum + d.value, 0);

  // Custom legend with proper styling
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-col items-center gap-2 px-4 pt-2">
        {payload.map((entry: any, index: number) => {
          const item = data.find((d) => d.name === entry.value);
          return (
            <div key={`legend-${index}`} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-foreground">
                {entry.value} ({item?.value || 0})
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={500} className="min-h-[500px]">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="30%"
          labelLine={false}
          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              const percentage = ((data.value / totalQuestions) * 100).toFixed(1);
              return (
                <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-semibold text-sm mb-1">{data.name}</p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Questions:</span>{' '}
                    <span className="font-medium">{data.value}</span> ({percentage}%)
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Est. Time:</span>{' '}
                    <span className="font-medium">{data.hours.toFixed(1)}h</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={180}
          content={renderLegend}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

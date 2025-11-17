import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TopicPerformance } from '@/lib/types/analytics';

interface TimeDistributionChartProps {
  topics: TopicPerformance[];
  totalTime: number; // in hours
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(221.2 83.2% 53.3%)', // blue
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

  return (
    <ResponsiveContainer width="100%" height={500} className="min-h-[500px]">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="35%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
          height={36}
          formatter={(value) => {
            const item = data.find((d) => d.name === value);
            return item ? `${value} (${item.value})` : value;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

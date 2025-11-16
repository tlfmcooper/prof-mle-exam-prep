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
import { TrendData } from '@/lib/types/analytics';

interface PerformanceChartProps {
  data: TrendData[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No performance data available yet. Start practicing to see your progress!
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(date) => {
            const d = new Date(date);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 12 }}
          label={{ value: 'Questions', angle: -90, position: 'insideLeft' }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          label={{ value: 'Accuracy %', angle: 90, position: 'insideRight' }}
        />
        <Tooltip
          labelFormatter={(date) => new Date(date).toLocaleDateString()}
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="questions_attempted"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))', r: 4 }}
          name="Questions Attempted"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="accuracy"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
          name="Accuracy %"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

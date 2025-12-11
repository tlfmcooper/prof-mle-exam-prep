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

  // Calculate domain for questions axis to ensure proper scaling
  const maxQuestions = Math.max(...data.map(d => d.questions_attempted));
  const questionsDomain = [0, Math.ceil(maxQuestions * 1.1)]; // Add 10% padding

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          domain={questionsDomain}
          tick={{ fontSize: 12 }}
          label={{ value: 'Questions', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          label={{ value: 'Accuracy %', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
        />
        <Tooltip
          labelFormatter={(date) => new Date(date).toLocaleDateString()}
          formatter={(value: number, name: string) => {
            if (name === 'Accuracy %') {
              return [`${value.toFixed(1)}%`, name];
            }
            return [value, name];
          }}
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
        <Legend
          wrapperStyle={{ paddingTop: '10px' }}
          iconType="line"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="questions_attempted"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))', r: 4 }}
          name="Questions Attempted"
          activeDot={{ r: 6 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="accuracy"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
          name="Accuracy %"
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

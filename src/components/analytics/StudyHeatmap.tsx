import { CalendarData } from '@/lib/types/analytics';

interface StudyHeatmapProps {
  data: CalendarData[];
  days?: number; // Number of days to show (default 90)
}

export function StudyHeatmap({ data, days = 90 }: StudyHeatmapProps) {
  // Create a map for quick lookup
  const dataMap = new Map(data.map((d) => [d.date, d]));

  // Generate array of last N days
  const today = new Date();
  const dates: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date);
  }

  // Group by weeks (starting Sunday)
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  // Pad to start on Sunday
  const firstDate = dates[0];
  const firstDayOfWeek = firstDate.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    const paddedDate = new Date(firstDate);
    paddedDate.setDate(paddedDate.getDate() - (firstDayOfWeek - i));
    currentWeek.push(paddedDate);
  }

  dates.forEach((date) => {
    currentWeek.push(date);
    if (date.getDay() === 6) {
      // Saturday
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    // Pad remaining days
    while (currentWeek.length < 7) {
      const lastDate = currentWeek[currentWeek.length - 1];
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 1);
      currentWeek.push(nextDate);
    }
    weeks.push(currentWeek);
  }

  // Function to get color based on activity
  const getColor = (activityCount: number) => {
    if (activityCount === 0) return 'bg-muted';
    if (activityCount < 5) return 'bg-green-200';
    if (activityCount < 10) return 'bg-green-400';
    if (activityCount < 20) return 'bg-green-600';
    return 'bg-green-800';
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground mb-4">
        Study Activity (Last {days} Days)
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex gap-1 mb-2 text-xs text-muted-foreground">
            {weeks.map((week, weekIndex) => {
              const monthStart = week[0].getMonth();
              const showLabel = weekIndex === 0 || week[0].getDate() <= 7;
              return (
                <div key={weekIndex} className="flex gap-1">
                  {weekIndex === 0 ? (
                    <div className="w-5 text-right pr-1">{monthNames[monthStart]}</div>
                  ) : showLabel ? (
                    <div className="w-5 text-right pr-1">{monthNames[monthStart]}</div>
                  ) : (
                    <div className="w-5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 text-xs text-muted-foreground pr-1">
              <div className="h-3">S</div>
              <div className="h-3">M</div>
              <div className="h-3">T</div>
              <div className="h-3">W</div>
              <div className="h-3">T</div>
              <div className="h-3">F</div>
              <div className="h-3">S</div>
            </div>

            {/* Calendar grid */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((date, dayIndex) => {
                  const dateStr = formatDate(date);
                  const dayData = dataMap.get(dateStr);
                  const activityCount = dayData?.activity_count || 0;
                  const isToday = formatDate(date) === formatDate(today);
                  const isFuture = date > today;

                  return (
                    <div
                      key={dayIndex}
                      className={`
                        w-3 h-3 rounded-sm transition-all cursor-pointer
                        ${isFuture ? 'bg-transparent' : getColor(activityCount)}
                        ${isToday ? 'ring-2 ring-primary' : ''}
                        hover:ring-2 hover:ring-primary/50
                      `}
                      title={
                        isFuture
                          ? ''
                          : `${date.toLocaleDateString()}: ${activityCount} questions${
                              dayData ? `, ${dayData.total_time_minutes}min` : ''
                            }`
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-muted rounded-sm" title="0 questions" />
              <div className="w-3 h-3 bg-green-200 rounded-sm" title="1-4 questions" />
              <div className="w-3 h-3 bg-green-400 rounded-sm" title="5-9 questions" />
              <div className="w-3 h-3 bg-green-600 rounded-sm" title="10-19 questions" />
              <div className="w-3 h-3 bg-green-800 rounded-sm" title="20+ questions" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import {
  StudyPlan,
  StudyPlanItem,
  WeeklySchedule,
  TopicPerformance,
} from '@/lib/types/analytics';

/**
 * Generate personalized study plan based on user performance and target exam date
 */
export function generateStudyPlan(
  topicPerformance: TopicPerformance[],
  targetExamDate: Date,
  hoursPerWeek: number
): StudyPlan {
  const daysUntilExam = Math.ceil(
    (targetExamDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const weeksUntilExam = Math.max(1, Math.ceil(daysUntilExam / 7));

  // Prioritize topics based on multiple factors
  const planItems = prioritizeTopics(topicPerformance);

  // Create weekly breakdown
  const weeklySchedule = createWeeklySchedule(
    planItems,
    weeksUntilExam,
    hoursPerWeek
  );

  return {
    target_exam_date: targetExamDate,
    days_until_exam: daysUntilExam,
    hours_per_week: hoursPerWeek,
    plan_items: planItems,
    weekly_schedule: weeklySchedule,
  };
}

/**
 * Prioritize topics based on accuracy, exam weight, and mastery level
 */
function prioritizeTopics(topics: TopicPerformance[]): StudyPlanItem[] {
  return topics
    .map((topic) => {
      // Calculate priority score
      const accuracyGap = 100 - topic.accuracy;
      const examImportance = (topic.exam_weight || 0.1) * 100;
      const masteryFactor = {
        novice: 4,
        learning: 3,
        proficient: 2,
        mastered: 1,
      }[topic.mastery_level];

      const priorityScore = accuracyGap * examImportance * masteryFactor;

      // Determine priority level
      let priority: 'high' | 'medium' | 'low';
      if (priorityScore > 5000 || topic.mastery_level === 'novice') {
        priority = 'high';
      } else if (priorityScore > 2000 || topic.mastery_level === 'learning') {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      // Calculate recommended questions
      const baseQuestions = topic.recommended_practice_count || 10;
      const bonusForImportance = Math.ceil(examImportance / 10);
      const recommended_questions = Math.min(50, baseQuestions + bonusForImportance);

      // Estimate time (assuming 2-3 minutes per question including review)
      const minutesPerQuestion = 2.5;
      const estimated_hours = (recommended_questions * minutesPerQuestion) / 60;

      // Target accuracy based on current level
      const target_accuracy = Math.min(95, Math.max(topic.accuracy + 15, 75));

      // Generate reason
      const reason = generateReason(topic, priority);

      return {
        topic_id: topic.topic_id,
        topic_name: topic.topic_name,
        priority,
        recommended_questions,
        estimated_hours: Math.round(estimated_hours * 10) / 10, // Round to 1 decimal
        target_accuracy,
        reason,
      };
    })
    .sort((a, b) => {
      // Sort by priority first, then by recommended questions
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.recommended_questions - a.recommended_questions;
    });
}

/**
 * Generate human-readable reason for topic priority
 */
function generateReason(
  topic: TopicPerformance,
  _priority: 'high' | 'medium' | 'low'
): string {
  const reasons: string[] = [];

  if (topic.mastery_level === 'novice') {
    reasons.push('Limited practice');
  } else if (topic.mastery_level === 'learning') {
    reasons.push('Developing proficiency');
  }

  if (topic.accuracy < 50) {
    reasons.push('Very low accuracy');
  } else if (topic.accuracy < 70) {
    reasons.push('Below passing threshold');
  } else if (topic.accuracy < 85) {
    reasons.push('Room for improvement');
  }

  if ((topic.exam_weight || 0) > 0.15) {
    reasons.push(`High exam weight (${((topic.exam_weight || 0) * 100).toFixed(0)}%)`);
  }

  if (topic.last_practiced) {
    const daysSince = Math.ceil(
      (Date.now() - new Date(topic.last_practiced).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince > 14) {
      reasons.push(`Not practiced in ${daysSince} days`);
    } else if (daysSince > 7) {
      reasons.push('Needs review');
    }
  } else {
    reasons.push('Not yet practiced');
  }

  if (topic.avg_confidence < 3 && topic.questions_attempted > 0) {
    reasons.push('Low confidence');
  }

  return reasons.length > 0 ? reasons.join('; ') : 'Maintain proficiency';
}

/**
 * Create weekly study schedule
 */
function createWeeklySchedule(
  planItems: StudyPlanItem[],
  weeksUntilExam: number,
  hoursPerWeek: number
): WeeklySchedule[] {
  const schedule: WeeklySchedule[] = [];
  const questionsPerHour = 20; // Approximate based on 3 min/question
  const questionsPerWeek = hoursPerWeek * questionsPerHour;

  // Separate by priority
  const highPriority = planItems.filter((p) => p.priority === 'high');
  const mediumPriority = planItems.filter((p) => p.priority === 'medium');
  // Low priority topics are for maintenance review
  // Low priority topics are for maintenance review (not actively used in schedule generation)

  // Calculate phase durations
  const reviewWeeks = Math.max(1, Math.floor(weeksUntilExam * 0.2)); // 20% for review
  const learningWeeks = weeksUntilExam - reviewWeeks;
  const highPriorityWeeks = Math.ceil(learningWeeks * 0.5);
  const mediumPriorityWeeks = learningWeeks - highPriorityWeeks;

  // Phase 1: High priority topics
  for (let week = 1; week <= highPriorityWeeks; week++) {
    const topicsThisWeek = highPriority.slice(0, Math.min(3, highPriority.length));
    schedule.push({
      week_number: week,
      topics_to_focus: topicsThisWeek.map((p) => p.topic_name),
      daily_target_questions: Math.ceil(questionsPerWeek / 5), // 5 study days per week
    });
  }

  // Phase 2: Medium priority topics + high priority review
  for (
    let week = highPriorityWeeks + 1;
    week <= highPriorityWeeks + mediumPriorityWeeks;
    week++
  ) {
    const mediumTopics = mediumPriority.slice(0, 2);
    const reviewTopics = highPriority.slice(0, 1);
    schedule.push({
      week_number: week,
      topics_to_focus: [...mediumTopics, ...reviewTopics].map((p) => p.topic_name),
      daily_target_questions: Math.ceil(questionsPerWeek / 5),
    });
  }

  // Phase 3: Final review
  for (let week = learningWeeks + 1; week <= weeksUntilExam; week++) {
    const allTopics = [...highPriority, ...mediumPriority].slice(0, 4);
    schedule.push({
      week_number: week,
      topics_to_focus: allTopics.map((p) => p.topic_name),
      daily_target_questions: Math.ceil((questionsPerWeek * 1.2) / 5), // 20% more for review
    });
  }

  return schedule;
}

/**
 * Calculate next review date using spaced repetition algorithm (simplified SM-2)
 */
export function calculateNextReviewDate(
  lastAttempt: Date,
  wasCorrect: boolean,
  repetitionNumber: number
): Date {
  // Simplified spaced repetition intervals
  const intervals = [1, 3, 7, 14, 30, 60, 120]; // days
  const nextDate = new Date(lastAttempt);

  if (wasCorrect) {
    const daysToAdd = intervals[Math.min(repetitionNumber, intervals.length - 1)];
    nextDate.setDate(nextDate.getDate() + daysToAdd);
  } else {
    // Reset if incorrect - review again tomorrow
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return nextDate;
}

/**
 * Estimate study hours needed to reach target score
 */
export function estimateStudyHours(
  currentAccuracy: number,
  targetScore: number,
  topicsCount: number
): number {
  const accuracyGap = targetScore - currentAccuracy;
  if (accuracyGap <= 0) return 0;

  // Rough estimate: 1% improvement requires ~2 hours per topic
  const hoursPerPercent = 2;
  const baseHours = accuracyGap * hoursPerPercent;

  // Adjust for number of topics
  const topicFactor = topicsCount / 6; // Normalized to 6 topics
  const estimatedHours = baseHours * topicFactor;

  return Math.ceil(estimatedHours);
}

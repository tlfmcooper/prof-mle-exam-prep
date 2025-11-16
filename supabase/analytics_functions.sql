-- Analytics SQL Functions for Professional ML Engineer Exam Prep

-- Function to calculate topic performance
CREATE OR REPLACE FUNCTION calculate_topic_performance(p_user_id UUID)
RETURNS TABLE (
  topic_id UUID,
  topic_name TEXT,
  exam_weight DECIMAL,
  attempted_count BIGINT,
  correct_count BIGINT,
  accuracy DECIMAL,
  avg_confidence DECIMAL,
  last_attempted TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS topic_id,
    t.name AS topic_name,
    t.exam_weight,
    COUNT(ua.id) AS attempted_count,
    COUNT(*) FILTER (WHERE ua.is_correct = true) AS correct_count,
    ROUND(
      (COUNT(*) FILTER (WHERE ua.is_correct = true)::DECIMAL / NULLIF(COUNT(ua.id), 0) * 100),
      2
    ) AS accuracy,
    ROUND(AVG(ua.confidence_level), 2) AS avg_confidence,
    MAX(ua.attempted_at) AS last_attempted
  FROM topics t
  LEFT JOIN question_topics qt ON qt.topic_id = t.id OR qt.topic_id IN (
    SELECT id FROM topics WHERE parent_topic_id = t.id
  )
  LEFT JOIN user_attempts ua ON ua.question_id = qt.question_id AND ua.user_id = p_user_id
  WHERE t.parent_topic_id IS NULL
  GROUP BY t.id, t.name, t.exam_weight
  ORDER BY t.exam_weight DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate daily trends
CREATE OR REPLACE FUNCTION calculate_daily_trends(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  questions_attempted BIGINT,
  accuracy DECIMAL,
  study_time_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(ua.attempted_at) AS date,
    COUNT(ua.id) AS questions_attempted,
    ROUND(
      (COUNT(*) FILTER (WHERE ua.is_correct = true)::DECIMAL / NULLIF(COUNT(ua.id), 0) * 100),
      2
    ) AS accuracy,
    ROUND(SUM(ua.time_spent_seconds) / 60.0)::INTEGER AS study_time_minutes
  FROM user_attempts ua
  WHERE ua.user_id = p_user_id
    AND ua.attempted_at >= CURRENT_DATE - p_days
  GROUP BY DATE(ua.attempted_at)
  ORDER BY date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get weak topics
CREATE OR REPLACE FUNCTION get_weak_topics(
  p_user_id UUID,
  p_accuracy_threshold DECIMAL DEFAULT 70.0,
  p_min_attempts INTEGER DEFAULT 3
)
RETURNS TABLE (
  topic_id UUID,
  topic_name TEXT,
  accuracy DECIMAL,
  attempted_count BIGINT,
  exam_weight DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH topic_stats AS (
    SELECT * FROM calculate_topic_performance(p_user_id)
  )
  SELECT
    ts.topic_id,
    ts.topic_name,
    ts.accuracy,
    ts.attempted_count,
    ts.exam_weight
  FROM topic_stats ts
  WHERE ts.attempted_count >= p_min_attempts
    AND ts.accuracy < p_accuracy_threshold
  ORDER BY ts.exam_weight DESC, ts.accuracy ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate difficulty breakdown
CREATE OR REPLACE FUNCTION calculate_difficulty_breakdown(p_user_id UUID)
RETURNS TABLE (
  difficulty TEXT,
  attempted BIGINT,
  correct BIGINT,
  accuracy DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.difficulty,
    COUNT(ua.id) AS attempted,
    COUNT(*) FILTER (WHERE ua.is_correct = true) AS correct,
    ROUND(
      (COUNT(*) FILTER (WHERE ua.is_correct = true)::DECIMAL / NULLIF(COUNT(ua.id), 0) * 100),
      2
    ) AS accuracy
  FROM user_attempts ua
  JOIN questions q ON q.id = ua.question_id
  WHERE ua.user_id = p_user_id
  GROUP BY q.difficulty
  ORDER BY
    CASE q.difficulty
      WHEN 'easy' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'hard' THEN 3
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to get study calendar data (for heatmap)
CREATE OR REPLACE FUNCTION get_study_calendar(
  p_user_id UUID,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  date DATE,
  activity_count INTEGER,
  total_time_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(ua.attempted_at) AS date,
    COUNT(DISTINCT ua.id)::INTEGER AS activity_count,
    ROUND(SUM(ua.time_spent_seconds) / 60.0)::INTEGER AS total_time_minutes
  FROM user_attempts ua
  WHERE ua.user_id = p_user_id
    AND ua.attempted_at >= CURRENT_DATE - p_days
  GROUP BY DATE(ua.attempted_at)
  ORDER BY date ASC;
END;
$$ LANGUAGE plpgsql;

-- Instructions for running these functions
-- Run this SQL script in your Supabase SQL Editor to create all analytics functions

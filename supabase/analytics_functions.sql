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
  LEFT JOIN question_topics qt ON (
    -- Direct match
    qt.topic_id = t.id
    OR
    -- Subtopic match
    qt.topic_id IN (SELECT id FROM topics WHERE parent_topic_id = t.id)
    OR
    -- Orphan topic mappings (map orphan topics to their official exam topics)
    (t.id = '550e8400-e29b-41d4-a716-446655440001'::uuid AND qt.topic_id = 'eb3efdfe-2acd-4890-9e32-f333100e3f70'::uuid) OR
    (t.id = '550e8400-e29b-41d4-a716-446655440002'::uuid AND qt.topic_id = '5eb76235-a9e7-468e-a2a6-944398cf715e'::uuid) OR
    (t.id = '550e8400-e29b-41d4-a716-446655440003'::uuid AND qt.topic_id IN ('71af905b-8cc5-43a2-aa44-8ce2dc97dc3b'::uuid, '6b45e087-c586-4d25-8786-fe0df8fb5b0f'::uuid)) OR
    (t.id = '550e8400-e29b-41d4-a716-446655440004'::uuid AND qt.topic_id = '4954d4a9-911f-492f-ac76-d05bbf69f720'::uuid) OR
    (t.id = '550e8400-e29b-41d4-a716-446655440005'::uuid AND qt.topic_id IN ('847b7dd0-05ed-44bb-aa2e-e2f0a041c1de'::uuid, '72179a26-c625-4f85-a906-419123a855db'::uuid)) OR
    (t.id = '550e8400-e29b-41d4-a716-446655440006'::uuid AND qt.topic_id IN ('abd39a8f-9eb5-4924-adc8-6c197312f1b6'::uuid, 'd36ca108-3416-415b-bfd0-ae508450d7b6'::uuid))
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
    COUNT(DISTINCT ua.question_id) AS questions_attempted,  -- Count unique questions
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

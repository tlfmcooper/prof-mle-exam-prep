-- Fix question_topics table to use TEXT for question_id
-- This aligns with the questions table which uses TEXT IDs

-- Drop existing table
DROP TABLE IF EXISTS question_topics CASCADE;

-- Recreate with correct types
CREATE TABLE question_topics (
  question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (question_id, topic_id)
);

-- Create indexes for performance
CREATE INDEX idx_question_topics_question ON question_topics(question_id);
CREATE INDEX idx_question_topics_topic ON question_topics(topic_id);

-- Enable RLS
ALTER TABLE question_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view question-topic mappings"
  ON question_topics FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert question-topic mappings"
  ON question_topics FOR INSERT
  WITH CHECK (true);

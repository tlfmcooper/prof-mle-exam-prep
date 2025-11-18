-- Migration: Update study_plans table structure
-- This drops the old study_plans table and creates a new one for personalized study plans
-- Date: 2025-11-18

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own study plans" ON study_plans;
DROP POLICY IF EXISTS "Users can insert their own study plans" ON study_plans;
DROP POLICY IF EXISTS "Users can update their own study plans" ON study_plans;
DROP POLICY IF EXISTS "Users can delete their own study plans" ON study_plans;

-- Drop existing table (this will cascade to any dependent objects)
DROP TABLE IF EXISTS study_plans CASCADE;

-- Create new study_plans table with JSONB structure
CREATE TABLE study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  hours_per_week INTEGER NOT NULL DEFAULT 10,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for user lookups
CREATE INDEX idx_study_plans_user_id ON study_plans(user_id);

-- Enable RLS
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own study plans"
  ON study_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study plans"
  ON study_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study plans"
  ON study_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plans"
  ON study_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_study_plans_updated_at 
  BEFORE UPDATE ON study_plans 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

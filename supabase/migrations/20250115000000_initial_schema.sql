-- Professional ML Engineer Exam Prep - Initial Schema Migration
-- Generated: 2025-11-15

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Extended user profile
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  target_exam_date DATE,
  study_goal_hours_per_week INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Question bank
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'multiple_select', 'case_study')),
  options JSONB, -- Array of option objects: [{id: 'A', text: '...', is_correct: boolean}]
  explanation TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  source TEXT, -- e.g., 'official_sample', 'practice_test_1'
  source_page INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Topics/domains
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  exam_weight DECIMAL(3,2), -- percentage of exam (0.00 to 1.00)
  parent_topic_id UUID REFERENCES topics(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Question-Topic mapping (many-to-many)
CREATE TABLE question_topics (
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, topic_id)
);

-- User attempts/answers
CREATE TABLE user_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  selected_options JSONB, -- Array of selected option IDs
  is_correct BOOLEAN,
  time_spent_seconds INTEGER,
  confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study sessions
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT CHECK (session_type IN ('practice', 'timed_exam', 'review')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  total_questions INTEGER,
  correct_answers INTEGER,
  score_percentage DECIMAL(5,2)
);

-- Session attempts junction
CREATE TABLE session_attempts (
  session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES user_attempts(id) ON DELETE CASCADE,
  sequence_number INTEGER,
  PRIMARY KEY (session_id, attempt_id)
);

-- User bookmarks/favorites
CREATE TABLE bookmarks (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);

-- Study plans
CREATE TABLE study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id),
  target_date DATE,
  target_mastery_percentage INTEGER,
  status TEXT CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Optimize common queries
CREATE INDEX idx_user_attempts_user_id ON user_attempts(user_id);
CREATE INDEX idx_user_attempts_question_id ON user_attempts(question_id);
CREATE INDEX idx_user_attempts_attempted_at ON user_attempts(attempted_at DESC);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_question_topics_topic_id ON question_topics(topic_id);
CREATE INDEX idx_question_topics_question_id ON question_topics(question_id);
CREATE INDEX idx_topics_parent ON topics(parent_topic_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on user tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read/update their own
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User attempts: Users can only manage their own
CREATE POLICY "Users can view own attempts"
  ON user_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON user_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts"
  ON user_attempts FOR UPDATE
  USING (auth.uid() = user_id);

-- Study sessions: Users can only manage their own
CREATE POLICY "Users can view own sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Bookmarks: Users can only manage their own
CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Study plans: Users can only manage their own
CREATE POLICY "Users can view own study plans"
  ON study_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study plans"
  ON study_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study plans"
  ON study_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study plans"
  ON study_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Questions: Public read access for authenticated users
CREATE POLICY "Authenticated users can view questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

-- Topics: Public read access for authenticated users
CREATE POLICY "Authenticated users can view topics"
  ON topics FOR SELECT
  TO authenticated
  USING (true);

-- Question topics: Public read access for authenticated users
CREATE POLICY "Authenticated users can view question topics"
  ON question_topics FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE profiles IS 'Extended user profiles with exam prep preferences';
COMMENT ON TABLE questions IS 'Question bank for practice and exams';
COMMENT ON TABLE topics IS 'Hierarchical topic/domain structure matching exam sections';
COMMENT ON TABLE user_attempts IS 'Individual question attempts by users';
COMMENT ON TABLE study_sessions IS 'Study session tracking';
COMMENT ON TABLE bookmarks IS 'User bookmarked questions';
COMMENT ON TABLE study_plans IS 'Personalized study plans for users';

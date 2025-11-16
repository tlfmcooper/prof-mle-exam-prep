-- Rollback for Initial Schema Migration
-- Run this if you need to completely reset the database

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_topics_parent;
DROP INDEX IF EXISTS idx_question_topics_question_id;
DROP INDEX IF EXISTS idx_question_topics_topic_id;
DROP INDEX IF EXISTS idx_study_sessions_user_id;
DROP INDEX IF EXISTS idx_questions_difficulty;
DROP INDEX IF EXISTS idx_user_attempts_attempted_at;
DROP INDEX IF EXISTS idx_user_attempts_question_id;
DROP INDEX IF EXISTS idx_user_attempts_user_id;

-- Drop tables in reverse order (respecting foreign key dependencies)
DROP TABLE IF EXISTS session_attempts CASCADE;
DROP TABLE IF EXISTS study_plans CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS user_attempts CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS question_topics CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Note: auth.users table is managed by Supabase Auth and should not be dropped

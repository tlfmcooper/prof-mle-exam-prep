-- Migration to add DELETE policies for study_sessions and session_attempts
-- These were missing from the initial schema, causing delete operations to silently fail

-- Enable RLS on session_attempts if not already enabled
ALTER TABLE session_attempts ENABLE ROW LEVEL SECURITY;

-- Add DELETE policy for study_sessions
CREATE POLICY "Users can delete own sessions"
  ON study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Add SELECT policy for session_attempts (needed to read before delete)
CREATE POLICY "Users can view own session attempts"
  ON session_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_sessions 
      WHERE study_sessions.id = session_attempts.session_id 
      AND study_sessions.user_id = auth.uid()
    )
  );

-- Add INSERT policy for session_attempts
CREATE POLICY "Users can insert own session attempts"
  ON session_attempts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_sessions 
      WHERE study_sessions.id = session_attempts.session_id 
      AND study_sessions.user_id = auth.uid()
    )
  );

-- Add DELETE policy for session_attempts
CREATE POLICY "Users can delete own session attempts"
  ON session_attempts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM study_sessions 
      WHERE study_sessions.id = session_attempts.session_id 
      AND study_sessions.user_id = auth.uid()
    )
  );

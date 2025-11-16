-- Verify and Fix Profile Creation Trigger
-- This script checks if the trigger exists and recreates it if needed

-- ============================================================================
-- CHECK EXISTING TRIGGER
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✓ Trigger "on_auth_user_created" exists';
  ELSE
    RAISE WARNING '⚠ Trigger "on_auth_user_created" is missing!';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'handle_new_user'
  ) THEN
    RAISE NOTICE '✓ Function "handle_new_user" exists';
  ELSE
    RAISE WARNING '⚠ Function "handle_new_user" is missing!';
  END IF;
END $$;

-- ============================================================================
-- RECREATE FUNCTION (Safe - will replace existing)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RECREATE TRIGGER (Safe - will replace existing)
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Trigger Setup Complete!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Function: handle_new_user() - Created/Updated';
  RAISE NOTICE 'Trigger: on_auth_user_created - Created/Updated';
  RAISE NOTICE '';
  RAISE NOTICE 'New user signups will now automatically create profiles!';
  RAISE NOTICE '===========================================';
END $$;

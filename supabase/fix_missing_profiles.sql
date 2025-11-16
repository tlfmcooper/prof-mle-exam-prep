-- Fix Missing Profiles Script
-- This script creates profiles for all auth users that don't have one yet
-- Safe to run multiple times (idempotent)

BEGIN;

-- Create profiles for users that don't have one
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User'), -- Get from metadata or default to 'User'
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL -- Only insert if profile doesn't exist
ON CONFLICT (id) DO NOTHING;

-- Report results
DO $$
DECLARE
  users_count INT;
  profiles_count INT;
  missing_count INT;
BEGIN
  SELECT COUNT(*) INTO users_count FROM auth.users;
  SELECT COUNT(*) INTO profiles_count FROM profiles;
  missing_count := users_count - profiles_count;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Profile Sync Report';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total auth users: %', users_count;
  RAISE NOTICE 'Total profiles: %', profiles_count;
  RAISE NOTICE 'Missing profiles (should be 0): %', missing_count;

  IF missing_count = 0 THEN
    RAISE NOTICE '✓ All users have profiles!';
  ELSE
    RAISE WARNING '⚠ % users still missing profiles - check RLS policies', missing_count;
  END IF;
  RAISE NOTICE '===========================================';
END $$;

COMMIT;

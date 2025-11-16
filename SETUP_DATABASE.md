# Database Setup Guide

## Issue
You're seeing errors when trying to load questions because the database tables haven't been created yet.

## Solution
Run the migration and seed files in your Supabase dashboard to create tables and populate data.

## Step-by-Step Instructions

### Step 1: Run the Initial Schema Migration

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `kwvkrdaslxbdmgypimiv`

2. **Navigate to SQL Editor**
   - Click on **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy and Run the Migration**
   - Open the file: `supabase/migrations/20250115000000_initial_schema.sql`
   - Copy ALL the contents (entire file)
   - Paste into the SQL Editor
   - Click **Run** or press `Ctrl+Enter`

4. **Verify Tables Were Created**
   - Click **Table Editor** in the left sidebar
   - You should see 9 new tables:
     - ✅ profiles
     - ✅ questions
     - ✅ topics
     - ✅ question_topics
     - ✅ user_attempts
     - ✅ study_sessions
     - ✅ session_attempts
     - ✅ bookmarks
     - ✅ study_plans

### Step 2: Seed the Database with Sample Data

1. **Open New SQL Query**
   - In **SQL Editor**, click **New Query**

2. **Copy and Run the Seed Data**
   - Open the file: `supabase/seed.sql`
   - Copy ALL the contents (entire file - 438 lines)
   - Paste into the SQL Editor
   - Click **Run** or press `Ctrl+Enter`

   **✅ Safe to run multiple times!** The script is idempotent:
   - Uses transactions for atomicity
   - Uses `ON CONFLICT` to handle duplicates
   - Will update existing records instead of failing

3. **Verify Data Was Inserted**
   - Click **Table Editor** → **questions**
   - You should see **15 questions**
   - Click **Table Editor** → **topics**
   - You should see **46 topics** (6 main + 40 subtopics)

### Step 3: Fix Missing Profiles (If Needed)

If you signed up before running the migrations, you might not have a profile.

1. **Run Profile Fix Script**
   - In **SQL Editor**, click **New Query**
   - Open the file: `supabase/fix_missing_profiles.sql`
   - Copy and paste the entire file
   - Click **Run**
   - You should see: "✓ All users have profiles!"

2. **Verify Trigger is Working**
   - In **SQL Editor**, click **New Query**
   - Open the file: `supabase/verify_trigger.sql`
   - Copy and paste the entire file
   - Click **Run**
   - You should see: "Trigger Setup Complete!"

3. **Check Your Profile**
   - Click **Table Editor** → **profiles**
   - You should see your profile with:
     - Your user ID
     - Your email
     - Your full name

### Step 4: Test the Application

1. **Refresh Your Browser**
   - Go back to http://localhost:3003 (or 3000)
   - Hard refresh the page (`Ctrl+Shift+R`)

2. **Check Dashboard**
   - You should see the dashboard load
   - No more infinite loading spinners!

3. **Navigate to Practice Mode**
   - Click **Start Practice** from the dashboard
   - You should now see questions loading successfully!

## Expected Results

After completing these steps:

✅ Database tables created
✅ 15 sample questions loaded
✅ Topics and subtopics loaded
✅ Your user profile exists
✅ Practice mode works without errors

## Troubleshooting

### Error: "relation does not exist"
- The migration didn't run successfully
- Go back to Step 1 and re-run the migration
- Make sure you copied the ENTIRE file

### Error: "duplicate key value violates unique constraint"
- **This should NOT happen anymore** - the seed script is now idempotent
- If you see this, the script didn't run completely
- Re-run the entire `seed.sql` script - it's safe to run multiple times

### No Questions Appear
1. Check Table Editor → questions to verify data exists
2. Check browser console for errors
3. Verify RLS policies are enabled (should be automatic)

### Profile Not Found
- Sign out of the application
- Sign up with a new email address
- The trigger will create your profile automatically

## Files Reference

- **Migration**: `supabase/migrations/20250115000000_initial_schema.sql`
- **Seed Data**: `supabase/seed.sql`
- **Rollback** (if needed): `supabase/migrations/20250115000001_rollback.sql`

## Database Schema

Your database now includes:

1. **profiles** - User profiles with study goals
2. **questions** - 15 sample Professional ML Engineer exam questions
3. **topics** - Exam topics hierarchy (6 main sections + subtopics)
4. **question_topics** - Links questions to topics
5. **user_attempts** - Tracks your answers to questions
6. **study_sessions** - Tracks practice/exam sessions
7. **session_attempts** - Links attempts to sessions
8. **bookmarks** - Save questions for later review
9. **study_plans** - Personalized study plans

## Sample Questions Included

The seed data includes 15 questions covering:
- Low-code AI solutions (BigQuery ML, AutoML)
- Data collaboration and preprocessing
- Model development and training
- Model serving and deployment
- MLOps and automation
- Monitoring and optimization

---

**Need Help?** Check `AUTHENTICATION_TESTING.md` and `DEVELOPER_GUIDE.md` for more information.

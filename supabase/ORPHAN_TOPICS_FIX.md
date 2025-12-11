# Orphan Topics Fix

## Problem Description

The analytics page was showing incorrect data for certain topics:

1. **"Model Interpretability" appearing as a weak area with incorrect stats:**
   - Showed "66.7% (6/9)" accuracy
   - Showed "0% of exam" coverage (should have shown Model Development's 18% weight)
   - Showed "5 questions needed" (calculation based on incomplete data)
   - Only 2 questions available when clicking "Practice These Topics"

2. **Root Cause:**
   - "Model Interpretability" and other orphan topics exist in the database as standalone topics with `parent_topic_id IS NULL`
   - They are NOT part of the official exam structure defined in `seed.sql`
   - The analytics SQL function filters `WHERE t.parent_topic_id IS NULL`, causing these orphan topics to appear as main exam topics
   - Since they have no `exam_weight`, they show "0% of exam"
   - Questions tagged with these orphan topics were not being counted under their correct official exam topics

## Solution

### Step 1: Delete Orphan Topics from Database

Run the migration script to remove orphan topics that should not exist as separate entities:

```sql
-- In Supabase SQL Editor, run:
\i supabase/fix_orphan_topics.sql
```

Or manually execute:

```sql
DELETE FROM topics WHERE id IN (
  'eb3efdfe-2acd-4890-9e32-f333100e3f70'::uuid,  -- Low Code AI → Architecting low-code AI solutions
  '5eb76235-a9e7-468e-a2a6-944398cf715e'::uuid,  -- Data Prep → Data and Model Collaboration
  '71af905b-8cc5-43a2-aa44-8ce2dc97dc3b'::uuid,  -- Model Dev → Model Development
  '6b45e087-c586-4d25-8786-fe0df8fb5b0f'::uuid,  -- Model Interpretability → Model Development
  '4954d4a9-911f-492f-ac76-d05bbf69f720'::uuid,  -- AB Testing → Model Serving
  '847b7dd0-05ed-44bb-aa2e-e2f0a041c1de'::uuid,  -- MLOps → MLOps & Automation
  '72179a26-c625-4f85-a906-419123a855db'::uuid,  -- CI/CD → MLOps & Automation
  'abd39a8f-9eb5-4924-adc8-6c197312f1b6'::uuid,  -- Monitoring → Monitoring & Optimization
  'd36ca108-3416-415b-bfd0-ae508450d7b6'::uuid   -- Training Serving Skew → Monitoring & Optimization
);
```

**Important:** This DELETE will:
- Remove the orphan topics from the `topics` table
- NOT delete `question_topics` relationships (questions will still be tagged with these orphan topic IDs)
- The updated `analytics_functions.sql` will properly count these questions under their official exam topics

### Step 2: Verify the Cleanup

After running the migration, verify that only the 6 official exam topics remain:

```sql
SELECT id, name, exam_weight, parent_topic_id
FROM topics
WHERE parent_topic_id IS NULL
ORDER BY exam_weight DESC;
```

Expected result:
```
id                                   | name                                  | exam_weight | parent_topic_id
-------------------------------------|---------------------------------------|-------------|----------------
550e8400-e29b-41d4-a716-446655440005 | MLOps & Automation                   | 0.22        | NULL
550e8400-e29b-41d4-a716-446655440004 | Model Serving                        | 0.20        | NULL
550e8400-e29b-41d4-a716-446655440003 | Model Development                    | 0.18        | NULL
550e8400-e29b-41d4-a716-446655440002 | Data and Model Collaboration         | 0.14        | NULL
550e8400-e29b-41d4-a716-446655440001 | Architecting low-code AI solutions   | 0.13        | NULL
550e8400-e29b-41d4-a716-446655440006 | Monitoring & Optimization            | 0.13        | NULL
```

### Step 3: Already Applied (Frontend + SQL Function)

The following changes have already been applied and committed:

1. **SQL Analytics Function (`analytics_functions.sql`):**
   - Updated `calculate_topic_performance` to include orphan topic mappings in the LEFT JOIN
   - Questions tagged with orphan topic IDs are now counted under their official exam topics

2. **Frontend TOPIC_MAPPINGS:**
   - `src/hooks/useQuestions.ts` - Includes orphan topic mappings
   - `src/hooks/useTopicStats.ts` - Includes orphan topic mappings
   - Questions are properly filtered when clicking topic cards

## What This Fixes

After applying all steps:

✅ **Analytics page will show only the 6 official exam topics**
✅ **Exam coverage percentages will be correct** (no more "0% of exam")
✅ **Questions needed calculations will be accurate** (based on complete data)
✅ **Practice page will show all questions** (including those tagged with orphan topic IDs)
✅ **Dashboard topic cards match analytics counts** (consistent across the app)

## Topic Mappings

Official Exam Topics and their orphan topic IDs:

| Official Topic | Exam Weight | Orphan Topic IDs |
|----------------|-------------|------------------|
| Architecting low-code AI solutions | 13% | `eb3efdfe-2acd-4890-9e32-f333100e3f70` |
| Data and Model Collaboration | 14% | `5eb76235-a9e7-468e-a2a6-944398cf715e` |
| Model Development | 18% | `71af905b-8cc5-43a2-aa44-8ce2dc97dc3b`, `6b45e087-c586-4d25-8786-fe0df8fb5b0f` |
| Model Serving | 20% | `4954d4a9-911f-492f-ac76-d05bbf69f720` |
| MLOps & Automation | 22% | `847b7dd0-05ed-44bb-aa2e-e2f0a041c1de`, `72179a26-c625-4f85-a906-419123a855db` |
| Monitoring & Optimization | 13% | `abd39a8f-9eb5-4924-adc8-6c197312f1b6`, `d36ca108-3416-415b-bfd0-ae508450d7b6` |

## Troubleshooting

If analytics still show orphan topics after applying the fix:

1. **Verify SQL function was updated:**
   ```sql
   SELECT prosrc FROM pg_proc WHERE proname = 'calculate_topic_performance';
   ```
   Should contain the orphan topic mappings in the LEFT JOIN.

2. **Check if orphan topics still exist:**
   ```sql
   SELECT * FROM topics WHERE id = '6b45e087-c586-4d25-8786-fe0df8fb5b0f'::uuid;
   ```
   Should return no rows after running the migration.

3. **Clear browser cache and reload** the analytics page.

4. **Check for other orphan topics:**
   ```sql
   SELECT t.id, t.name, t.exam_weight, t.parent_topic_id
   FROM topics t
   WHERE t.parent_topic_id IS NULL
     AND t.id NOT IN (
       '550e8400-e29b-41d4-a716-446655440001'::uuid,
       '550e8400-e29b-41d4-a716-446655440002'::uuid,
       '550e8400-e29b-41d4-a716-446655440003'::uuid,
       '550e8400-e29b-41d4-a716-446655440004'::uuid,
       '550e8400-e29b-41d4-a716-446655440005'::uuid,
       '550e8400-e29b-41d4-a716-446655440006'::uuid
     );
   ```
   If any rows are returned, they are additional orphan topics that need to be mapped or deleted.

-- Fix Orphan Topics Migration
-- This script removes orphan topics that should not appear as main topics in analytics
-- and ensures their questions are properly mapped to official exam topics

-- Step 1: Delete orphan topics that are already mapped in TOPIC_MAPPINGS
-- These topics should not exist as separate entities since their questions
-- are counted under the official exam topics

DELETE FROM topics WHERE id IN (
  'eb3efdfe-2acd-4890-9e32-f333100e3f70'::uuid,  -- Low Code AI (mapped to Architecting low-code AI solutions)
  '5eb76235-a9e7-468e-a2a6-944398cf715e'::uuid,  -- Data Prep (mapped to Data and Model Collaboration)
  '71af905b-8cc5-43a2-aa44-8ce2dc97dc3b'::uuid,  -- Model Dev (mapped to Model Development)
  '6b45e087-c586-4d25-8786-fe0df8fb5b0f'::uuid,  -- Model Interpretability (mapped to Model Development)
  '4954d4a9-911f-492f-ac76-d05bbf69f720'::uuid,  -- AB Testing (mapped to Model Serving)
  '847b7dd0-05ed-44bb-aa2e-e2f0a041c1de'::uuid,  -- MLOps (mapped to MLOps & Automation)
  '72179a26-c625-4f85-a906-419123a855db'::uuid,  -- CI/CD (mapped to MLOps & Automation)
  'abd39a8f-9eb5-4924-adc8-6c197312f1b6'::uuid,  -- Monitoring (mapped to Monitoring & Optimization)
  'd36ca108-3416-415b-bfd0-ae508450d7b6'::uuid   -- Training Serving Skew (mapped to Monitoring & Optimization)
);

-- Note: The DELETE will cascade to remove these topics from the topics table,
-- but it will NOT delete the question_topics relationships. The questions
-- will still be tagged with these orphan topic IDs, and the analytics_functions.sql
-- LEFT JOIN will properly count them under their mapped official topics.

-- Step 2: Verify the cleanup
-- After running this script, you can verify with:
-- SELECT id, name, exam_weight, parent_topic_id FROM topics WHERE parent_topic_id IS NULL;
-- This should only return the 6 official exam topics.

-- Expected result:
-- - 550e8400-e29b-41d4-a716-446655440001 | Architecting low-code AI solutions
-- - 550e8400-e29b-41d4-a716-446655440002 | Data and Model Collaboration
-- - 550e8400-e29b-41d4-a716-446655440003 | Model Development
-- - 550e8400-e29b-41d4-a716-446655440004 | Model Serving
-- - 550e8400-e29b-41d4-a716-446655440005 | MLOps & Automation
-- - 550e8400-e29b-41d4-a716-446655440006 | Monitoring & Optimization

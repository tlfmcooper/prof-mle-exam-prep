
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const duplicateTopicId = '16dfb8a7-7648-47e7-a670-cd0bb3b23f49'; // Low-code AI (0 questions)
const targetTopicId = 'eb3efdfe-2acd-4890-9e32-f333100e3f70'; // Low Code Ai (239 questions)

async function fixTopics() {
  console.log('Starting topic fix...');

  // 1. Delete the duplicate topic
  const { data: deleted, error: deleteError } = await supabase
    .from('topics')
    .delete()
    .eq('id', duplicateTopicId)
    .select();

  if (deleteError) {
    console.error('Error deleting duplicate topic:', deleteError);
    return;
  }
  console.log('Deleted duplicate topic:', deleted);

  // 2. Update the target topic with correct name and weight
  const { data: updated, error: updateError } = await supabase
    .from('topics')
    .update({ 
      name: 'Low-code AI',
      exam_weight: 0.16 
    })
    .eq('id', targetTopicId)
    .select();

  if (updateError) {
    console.error('Error updating target topic:', updateError);
    return;
  }
  console.log('Updated target topic:', updated);
  console.log('Fix complete.');
}

fixTopics();

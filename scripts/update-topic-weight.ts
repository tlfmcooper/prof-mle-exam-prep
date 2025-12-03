
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

const targetTopicId = 'eb3efdfe-2acd-4890-9e32-f333100e3f70'; // Low Code Ai (239 questions)

async function updateTopicWeight() {
  console.log('Updating topic weight...');

  const { data: updated, error: updateError } = await supabase
    .from('topics')
    .update({ 
      name: 'Low-code AI',
      exam_weight: 0.16 
    })
    .eq('id', targetTopicId)
    .select();

  if (updateError) {
    console.error('Error updating topic:', updateError);
    return;
  }
  
  if (!updated || updated.length === 0) {
    console.log('No rows updated. This might be due to RLS policies.');
    console.log('Please update manually in Supabase dashboard:');
    console.log(`  Topic ID: ${targetTopicId}`);
    console.log('  Set exam_weight to: 0.16');
    console.log('  Set name to: Low-code AI');
  } else {
    console.log('Updated topic successfully:', updated);
  }
}

updateTopicWeight();

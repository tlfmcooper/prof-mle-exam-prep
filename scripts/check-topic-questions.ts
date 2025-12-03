
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const topicIds = [
  '16dfb8a7-7648-47e7-a670-cd0bb3b23f49', // Low-code AI (0/0?)
  'eb3efdfe-2acd-4890-9e32-f333100e3f70', // Low Code Ai
  '550e8400-e29b-41d4-a716-446655440001'  // Architecting low-code AI solutions
];

async function checkTopicQuestions() {
  for (const id of topicIds) {
    const { count, error } = await supabase
      .from('question_topics')
      .select('*', { count: 'exact', head: true })
      .eq('topic_id', id);

    if (error) {
      console.error(`Error checking topic ${id}:`, error);
    } else {
      console.log(`Topic ${id} has ${count} questions.`);
    }
  }
}

checkTopicQuestions();

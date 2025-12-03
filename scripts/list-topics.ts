
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

async function listTopics() {
  const { data: topics, error } = await supabase
    .from('topics')
    .select('*')
    .ilike('name', '%Low%')
    .order('name');

  if (error) {
    console.error('Error fetching topics:', error);
    return;
  }

  console.log('Topics found:', topics.length);
  topics.forEach(t => {
    console.log(`ID: ${t.id}, Name: "${t.name}", Parent: ${t.parent_topic_id}, Weight: ${t.exam_weight}`);
  });
}

listTopics();

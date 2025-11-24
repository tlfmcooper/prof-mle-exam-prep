
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugQuestions() {
  console.log('--- Debugging Questions ---');

  // 1. Count total questions
  const { count: totalCount, error: countError } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('Error counting questions:', countError);
  } else {
    console.log(`Total questions in DB: ${totalCount}`);
  }

  // 2. Count questions with topics (inner join)
  const { data: questionsWithTopics, error: joinError } = await supabase
    .from('questions')
    .select(`
      id,
      question_topics!inner (
        topic:topics!inner (
          id,
          name
        )
      )
    `);

  if (joinError) {
    console.error('Error fetching questions with topics:', joinError);
  } else {
    console.log(`Questions with topics (inner join): ${questionsWithTopics?.length}`);
    if (questionsWithTopics && questionsWithTopics.length < 20) {
        console.log('IDs of questions with topics:', questionsWithTopics.map(q => q.id));
    }
  }

  // 3. Fetch topics and weights
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('id, name, exam_weight')
    .is('parent_topic_id', null)
    .order('exam_weight', { ascending: false });

    if (topicsError) {
        console.error('Error fetching topics:', topicsError);
    } else {
        console.log(`Fetched ${topics?.length} main topics`);
        topics?.forEach(t => console.log(`- ${t.name}: ${t.exam_weight}`));
    }

}

debugQuestions().catch(console.error);

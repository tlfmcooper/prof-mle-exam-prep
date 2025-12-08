
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTopics() {
  console.log('Fetching topics...');

  // 1. Get all main topics
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('*')
    .is('parent_topic_id', null)
    .order('name');

  if (topicsError) {
    console.error('Error fetching topics:', topicsError);
    return;
  }

  console.log(`Found ${topics.length} main topics.`);

  // 2. Get questions and their topic links
  const { data: allQuestions, error: questionsError } = await supabase
    .from('questions')
    .select(`
      id,
      question_topics (
        topic:topics (
          id,
          name,
          parent_topic_id
        )
      )
    `);

  if (questionsError) {
    console.error('Error fetching questions:', questionsError);
    return;
  }

  // 3. Calculate counts for each topic (mimicking useTopicStats logic)
  topics.forEach(topic => {
      // Find all questions for this topic or its subtopics
      const topicQuestions = allQuestions.filter((q: any) => {
          const questionTopics = q.question_topics || [];
          return questionTopics.some((qt: any) => {
            const qTopic = qt.topic;
            // Handle array or single object if Supabase returns differently
            if (!qTopic) return false;
            
            // Match if question is tagged with this topic or a subtopic of this topic
            return qTopic.id === topic.id || qTopic.parent_topic_id === topic.id;
          });
        });

      console.log(`Topic: "${topic.name}"`);
      console.log(`  ID: ${topic.id}`);
      console.log(`  Target Weight: ${topic.exam_weight}`);
      console.log(`  Question Count: ${topicQuestions.length}`);
      console.log('---');
  });
}

debugTopics();

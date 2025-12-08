
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const OFFICIAL_TOPIC_IDS = [
  '550e8400-e29b-41d4-a716-446655440001', // Architecting low-code AI solutions
  '550e8400-e29b-41d4-a716-446655440002', // Data and Model Collaboration
  '550e8400-e29b-41d4-a716-446655440003', // Model Development
  '550e8400-e29b-41d4-a716-446655440004', // Model Serving
  '550e8400-e29b-41d4-a716-446655440005', // MLOps & Automation
  '550e8400-e29b-41d4-a716-446655440006'  // Monitoring & Optimization
];

async function checkCoverage() {
  console.log('Checking coverage against official topics...');

  // 1. Get all questions
  const { data: allQuestions, error: questionsError } = await supabase
    .from('questions')
    .select(`
      id,
      question_topics (
        topic_id,
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

  console.log(`Total questions in DB: ${allQuestions.length}`);

  let coveredCount = 0;
  const uncoveredQuestions: any[] = [];
  const orphansMap = new Map<string, number>();

  allQuestions.forEach(q => {
    let isCovered = false;
    const questionTopics = q.question_topics || [];

    // Check if any topic linked to this question is an Official Topic OR a child of one
    for (const qt of questionTopics) {
      if (!qt.topic) continue;
      
      const topicId = qt.topic.id;
      const parentId = qt.topic.parent_topic_id;

      if (OFFICIAL_TOPIC_IDS.includes(topicId)) {
        isCovered = true;
        break;
      }
      if (parentId && OFFICIAL_TOPIC_IDS.includes(parentId)) {
        isCovered = true;
        break;
      }
    }

    if (isCovered) {
      coveredCount++;
    } else {
      uncoveredQuestions.push(q);
      // Log which topics ARE linked to this uncovered question
      questionTopics.forEach((qt: any) => {
         if (qt.topic) {
             const key = `${qt.topic.name} (${qt.topic.id})`;
             orphansMap.set(key, (orphansMap.get(key) || 0) + 1);
         }
      });
    }
  });

  console.log(`Covered questions: ${coveredCount}`);
  console.log(`Uncovered questions: ${uncoveredQuestions.length}`);
  console.log(`Coverage %: ${((coveredCount / allQuestions.length) * 100).toFixed(1)}%`);

  if (uncoveredQuestions.length > 0) {
    console.log('\nTopics associated with Uncovered Questions:');
    // Sort by count desc
    const sortedOrphans = [...orphansMap.entries()].sort((a, b) => b[1] - a[1]);
    sortedOrphans.forEach(([topic, count]) => {
      console.log(`- ${topic}: ${count} questions`);
    });
  }
}

checkCoverage();

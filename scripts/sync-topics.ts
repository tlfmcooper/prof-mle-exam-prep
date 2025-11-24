import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncTopics() {
  console.log(chalk.bold.cyan('\n=== Topic Synchronization ===\n'));

  const spinner = ora('Fetching topics from database...').start();

  // Get all topics from database
  const { data: dbTopics, error: dbError } = await supabase
    .from('topics')
    .select('id, name');

  if (dbError) {
    spinner.fail('Failed to fetch database topics');
    console.error(dbError);
    process.exit(1);
  }

  // Create a set of topic names (not IDs) from database
  const dbTopicNames = new Set(dbTopics?.map(t => t.name.toLowerCase()) || []);
  spinner.succeed(`Fetched ${dbTopics.length} topics from database`);

  // Load questions and extract unique topic string IDs
  spinner.start('Loading questions JSON...');
  const questionsPath = path.resolve(__dirname, '../data/improved-questions.json');
  const questions = JSON.parse(readFileSync(questionsPath, 'utf-8'));

  const questionTopicIds = new Set();
  questions.forEach(q => {
    if (q.topics) {
      q.topics.forEach(t => questionTopicIds.add(t));
    }
  });

  spinner.succeed(`Found ${questionTopicIds.size} unique topic IDs in questions JSON`);

  // Convert string IDs to readable names and check if they exist
  const missingTopicIds = [];
  for (const topicId of questionTopicIds) {
    const topicName = topicId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (!dbTopicNames.has(topicName.toLowerCase())) {
      missingTopicIds.push(topicId);
    }
  }

  console.log(chalk.bold('\nAnalysis:'));
  console.log(`  Topics in database: ${chalk.cyan(dbTopics.length)}`);
  console.log(`  Topic IDs in questions: ${chalk.cyan(questionTopicIds.size)}`);
  console.log(`  Missing from database: ${missingTopicIds.length > 0 ? chalk.red(missingTopicIds.length) : chalk.green(0)}`);

  if (missingTopicIds.length === 0) {
    console.log(chalk.green('\n✅ All topics are synchronized!'));
    return;
  }

  console.log(chalk.yellow('\nMissing topic IDs (first 20):'));
  missingTopicIds.slice(0, 20).forEach(t => console.log(`  - ${t}`));
  if (missingTopicIds.length > 20) {
    console.log(`  ... and ${missingTopicIds.length - 20} more`);
  }

  // Generate UUIDs for new topics and create mapping
  spinner.start(`\nAdding ${missingTopicIds.length} missing topics to database...`);

  const idMapping = {};
  const newTopics = missingTopicIds.map(stringId => {
    const uuid = randomUUID();
    idMapping[stringId] = uuid;
    return {
      id: uuid,
      name: stringId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      exam_weight: null,
      parent_topic_id: null
    };
  });

  const { data: insertedTopics, error: insertError } = await supabase
    .from('topics')
    .insert(newTopics)
    .select();

  if (insertError) {
    spinner.fail('Failed to insert topics');
    console.error(insertError);
    process.exit(1);
  }

  spinner.succeed(`Added ${insertedTopics.length} new topics to database`);

  // Save the ID mapping for reference
  const mappingPath = path.resolve(__dirname, '../data/topic-id-mapping.json');
  writeFileSync(mappingPath, JSON.stringify(idMapping, null, 2));

  console.log(chalk.green('\n✅ Topics table synchronized successfully!'));
  console.log(chalk.gray(`Saved ID mapping to: ${path.basename(mappingPath)}`));
  console.log(chalk.gray('\nYou can now re-run the ingestion script to link all questions.'));
}

syncTopics().catch(console.error);

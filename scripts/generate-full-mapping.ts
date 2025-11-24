import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';

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

async function generateMapping() {
  console.log(chalk.bold.cyan('\n=== Generating Full Topic Mapping ===\n'));

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

  spinner.succeed(`Fetched ${dbTopics.length} topics from database`);

  // Create the map that ingestion script uses (to test what's already covered)
  const ingestionMap = new Map<string, string>();
  dbTopics.forEach(t => {
    ingestionMap.set(t.id, t.id);
    ingestionMap.set(t.name, t.id);
    ingestionMap.set(t.id.toLowerCase(), t.id);
    ingestionMap.set(t.name.toLowerCase(), t.id);
  });

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

  // Find topics that don't map
  const unmappedTopics = [];
  const fullMapping = {};

  for (const topicId of questionTopicIds) {
    if (ingestionMap.has(topicId)) {
      continue; // Already maps
    }
    
    // Try to find a match in DB topics by fuzzy name matching
    // e.g. "low_code_ai" -> "Low Code Ai"
    const normalizedName = topicId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const match = dbTopics.find(t => 
      t.name.toLowerCase() === normalizedName.toLowerCase() ||
      t.name.toLowerCase() === topicId.replace(/_/g, ' ').toLowerCase()
    );

    if (match) {
      fullMapping[topicId] = match.id;
    } else {
      unmappedTopics.push(topicId);
      console.warn(chalk.yellow(`  ⚠️  No match found for: ${topicId}`));
    }
  }

  console.log(chalk.bold('\nAnalysis:'));
  console.log(`  Total JSON topics: ${chalk.cyan(questionTopicIds.size)}`);
  console.log(`  New mappings found: ${chalk.cyan(Object.keys(fullMapping).length)}`);
  console.log(`  Still unmapped: ${unmappedTopics.length > 0 ? chalk.red(unmappedTopics.length) : chalk.green(0)}`);

  // Merge with existing mapping if exists
  const mappingPath = path.resolve(__dirname, '../data/topic-id-mapping.json');
  let existingMapping = {};
  try {
    existingMapping = JSON.parse(readFileSync(mappingPath, 'utf-8'));
  } catch (e) {}

  const finalMapping = { ...existingMapping, ...fullMapping };

  writeFileSync(mappingPath, JSON.stringify(finalMapping, null, 2));

  console.log(chalk.green('\n✅ Updated topic-id-mapping.json successfully!'));
  console.log(chalk.gray(`Total mappings: ${Object.keys(finalMapping).length}`));
  console.log(chalk.gray('\nYou can now re-run the ingestion script.'));
}

generateMapping().catch(console.error);

#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { config } from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/lib/database.types.js';

// Load environment variables
config();

interface TopicData {
  id: string;
  name: string;
  exam_weight: number | null;
  parent_topic_id: string | null;
  description?: string;
}

interface TopicsFile {
  metadata: any;
  topics: TopicData[];
  topic_coverage_by_question: Record<string, string[]>;
}

/**
 * Get Supabase client with admin privileges
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  // Use service role key for admin operations (bypasses RLS)
  const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY in .env file.'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
}

async function ingestTopics(topicsFile?: string) {
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║            Ingest Topics to Supabase                   ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  // Determine which file to use
  const filePath = topicsFile || './data/topics.json';
  
  if (!topicsFile) {
    console.log(chalk.yellow('⚠️  Using default topics path (deprecated).'));
    console.log(chalk.yellow('   Use --topics-file flag instead: --topics-file=./data/topics.json\n'));
  }

  const spinner = ora(`Reading ${filePath}...`).start();

  try {
    // Read topics file
    const content = readFileSync(filePath, 'utf-8');
    const topicsData: TopicsFile = JSON.parse(content);

    spinner.succeed(`Loaded ${topicsData.topics.length} topics from ${filePath}`);

    // Get Supabase client
    spinner.start('Connecting to Supabase...');
    const supabase = getSupabaseClient();
    spinner.succeed('Connected to Supabase');

    // Map of string ID to UUID
    const idMap = new Map<string, string>();

    // Step 1: Insert all topics (with parent_topic_id = null first)
    spinner.start('Inserting topics...');

    // First pass: Upsert main topics (no parent) or get existing ones
    const mainTopics = topicsData.topics.filter(t => !t.parent_topic_id);

    for (const topic of mainTopics) {
      // Try to get existing topic first
      const { data: existing } = await supabase
        .from('topics')
        .select('id')
        .eq('name', topic.name)
        .maybeSingle();

      if (existing) {
        idMap.set(topic.id, existing.id);
        continue;
      }

      // Insert new topic
      const { data, error } = await supabase
        .from('topics')
        .insert({
          name: topic.name,
          description: topic.description || null,
          exam_weight: topic.exam_weight,
          parent_topic_id: null
        })
        .select('id')
        .single();

      if (error) {
        console.error(chalk.red(`\nError inserting topic ${topic.name}:`), error);
        continue;
      }

      idMap.set(topic.id, data.id);
    }

    spinner.text = `Inserted ${mainTopics.length} main topics`;

    // Second pass: Upsert child topics or get existing ones
    const childTopics = topicsData.topics.filter(t => t.parent_topic_id);

    for (const topic of childTopics) {
      const parentUuid = idMap.get(topic.parent_topic_id!);

      if (!parentUuid) {
        console.warn(chalk.yellow(`\nWarning: Parent topic ${topic.parent_topic_id} not found for ${topic.name}`));
        continue;
      }

      // Try to get existing topic first
      const { data: existing } = await supabase
        .from('topics')
        .select('id')
        .eq('name', topic.name)
        .maybeSingle();

      if (existing) {
        idMap.set(topic.id, existing.id);
        continue;
      }

      // Insert new topic
      const { data, error } = await supabase
        .from('topics')
        .insert({
          name: topic.name,
          description: topic.description || null,
          exam_weight: topic.exam_weight,
          parent_topic_id: parentUuid
        })
        .select('id')
        .single();

      if (error) {
        console.error(chalk.red(`\nError inserting topic ${topic.name}:`), error);
        continue;
      }

      idMap.set(topic.id, data.id);
    }

    spinner.succeed(`Inserted ${topicsData.topics.length} topics total`);

    // Step 2: Create question-topic mappings
    spinner.start('Creating question-topic mappings...');

    let mappingsCreated = 0;
    let mappingsSkipped = 0;

    for (const [questionId, topicIds] of Object.entries(topicsData.topic_coverage_by_question)) {
      // Check if question exists
      const { data: questionExists } = await supabase
        .from('questions')
        .select('id')
        .eq('id', questionId)
        .single();

      if (!questionExists) {
        mappingsSkipped++;
        continue;
      }

      // Insert mappings for each topic
      for (const topicId of topicIds) {
        const topicUuid = idMap.get(topicId);

        if (!topicUuid) {
          console.warn(chalk.yellow(`\nWarning: Topic ${topicId} not found in mapping`));
          continue;
        }

        const { error } = await supabase
          .from('question_topics')
          .upsert({
            question_id: questionId,
            topic_id: topicUuid
          }, {
            onConflict: 'question_id,topic_id'
          });

        if (error) {
          console.error(chalk.red(`\nError mapping question ${questionId} to topic ${topicId}:`), error);
        } else {
          mappingsCreated++;
        }
      }
    }

    spinner.succeed(`Created ${mappingsCreated} question-topic mappings (${mappingsSkipped} questions not found)`);

    // Summary
    console.log('\n' + chalk.bold('Summary:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  Topics Inserted: ${chalk.green(topicsData.topics.length)}`);
    console.log(`  Mappings Created: ${chalk.green(mappingsCreated)}`);
    console.log(`  Questions Skipped: ${chalk.yellow(mappingsSkipped)}`);
    console.log(chalk.gray('─'.repeat(60)));

    console.log(chalk.green.bold('\n✅ Topics ingestion completed successfully!\n'));
    process.exit(0);

  } catch (error: any) {
    spinner.fail('Topics ingestion failed');
    console.error(chalk.red.bold('\n❌ Error:\n'));
    console.error(error);
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  const program = new Command();

  program
    .name('ingest-topics')
    .description('Ingest topics and topic-question mappings into Supabase database')
    .option('-t, --topics-file <path>', 'Path to topics JSON file')
    .parse();

  const options = program.opts();

  await ingestTopics(options.topicsFile);
}

export { ingestTopics };

// Run main
main();

#!/usr/bin/env tsx

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { config } from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/lib/database.types.js';
import { ingestionConfig } from '../config/ingestion.config.js';
import { Command } from 'commander';

// Load environment variables
config();

// Raw question from batch files
interface BatchQuestion {
  id: string;
  question_number?: number;
  question_text: string;
  question_type: 'multiple_choice' | 'multiple_select' | 'case_study';
  options: Array<{
    id: string;
    text: string;
    is_correct: boolean;
  }>;
  correct_answer_ids: string[];
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  topics?: string[];
  source?: {
    pdf_name?: string;
    page_number?: number | null;
    section?: string;
    extraction_date?: string;
    extraction_method?: string;
  };
  created_at?: string;
}

// Database question type
type DBQuestionInsert = Database['public']['Tables']['questions']['Insert'];

interface IngestionResult {
  totalQuestions: number;
  inserted: number;
  failed: number;
  errors: Array<{
    questionId: string;
    error: string;
  }>;
  duration: number;
}

/**
 * Transform batch question to database format
 */
function transformQuestion(batchQuestion: BatchQuestion): DBQuestionInsert {
  return {
    id: batchQuestion.id,
    question_text: batchQuestion.question_text,
    question_type: batchQuestion.question_type,
    options: batchQuestion.options as any,  // JSON field
    explanation: batchQuestion.explanation || null,
    difficulty: batchQuestion.difficulty || null,
    source: batchQuestion.source?.pdf_name || null,
    source_page: batchQuestion.source?.page_number || null,
    created_at: batchQuestion.created_at || new Date().toISOString()
  };
}

/**
 * Get Supabase client
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file.'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
}

/**
 * Split array into batches
 */
function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Insert a batch of questions with retry logic
 */
async function insertBatch(
  supabase: ReturnType<typeof getSupabaseClient>,
  questions: DBQuestionInsert[],
  retries: number = 3
): Promise<{ success: boolean; inserted: number; error?: any }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Use upsert to make ingestion idempotent
      const { error, count } = await supabase
        .from('questions')
        .upsert(questions, { onConflict: 'id' });

      if (error) throw error;

      return { success: true, inserted: count || questions.length };
    } catch (error: any) {
      if (attempt < retries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
      } else {
        return { success: false, inserted: 0, error };
      }
    }
  }

  return { success: false, inserted: 0, error: 'Max retries exceeded' };
}

/**
 * Helper to ingest topics for a batch of questions
 */
async function ingestBatchTopics(
  supabase: ReturnType<typeof getSupabaseClient>,
  questions: BatchQuestion[],
  topicNameMap: Map<string, string>
): Promise<number> {
  let mappingsCreated = 0;
  const topicInserts: any[] = [];

  for (const q of questions) {
    if (!q.topics || q.topics.length === 0) continue;

    // Deduplicate topics for this question
    const uniqueTopics = [...new Set(q.topics)];

    for (const topicName of uniqueTopics) {
      const topicId = topicNameMap.get(topicName);
      
      if (topicId) {
        topicInserts.push({
          question_id: q.id,
          topic_id: topicId
        });
      } else {
        // Optional: Log warning for unknown topic
        // console.warn(`Unknown topic: ${topicName} for question ${q.id}`);
      }
    }
  }

  if (topicInserts.length > 0) {
    const { error, count } = await supabase
      .from('question_topics')
      .upsert(topicInserts, { onConflict: 'question_id,topic_id' });

    if (!error) {
      mappingsCreated = topicInserts.length;
    } else {
      console.error('Error inserting topic mappings:', error);
    }
  }

  return mappingsCreated;
}

/**
 * Ingest questions to Supabase
 */
async function ingestQuestions(dryRun: boolean = false, questionsFile?: string): Promise<IngestionResult> {
  console.log(chalk.bold.magenta('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.magenta('║            Ingest to Supabase                          ║'));
  console.log(chalk.bold.magenta('╚════════════════════════════════════════════════════════╝\n'));

  // Determine which file to use
  const filePath = questionsFile || ingestionConfig.outputFile;
  
  if (!questionsFile) {
    console.log(chalk.yellow('⚠️  Using config file for questions path (deprecated).'));
    console.log(chalk.yellow('   Use --questions-file flag instead: --questions-file=./data/improved-questions.json\n'));
  }

  const startTime = Date.now();
  const spinner = ora('Reading questions...').start();

  const result: IngestionResult = {
    totalQuestions: 0,
    inserted: 0,
    failed: 0,
    errors: [],
    duration: 0
  };

  try {
    // Read questions file
    spinner.text = `Reading ${filePath}...`;
    const content = readFileSync(filePath, 'utf-8');
    const batchQuestions: BatchQuestion[] = JSON.parse(content);

    result.totalQuestions = batchQuestions.length;

    spinner.succeed(`Loaded ${batchQuestions.length} questions from ${filePath}`);

    // Transform to database format
    spinner.start('Transforming questions...');

    const dbQuestions = batchQuestions.map(transformQuestion);

    spinner.succeed('Transformed questions to database format');

    // Dry run mode
    if (dryRun) {
      spinner.info(chalk.yellow('DRY RUN MODE - No data will be inserted'));

      console.log('\n' + chalk.yellow('Sample transformed question:'));
      console.log(chalk.gray(JSON.stringify(dbQuestions[0], null, 2)));

      result.inserted = batchQuestions.length;
      result.duration = Date.now() - startTime;

      console.log('\n' + chalk.yellow.bold(`✓ Dry run completed - ${batchQuestions.length} questions would be inserted\n`));
      return result;
    }

    // Get Supabase client
    spinner.start('Connecting to Supabase...');

    const supabase = getSupabaseClient();

    spinner.succeed('Connected to Supabase');

    // Fetch all topics to create a mapping
    spinner.start('Fetching topics...');
    const { data: topicsData, error: topicsError } = await supabase
      .from('topics')
      .select('id, name');

    if (topicsError) {
      throw new Error(`Failed to fetch topics: ${topicsError.message}`);
    }

    const topicNameMap = new Map<string, string>();
    // Map both IDs and names to their IDs (prioritize ID for efficiency)
    topicsData?.forEach(t => {
      topicNameMap.set(t.id, t.id); // ID -> ID mapping (most common case)
      topicNameMap.set(t.name, t.id); // Name -> ID mapping (fallback)
      topicNameMap.set(t.id.toLowerCase(), t.id); // Lowercase ID for case-insensitivity
      topicNameMap.set(t.name.toLowerCase(), t.id); // Lowercase name for case-insensitivity
    });

    // Load manual ID mapping if it exists
    try {
      const mappingPath = path.resolve(__dirname, '../data/topic-id-mapping.json');
      if (existsSync(mappingPath)) {
        const mapping = JSON.parse(readFileSync(mappingPath, 'utf-8'));
        Object.entries(mapping).forEach(([key, value]) => {
            topicNameMap.set(key, value as string);
        });
        spinner.succeed(`Loaded ${Object.keys(mapping).length} manual topic mappings`);
      }
    } catch (e) {
      // Ignore if file doesn't exist or fails to load
    }

    spinner.succeed(`Loaded ${topicNameMap.size} topics for mapping`);

    // Split into batches
    // We need to keep the original batchQuestions to access the 'topics' field
    const batchSize = ingestionConfig.batchSize;
    const questionBatches = batchArray(batchQuestions, batchSize);
    const dbBatches = batchArray(dbQuestions, batchSize);

    console.log(chalk.gray(`\nProcessing ${dbBatches.length} batches of ${batchSize}\n`));

    let totalTopicMappings = 0;

    // Process each batch
    for (let i = 0; i < dbBatches.length; i++) {
      const dbBatch = dbBatches[i];
      const originalBatch = questionBatches[i];
      const batchNum = i + 1;

      spinner.start(`Inserting batch ${batchNum}/${dbBatches.length} (${dbBatch.length} questions)...`);

      const batchResult = await insertBatch(supabase, dbBatch);

      if (batchResult.success) {
        result.inserted += batchResult.inserted;
        
        // Insert topics for this batch
        const mappings = await ingestBatchTopics(supabase, originalBatch, topicNameMap);
        totalTopicMappings += mappings;

        spinner.succeed(`Batch ${batchNum}/${dbBatches.length} inserted (${batchResult.inserted} questions, ${mappings} topic links)`);
      } else {
        result.failed += dbBatch.length;
        spinner.fail(`Batch ${batchNum}/${dbBatches.length} failed`);

        console.log(chalk.red(`  Error: ${batchResult.error?.message || batchResult.error}`));

        // Record errors
        dbBatch.forEach(q => {
          result.errors.push({
            questionId: q.id || 'unknown',
            error: batchResult.error?.message || String(batchResult.error)
          });
        });
      }

      // Small delay between batches
      if (i < dbBatches.length - 1) {
        await sleep(100);
      }
    }

    result.duration = Date.now() - startTime;

    // Summary
    console.log('\n' + chalk.bold('Ingestion Summary:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  ${chalk.cyan('Total Questions')}: ${result.totalQuestions}`);
    console.log(`  ${chalk.green('Inserted')}: ${result.inserted}`);
    console.log(`  ${chalk.green('Topic Mappings')}: ${totalTopicMappings}`);
    console.log(`  ${result.failed > 0 ? chalk.red('Failed') : chalk.gray('Failed')}: ${result.failed}`);
    console.log(`  ${chalk.gray('Duration')}: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(chalk.gray('─'.repeat(60)));

    if (result.failed === 0) {
      console.log('\n' + chalk.green.bold('✅ All questions inserted successfully!\n'));
    } else {
      console.log('\n' + chalk.red.bold(`❌ ${result.failed} questions failed to insert\n`));

      if (result.errors.length > 0) {
        console.log(chalk.red('Sample errors (first 5):'));
        result.errors.slice(0, 5).forEach(err => {
          console.log(chalk.gray(`  - ${err.questionId}: ${err.error}`));
        });
        console.log();
      }
    }

    return result;

  } catch (error: any) {
    spinner.fail('Ingestion failed');
    console.error(chalk.red.bold('\n❌ Error:\n'));
    console.error(error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const program = new Command();

  program
    .name('ingest-to-supabase')
    .description('Ingest questions into Supabase database')
    .option('-d, --dry-run', 'Test without inserting data', false)
    .option('-q, --questions-file <path>', 'Path to questions JSON file')
    .parse();

  const options = program.opts();

  try {
    const result = await ingestQuestions(options.dryRun, options.questionsFile);

    if (result.failed === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    process.exit(1);
  }
}

export { ingestQuestions, transformQuestion };

// Run main only if this file is executed directly
if (process.argv[1]?.includes('ingest-to-supabase')) {
  main();
}

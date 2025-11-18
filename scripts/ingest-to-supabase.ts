#!/usr/bin/env tsx

import { readFileSync } from 'fs';
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
      const { error, count } = await supabase
        .from('questions')
        .insert(questions);

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
 * Ingest questions to Supabase
 */
async function ingestQuestions(dryRun: boolean = false): Promise<IngestionResult> {
  console.log(chalk.bold.magenta('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.magenta('║            Ingest to Supabase                          ║'));
  console.log(chalk.bold.magenta('╚════════════════════════════════════════════════════════╝\n'));

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
    // Read merged questions
    const content = readFileSync(ingestionConfig.outputFile, 'utf-8');
    const batchQuestions: BatchQuestion[] = JSON.parse(content);

    result.totalQuestions = batchQuestions.length;

    spinner.succeed(`Loaded ${batchQuestions.length} questions`);

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

    // Split into batches
    const batches = batchArray(dbQuestions, ingestionConfig.batchSize);

    console.log(chalk.gray(`\nProcessing ${batches.length} batches of ${ingestionConfig.batchSize}\n`));

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNum = i + 1;

      spinner.start(`Inserting batch ${batchNum}/${batches.length} (${batch.length} questions)...`);

      const batchResult = await insertBatch(supabase, batch);

      if (batchResult.success) {
        result.inserted += batchResult.inserted;
        spinner.succeed(`Batch ${batchNum}/${batches.length} inserted (${batchResult.inserted} questions)`);
      } else {
        result.failed += batch.length;
        spinner.fail(`Batch ${batchNum}/${batches.length} failed`);

        console.log(chalk.red(`  Error: ${batchResult.error?.message || batchResult.error}`));

        // Record errors
        batch.forEach(q => {
          result.errors.push({
            questionId: q.id || 'unknown',
            error: batchResult.error?.message || String(batchResult.error)
          });
        });
      }

      // Small delay between batches
      if (i < batches.length - 1) {
        await sleep(100);
      }
    }

    result.duration = Date.now() - startTime;

    // Summary
    console.log('\n' + chalk.bold('Ingestion Summary:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  ${chalk.cyan('Total Questions')}: ${result.totalQuestions}`);
    console.log(`  ${chalk.green('Inserted')}: ${result.inserted}`);
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
    .parse();

  const options = program.opts();

  try {
    const result = await ingestQuestions(options.dryRun);

    if (result.failed === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  main();
}

export { ingestQuestions, transformQuestion };

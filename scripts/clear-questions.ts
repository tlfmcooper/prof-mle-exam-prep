import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
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

async function clearQuestions() {
  console.log(chalk.bold.yellow('\n⚠️  WARNING: This will delete ALL questions!\n'));
  console.log(chalk.gray('(Question-topic mappings will be automatically removed via CASCADE)\n'));
  
  const spinner = ora('Clearing questions table...').start();
  
  try {
    // Clear questions table (question_topics will cascade delete)
    const { error: questionsError } = await supabase
      .from('questions')
      .delete()
      .neq('id', ''); // Delete all rows
    
    if (questionsError) {
      spinner.fail('Failed to clear questions');
      console.error(questionsError);
      process.exit(1);
    }
    
    spinner.succeed('Cleared questions table (and related question_topics)');
    
    console.log(chalk.green.bold('\n✅ Questions table cleared successfully!\n'));
    console.log(chalk.gray('You can now re-run the ingestion script:\n'));
    console.log(chalk.cyan('  npx tsx scripts/ingest-to-supabase.ts --questions-file=./data/improved-questions.json\n'));
    
  } catch (error) {
    spinner.fail('Failed to clear questions');
    console.error(error);
    process.exit(1);
  }
}

clearQuestions();

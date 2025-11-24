import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath} from 'url';
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

async function clearDatabase() {
  console.log(chalk.bold.yellow('\n⚠️  WARNING: This will delete ALL questions and question-topic mappings!\n'));
  
  const spinner = ora('Clearing question_topics table...').start();
  
  try {
    // Clear question_topics first (foreign key constraint)
    const { error: topicsError } = await supabase
      .from('question_topics')
      .delete()
      .neq('question_id', ''); // Delete all rows
    
    if (topicsError) {
      spinner.fail('Failed to clear question_topics');
      console.error(topicsError);
      process.exit(1);
    }
    
    spinner.succeed('Cleared question_topics table');
    
    // Clear questions table
    spinner.start('Clearing questions table...');
    
    const { error: questionsError } = await supabase
      .from('questions')
      .delete()
      .neq('id', ''); // Delete all rows
    
    if (questionsError) {
      spinner.fail('Failed to clear questions');
      console.error(questionsError);
      process.exit(1);
    }
    
    spinner.succeed('Cleared questions table');
    
    console.log(chalk.green.bold('\n✅ Database tables cleared successfully!\n'));
    console.log(chalk.gray('You can now re-run the ingestion script:\n'));
    console.log(chalk.cyan('  npx tsx scripts/ingest-to-supabase.ts --questions-file=./data/improved-questions.json\n'));
    
  } catch (error) {
    spinner.fail('Failed to clear database');
    console.error(error);
    process.exit(1);
  }
}

clearDatabase();

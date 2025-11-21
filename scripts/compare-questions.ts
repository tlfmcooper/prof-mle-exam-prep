import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  question_type: string;
  options: Array<{
    id: string;
    text: string;
    is_correct: boolean;
  }>;
  correct_answer_ids: string[];
  explanation: string;
  difficulty: string;
  topics: string[];
  source?: {
    pdf_name: string;
    page_number: number | null;
    section: string;
    extraction_date: string;
    extraction_method: string;
  };
  created_at: string;
}

async function compareQuestions(file1?: string, file2?: string, outputFile?: string) {
  // Use provided paths or defaults
  const dataDir = path.join(process.cwd(), 'data');
  const mergedPath = file1 || path.join(dataDir, 'merged-questions.json');
  const improvedPath = file2 || path.join(dataDir, 'improved-questions.json');
  const outputPath = outputFile || path.join(dataDir, 'missing-questions.json');

  if (!file1 || !file2) {
    console.log(chalk.yellow('⚠️  Using default file paths (deprecated).'));
    console.log(chalk.yellow('   Use --file1 and --file2 flags instead.\n'));
  }

  console.log(chalk.cyan(`🔍 Comparing questions from:\n  ${mergedPath}\n  ${improvedPath}\n`));

  // Load the JSON files
  const mergedContent = fs.readFileSync(mergedPath, 'utf-8');
  const improvedContent = fs.readFileSync(improvedPath, 'utf-8');

  const mergedQuestions: Question[] = JSON.parse(mergedContent);
  const improvedQuestions: Question[] = JSON.parse(improvedContent);

  console.log(`📊 Loaded ${chalk.cyan(mergedQuestions.length)} questions from ${path.basename(mergedPath)}`);
  console.log(`📊 Loaded ${chalk.cyan(improvedQuestions.length)} questions from ${path.basename(improvedPath)}\n`);

  // Create a Set of question IDs from improved-questions.json for fast lookup
  const improvedIds = new Set(improvedQuestions.map(q => q.id));

  // Find questions in merged-questions.json that are NOT in improved-questions.json
  const missingQuestions = mergedQuestions.filter(q => !improvedIds.has(q.id));

  console.log(`✅ Found ${chalk.yellow(missingQuestions.length)} questions in ${path.basename(mergedPath)} that are NOT in ${path.basename(improvedPath)}\n`);

  // Sort by question number for better readability
  missingQuestions.sort((a, b) => a.question_number - b.question_number);

  // Display summary
  if (missingQuestions.length > 0) {
    console.log(chalk.bold('📋 Missing question IDs:'));
    const ids = missingQuestions.map(q => q.id);
    console.log(chalk.gray(ids.join(', ')));
    console.log();
    
    console.log(chalk.bold('📋 Missing question numbers:'));
    const numbers = missingQuestions.map(q => q.question_number);
    console.log(chalk.gray(numbers.join(', ')));
    console.log();
  }

  // Write the result to a new JSON file
  fs.writeFileSync(outputPath, JSON.stringify(missingQuestions, null, 2), 'utf-8');

  console.log(chalk.green(`💾 Saved missing questions to: ${outputPath}`));
  console.log(chalk.green(`\n✨ Comparison complete!`));
}

/**
 * Main execution
 */
async function main() {
  const program = new Command();

  program
    .name('compare-questions')
    .description('Compare two question JSON files and find differences')
    .option('-1, --file1 <path>', 'Path to first questions file (baseline)')
    .option('-2, --file2 <path>', 'Path to second questions file (comparison)')
    .option('-o, --output <path>', 'Path to output file for missing questions')
    .parse();

  const options = program.opts();

  try {
    await compareQuestions(options.file1, options.file2, options.output);
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('❌ Error during comparison:'), error);
    process.exit(1);
  }
}

// Run the comparison
main();

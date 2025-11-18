#!/usr/bin/env tsx

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, basename } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import hashSum from 'hash-sum';
import { ingestionConfig } from '../config/ingestion.config.js';

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

interface MergeResult {
  totalFiles: number;
  filesProcessed: number;
  filesSkipped: number;
  totalQuestions: number;
  uniqueQuestions: number;
  duplicatesRemoved: number;
  questionsPerFile: Record<string, number>;
  errors: Array<{ file: string; error: string }>;
}

/**
 * Generate hash for deduplication
 */
function generateQuestionHash(question: BatchQuestion): string {
  const normalizedText = question.question_text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  return hashSum(`${normalizedText}::${question.correct_answer_ids.join(',')}`);
}

/**
 * Deduplicate questions by ID
 */
function deduplicateById(questions: BatchQuestion[]): {
  unique: BatchQuestion[];
  duplicates: BatchQuestion[];
} {
  const seen = new Set<string>();
  const unique: BatchQuestion[] = [];
  const duplicates: BatchQuestion[] = [];

  for (const question of questions) {
    if (!seen.has(question.id)) {
      seen.add(question.id);
      unique.push(question);
    } else {
      duplicates.push(question);
    }
  }

  return { unique, duplicates };
}

/**
 * Deduplicate questions by hash
 */
function deduplicateByHash(questions: BatchQuestion[]): {
  unique: BatchQuestion[];
  duplicates: BatchQuestion[];
} {
  const seen = new Set<string>();
  const unique: BatchQuestion[] = [];
  const duplicates: BatchQuestion[] = [];

  for (const question of questions) {
    const hash = generateQuestionHash(question);

    if (!seen.has(hash)) {
      seen.add(hash);
      unique.push(question);
    } else {
      duplicates.push(question);
    }
  }

  return { unique, duplicates };
}

/**
 * Read and merge all batch files
 */
async function mergeQuestions(): Promise<{ questions: BatchQuestion[]; result: MergeResult }> {
  console.log(chalk.bold.blue('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║           Merge Question Batch Files                  ║'));
  console.log(chalk.bold.blue('╚════════════════════════════════════════════════════════╝\n'));

  const spinner = ora('Finding batch files...').start();

  // Find all batch files
  const allFiles = readdirSync(ingestionConfig.sourceDir)
    .filter(file => ingestionConfig.filePattern.test(file))
    .map(file => join(ingestionConfig.sourceDir, file));

  spinner.succeed(`Found ${allFiles.length} matching files`);

  // Filter out excluded files
  const excludeSet = new Set(ingestionConfig.excludeFiles);
  const filesToProcess = allFiles.filter(file => !excludeSet.has(basename(file)));

  console.log(chalk.gray(`Processing ${filesToProcess.length} files (${excludeSet.size} excluded)\n`));

  const result: MergeResult = {
    totalFiles: allFiles.length,
    filesProcessed: 0,
    filesSkipped: excludeSet.size,
    totalQuestions: 0,
    uniqueQuestions: 0,
    duplicatesRemoved: 0,
    questionsPerFile: {},
    errors: []
  };

  const allQuestions: BatchQuestion[] = [];

  // Process each file
  spinner.start('Reading and merging files...');

  for (const filePath of filesToProcess) {
    const fileName = basename(filePath);

    try {
      const content = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Handle both array and object formats
      let questions: BatchQuestion[];
      if (Array.isArray(data)) {
        questions = data;
      } else if (data.questions && Array.isArray(data.questions)) {
        questions = data.questions;
      } else {
        throw new Error('Unrecognized file format');
      }

      if (questions.length > 0) {
        allQuestions.push(...questions);
        result.questionsPerFile[fileName] = questions.length;
        result.filesProcessed++;
        spinner.text = `Processed ${result.filesProcessed}/${filesToProcess.length} files (${allQuestions.length} questions)`;
      } else {
        result.errors.push({
          file: fileName,
          error: 'No questions found'
        });
      }
    } catch (error: any) {
      result.errors.push({
        file: fileName,
        error: error.message
      });
      console.log(chalk.red(`\n❌ Error processing ${fileName}: ${error.message}`));
    }
  }

  result.totalQuestions = allQuestions.length;
  spinner.succeed(`Merged ${result.totalQuestions} questions from ${result.filesProcessed} files`);

  // Deduplicate
  console.log();
  spinner.start('Deduplicating questions...');

  const { unique, duplicates } = ingestionConfig.deduplication.strategy === 'id'
    ? deduplicateById(allQuestions)
    : deduplicateByHash(allQuestions);

  result.uniqueQuestions = unique.length;
  result.duplicatesRemoved = duplicates.length;

  const duplicatePercent = ((duplicates.length / allQuestions.length) * 100).toFixed(1);
  spinner.succeed(`Removed ${duplicates.length} duplicates (${duplicatePercent}%)`);

  // Save merged questions
  console.log();
  spinner.start(`Writing to ${basename(ingestionConfig.outputFile)}...`);

  writeFileSync(
    ingestionConfig.outputFile,
    JSON.stringify(unique, null, 2),
    'utf-8'
  );

  const stats = statSync(ingestionConfig.outputFile);
  const sizeKB = (stats.size / 1024).toFixed(2);

  spinner.succeed(`Saved ${unique.length} questions (${sizeKB} KB)`);

  return { questions: unique, result };
}

/**
 * Display statistics
 */
function displayStats(result: MergeResult) {
  console.log('\n' + chalk.bold('Summary:'));
  console.log(chalk.gray('─'.repeat(60)));

  const data: Record<string, any> = {
    'Total Files Found': result.totalFiles,
    'Files Processed': result.filesProcessed,
    'Files Skipped': result.filesSkipped,
    'Total Questions': result.totalQuestions,
    'Unique Questions': result.uniqueQuestions,
    'Duplicates Removed': result.duplicatesRemoved
  };

  const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));

  for (const [key, value] of Object.entries(data)) {
    const paddedKey = key.padEnd(maxKeyLength);
    let displayValue = value;

    if (typeof value === 'number') {
      if (key.includes('Removed') && value > 0) {
        displayValue = chalk.yellow(value);
      } else if (key.includes('Processed') || key.includes('Unique')) {
        displayValue = chalk.green(value);
      } else {
        displayValue = chalk.cyan(value);
      }
    }

    console.log(`  ${chalk.gray(paddedKey)} : ${displayValue}`);
  }

  console.log(chalk.gray('─'.repeat(60)));

  if (result.errors.length > 0) {
    console.log('\n' + chalk.yellow(`⚠️  ${result.errors.length} file(s) had errors:`));
    result.errors.forEach(err => {
      console.log(chalk.gray(`  - ${err.file}: ${err.error}`));
    });
  }

  console.log();
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now();

  try {
    const { questions, result } = await mergeQuestions();

    // Display statistics
    displayStats(result);

    // Save report
    if (ingestionConfig.saveReport) {
      const reportData = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        ...result
      };

      writeFileSync(
        ingestionConfig.reportPath.replace('ingestion-report', 'merge-report'),
        JSON.stringify(reportData, null, 2),
        'utf-8'
      );
    }

    console.log(chalk.green.bold('✅ Merge completed successfully!\n'));
    process.exit(0);

  } catch (error: any) {
    console.error(chalk.red.bold('\n❌ Fatal Error:\n'));
    console.error(error);
    process.exit(1);
  }
}

export { mergeQuestions, deduplicateById, deduplicateByHash };

// Run main if this is the entry point
main();

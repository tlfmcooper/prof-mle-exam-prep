#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
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
  source?: any;
  created_at?: string;
}

interface ValidationError {
  questionId: string;
  questionIndex: number;
  field: string;
  message: string;
  type: 'error' | 'warning';
}

interface ValidationResult {
  valid: boolean;
  totalQuestions: number;
  validQuestions: number;
  invalidQuestions: number;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate a single question
 */
function validateQuestion(question: any, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const questionId = question.id || `question_${index}`;

  // Required fields
  const requiredFields = [
    'id',
    'question_text',
    'question_type',
    'options',
    'correct_answer_ids'
  ];

  for (const field of requiredFields) {
    if (!(field in question) || question[field] === undefined || question[field] === null) {
      errors.push({
        questionId,
        questionIndex: index,
        field,
        message: `Missing required field: ${field}`,
        type: 'error'
      });
    }
  }

  // If missing required fields, return early
  if (errors.length > 0) {
    return errors;
  }

  // Validate ID
  if (typeof question.id !== 'string' || question.id.trim() === '') {
    errors.push({
      questionId,
      questionIndex: index,
      field: 'id',
      message: 'ID must be a non-empty string',
      type: 'error'
    });
  }

  // Validate question_text
  if (typeof question.question_text !== 'string' || question.question_text.trim() === '') {
    errors.push({
      questionId,
      questionIndex: index,
      field: 'question_text',
      message: 'question_text must be a non-empty string',
      type: 'error'
    });
  }

  // Validate question_type
  const validTypes = ['multiple_choice', 'multiple_select', 'case_study'];
  if (!validTypes.includes(question.question_type)) {
    errors.push({
      questionId,
      questionIndex: index,
      field: 'question_type',
      message: `question_type must be one of: ${validTypes.join(', ')}`,
      type: 'error'
    });
  }

  // Validate options array
  if (!Array.isArray(question.options)) {
    errors.push({
      questionId,
      questionIndex: index,
      field: 'options',
      message: 'options must be an array',
      type: 'error'
    });
  } else {
    if (question.options.length < 2) {
      errors.push({
        questionId,
        questionIndex: index,
        field: 'options',
        message: 'Must have at least 2 options',
        type: 'error'
      });
    }

    // Validate each option
    question.options.forEach((option: any, optIdx: number) => {
      if (!option.id || typeof option.id !== 'string') {
        errors.push({
          questionId,
          questionIndex: index,
          field: `options[${optIdx}].id`,
          message: 'Option ID must be a non-empty string',
          type: 'error'
        });
      }

      if (!option.text || typeof option.text !== 'string' || option.text.trim() === '') {
        errors.push({
          questionId,
          questionIndex: index,
          field: `options[${optIdx}].text`,
          message: 'Option text must be a non-empty string',
          type: 'error'
        });
      }

      if (typeof option.is_correct !== 'boolean') {
        errors.push({
          questionId,
          questionIndex: index,
          field: `options[${optIdx}].is_correct`,
          message: 'Option is_correct must be a boolean',
          type: 'error'
        });
      }
    });
  }

  // Validate correct_answer_ids
  if (!Array.isArray(question.correct_answer_ids)) {
    errors.push({
      questionId,
      questionIndex: index,
      field: 'correct_answer_ids',
      message: 'correct_answer_ids must be an array',
      type: 'error'
    });
  } else {
    if (question.correct_answer_ids.length === 0) {
      errors.push({
        questionId,
        questionIndex: index,
        field: 'correct_answer_ids',
        message: 'Must have at least one correct answer',
        type: 'error'
      });
    }

    // Check if correct_answer_ids match option ids
    if (Array.isArray(question.options)) {
      const optionIds = new Set(question.options.map((o: any) => o.id));
      question.correct_answer_ids.forEach((answerId: string) => {
        if (!optionIds.has(answerId)) {
          errors.push({
            questionId,
            questionIndex: index,
            field: 'correct_answer_ids',
            message: `Answer ID "${answerId}" not found in options`,
            type: 'error'
          });
        }
      });

      // Check if options marked as correct match correct_answer_ids
      const markedCorrect = question.options
        .filter((o: any) => o.is_correct)
        .map((o: any) => o.id);

      const correctSet = new Set(question.correct_answer_ids);
      const markedSet = new Set(markedCorrect);

      if (markedCorrect.length !== question.correct_answer_ids.length ||
          !markedCorrect.every((id: string) => correctSet.has(id))) {
        errors.push({
          questionId,
          questionIndex: index,
          field: 'correct_answer_ids',
          message: 'Mismatch between correct_answer_ids and options marked as is_correct',
          type: 'warning'
        });
      }
    }
  }

  // Validate difficulty (optional)
  if (question.difficulty !== undefined) {
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(question.difficulty)) {
      errors.push({
        questionId,
        questionIndex: index,
        field: 'difficulty',
        message: `difficulty must be one of: ${validDifficulties.join(', ')}`,
        type: 'error'
      });
    }
  } else if (ingestionConfig.validation.requireDifficulty) {
    errors.push({
      questionId,
      questionIndex: index,
      field: 'difficulty',
      message: 'difficulty is recommended but missing',
      type: 'warning'
    });
  }

  // Validate explanation (optional)
  if (question.explanation !== undefined) {
    if (typeof question.explanation !== 'string') {
      errors.push({
        questionId,
        questionIndex: index,
        field: 'explanation',
        message: 'explanation must be a string',
        type: 'error'
      });
    }
  } else if (ingestionConfig.validation.requireExplanations) {
    errors.push({
      questionId,
      questionIndex: index,
      field: 'explanation',
      message: 'explanation is recommended but missing',
      type: 'warning'
    });
  }

  return errors;
}

/**
 * Validate all questions
 */
function validateQuestions(questions: BatchQuestion[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  let validCount = 0;

  for (let i = 0; i < questions.length; i++) {
    const errors = validateQuestion(questions[i], i);

    if (errors.filter(e => e.type === 'error').length === 0) {
      validCount++;
    }

    allErrors.push(...errors);
  }

  const errors = allErrors.filter(e => e.type === 'error');
  const warnings = allErrors.filter(e => e.type === 'warning');

  return {
    valid: errors.length === 0,
    totalQuestions: questions.length,
    validQuestions: validCount,
    invalidQuestions: questions.length - validCount,
    errors,
    warnings
  };
}

/**
 * Display validation report
 */
function displayReport(result: ValidationResult) {
  console.log('\n' + chalk.bold('Validation Report:'));
  console.log('='.repeat(60));

  console.log(`\nOverall Status: ${result.valid ? chalk.green('✅ PASS') : chalk.red('❌ FAIL')}`);
  console.log(`Total Questions: ${chalk.cyan(result.totalQuestions)}`);
  console.log(`Valid Questions: ${chalk.green(result.validQuestions)}`);
  console.log(`Invalid Questions: ${result.invalidQuestions > 0 ? chalk.red(result.invalidQuestions) : chalk.gray(result.invalidQuestions)}`);
  console.log(`Errors: ${result.errors.length > 0 ? chalk.red(result.errors.length) : chalk.gray(result.errors.length)}`);
  console.log(`Warnings: ${result.warnings.length > 0 ? chalk.yellow(result.warnings.length) : chalk.gray(result.warnings.length)}`);

  if (result.errors.length > 0) {
    console.log('\n' + chalk.red.bold(`Errors (showing first 20):`));
    console.log('-'.repeat(60));

    result.errors.slice(0, 20).forEach(error => {
      console.log(chalk.red(`  [${error.questionId}] ${error.field}: ${error.message}`));
    });

    if (result.errors.length > 20) {
      console.log(chalk.gray(`  ... and ${result.errors.length - 20} more errors`));
    }
  }

  if (result.warnings.length > 0) {
    console.log('\n' + chalk.yellow.bold(`Warnings (showing first 10):`));
    console.log('-'.repeat(60));

    result.warnings.slice(0, 10).forEach(warning => {
      console.log(chalk.yellow(`  [${warning.questionId}] ${warning.field}: ${warning.message}`));
    });

    if (result.warnings.length > 10) {
      console.log(chalk.gray(`  ... and ${result.warnings.length - 10} more warnings`));
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Main execution
 */
async function main() {
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║              Validate Questions                        ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  const spinner = ora('Reading merged questions...').start();

  try {
    // Read merged questions
    const content = readFileSync(ingestionConfig.outputFile, 'utf-8');
    const questions: BatchQuestion[] = JSON.parse(content);

    spinner.succeed(`Loaded ${questions.length} questions`);

    // Validate
    spinner.start('Validating questions...');

    const result = validateQuestions(questions);

    if (result.valid) {
      spinner.succeed(`All ${questions.length} questions are valid!`);
    } else {
      spinner.warn(`Validation completed with ${result.errors.length} errors`);
    }

    // Display report
    displayReport(result);

    if (result.valid) {
      console.log(chalk.green.bold('✅ Validation passed!\n'));
      process.exit(0);
    } else {
      console.log(chalk.red.bold('❌ Validation failed - please fix errors before ingesting\n'));
      process.exit(1);
    }

  } catch (error: any) {
    spinner.fail('Validation failed');
    console.error(chalk.red.bold('\n❌ Error:\n'));
    console.error(error.message);
    process.exit(1);
  }
}

export { validateQuestions, validateQuestion };

// Run main only if this file is executed directly
if (process.argv[1]?.includes('validate-questions')) {
  main();
}

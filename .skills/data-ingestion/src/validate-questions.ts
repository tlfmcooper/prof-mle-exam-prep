import { Question } from './utils/hash.js';
import { getLogger } from './utils/logger.js';
import { ProgressTracker } from './utils/progress.js';

export type ValidationErrorType =
  | 'missing_required_field'
  | 'invalid_type'
  | 'invalid_value'
  | 'empty_field'
  | 'reference_error';

export interface ValidationError {
  type: ValidationErrorType;
  field: string;
  message: string;
  questionId: string;
  questionIndex?: number;
}

export interface ValidationWarning {
  field: string;
  message: string;
  questionId: string;
  questionIndex?: number;
}

export interface ValidationConfig {
  strict?: boolean;
  requireExplanations?: boolean;
  requireTags?: boolean;
  requireDifficulty?: boolean;
  requireTopicId?: boolean;
  requireSectionId?: boolean;
  allowedTopicIds?: string[];
  allowedSectionIds?: string[];
}

export interface ValidationResult {
  valid: boolean;
  validCount: number;
  invalidCount: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  errorsByType: Record<ValidationErrorType, number>;
}

/**
 * Validate a single question
 */
export function validateQuestion(
  question: any,
  index: number,
  config: ValidationConfig = {}
): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const questionId = question.id || `question_${index}`;

  // Required fields
  const requiredFields = [
    'id',
    'text',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'correct_answer'
  ];

  for (const field of requiredFields) {
    if (!(field in question) || question[field] === undefined || question[field] === null) {
      errors.push({
        type: 'missing_required_field',
        field,
        message: `Missing required field: ${field}`,
        questionId,
        questionIndex: index
      });
    }
  }

  // If missing required fields, return early
  if (errors.length > 0) {
    return { errors, warnings };
  }

  // Validate ID
  if (typeof question.id !== 'string' || question.id.trim() === '') {
    errors.push({
      type: 'invalid_type',
      field: 'id',
      message: 'ID must be a non-empty string',
      questionId,
      questionIndex: index
    });
  }

  // Validate text fields
  const textFields = ['text', 'option_a', 'option_b', 'option_c', 'option_d'];
  for (const field of textFields) {
    if (typeof question[field] !== 'string') {
      errors.push({
        type: 'invalid_type',
        field,
        message: `${field} must be a string`,
        questionId,
        questionIndex: index
      });
    } else if (question[field].trim() === '') {
      errors.push({
        type: 'empty_field',
        field,
        message: `${field} cannot be empty`,
        questionId,
        questionIndex: index
      });
    }
  }

  // Validate correct_answer
  const validAnswers = ['A', 'B', 'C', 'D'];
  if (!validAnswers.includes(question.correct_answer)) {
    errors.push({
      type: 'invalid_value',
      field: 'correct_answer',
      message: `correct_answer must be one of: ${validAnswers.join(', ')}. Got: ${question.correct_answer}`,
      questionId,
      questionIndex: index
    });
  }

  // Validate optional fields
  if (question.explanation !== undefined) {
    if (typeof question.explanation !== 'string') {
      errors.push({
        type: 'invalid_type',
        field: 'explanation',
        message: 'explanation must be a string',
        questionId,
        questionIndex: index
      });
    } else if (question.explanation.trim() === '') {
      warnings.push({
        field: 'explanation',
        message: 'explanation is empty',
        questionId,
        questionIndex: index
      });
    }
  }

  if (question.detailed_explanation !== undefined && typeof question.detailed_explanation !== 'string') {
    errors.push({
      type: 'invalid_type',
      field: 'detailed_explanation',
      message: 'detailed_explanation must be a string',
      questionId,
      questionIndex: index
    });
  }

  // Validate difficulty
  if (question.difficulty !== undefined) {
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(question.difficulty)) {
      errors.push({
        type: 'invalid_value',
        field: 'difficulty',
        message: `difficulty must be one of: ${validDifficulties.join(', ')}. Got: ${question.difficulty}`,
        questionId,
        questionIndex: index
      });
    }
  }

  // Validate arrays
  if (question.tags !== undefined) {
    if (!Array.isArray(question.tags)) {
      errors.push({
        type: 'invalid_type',
        field: 'tags',
        message: 'tags must be an array',
        questionId,
        questionIndex: index
      });
    } else if (question.tags.some((tag: any) => typeof tag !== 'string')) {
      errors.push({
        type: 'invalid_type',
        field: 'tags',
        message: 'all tags must be strings',
        questionId,
        questionIndex: index
      });
    }
  }

  if (question.links !== undefined) {
    if (!Array.isArray(question.links)) {
      errors.push({
        type: 'invalid_type',
        field: 'links',
        message: 'links must be an array',
        questionId,
        questionIndex: index
      });
    } else if (question.links.some((link: any) => typeof link !== 'string')) {
      errors.push({
        type: 'invalid_type',
        field: 'links',
        message: 'all links must be strings',
        questionId,
        questionIndex: index
      });
    }
  }

  // Config-based validation
  if (config.requireExplanations && !question.explanation) {
    warnings.push({
      field: 'explanation',
      message: 'explanation is recommended but missing',
      questionId,
      questionIndex: index
    });
  }

  if (config.requireTags && (!question.tags || question.tags.length === 0)) {
    warnings.push({
      field: 'tags',
      message: 'tags are recommended but missing',
      questionId,
      questionIndex: index
    });
  }

  if (config.requireDifficulty && !question.difficulty) {
    warnings.push({
      field: 'difficulty',
      message: 'difficulty is recommended but missing',
      questionId,
      questionIndex: index
    });
  }

  if (config.requireTopicId && !question.topic_id) {
    warnings.push({
      field: 'topic_id',
      message: 'topic_id is recommended but missing',
      questionId,
      questionIndex: index
    });
  }

  if (config.requireSectionId && !question.section_id) {
    warnings.push({
      field: 'section_id',
      message: 'section_id is recommended but missing',
      questionId,
      questionIndex: index
    });
  }

  // Validate references
  if (config.allowedTopicIds && question.topic_id) {
    if (!config.allowedTopicIds.includes(question.topic_id)) {
      errors.push({
        type: 'reference_error',
        field: 'topic_id',
        message: `topic_id "${question.topic_id}" is not in allowed list`,
        questionId,
        questionIndex: index
      });
    }
  }

  if (config.allowedSectionIds && question.section_id) {
    if (!config.allowedSectionIds.includes(question.section_id)) {
      errors.push({
        type: 'reference_error',
        field: 'section_id',
        message: `section_id "${question.section_id}" is not in allowed list`,
        questionId,
        questionIndex: index
      });
    }
  }

  return { errors, warnings };
}

/**
 * Validate multiple questions
 */
export function validateQuestions(
  questions: Question[],
  config: ValidationConfig = {}
): ValidationResult {
  const logger = getLogger();
  const progress = new ProgressTracker();

  logger.info(`Validating ${questions.length} questions`);

  progress.start('Validating questions', questions.length);

  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];
  let validCount = 0;

  for (let i = 0; i < questions.length; i++) {
    const { errors, warnings } = validateQuestion(questions[i], i, config);

    if (errors.length === 0) {
      validCount++;
    } else {
      allErrors.push(...errors);
    }

    allWarnings.push(...warnings);

    if ((i + 1) % 100 === 0 || i === questions.length - 1) {
      progress.update(i + 1);
    }
  }

  const invalidCount = questions.length - validCount;

  // Count errors by type
  const errorsByType: Record<ValidationErrorType, number> = {
    missing_required_field: 0,
    invalid_type: 0,
    invalid_value: 0,
    empty_field: 0,
    reference_error: 0
  };

  for (const error of allErrors) {
    errorsByType[error.type]++;
  }

  const result: ValidationResult = {
    valid: invalidCount === 0,
    validCount,
    invalidCount,
    errors: allErrors,
    warnings: allWarnings,
    errorsByType
  };

  if (result.valid) {
    progress.succeed(`All ${questions.length} questions are valid`);
  } else {
    progress.warn(
      `Validation complete: ${validCount} valid, ${invalidCount} invalid (${allErrors.length} errors, ${allWarnings.length} warnings)`
    );
  }

  // Log summary
  if (allErrors.length > 0) {
    logger.error(`Found ${allErrors.length} validation errors`);
    logger.debug('Error breakdown:', errorsByType);
  }

  if (allWarnings.length > 0) {
    logger.warn(`Found ${allWarnings.length} validation warnings`);
  }

  return result;
}

/**
 * Get only valid questions from a list
 */
export function filterValidQuestions(
  questions: Question[],
  config: ValidationConfig = {}
): {
  valid: Question[];
  invalid: Question[];
  result: ValidationResult;
} {
  const logger = getLogger();

  logger.info('Filtering valid questions');

  const valid: Question[] = [];
  const invalid: Question[] = [];

  for (let i = 0; i < questions.length; i++) {
    const { errors } = validateQuestion(questions[i], i, config);

    if (errors.length === 0) {
      valid.push(questions[i]);
    } else {
      invalid.push(questions[i]);
    }
  }

  const result = validateQuestions(questions, config);

  logger.success(`Filtered ${valid.length} valid questions (${invalid.length} invalid)`);

  return { valid, invalid, result };
}

/**
 * Generate a validation report
 */
export function generateValidationReport(result: ValidationResult): string {
  let report = '\n';
  report += '=' .repeat(60) + '\n';
  report += '                    VALIDATION REPORT\n';
  report += '='.repeat(60) + '\n\n';

  // Summary
  report += `Overall Status: ${result.valid ? '✅ PASS' : '❌ FAIL'}\n`;
  report += `Valid Questions: ${result.validCount}\n`;
  report += `Invalid Questions: ${result.invalidCount}\n`;
  report += `Total Errors: ${result.errors.length}\n`;
  report += `Total Warnings: ${result.warnings.length}\n\n`;

  // Errors by type
  if (result.errors.length > 0) {
    report += 'Errors by Type:\n';
    report += '-'.repeat(60) + '\n';
    for (const [type, count] of Object.entries(result.errorsByType)) {
      if (count > 0) {
        report += `  ${type.padEnd(30)} : ${count}\n`;
      }
    }
    report += '\n';

    // First 10 errors
    report += 'Sample Errors (first 10):\n';
    report += '-'.repeat(60) + '\n';
    for (const error of result.errors.slice(0, 10)) {
      report += `  [${error.questionId}] ${error.field}: ${error.message}\n`;
    }
    report += '\n';
  }

  // Warnings
  if (result.warnings.length > 0) {
    report += `Sample Warnings (first 10):\n`;
    report += '-'.repeat(60) + '\n';
    for (const warning of result.warnings.slice(0, 10)) {
      report += `  [${warning.questionId}] ${warning.field}: ${warning.message}\n`;
    }
    report += '\n';
  }

  report += '='.repeat(60) + '\n';

  return report;
}

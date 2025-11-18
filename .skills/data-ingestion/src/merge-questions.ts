import { Question, deduplicateByHash, deduplicateById, deduplicateSmart } from './utils/hash.js';
import { findFiles, readQuestionsFile, writeQuestionsFile, FileInfo } from './utils/file-utils.js';
import { getLogger } from './utils/logger.js';
import { ProgressTracker } from './utils/progress.js';

export interface MergeConfig {
  sourceDir: string;
  excludeFiles?: string[];
  filePattern?: string | RegExp;
  recursive?: boolean;
  outputFile?: string;
}

export interface MergeResult {
  totalFiles: number;
  filesProcessed: number;
  filesSkipped: number;
  totalQuestions: number;
  questionsPerFile: Record<string, number>;
  errors: Array<{ file: string; error: string }>;
}

/**
 * Merge multiple question batch files into a single array
 */
export async function mergeQuestionBatches(config: MergeConfig): Promise<{
  questions: Question[];
  result: MergeResult;
}> {
  const logger = getLogger();
  const progress = new ProgressTracker();

  logger.info(`Starting merge from directory: ${config.sourceDir}`);

  // Find matching files
  const pattern = config.filePattern || 'batch_';
  const allFiles = findFiles(config.sourceDir, pattern, config.recursive);

  logger.info(`Found ${allFiles.length} matching files`);

  // Filter out excluded files
  const excludeSet = new Set(config.excludeFiles || []);
  const filesToProcess = allFiles.filter(file => !excludeSet.has(file.name));

  logger.info(`Processing ${filesToProcess.length} files (${excludeSet.size} excluded)`);

  // Initialize result
  const result: MergeResult = {
    totalFiles: allFiles.length,
    filesProcessed: 0,
    filesSkipped: excludeSet.size,
    totalQuestions: 0,
    questionsPerFile: {},
    errors: []
  };

  const allQuestions: Question[] = [];

  // Process each file
  progress.start('Merging question files', filesToProcess.length);

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];

    try {
      logger.debug(`Reading file: ${file.name}`);
      const questions = readQuestionsFile(file.path);

      if (questions.length > 0) {
        allQuestions.push(...questions);
        result.questionsPerFile[file.name] = questions.length;
        result.filesProcessed++;
        logger.debug(`Loaded ${questions.length} questions from ${file.name}`);
      } else {
        logger.warn(`No questions found in ${file.name}`);
        result.errors.push({
          file: file.name,
          error: 'No questions found'
        });
      }
    } catch (error: any) {
      logger.error(`Error processing file ${file.name}`, error.message);
      result.errors.push({
        file: file.name,
        error: error.message
      });
    }

    progress.update(i + 1);
  }

  result.totalQuestions = allQuestions.length;

  progress.succeed(`Merged ${result.totalQuestions} questions from ${result.filesProcessed} files`);

  // Write to output file if specified
  if (config.outputFile) {
    logger.info(`Writing merged questions to ${config.outputFile}`);
    const success = writeQuestionsFile(config.outputFile, allQuestions);

    if (!success) {
      logger.error(`Failed to write output file: ${config.outputFile}`);
    }
  }

  return { questions: allQuestions, result };
}

export type DeduplicationStrategy = 'hash' | 'id' | 'smart';

export interface DeduplicationConfig {
  strategy: DeduplicationStrategy;
  smartThreshold?: number;
}

export interface DeduplicationResult {
  originalCount: number;
  uniqueCount: number;
  duplicatesRemoved: number;
  duplicates: Question[];
}

/**
 * Deduplicate questions using the specified strategy
 */
export function deduplicateQuestions(
  questions: Question[],
  config: DeduplicationConfig
): { unique: Question[]; result: DeduplicationResult } {
  const logger = getLogger();
  const originalCount = questions.length;

  logger.info(`Deduplicating ${originalCount} questions using "${config.strategy}" strategy`);

  let unique: Question[];
  let duplicates: Question[];

  switch (config.strategy) {
    case 'hash':
      ({ unique, duplicates } = deduplicateByHash(questions));
      break;

    case 'id':
      ({ unique, duplicates } = deduplicateById(questions));
      break;

    case 'smart':
      const threshold = config.smartThreshold || 0.9;
      ({ unique, duplicates } = deduplicateSmart(questions, threshold));
      break;

    default:
      logger.warn(`Unknown strategy "${config.strategy}", using hash strategy`);
      ({ unique, duplicates } = deduplicateByHash(questions));
  }

  const result: DeduplicationResult = {
    originalCount,
    uniqueCount: unique.length,
    duplicatesRemoved: duplicates.length,
    duplicates
  };

  logger.success(
    `Removed ${result.duplicatesRemoved} duplicates (${((result.duplicatesRemoved / originalCount) * 100).toFixed(1)}%)`
  );

  // Log first few duplicates if in verbose mode
  if (duplicates.length > 0) {
    logger.debug('Sample duplicates:', duplicates.slice(0, 3).map(q => ({
      id: q.id,
      text: q.text.substring(0, 50) + '...'
    })));
  }

  return { unique, result };
}

/**
 * Merge and deduplicate in one operation
 */
export async function mergeAndDeduplicate(
  mergeConfig: MergeConfig,
  deduplicationConfig: DeduplicationConfig
): Promise<{
  questions: Question[];
  mergeResult: MergeResult;
  deduplicationResult: DeduplicationResult;
}> {
  const logger = getLogger();

  // Step 1: Merge
  logger.info('Step 1: Merging files');
  const { questions: merged, result: mergeResult } = await mergeQuestionBatches(mergeConfig);

  // Step 2: Deduplicate
  logger.info('Step 2: Deduplicating questions');
  const { unique, result: deduplicationResult } = deduplicateQuestions(merged, deduplicationConfig);

  // Write deduplicated questions to output file
  if (mergeConfig.outputFile) {
    logger.info(`Writing ${unique.length} deduplicated questions to ${mergeConfig.outputFile}`);
    writeQuestionsFile(mergeConfig.outputFile, unique);
  }

  return {
    questions: unique,
    mergeResult,
    deduplicationResult
  };
}

/**
 * Get statistics about merged questions
 */
export function getQuestionStatistics(questions: Question[]): {
  total: number;
  byDifficulty: Record<string, number>;
  byTopic: Record<string, number>;
  bySection: Record<string, number>;
  withExplanations: number;
  withTags: number;
  withLinks: number;
} {
  const stats = {
    total: questions.length,
    byDifficulty: {} as Record<string, number>,
    byTopic: {} as Record<string, number>,
    bySection: {} as Record<string, number>,
    withExplanations: 0,
    withTags: 0,
    withLinks: 0
  };

  for (const q of questions) {
    // Difficulty
    if (q.difficulty) {
      stats.byDifficulty[q.difficulty] = (stats.byDifficulty[q.difficulty] || 0) + 1;
    }

    // Topic
    if (q.topic_id) {
      stats.byTopic[q.topic_id] = (stats.byTopic[q.topic_id] || 0) + 1;
    }

    // Section
    if (q.section_id) {
      stats.bySection[q.section_id] = (stats.bySection[q.section_id] || 0) + 1;
    }

    // Metadata
    if (q.explanation || q.detailed_explanation) stats.withExplanations++;
    if (q.tags && q.tags.length > 0) stats.withTags++;
    if (q.links && q.links.length > 0) stats.withLinks++;
  }

  return stats;
}

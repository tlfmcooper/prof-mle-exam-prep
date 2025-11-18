import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Question } from './utils/hash.js';
import { getLogger } from './utils/logger.js';
import { BatchProgressTracker } from './utils/progress.js';

export interface IngestionConfig {
  batchSize?: number;
  dryRun?: boolean;
  tableName?: string;
  upsertOnConflict?: boolean;
  validateForeignKeys?: boolean;
  onProgress?: (current: number, total: number) => void;
}

export interface IngestionError {
  type: 'database' | 'network' | 'validation';
  message: string;
  details: any;
  questionId?: string;
  batchIndex?: number;
}

export interface IngestionResult {
  totalQuestions: number;
  inserted: number;
  updated: number;
  failed: number;
  errors: IngestionError[];
  duration: number;
  batchResults: Array<{
    batchIndex: number;
    success: boolean;
    inserted: number;
    error?: string;
  }>;
}

/**
 * Get Supabase client from environment variables
 */
function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
    );
  }

  return createClient(supabaseUrl, supabaseKey);
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
 * Validate foreign key references
 */
async function validateForeignKeys(
  supabase: SupabaseClient,
  questions: Question[]
): Promise<{ valid: boolean; errors: IngestionError[] }> {
  const logger = getLogger();
  const errors: IngestionError[] = [];

  // Get unique topic IDs and section IDs
  const topicIds = [...new Set(questions.map(q => q.topic_id).filter(Boolean))];
  const sectionIds = [...new Set(questions.map(q => q.section_id).filter(Boolean))];

  // Validate topic IDs
  if (topicIds.length > 0) {
    logger.debug(`Validating ${topicIds.length} topic IDs`);

    const { data: topics, error } = await supabase
      .from('topics')
      .select('id')
      .in('id', topicIds);

    if (error) {
      errors.push({
        type: 'database',
        message: 'Failed to validate topic IDs',
        details: error
      });
    } else {
      const validTopicIds = new Set((topics || []).map(t => t.id));
      const invalidTopicIds = topicIds.filter(id => !validTopicIds.has(id));

      if (invalidTopicIds.length > 0) {
        errors.push({
          type: 'validation',
          message: `Invalid topic IDs: ${invalidTopicIds.join(', ')}`,
          details: { invalidTopicIds }
        });
      }
    }
  }

  // Validate section IDs
  if (sectionIds.length > 0) {
    logger.debug(`Validating ${sectionIds.length} section IDs`);

    const { data: sections, error } = await supabase
      .from('sections')
      .select('id')
      .in('id', sectionIds);

    if (error) {
      errors.push({
        type: 'database',
        message: 'Failed to validate section IDs',
        details: error
      });
    } else {
      const validSectionIds = new Set((sections || []).map(s => s.id));
      const invalidSectionIds = sectionIds.filter(id => !validSectionIds.has(id));

      if (invalidSectionIds.length > 0) {
        errors.push({
          type: 'validation',
          message: `Invalid section IDs: ${invalidSectionIds.join(', ')}`,
          details: { invalidSectionIds }
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Insert a batch of questions
 */
async function insertBatch(
  supabase: SupabaseClient,
  questions: Question[],
  config: IngestionConfig,
  retries: number = 3
): Promise<{ success: boolean; inserted: number; error?: any }> {
  const logger = getLogger();
  const tableName = config.tableName || 'questions';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (config.upsertOnConflict) {
        const { error, count } = await supabase
          .from(tableName)
          .upsert(questions, { onConflict: 'id' });

        if (error) throw error;

        return { success: true, inserted: count || questions.length };
      } else {
        const { error, count } = await supabase
          .from(tableName)
          .insert(questions);

        if (error) throw error;

        return { success: true, inserted: count || questions.length };
      }
    } catch (error: any) {
      logger.warn(`Batch insert attempt ${attempt}/${retries} failed`, error.message);

      if (attempt < retries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        logger.debug(`Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        return { success: false, inserted: 0, error };
      }
    }
  }

  return { success: false, inserted: 0, error: 'Max retries exceeded' };
}

/**
 * Ingest questions into Supabase
 */
export async function ingestQuestions(
  questions: Question[],
  config: IngestionConfig = {}
): Promise<IngestionResult> {
  const logger = getLogger();
  const startTime = Date.now();

  const batchSize = config.batchSize || 100;
  const tableName = config.tableName || 'questions';

  logger.info(`Starting ingestion of ${questions.length} questions`);
  logger.info(`Configuration: batchSize=${batchSize}, dryRun=${config.dryRun}, table=${tableName}`);

  const result: IngestionResult = {
    totalQuestions: questions.length,
    inserted: 0,
    updated: 0,
    failed: 0,
    errors: [],
    duration: 0,
    batchResults: []
  };

  // Dry run - don't actually insert
  if (config.dryRun) {
    logger.info('DRY RUN MODE - No data will be inserted');
    result.inserted = questions.length;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Get Supabase client
  let supabase: SupabaseClient;
  try {
    supabase = getSupabaseClient();
    logger.success('Connected to Supabase');
  } catch (error: any) {
    logger.error('Failed to connect to Supabase', error.message);
    result.errors.push({
      type: 'database',
      message: 'Failed to connect to Supabase',
      details: error
    });
    result.failed = questions.length;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Validate foreign keys
  if (config.validateForeignKeys) {
    logger.info('Validating foreign key references');
    const validation = await validateForeignKeys(supabase, questions);

    if (!validation.valid) {
      logger.error('Foreign key validation failed');
      result.errors.push(...validation.errors);
      result.failed = questions.length;
      result.duration = Date.now() - startTime;
      return result;
    }

    logger.success('Foreign key validation passed');
  }

  // Split into batches
  const batches = batchArray(questions, batchSize);
  logger.info(`Split into ${batches.length} batches of ${batchSize}`);

  // Progress tracking
  const progress = new BatchProgressTracker(questions.length, batchSize);
  progress.start(`Ingesting questions into ${tableName}`);

  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchIndex = i + 1;

    logger.debug(`Processing batch ${batchIndex}/${batches.length} (${batch.length} questions)`);

    const batchResult = await insertBatch(supabase, batch, config);

    result.batchResults.push({
      batchIndex,
      success: batchResult.success,
      inserted: batchResult.inserted,
      error: batchResult.error?.message
    });

    if (batchResult.success) {
      result.inserted += batchResult.inserted;
      logger.debug(`Batch ${batchIndex} inserted successfully`);
    } else {
      result.failed += batch.length;
      logger.error(`Batch ${batchIndex} failed`, batchResult.error);

      result.errors.push({
        type: 'database',
        message: `Batch ${batchIndex} insertion failed`,
        details: batchResult.error,
        batchIndex
      });
    }

    // Update progress
    progress.updateBatch(batchIndex, batch.length);

    // Call progress callback
    if (config.onProgress) {
      config.onProgress(
        Math.min((batchIndex * batchSize), questions.length),
        questions.length
      );
    }

    // Small delay between batches to avoid rate limits
    if (i < batches.length - 1) {
      await sleep(100);
    }
  }

  result.duration = Date.now() - startTime;

  if (result.failed === 0) {
    progress.succeed(`Successfully inserted ${result.inserted} questions`);
    logger.success(`Ingestion completed: ${result.inserted} inserted, ${result.failed} failed`);
  } else {
    progress.fail(`Ingestion completed with errors: ${result.inserted} inserted, ${result.failed} failed`);
    logger.error(`Ingestion had errors: ${result.errors.length} errors`);
  }

  return result;
}

/**
 * Check if questions already exist in database
 */
export async function checkExistingQuestions(
  questionIds: string[],
  tableName: string = 'questions'
): Promise<{
  existing: string[];
  new: string[];
}> {
  const logger = getLogger();

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .in('id', questionIds);

    if (error) throw error;

    const existingIds = new Set((data || []).map(q => q.id));
    const existing = questionIds.filter(id => existingIds.has(id));
    const newIds = questionIds.filter(id => !existingIds.has(id));

    logger.info(`Found ${existing.length} existing questions, ${newIds.length} new questions`);

    return { existing, new: newIds };
  } catch (error: any) {
    logger.error('Failed to check existing questions', error.message);
    return { existing: [], new: questionIds };
  }
}

/**
 * Delete questions by IDs
 */
export async function deleteQuestions(
  questionIds: string[],
  tableName: string = 'questions'
): Promise<{ success: boolean; deleted: number; error?: any }> {
  const logger = getLogger();

  logger.warn(`Deleting ${questionIds.length} questions from ${tableName}`);

  try {
    const supabase = getSupabaseClient();

    const { error, count } = await supabase
      .from(tableName)
      .delete()
      .in('id', questionIds);

    if (error) throw error;

    logger.success(`Deleted ${count} questions`);

    return { success: true, deleted: count || 0 };
  } catch (error: any) {
    logger.error('Failed to delete questions', error.message);
    return { success: false, deleted: 0, error };
  }
}

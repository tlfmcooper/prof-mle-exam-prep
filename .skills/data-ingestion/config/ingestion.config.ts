import { join } from 'path';
import { MergeConfig } from '../src/merge-questions.js';
import { ValidationConfig } from '../src/validate-questions.js';
import { IngestionConfig } from '../src/ingest-to-supabase.js';
import { DeduplicationStrategy } from '../src/merge-questions.js';

export interface FullIngestionConfig {
  // Source files
  sourceDir: string;
  excludeFiles: string[];
  filePattern: string | RegExp;
  recursive: boolean;

  // Output
  outputFile: string;
  saveReport: boolean;
  reportPath: string;

  // Processing
  batchSize: number;
  deduplication: {
    enabled: boolean;
    strategy: DeduplicationStrategy;
    smartThreshold: number;
  };

  // Validation
  validation: ValidationConfig;

  // Supabase
  supabase: {
    tableName: string;
    upsertOnConflict: boolean;
    validateForeignKeys: boolean;
  };

  // Logging
  logging: {
    verbose: boolean;
    saveReport: boolean;
    reportPath: string;
  };
}

/**
 * Default configuration for question data ingestion
 */
export const ingestionConfig: FullIngestionConfig = {
  // Source files
  sourceDir: './miscellaneous_files',
  excludeFiles: [
    'batch_1_0.json',  // Already in database
    'seed.sql',
    '.gitkeep'
  ],
  filePattern: /batch_.*\.json$/,
  recursive: false,

  // Output
  outputFile: './data/merged-questions.json',
  saveReport: true,
  reportPath: './data/ingestion-report.json',

  // Processing
  batchSize: 100,
  deduplication: {
    enabled: true,
    strategy: 'hash',
    smartThreshold: 0.9
  },

  // Validation
  validation: {
    strict: true,
    requireExplanations: false,
    requireTags: false,
    requireDifficulty: false,
    requireTopicId: false,
    requireSectionId: false
  },

  // Supabase
  supabase: {
    tableName: 'questions',
    upsertOnConflict: false,
    validateForeignKeys: false  // Set to true if topics/sections exist
  },

  // Logging
  logging: {
    verbose: false,
    saveReport: true,
    reportPath: './data/ingestion-log.json'
  }
};

/**
 * Get merge configuration from full config
 */
export function getMergeConfig(config: FullIngestionConfig): MergeConfig {
  return {
    sourceDir: config.sourceDir,
    excludeFiles: config.excludeFiles,
    filePattern: config.filePattern,
    recursive: config.recursive,
    outputFile: config.outputFile
  };
}

/**
 * Get validation configuration from full config
 */
export function getValidationConfig(config: FullIngestionConfig): ValidationConfig {
  return config.validation;
}

/**
 * Get ingestion configuration from full config
 */
export function getIngestionConfig(config: FullIngestionConfig): IngestionConfig {
  return {
    batchSize: config.batchSize,
    tableName: config.supabase.tableName,
    upsertOnConflict: config.supabase.upsertOnConflict,
    validateForeignKeys: config.supabase.validateForeignKeys,
    dryRun: false  // Set by CLI args
  };
}

/**
 * Configuration for test ingestion (small sample)
 */
export const testIngestionConfig: FullIngestionConfig = {
  ...ingestionConfig,
  batchSize: 10,
  outputFile: './data/test-questions.json',
  reportPath: './data/test-ingestion-report.json',
  logging: {
    verbose: true,
    saveReport: true,
    reportPath: './data/test-ingestion-log.json'
  }
};

/**
 * Configuration presets for different scenarios
 */
export const configPresets = {
  /**
   * Strict validation, no duplicates allowed
   */
  strict: {
    ...ingestionConfig,
    validation: {
      strict: true,
      requireExplanations: true,
      requireTags: true,
      requireDifficulty: true,
      requireTopicId: true,
      requireSectionId: true
    },
    deduplication: {
      enabled: true,
      strategy: 'hash' as const,
      smartThreshold: 0.95
    }
  },

  /**
   * Lenient validation, allow duplicates
   */
  lenient: {
    ...ingestionConfig,
    validation: {
      strict: false,
      requireExplanations: false,
      requireTags: false,
      requireDifficulty: false
    },
    deduplication: {
      enabled: false,
      strategy: 'hash' as const,
      smartThreshold: 0.9
    }
  },

  /**
   * Fast ingestion, minimal validation
   */
  fast: {
    ...ingestionConfig,
    batchSize: 500,
    validation: {
      strict: false,
      requireExplanations: false,
      requireTags: false,
      requireDifficulty: false
    },
    deduplication: {
      enabled: true,
      strategy: 'id' as const,  // Faster than hash
      smartThreshold: 0.9
    },
    supabase: {
      tableName: 'questions',
      upsertOnConflict: true,  // Allow updates
      validateForeignKeys: false
    }
  },

  /**
   * Development/testing configuration
   */
  development: {
    ...ingestionConfig,
    batchSize: 10,
    logging: {
      verbose: true,
      saveReport: true,
      reportPath: './data/dev-ingestion-log.json'
    },
    outputFile: './data/dev-questions.json'
  }
};

/**
 * Load configuration from environment or use defaults
 */
export function loadConfig(preset?: keyof typeof configPresets): FullIngestionConfig {
  if (preset && configPresets[preset]) {
    return configPresets[preset];
  }

  return ingestionConfig;
}

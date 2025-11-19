export interface IngestionConfig {
  // Source files
  sourceDir: string;
  excludeFiles: string[];
  filePattern: RegExp;
  recursive: boolean;

  // Output
  outputFile: string;
  saveReport: boolean;
  reportPath: string;

  // Processing
  batchSize: number;
  deduplication: {
    enabled: boolean;
    strategy: 'hash' | 'id' | 'smart';
    smartThreshold: number;
  };

  // Validation
  validation: {
    strict: boolean;
    requireExplanations: boolean;
    requireDifficulty: boolean;
  };

  // Supabase
  supabase: {
    tableName: string;
    upsertOnConflict: boolean;
  };

  // Logging
  logging: {
    verbose: boolean;
  };
}

/**
 * Default configuration for question data ingestion
 */
export const ingestionConfig: IngestionConfig = {
  // Source files - use relative paths from project root
  sourceDir: './qdb',
  excludeFiles: [
    'analytics.jpg',
    'claude_code_skill.txt',
    'GENERATION_PROGRESS.md',
  ],
  filePattern: /.*_batch.json$/,
  recursive: false,

  // Output
  outputFile: './data/improved-questions.json',
  saveReport: true,
  reportPath: './data/ingestion-report.json',

  // Processing
  batchSize: 100,
  deduplication: {
    enabled: true,
    strategy: 'id',  // Use ID-based deduplication
    smartThreshold: 0.9
  },

  // Validation
  validation: {
    strict: true,
    requireExplanations: false,
    requireDifficulty: false
  },

  // Supabase
  supabase: {
    tableName: 'questions',
    upsertOnConflict: false
  },

  // Logging
  logging: {
    verbose: false
  }
};

/**
 * Configuration presets
 */
export const configPresets = {
  /**
   * Strict validation, no duplicates
   */
  strict: {
    ...ingestionConfig,
    validation: {
      strict: true,
      requireExplanations: true,
      requireDifficulty: true
    },
    deduplication: {
      enabled: true,
      strategy: 'hash' as const,
      smartThreshold: 0.95
    }
  },

  /**
   * Fast ingestion with minimal validation
   */
  fast: {
    ...ingestionConfig,
    batchSize: 500,
    validation: {
      strict: false,
      requireExplanations: false,
      requireDifficulty: false
    },
    deduplication: {
      enabled: true,
      strategy: 'id' as const,
      smartThreshold: 0.9
    },
    supabase: {
      tableName: 'questions',
      upsertOnConflict: true
    }
  },

  /**
   * Development/testing configuration
   */
  development: {
    ...ingestionConfig,
    batchSize: 10,
    logging: {
      verbose: true
    }
  }
};

/**
 * Load configuration from preset or use default
 */
export function loadConfig(preset?: keyof typeof configPresets): IngestionConfig {
  if (preset && configPresets[preset]) {
    return configPresets[preset];
  }
  return ingestionConfig;
}

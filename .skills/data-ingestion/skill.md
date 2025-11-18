# Data Ingestion Skill

## Overview

A comprehensive skill for handling bulk question data ingestion for exam preparation applications. This skill provides robust patterns for merging, validating, deduplicating, and inserting question data into Supabase.

## Purpose

- **Merge** multiple JSON batch files into a single dataset
- **Validate** question schema and data integrity
- **Deduplicate** questions using multiple strategies
- **Insert** questions into Supabase programmatically
- **Handle** errors and transactions gracefully
- **Provide** reusable patterns for future data batches

## Use Cases

1. **Bulk Import**: Import 1000+ questions from multiple JSON files
2. **Data Migration**: Move questions from legacy formats to new schema
3. **Incremental Updates**: Add new question batches without duplicates
4. **Data Cleaning**: Validate and fix question data before insertion
5. **Testing**: Generate test datasets for development

## Architecture

```
.skills/data-ingestion/
├── skill.md                          # This file
├── config/
│   └── ingestion.config.ts           # Configuration settings
├── src/
│   ├── merge-questions.ts            # Merge multiple JSON files
│   ├── validate-questions.ts         # Schema validation
│   ├── ingest-to-supabase.ts         # Database insertion
│   └── utils/
│       ├── logger.ts                 # Structured logging
│       ├── hash.ts                   # Deduplication hashing
│       ├── file-utils.ts             # File operations
│       └── progress.ts               # Progress indicators
└── scripts/
    ├── ingest-all.ts                 # Main ingestion pipeline
    └── test-ingestion.ts             # Test with sample data
```

## Quick Start

### 1. Install Dependencies

```bash
npm install tsx chalk ora commander hash-sum --save-dev
```

### 2. Prepare Your Data

Place JSON batch files in a directory (e.g., `./miscellaneous_files/`):

```
miscellaneous_files/
├── batch_1_1_questions.json
├── batch_2_0.json
├── batch_3_1.json
└── ...
```

### 3. Run Dry Run (Test Mode)

```bash
npx tsx scripts/ingest-all.ts --dry-run --verbose
```

### 4. Run Full Ingestion

```bash
npx tsx scripts/ingest-all.ts
```

## Data Schema

### Question Interface

```typescript
interface Question {
  // Required fields
  id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';

  // Optional fields
  explanation?: string;
  detailed_explanation?: string;
  tags?: string[];
  links?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  section_id?: string;
  topic_id?: string;

  // Metadata
  created_at?: string;
  updated_at?: string;
}
```

### JSON File Formats Supported

**Format 1: Array of questions**
```json
[
  { "id": "q1", "text": "...", ... },
  { "id": "q2", "text": "...", ... }
]
```

**Format 2: Object with questions key**
```json
{
  "questions": [
    { "id": "q1", "text": "...", ... },
    { "id": "q2", "text": "...", ... }
  ]
}
```

## Core Functions

### 1. Merge Questions

Combines multiple JSON files into a single array.

```typescript
import { mergeQuestionBatches } from './.skills/data-ingestion/src/merge-questions';

const merged = await mergeQuestionBatches({
  sourceDir: './miscellaneous_files',
  excludeFiles: ['batch_1_0.json'],
  outputFile: './data/merged-questions.json'
});

console.log(`Merged ${merged.length} questions from ${fileCount} files`);
```

**Features:**
- Recursive directory search
- Pattern matching for batch files
- Handles multiple JSON structures
- Robust error handling for malformed JSON
- Preserves question metadata

### 2. Validate Questions

Validates question schema and data integrity.

```typescript
import { validateQuestions } from './.skills/data-ingestion/src/validate-questions';

const result = validateQuestions(questions, {
  strict: true,
  requireExplanations: true,
  requireTags: false
});

console.log(`Valid: ${result.validCount}`);
console.log(`Errors: ${result.errors.length}`);
console.log(`Warnings: ${result.warnings.length}`);
```

**Validation Rules:**
- ✅ Required fields present
- ✅ Data types correct
- ✅ No empty strings
- ✅ Correct answer is A/B/C/D
- ✅ Referenced IDs exist (topics, sections)
- ⚠️  Optional fields (warnings only)

### 3. Deduplicate Questions

Removes duplicate questions using configurable strategies.

```typescript
import { deduplicateQuestions } from './.skills/data-ingestion/src/merge-questions';

const unique = deduplicateQuestions(questions, {
  strategy: 'hash', // 'hash' | 'id' | 'smart'
  threshold: 0.9     // For smart matching
});

console.log(`Removed ${questions.length - unique.length} duplicates`);
```

**Strategies:**
- **hash**: Hash question text + correct answer (exact matches)
- **id**: Use question ID field
- **smart**: Detect near-duplicates (>90% similar text)

### 4. Ingest to Supabase

Inserts questions into Supabase with batching and error handling.

```typescript
import { ingestQuestions } from './.skills/data-ingestion/src/ingest-to-supabase';

const result = await ingestQuestions(questions, {
  batchSize: 100,
  dryRun: false,
  onProgress: (current, total) => {
    console.log(`Progress: ${current}/${total} (${(current/total*100).toFixed(1)}%)`);
  }
});

console.log(`Inserted: ${result.inserted}`);
console.log(`Failed: ${result.failed}`);
```

**Features:**
- Batched insertions (configurable size)
- Transaction support
- Upsert strategy (insert or update)
- Progress tracking
- Error recovery per batch
- Foreign key validation

## Error Handling

### Error Types

```typescript
class IngestionError extends Error {
  type: 'file' | 'parse' | 'validation' | 'database' | 'network';
  details: any;
  recoverable: boolean;
}
```

### Error Strategies

| Error Type | Strategy | Action |
|------------|----------|--------|
| File read | Skip file | Log and continue with other files |
| JSON parse | Skip file | Show file path and error line |
| Validation | Collect all | Don't fail fast, show all errors |
| Database | Rollback batch | Retry with exponential backoff |
| Network | Retry | 3 attempts with backoff |

### Example Error Output

```
❌ Error processing batch_3_2.json
   Type: parse
   Line: 45
   Details: Unexpected token } in JSON at position 1245
   Action: Skipped file, continuing with others

⚠️  Validation warning for question q_ml_234
   Field: explanation
   Issue: Missing explanation (optional field)
   Action: Question will be inserted without explanation
```

## Configuration

Edit `.skills/data-ingestion/config/ingestion.config.ts`:

```typescript
export const ingestionConfig = {
  // Source files
  sourceDir: './miscellaneous_files',
  excludeFiles: ['batch_1_0.json', 'seed.sql'],
  filePattern: 'batch_*.json',

  // Output
  outputFile: './data/merged-questions.json',

  // Processing
  batchSize: 100,
  deduplication: {
    enabled: true,
    strategy: 'hash' as const,
    smartThreshold: 0.9
  },

  // Validation
  validation: {
    strict: true,
    requireExplanations: false,
    requireTags: false,
    requireDifficulty: false
  },

  // Supabase
  supabase: {
    tableName: 'questions',
    upsertOnConflict: false,
    validateForeignKeys: true
  },

  // Logging
  logging: {
    verbose: false,
    saveReport: true,
    reportPath: './data/ingestion-report.json'
  }
};
```

## CLI Commands

### Main Ingestion Pipeline

```bash
# Full pipeline with all steps
npx tsx scripts/ingest-all.ts

# Dry run (validate only, don't insert)
npx tsx scripts/ingest-all.ts --dry-run

# Verbose output
npx tsx scripts/ingest-all.ts --verbose

# Custom source directory
npx tsx scripts/ingest-all.ts --source ./my-questions

# Skip deduplication
npx tsx scripts/ingest-all.ts --no-dedup

# Custom batch size
npx tsx scripts/ingest-all.ts --batch-size 500
```

### Test Ingestion

```bash
# Test with first 10 questions
npx tsx scripts/test-ingestion.ts

# Test with specific file
npx tsx scripts/test-ingestion.ts --file batch_2_1.json

# Test with custom sample size
npx tsx scripts/test-ingestion.ts --sample 50
```

## Ingestion Report

After each run, a detailed report is generated:

```json
{
  "timestamp": "2025-01-17T10:30:00.000Z",
  "duration": 45.2,
  "filesProcessed": 18,
  "questionsFound": 1247,
  "duplicatesRemoved": 23,
  "validationErrors": 5,
  "validationWarnings": 12,
  "questionsInserted": 1219,
  "questionsFailed": 5,
  "errors": [
    {
      "type": "validation",
      "questionId": "q_ml_567",
      "message": "Missing required field: text",
      "details": {...}
    }
  ],
  "warnings": [...],
  "statistics": {
    "avgQuestionsPerFile": 69.3,
    "duplicateRate": 1.8,
    "errorRate": 0.4
  }
}
```

## Future Batch Workflow

When you receive new question batches:

### 1. Add Files

```bash
# Copy new batch files to source directory
cp new_batches/*.json ./miscellaneous_files/
```

### 2. Update Exclusions (if needed)

Edit config to exclude already-imported files:

```typescript
excludeFiles: ['batch_1_0.json', 'batch_1_1.json', ...]
```

### 3. Run Dry Run

```bash
npx tsx scripts/ingest-all.ts --dry-run --verbose
```

Review the output for errors and warnings.

### 4. Run Full Ingestion

```bash
npx tsx scripts/ingest-all.ts
```

### 5. Verify in Supabase

Check the Supabase dashboard to ensure questions were inserted correctly.

### 6. Commit Merged File

```bash
git add data/merged-questions.json data/ingestion-report.json
git commit -m "feat: add batch_7 questions (234 new questions)"
git push
```

## Advanced Usage

### Custom Validation Rules

Add custom validation in `validate-questions.ts`:

```typescript
function validateCustomRules(question: Question): ValidationError[] {
  const errors: ValidationError[] = [];

  // Example: Ensure explanations are at least 50 characters
  if (question.explanation && question.explanation.length < 50) {
    errors.push({
      type: 'validation',
      field: 'explanation',
      message: 'Explanation too short (min 50 chars)',
      questionId: question.id
    });
  }

  // Example: Ensure ML questions have ML-related tags
  if (question.text.includes('machine learning') && !question.tags?.includes('ml')) {
    errors.push({
      type: 'validation',
      field: 'tags',
      message: 'ML question missing "ml" tag',
      questionId: question.id
    });
  }

  return errors;
}
```

### Custom Deduplication

Implement custom deduplication logic:

```typescript
function customDeduplication(questions: Question[]): Question[] {
  const seen = new Map<string, Question>();

  for (const q of questions) {
    // Custom key: first 50 chars of text + difficulty
    const key = `${q.text.substring(0, 50)}_${q.difficulty}`;

    if (!seen.has(key)) {
      seen.set(key, q);
    } else {
      // Keep the one with better explanation
      const existing = seen.get(key)!;
      if ((q.explanation?.length || 0) > (existing.explanation?.length || 0)) {
        seen.set(key, q);
      }
    }
  }

  return Array.from(seen.values());
}
```

### Progress Callbacks

Track progress in real-time:

```typescript
import ora from 'ora';

const spinner = ora('Ingesting questions...').start();

await ingestQuestions(questions, {
  batchSize: 100,
  onProgress: (current, total) => {
    const percent = (current / total * 100).toFixed(1);
    spinner.text = `Ingesting questions... ${current}/${total} (${percent}%)`;
  }
});

spinner.succeed('All questions ingested!');
```

## Troubleshooting

### Issue: "File not found" errors

**Solution:** Check the `sourceDir` path in config. Use absolute paths if relative paths don't work.

```typescript
sourceDir: path.join(__dirname, '../../miscellaneous_files')
```

### Issue: Validation errors for all questions

**Solution:** Check your question schema matches the expected format. Run with `--verbose` to see detailed validation errors.

### Issue: Database connection errors

**Solution:** Verify Supabase credentials in environment variables:

```bash
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Issue: Out of memory on large batches

**Solution:** Reduce batch size in config:

```typescript
batchSize: 50  // Reduce from 100
```

### Issue: Slow ingestion

**Solution:** Increase batch size (be careful not to exceed Supabase limits):

```typescript
batchSize: 500  // Increase from 100
```

## Performance Tips

1. **Batch Size**: 100-500 questions per batch is optimal
2. **Deduplication**: Use hash strategy for speed, smart for accuracy
3. **Validation**: Disable strict mode for faster processing
4. **Parallel Processing**: Process files in parallel (future enhancement)
5. **Indexing**: Ensure database has proper indexes on question IDs

## Dependencies

```json
{
  "devDependencies": {
    "tsx": "^4.7.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.1",
    "commander": "^11.1.0",
    "hash-sum": "^2.0.0"
  }
}
```

## Examples

### Example 1: Import New Batch

```typescript
import { mergeQuestionBatches, deduplicateQuestions } from './.skills/data-ingestion/src/merge-questions';
import { validateQuestions } from './.skills/data-ingestion/src/validate-questions';
import { ingestQuestions } from './.skills/data-ingestion/src/ingest-to-supabase';

async function importNewBatch() {
  // Step 1: Merge all files
  const questions = await mergeQuestionBatches({
    sourceDir: './miscellaneous_files',
    excludeFiles: ['batch_1_0.json'],
    outputFile: './data/merged.json'
  });

  // Step 2: Deduplicate
  const unique = deduplicateQuestions(questions, { strategy: 'hash' });

  // Step 3: Validate
  const validation = validateQuestions(unique);
  if (validation.errors.length > 0) {
    console.error('Validation errors:', validation.errors);
    return;
  }

  // Step 4: Ingest
  const result = await ingestQuestions(unique, {
    batchSize: 100,
    dryRun: false
  });

  console.log(`Success! Inserted ${result.inserted} questions`);
}
```

### Example 2: Validate Existing Data

```typescript
import { validateQuestions } from './.skills/data-ingestion/src/validate-questions';
import { readFileSync } from 'fs';

const questions = JSON.parse(readFileSync('./data/questions.json', 'utf-8'));

const result = validateQuestions(questions, {
  strict: true,
  requireExplanations: true
});

console.log('Validation Report:');
console.log(`✅ Valid: ${result.validCount}`);
console.log(`❌ Errors: ${result.errors.length}`);
console.log(`⚠️  Warnings: ${result.warnings.length}`);

// Show first 5 errors
result.errors.slice(0, 5).forEach(err => {
  console.log(`  ${err.questionId}: ${err.message}`);
});
```

## License

This skill is part of the Professional ML Engineer Exam Prep project.

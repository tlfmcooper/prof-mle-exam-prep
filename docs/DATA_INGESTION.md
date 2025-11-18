# Question Data Ingestion Pipeline

Complete guide for ingesting question batches into the database.

## Overview

The data ingestion pipeline consists of three main steps:

1. **Merge** - Combine multiple JSON batch files
2. **Validate** - Check data integrity and schema compliance
3. **Ingest** - Transform and insert into Supabase

## Quick Start

```bash
# 1. Test with a small sample first
npm run test-ingestion

# 2. Run full pipeline in dry-run mode (no database insertion)
npm run ingest-all:dry-run

# 3. If everything looks good, run actual ingestion
npm run ingest-all
```

## Pipeline Steps

### Step 1: Merge Batch Files

Combines all `batch_*.json` files from `miscellaneous_files/` directory.

**What it does:**
- Finds all batch files matching pattern
- Excludes already-imported files (configured in `config/ingestion.config.ts`)
- Deduplicates questions by ID
- Saves merged output to `data/merged-questions.json`

**Run manually:**
```bash
npm run merge-questions
```

### Step 2: Validate Questions

Validates merged questions against expected schema.

**Validation checks:**
- ✅ Required fields present (id, question_text, question_type, options, correct_answer_ids)
- ✅ Field types correct (strings, arrays, booleans)
- ✅ No empty strings
- ✅ Options array has at least 2 items
- ✅ correct_answer_ids match option IDs
- ✅ is_correct flags match correct_answer_ids
- ⚠️  Optional fields (explanation, difficulty) if configured

**Run manually:**
```bash
npm run validate-questions
```

### Step 3: Ingest to Supabase

Transforms and inserts questions into the database.

**Transformation:**
```typescript
// From batch format:
{
  id: "q021",
  question_text: "...",
  options: [
    { id: "A", text: "...", is_correct: true },
    { id: "B", text: "...", is_correct: false }
  ],
  correct_answer_ids: ["A"],
  source: { pdf_name: "...", page_number: 15 }
}

// To database format:
{
  id: "q021",
  question_text: "...",
  options: [...],  // JSON field
  source: "...",
  source_page: 15
}
```

**Features:**
- Batched insertions (100 questions per batch)
- Retry logic with exponential backoff (3 attempts)
- Progress tracking with spinners
- Error reporting per batch

**Run manually:**
```bash
npm run ingest-questions
npm run ingest-questions -- --dry-run  # Test without inserting
```

## Configuration

Edit `config/ingestion.config.ts` to customize:

```typescript
export const ingestionConfig = {
  // Source files
  sourceDir: './miscellaneous_files',
  excludeFiles: ['batch_1_0.json'],  // Already in DB
  filePattern: /^batch_.*\.json$/,

  // Output
  outputFile: './data/merged-questions.json',
  reportPath: './data/ingestion-report.json',

  // Processing
  batchSize: 100,
  deduplication: {
    enabled: true,
    strategy: 'id'  // or 'hash'
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
  }
};
```

### Configuration Presets

Use built-in presets for common scenarios:

```bash
# Strict: All validations, high dedup threshold
npm run ingest-all -- --preset strict

# Fast: Minimal validation, large batches, upsert mode
npm run ingest-all -- --preset fast

# Development: Verbose logging, small batches
npm run ingest-all -- --preset development
```

## Adding New Question Batches

Follow this workflow when you receive new question batches:

### 1. Add Files

Place new batch files in `miscellaneous_files/`:

```bash
cp ~/Downloads/batch_7_1.json miscellaneous_files/
cp ~/Downloads/batch_7_2.json miscellaneous_files/
```

### 2. Update Configuration

Edit `config/ingestion.config.ts` to exclude already-imported files:

```typescript
excludeFiles: [
  'batch_1_0.json',   // Already in DB
  'batch_2_1.json',   // Already in DB
  // ... add previously imported files
]
```

### 3. Test with Sample

```bash
npm run test-ingestion
```

Review the output carefully:
- Check sample transformation
- Verify validation passes
- Confirm field mappings

### 4. Dry Run

```bash
npm run ingest-all:dry-run
```

This will:
- Merge all files
- Validate all questions
- Show what would be inserted (without actually inserting)

### 5. Review Dry Run Output

Check for:
- ✅ All files processed successfully
- ✅ No validation errors
- ✅ Reasonable duplicate count
- ✅ Correct total question count

### 6. Run Full Ingestion

If dry run looks good:

```bash
npm run ingest-all
```

### 7. Verify in Supabase

1. Open Supabase dashboard
2. Go to Table Editor → questions
3. Check that questions were inserted
4. Verify a few random questions manually

### 8. Commit Results

```bash
git add data/merged-questions.json data/ingestion-report.json
git commit -m "feat: add batch_7 questions (245 new questions)"
git push
```

## Command Reference

### Main Pipeline

```bash
# Run complete pipeline
npm run ingest-all

# Dry run (no database insertion)
npm run ingest-all:dry-run

# Verbose output
npm run ingest-all -- --verbose
```

### Individual Steps

```bash
# Merge batch files
npm run merge-questions

# Validate merged questions
npm run validate-questions

# Ingest to database
npm run ingest-questions

# Ingest dry run
npm run ingest-questions -- --dry-run
```

### Testing

```bash
# Test with 5 questions
npm run test-ingestion

# Test with custom sample size
npm run test-ingestion -- --sample 10
```

## Output Files

After running the pipeline:

### data/merged-questions.json
```json
[
  {
    "id": "q021",
    "question_text": "...",
    "question_type": "multiple_choice",
    "options": [...],
    "correct_answer_ids": ["A"],
    "explanation": "...",
    "difficulty": "medium"
  }
]
```

### data/ingestion-report.json
```json
{
  "timestamp": "2025-01-17T10:30:00Z",
  "dryRun": false,
  "merge": {
    "totalFiles": 22,
    "filesProcessed": 21,
    "totalQuestions": 1247,
    "duplicatesRemoved": 12
  },
  "validation": {
    "validQuestions": 1235,
    "invalidQuestions": 0,
    "errorCount": 0,
    "warningCount": 5
  },
  "ingestion": {
    "totalQuestions": 1235,
    "inserted": 1235,
    "failed": 0
  },
  "duration": 45230,
  "success": true
}
```

## Troubleshooting

### Error: Missing Supabase credentials

**Solution:** Create `.env` file with:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Error: File not found

**Problem:** Config points to wrong directory

**Solution:** Check `sourceDir` in `config/ingestion.config.ts`:
```typescript
sourceDir: join(__dirname, '../miscellaneous_files')  // Correct path
```

### Validation errors

**Problem:** Questions don't match expected schema

**Solution:** Run with verbose to see details:
```bash
npm run validate-questions
```

Review errors and fix source files, or update validation config if schema changed.

### Database errors

**Problem:** Insertion fails with foreign key or constraint errors

**Solutions:**

1. **Check database connection:**
   ```bash
   # Test Supabase connection
   npm run ingest-questions -- --dry-run
   ```

2. **Reduce batch size:**
   ```typescript
   // In config/ingestion.config.ts
   batchSize: 50  // Instead of 100
   ```

3. **Check for duplicate IDs:**
   ```bash
   # Questions table has unique constraint on id
   # Use upsert mode to update existing:
   npm run ingest-questions -- --upsert
   ```

### Duplicate questions

**Problem:** Same question appears multiple times

**Solutions:**

1. **Enable deduplication:**
   ```typescript
   deduplication: {
     enabled: true,
     strategy: 'id'  // Remove duplicates by ID
   }
   ```

2. **Use hash strategy for content-based dedup:**
   ```typescript
   deduplication: {
     enabled: true,
     strategy: 'hash'  // Remove duplicates by content
   }
   ```

## Advanced Usage

### Custom Validation Rules

Edit `scripts/validate-questions.ts` to add custom checks:

```typescript
// Example: Ensure all questions have at least 4 options
if (question.options.length < 4) {
  errors.push({
    questionId,
    field: 'options',
    message: 'Must have exactly 4 options (A, B, C, D)',
    type: 'error'
  });
}
```

### Custom Transformation

Edit `scripts/ingest-to-supabase.ts` to modify data before insertion:

```typescript
function transformQuestion(batchQuestion: BatchQuestion): DBQuestionInsert {
  return {
    id: batchQuestion.id,
    question_text: batchQuestion.question_text,
    // Add custom transformation here
    custom_field: processCustomField(batchQuestion),
    ...
  };
}
```

### Batch Processing Strategy

For very large datasets (10,000+ questions):

1. **Split into multiple runs:**
   ```bash
   # Process batch_1_*.json first
   npm run ingest-all

   # Then batch_2_*.json
   # Update excludeFiles to include batch_1_*
   npm run ingest-all
   ```

2. **Increase batch size:**
   ```typescript
   batchSize: 500  // Process more per batch
   ```

3. **Use upsert mode:**
   ```typescript
   supabase: {
     upsertOnConflict: true  // Allow updates
   }
   ```

## Schema

### Batch File Format

```typescript
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
    page_number?: number;
    section?: string;
  };
  created_at?: string;
}
```

### Database Format

```typescript
interface DBQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'multiple_select' | 'case_study';
  options: Json;  // Array stored as JSON
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  source: string | null;
  source_page: number | null;
  created_at: string;
}
```

## Best Practices

1. **Always test first:**
   ```bash
   npm run test-ingestion
   npm run ingest-all:dry-run
   ```

2. **Keep backups:**
   - Commit `data/merged-questions.json` to git
   - Save ingestion reports

3. **Incremental imports:**
   - Update `excludeFiles` after each import
   - Don't re-import the same batch

4. **Verify in database:**
   - Check random questions manually
   - Verify question count matches expected

5. **Monitor for duplicates:**
   - Review deduplication report
   - Investigate if many duplicates found

## Support

For issues:
1. Check this documentation
2. Review logs in `data/ingestion-report.json`
3. Run with `--verbose` flag for detailed output
4. Check `.skills/data-ingestion/skill.md` for advanced patterns

## Related Documentation

- `.skills/data-ingestion/skill.md` - Complete skill documentation
- `.skills/data-ingestion/README.md` - Skill quick start guide
- `src/lib/database.types.ts` - Database schema types

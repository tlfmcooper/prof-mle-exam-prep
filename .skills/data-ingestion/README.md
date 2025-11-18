# Data Ingestion Skill

A comprehensive TypeScript skill for bulk question data ingestion into Supabase.

## Quick Start

```bash
# Test with a sample file (dry-run)
npm run ingest:test -- --file ./miscellaneous_files/batch_1_1_questions.json

# Run full ingestion (dry-run)
npm run ingest:dry-run

# Run full ingestion (live)
npm run ingest:all
```

## Features

✅ **Merge** multiple JSON batch files
✅ **Deduplicate** using hash, ID, or smart strategies
✅ **Validate** question schema and data
✅ **Ingest** to Supabase with batching
✅ **Error handling** with retries
✅ **Progress tracking** with spinners
✅ **Detailed reporting** with JSON output

## Installation

Dependencies are already installed. If you need to reinstall:

```bash
npm install tsx chalk ora commander hash-sum dotenv --save-dev
```

## Usage

### 1. Test Ingestion

Test with a single file before running the full pipeline:

```bash
npx tsx scripts/test-ingestion.ts --file ./path/to/batch.json --sample 10 --verbose
```

Options:
- `--file <path>`: Path to JSON file with questions
- `--sample <size>`: Number of questions to test (default: 10)
- `--verbose`: Show detailed logs
- `--no-dry-run`: Actually insert into database (default is dry-run)

### 2. Full Ingestion

Run the complete pipeline (merge → deduplicate → validate → ingest):

```bash
npx tsx scripts/ingest-all.ts
```

Options:
- `--dry-run`: Test without inserting data
- `--verbose`: Show detailed logs
- `--source <dir>`: Source directory for batch files
- `--batch-size <size>`: Batch size for insertion (default: 100)
- `--no-dedup`: Skip deduplication
- `--no-validate`: Skip validation
- `--preset <name>`: Use preset (strict|lenient|fast|development)
- `--output <file>`: Output file for merged questions
- `--upsert`: Use upsert instead of insert

### 3. Configuration Presets

```bash
# Strict validation and deduplication
npx tsx scripts/ingest-all.ts --preset strict

# Fast ingestion with minimal validation
npx tsx scripts/ingest-all.ts --preset fast

# Development mode with verbose logging
npx tsx scripts/ingest-all.ts --preset development
```

## Configuration

Edit `.skills/data-ingestion/config/ingestion.config.ts` to customize:

```typescript
export const ingestionConfig = {
  sourceDir: './miscellaneous_files',
  excludeFiles: ['batch_1_0.json'],  // Already in DB
  batchSize: 100,
  deduplication: {
    enabled: true,
    strategy: 'hash'  // 'hash' | 'id' | 'smart'
  },
  validation: {
    strict: true,
    requireExplanations: false
  },
  supabase: {
    tableName: 'questions',
    upsertOnConflict: false
  }
};
```

## Workflow

### Adding New Question Batches

1. **Place files** in `./miscellaneous_files/` directory
2. **Update config** to exclude already-imported files
3. **Test first**:
   ```bash
   npm run ingest:dry-run -- --verbose
   ```
4. **Review output** and check for errors/warnings
5. **Run live ingestion**:
   ```bash
   npm run ingest:all
   ```
6. **Verify** in Supabase dashboard
7. **Commit** the merged file and report

## Output Files

After ingestion, you'll find:

- `./data/merged-questions.json` - All merged and deduplicated questions
- `./data/ingestion-report.json` - Detailed ingestion report with stats
- `./data/ingestion-log.json` - Complete log of operations

## Report Structure

```json
{
  "timestamp": "2025-01-17T10:30:00Z",
  "duration": 45200,
  "files": {
    "processed": 18,
    "skipped": 1
  },
  "deduplication": {
    "original": 1247,
    "unique": 1224,
    "removed": 23
  },
  "validation": {
    "valid": 1219,
    "invalid": 5,
    "errors": 5,
    "warnings": 12
  },
  "ingestion": {
    "inserted": 1219,
    "failed": 0
  },
  "statistics": {
    "total": 1219,
    "byDifficulty": {...},
    "withExplanations": 1150
  }
}
```

## Troubleshooting

### "Missing Supabase credentials"

Set environment variables:
```bash
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### "File not found"

Check the `sourceDir` path in config. Use absolute paths if needed:
```typescript
sourceDir: path.join(__dirname, '../../miscellaneous_files')
```

### Validation errors

Run with `--verbose` to see detailed error messages:
```bash
npx tsx scripts/ingest-all.ts --dry-run --verbose
```

### Database errors

1. Check Supabase connection
2. Verify table schema matches question interface
3. Check for foreign key constraints
4. Try with smaller batch size: `--batch-size 50`

## Development

### File Structure

```
.skills/data-ingestion/
├── README.md                    # This file
├── skill.md                     # Complete documentation
├── config/
│   └── ingestion.config.ts      # Configuration presets
├── src/
│   ├── merge-questions.ts       # Merge and deduplication
│   ├── validate-questions.ts    # Schema validation
│   ├── ingest-to-supabase.ts   # Database insertion
│   └── utils/
│       ├── logger.ts            # Structured logging
│       ├── hash.ts              # Deduplication hashing
│       ├── file-utils.ts        # File operations
│       └── progress.ts          # Progress indicators
└── scripts/
    ├── ingest-all.ts            # Main CLI
    └── test-ingestion.ts        # Test CLI
```

### Testing Your Changes

1. Make changes to source files
2. Test with sample data:
   ```bash
   npm run ingest:test -- --file ./path/to/test.json --verbose
   ```
3. Run dry-run with full data:
   ```bash
   npm run ingest:dry-run -- --verbose
   ```
4. If successful, run live ingestion

## Examples

### Example 1: Import New Batch

```bash
# 1. Add new batch file
cp ~/Downloads/batch_7_1.json ./miscellaneous_files/

# 2. Test with dry-run
npx tsx scripts/ingest-all.ts --dry-run --verbose

# 3. Run live if tests pass
npx tsx scripts/ingest-all.ts

# 4. Check report
cat data/ingestion-report.json
```

### Example 2: Re-import with Updates

```bash
# Use upsert mode to update existing questions
npx tsx scripts/ingest-all.ts --upsert --preset fast
```

### Example 3: Validate Only

```bash
# Skip ingestion, just merge and validate
npx tsx scripts/ingest-all.ts --dry-run --preset strict
```

## Advanced Usage

### Custom Deduplication

Edit `src/merge-questions.ts` to add custom deduplication logic.

### Custom Validation

Edit `src/validate-questions.ts` to add custom validation rules.

### Parallel Processing

For very large datasets, consider processing files in parallel by modifying `merge-questions.ts`.

## Support

For issues or questions:
1. Check the main `skill.md` file for detailed documentation
2. Run with `--verbose` to see detailed logs
3. Check the ingestion report for error details

## License

Part of the Professional ML Engineer Exam Prep project.

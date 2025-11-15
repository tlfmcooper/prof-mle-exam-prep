# PDF Question Extraction Skill

## Overview
Comprehensive patterns for extracting, parsing, validating, and structuring exam questions from Google Cloud Professional ML Engineer PDF documents into structured JSON/SQL formats.

## Problem Context

Google's Professional ML Engineer exam PDFs contain:
- Sample questions in various formats
- Multiple choice (single answer)
- Multiple select (multiple correct answers)
- Case study scenarios with follow-up questions
- Explanations and answer keys
- Topic/domain classifications

**Goal**: Transform unstructured PDF content into structured, queryable data.

## Extraction Strategies

### Strategy 1: Manual/Semi-Automated (Recommended for Small Sets)

For 10-50 questions, manual extraction with validation is most reliable.

**Process:**
1. Read PDF visually
2. Use structured templates for data entry
3. Validate with automated scripts
4. Review and quality check

**Tools:**
- PDF reader (Adobe, browser)
- Structured JSON/CSV templates
- Validation scripts

### Strategy 2: PDF Parsing Libraries (Medium Sets)

For 50-200 questions, use PDF parsing with manual review.

**Libraries:**
```typescript
// Node.js approach
import pdf from 'pdf-parse';
import fs from 'fs';

async function extractText(pdfPath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  return data.text;
}
```

```python
# Python approach (more robust)
import PyPDF2
import pdfplumber

def extract_text_pypdf(pdf_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ''
        for page in reader.pages:
            text += page.extract_text()
    return text

def extract_text_pdfplumber(pdf_path):
    """Better for maintaining structure"""
    with pdfplumber.open(pdf_path) as pdf:
        text = ''
        for page in pdf.pages:
            text += page.extract_text()
    return text
```

### Strategy 3: OCR + LLM (Large Sets or Complex Formats)

For complex PDFs or 200+ questions, combine OCR with LLM parsing.

**Tools:**
- Tesseract OCR or Adobe PDF Extract API
- OpenAI GPT-4, Anthropic Claude, or Google Gemini
- Custom prompt engineering for structure extraction

## Structured Data Format

### JSON Schema

```typescript
// types/question.ts
export interface Question {
  id: string;                    // UUID or incremental
  question_number?: number;      // Original numbering from PDF
  question_text: string;         // The question
  question_type: QuestionType;   // Type of question
  options: QuestionOption[];     // Answer choices
  correct_answer_ids: string[];  // IDs of correct options
  explanation?: string;          // Answer explanation
  difficulty?: Difficulty;       // Estimated difficulty
  topics: string[];              // Topic tags
  source: SourceMetadata;        // PDF source info
  created_at: string;
}

export type QuestionType =
  | 'multiple_choice'      // Single correct answer
  | 'multiple_select'      // Multiple correct answers
  | 'case_study';          // Scenario-based

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string;              // A, B, C, D, etc.
  text: string;            // Option text
  is_correct: boolean;     // Whether this is correct
}

export interface SourceMetadata {
  pdf_name: string;
  page_number: number;
  section?: string;        // e.g., "Sample Questions Set 1"
  extraction_date: string;
  extraction_method: string; // 'manual', 'automated', 'llm'
}
```

### Example JSON

```json
{
  "id": "q001",
  "question_number": 1,
  "question_text": "You are building a machine learning model to predict customer churn. Your dataset has 100,000 rows and 50 features. Which approach should you take first?",
  "question_type": "multiple_choice",
  "options": [
    {
      "id": "A",
      "text": "Use AutoML to automatically find the best model",
      "is_correct": false
    },
    {
      "id": "B",
      "text": "Perform exploratory data analysis to understand feature distributions and correlations",
      "is_correct": true
    },
    {
      "id": "C",
      "text": "Immediately deploy a deep learning model with all features",
      "is_correct": false
    },
    {
      "id": "D",
      "text": "Remove all features with missing values",
      "is_correct": false
    }
  ],
  "correct_answer_ids": ["B"],
  "explanation": "Before building any model, you should perform EDA to understand your data, identify patterns, outliers, and feature relationships. This informs feature engineering and model selection decisions.",
  "difficulty": "easy",
  "topics": ["Data Analysis", "ML Workflow", "Best Practices"],
  "source": {
    "pdf_name": "professional_machine_learning_engineer_exam_guide_english.pdf",
    "page_number": 12,
    "section": "Sample Questions",
    "extraction_date": "2024-01-15",
    "extraction_method": "manual"
  }
}
```

## Extraction Patterns

### Pattern 1: Regex-Based Text Parsing

```python
import re
from typing import List, Dict

def parse_questions_from_text(text: str) -> List[Dict]:
    """
    Parse questions from extracted text using regex patterns.
    Assumes format like:

    1. Question text here?
    A. Option A
    B. Option B
    C. Option C
    D. Option D

    Answer: B
    Explanation: ...
    """
    questions = []

    # Pattern to match question blocks
    question_pattern = r'(\d+)\.\s+(.*?)\n([A-D]\..+?)(?=\n\d+\.|Answer:|$)'
    answer_pattern = r'Answer:\s*([A-D])'
    explanation_pattern = r'Explanation:\s*(.*?)(?=\n\d+\.|$)'

    # Find all questions
    question_matches = re.finditer(question_pattern, text, re.DOTALL)

    for match in question_matches:
        q_num = match.group(1)
        q_text = match.group(2).strip()
        options_text = match.group(3)

        # Parse options
        options = []
        option_pattern = r'([A-D])\.\s*(.*?)(?=[A-D]\.|$)'
        for opt_match in re.finditer(option_pattern, options_text, re.DOTALL):
            options.append({
                'id': opt_match.group(1),
                'text': opt_match.group(2).strip(),
                'is_correct': False  # Will be set based on answer
            })

        # Find answer
        answer_match = re.search(answer_pattern, text[match.end():])
        correct_answer = answer_match.group(1) if answer_match else None

        # Mark correct option
        for opt in options:
            if opt['id'] == correct_answer:
                opt['is_correct'] = True

        # Find explanation
        expl_match = re.search(explanation_pattern, text[match.end():])
        explanation = expl_match.group(1).strip() if expl_match else None

        questions.append({
            'question_number': int(q_num),
            'question_text': q_text,
            'options': options,
            'correct_answer_ids': [correct_answer] if correct_answer else [],
            'explanation': explanation
        })

    return questions
```

### Pattern 2: LLM-Based Structured Extraction

```typescript
// lib/extractWithLLM.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ExtractionResult {
  questions: Question[];
  confidence: number;
  warnings: string[];
}

export async function extractQuestionsWithClaude(
  pdfText: string,
  pageNumber: number
): Promise<ExtractionResult> {
  const prompt = `Extract exam questions from the following text. Return a JSON array of questions.

For each question, provide:
- question_number (if visible)
- question_text
- question_type ("multiple_choice" or "multiple_select")
- options array with id (A, B, C, D), text, and is_correct
- correct_answer_ids array
- explanation (if provided)
- topics (array of relevant topics)

Text to parse:
${pdfText}

Return ONLY valid JSON, no additional text.`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 8096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  const extracted = JSON.parse(content.text);

  return {
    questions: extracted.map((q: any) => ({
      ...q,
      source: {
        page_number: pageNumber,
        extraction_method: 'llm',
        extraction_date: new Date().toISOString(),
      },
    })),
    confidence: 0.9, // Could implement confidence scoring
    warnings: validateQuestions(extracted),
  };
}
```

### Pattern 3: Hybrid Manual Template

```typescript
// scripts/manualEntry.ts
/**
 * Interactive CLI for manual question entry with validation
 */
import inquirer from 'inquirer';
import { Question, QuestionOption } from '../types/question';
import { v4 as uuidv4 } from 'uuid';

export async function manualQuestionEntry(): Promise<Question> {
  console.log('\n=== Enter Question Details ===\n');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'question_text',
      message: 'Enter the question text:',
      validate: (input) => input.length > 10 || 'Question too short',
    },
    {
      type: 'list',
      name: 'question_type',
      message: 'Question type:',
      choices: ['multiple_choice', 'multiple_select', 'case_study'],
    },
    {
      type: 'number',
      name: 'num_options',
      message: 'Number of options:',
      default: 4,
      validate: (input) => input >= 2 && input <= 6,
    },
  ]);

  // Collect options
  const options: QuestionOption[] = [];
  for (let i = 0; i < answers.num_options; i++) {
    const optionId = String.fromCharCode(65 + i); // A, B, C, ...
    const optionAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'text',
        message: `Option ${optionId} text:`,
      },
      {
        type: 'confirm',
        name: 'is_correct',
        message: `Is option ${optionId} correct?`,
        default: false,
      },
    ]);

    options.push({
      id: optionId,
      ...optionAnswers,
    });
  }

  const correct_answer_ids = options
    .filter((opt) => opt.is_correct)
    .map((opt) => opt.id);

  // Validation
  if (answers.question_type === 'multiple_choice' && correct_answer_ids.length !== 1) {
    throw new Error('Multiple choice must have exactly one correct answer');
  }

  const metadata = await inquirer.prompt([
    {
      type: 'input',
      name: 'explanation',
      message: 'Explanation (optional):',
    },
    {
      type: 'list',
      name: 'difficulty',
      message: 'Difficulty:',
      choices: ['easy', 'medium', 'hard'],
    },
    {
      type: 'input',
      name: 'topics',
      message: 'Topics (comma-separated):',
      filter: (input) => input.split(',').map((t: string) => t.trim()),
    },
    {
      type: 'number',
      name: 'page_number',
      message: 'PDF page number:',
    },
  ]);

  return {
    id: uuidv4(),
    question_text: answers.question_text,
    question_type: answers.question_type,
    options,
    correct_answer_ids,
    topics: metadata.topics,
    difficulty: metadata.difficulty,
    explanation: metadata.explanation || undefined,
    source: {
      pdf_name: 'manual_entry',
      page_number: metadata.page_number,
      extraction_date: new Date().toISOString(),
      extraction_method: 'manual',
    },
    created_at: new Date().toISOString(),
  };
}
```

## Validation & Quality Checks

### Validation Rules

```typescript
// lib/validation.ts
export interface ValidationError {
  questionId: string;
  field: string;
  error: string;
  severity: 'error' | 'warning';
}

export function validateQuestion(question: Question): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!question.question_text || question.question_text.length < 10) {
    errors.push({
      questionId: question.id,
      field: 'question_text',
      error: 'Question text is too short or missing',
      severity: 'error',
    });
  }

  // Options validation
  if (!question.options || question.options.length < 2) {
    errors.push({
      questionId: question.id,
      field: 'options',
      error: 'Must have at least 2 options',
      severity: 'error',
    });
  }

  // Correct answers validation
  const correctCount = question.options.filter((opt) => opt.is_correct).length;

  if (question.question_type === 'multiple_choice' && correctCount !== 1) {
    errors.push({
      questionId: question.id,
      field: 'correct_answer_ids',
      error: 'Multiple choice must have exactly 1 correct answer',
      severity: 'error',
    });
  }

  if (question.question_type === 'multiple_select' && correctCount < 2) {
    errors.push({
      questionId: question.id,
      field: 'correct_answer_ids',
      error: 'Multiple select should have at least 2 correct answers',
      severity: 'warning',
    });
  }

  if (correctCount === 0) {
    errors.push({
      questionId: question.id,
      field: 'correct_answer_ids',
      error: 'No correct answer specified',
      severity: 'error',
    });
  }

  // Option IDs should be sequential
  const expectedIds = question.options.map((_, i) => String.fromCharCode(65 + i));
  const actualIds = question.options.map((opt) => opt.id);
  if (JSON.stringify(expectedIds) !== JSON.stringify(actualIds)) {
    errors.push({
      questionId: question.id,
      field: 'options',
      error: 'Option IDs should be sequential (A, B, C, D)',
      severity: 'warning',
    });
  }

  // Topics validation
  if (!question.topics || question.topics.length === 0) {
    errors.push({
      questionId: question.id,
      field: 'topics',
      error: 'No topics assigned',
      severity: 'warning',
    });
  }

  // Explanation check
  if (!question.explanation) {
    errors.push({
      questionId: question.id,
      field: 'explanation',
      error: 'No explanation provided',
      severity: 'warning',
    });
  }

  return errors;
}

export function validateQuestionBatch(questions: Question[]): {
  valid: Question[];
  invalid: Question[];
  errors: ValidationError[];
} {
  const allErrors: ValidationError[] = [];
  const valid: Question[] = [];
  const invalid: Question[] = [];

  questions.forEach((q) => {
    const errors = validateQuestion(q);
    const hasErrors = errors.some((e) => e.severity === 'error');

    if (hasErrors) {
      invalid.push(q);
    } else {
      valid.push(q);
    }

    allErrors.push(...errors);
  });

  return { valid, invalid, errors: allErrors };
}
```

## Topic Tagging & Categorization

### Google Cloud ML Engineer Exam Topics

```typescript
// lib/topics.ts
export const ML_ENGINEER_TOPICS = {
  // Section 1: Framing ML problems
  PROBLEM_FRAMING: {
    id: 'problem_framing',
    name: 'Problem Framing',
    exam_weight: 0.15,
    subtopics: [
      'Business objective translation',
      'Success metrics definition',
      'ML vs non-ML solutions',
      'Data availability assessment',
    ],
  },

  // Section 2: ML solution architecture
  ARCHITECTURE: {
    id: 'architecture',
    name: 'ML Solution Architecture',
    exam_weight: 0.20,
    subtopics: [
      'Data ingestion strategies',
      'Training infrastructure',
      'Serving infrastructure',
      'Online vs batch prediction',
      'Vertex AI components',
    ],
  },

  // Section 3: Data preparation and processing
  DATA_PREP: {
    id: 'data_prep',
    name: 'Data Preparation & Processing',
    exam_weight: 0.25,
    subtopics: [
      'Feature engineering',
      'Data validation',
      'Data transformation',
      'Handling missing data',
      'BigQuery ML',
      'Dataflow',
      'Feature Store',
    ],
  },

  // Section 4: ML model development
  MODEL_DEV: {
    id: 'model_dev',
    name: 'Model Development',
    exam_weight: 0.20,
    subtopics: [
      'Model selection',
      'Hyperparameter tuning',
      'AutoML',
      'Custom training',
      'Transfer learning',
      'TensorFlow/PyTorch',
    ],
  },

  // Section 5: ML pipeline automation
  MLOPS: {
    id: 'mlops',
    name: 'MLOps & Automation',
    exam_weight: 0.10,
    subtopics: [
      'Vertex AI Pipelines',
      'CI/CD for ML',
      'Model monitoring',
      'A/B testing',
      'Model versioning',
    ],
  },

  // Section 6: ML solution monitoring
  MONITORING: {
    id: 'monitoring',
    name: 'Monitoring & Optimization',
    exam_weight: 0.10,
    subtopics: [
      'Performance metrics',
      'Model drift detection',
      'Explainability',
      'Bias detection',
      'Cost optimization',
    ],
  },
};

export function autoTagQuestion(questionText: string, options: QuestionOption[]): string[] {
  const allText = (questionText + ' ' + options.map((o) => o.text).join(' ')).toLowerCase();
  const tags: string[] = [];

  // Keyword-based tagging
  const keywords = {
    problem_framing: ['business objective', 'success metric', 'kpi', 'feasibility'],
    architecture: ['vertex ai', 'architecture', 'infrastructure', 'deployment'],
    data_prep: ['feature engineering', 'preprocessing', 'bigquery', 'dataflow', 'feature store'],
    model_dev: ['model', 'training', 'hyperparameter', 'automl', 'tensorflow', 'pytorch'],
    mlops: ['pipeline', 'ci/cd', 'automation', 'kubeflow', 'tfx'],
    monitoring: ['monitoring', 'drift', 'explainability', 'bias', 'fairness'],
  };

  Object.entries(keywords).forEach(([topic, words]) => {
    if (words.some((word) => allText.includes(word))) {
      tags.push(topic);
    }
  });

  return tags.length > 0 ? tags : ['general'];
}
```

## SQL Import Scripts

### Bulk Insert Script

```sql
-- scripts/import_questions.sql

-- Insert questions from JSON
INSERT INTO questions (id, question_text, question_type, options, explanation, difficulty, source, source_page)
SELECT
  (data->>'id')::UUID,
  data->>'question_text',
  data->>'question_type',
  data->'options',
  data->>'explanation',
  data->>'difficulty',
  data->'source'->>'pdf_name',
  (data->'source'->>'page_number')::INTEGER
FROM json_array_elements('[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "question_text": "Which service should you use for...",
    ...
  }
]'::json) AS data;

-- Insert topic associations
INSERT INTO question_topics (question_id, topic_id)
SELECT
  q.id,
  t.id
FROM questions q
CROSS JOIN LATERAL jsonb_array_elements_text(
  -- Assuming topics stored as JSON array in temp table
  (SELECT topics FROM temp_question_data WHERE question_id = q.id)
) AS topic_name
JOIN topics t ON t.name = topic_name;
```

### Node.js Import Script

```typescript
// scripts/importToSupabase.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { Question } from '../types/question';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for imports
);

async function importQuestions(jsonFilePath: string) {
  const questionsData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
  const questions: Question[] = questionsData.questions;

  console.log(`Importing ${questions.length} questions...`);

  for (const question of questions) {
    // Insert question
    const { data: insertedQuestion, error: questionError } = await supabase
      .from('questions')
      .insert({
        id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.options,
        explanation: question.explanation,
        difficulty: question.difficulty,
        source: question.source.pdf_name,
        source_page: question.source.page_number,
      })
      .select()
      .single();

    if (questionError) {
      console.error(`Error inserting question ${question.id}:`, questionError);
      continue;
    }

    // Insert topic associations
    if (question.topics && question.topics.length > 0) {
      for (const topicName of question.topics) {
        // Find or create topic
        const { data: topic } = await supabase
          .from('topics')
          .select('id')
          .eq('name', topicName)
          .single();

        let topicId = topic?.id;

        if (!topicId) {
          const { data: newTopic } = await supabase
            .from('topics')
            .insert({ name: topicName })
            .select()
            .single();
          topicId = newTopic?.id;
        }

        // Create association
        if (topicId) {
          await supabase.from('question_topics').insert({
            question_id: insertedQuestion.id,
            topic_id: topicId,
          });
        }
      }
    }

    console.log(`✓ Imported question ${question.id}`);
  }

  console.log('Import complete!');
}

// Usage
importQuestions('./data/extracted_questions.json');
```

## Recommended Workflow

### For Your Project (2 PDFs)

```bash
# Step 1: Extract text from PDFs
npm run extract:pdf -- "Professional Machine Learning Engineer Sample Questions.pdf"
npm run extract:pdf -- "professional_machine_learning_engineer_exam_guide_english.pdf"

# Step 2: Manual review and structure (or use LLM)
npm run extract:llm -- ./data/raw/sample_questions.txt

# Step 3: Validate extracted data
npm run validate -- ./data/extracted_questions.json

# Step 4: Review and fix errors
# Edit data/extracted_questions.json

# Step 5: Import to Supabase
npm run import -- ./data/extracted_questions.json

# Step 6: Verify in database
npm run verify:questions
```

## Integration with Main App

```typescript
// In your React app
import { useQuestions } from '@/hooks/useQuestions';

function PracticeQuiz() {
  const { data: questions, isLoading } = useQuestions({
    difficulty: 'medium',
    topicIds: ['data_prep'],
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <QuestionCarousel questions={questions} />
  );
}
```

## Quality Metrics

Track extraction quality:
```typescript
interface ExtractionMetrics {
  total_questions: number;
  validation_errors: number;
  validation_warnings: number;
  missing_explanations: number;
  missing_topics: number;
  avg_confidence_score: number;
  manual_review_required: number;
}
```

## Common Pitfalls

1. **PDF Encoding Issues**: Some PDFs have non-standard encodings
   - Solution: Try multiple libraries (pdfplumber, PyPDF2, pdf.js)

2. **Option Letter Mismatch**: A, B, C, D vs 1, 2, 3, 4
   - Solution: Normalize to letters in validation

3. **Multi-line Options**: Options spanning multiple lines
   - Solution: Use lookahead patterns in regex or LLM extraction

4. **Case Studies**: Complex scenarios with multiple questions
   - Solution: Link questions with `parent_question_id` field

5. **Duplicate Questions**: Same question appears multiple times
   - Solution: Hash question text and check for duplicates

## Testing Checklist

- [ ] PDF text extraction produces readable output
- [ ] All question types detected correctly
- [ ] Option IDs are consistent (A, B, C, D)
- [ ] Correct answers properly marked
- [ ] Topics auto-tagged accurately (>80%)
- [ ] Validation catches all error types
- [ ] Import script handles large batches
- [ ] Database constraints prevent invalid data
- [ ] Duplicate detection works
- [ ] Manual review workflow is efficient

## Tools Reference

**PDF Parsing:**
- `pdf-parse` (Node.js)
- `pdfplumber` (Python)
- `PyPDF2` (Python)

**LLM APIs:**
- Anthropic Claude API
- OpenAI GPT-4 API
- Google Gemini API

**Validation:**
- JSON Schema validation
- Custom TypeScript validators
- SQL constraints

**Interactive Entry:**
- `inquirer` (Node.js)
- Custom web form

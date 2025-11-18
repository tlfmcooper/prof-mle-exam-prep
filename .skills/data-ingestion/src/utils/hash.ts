import hashSum from 'hash-sum';

export interface Question {
  id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  detailed_explanation?: string;
  tags?: string[];
  links?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  section_id?: string;
  topic_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Generate a hash for a question based on its text and correct answer
 * This is used for exact duplicate detection
 */
export function generateQuestionHash(question: Question): string {
  // Normalize text: lowercase, trim, remove extra whitespace
  const normalizedText = question.text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  // Create a string combining text and correct answer
  const hashInput = `${normalizedText}::${question.correct_answer}`;

  return hashSum(hashInput);
}

/**
 * Generate a content hash for a question based on all options
 * This is more strict and includes all answer options
 */
export function generateContentHash(question: Question): string {
  const normalized = {
    text: normalizeString(question.text),
    a: normalizeString(question.option_a),
    b: normalizeString(question.option_b),
    c: normalizeString(question.option_c),
    d: normalizeString(question.option_d),
    correct: question.correct_answer
  };

  return hashSum(JSON.stringify(normalized));
}

/**
 * Calculate similarity between two strings (0-1)
 * Uses Levenshtein distance normalized by length
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  return 1 - (distance / maxLength);
}

/**
 * Check if two questions are similar based on text similarity threshold
 */
export function areQuestionsSimilar(
  q1: Question,
  q2: Question,
  threshold: number = 0.9
): boolean {
  const textSimilarity = calculateSimilarity(q1.text, q2.text);

  if (textSimilarity >= threshold) {
    // If texts are very similar, also check if correct answer is the same
    return q1.correct_answer === q2.correct_answer;
  }

  return false;
}

/**
 * Normalize a string for comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ''); // Remove punctuation
}

/**
 * Calculate Levenshtein distance between two strings
 * This measures the minimum number of edits needed to transform one string into another
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create a 2D array for dynamic programming
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill the dp table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + 1   // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Group questions by hash for duplicate detection
 */
export function groupByHash(
  questions: Question[],
  hashFn: (q: Question) => string
): Map<string, Question[]> {
  const groups = new Map<string, Question[]>();

  for (const question of questions) {
    const hash = hashFn(question);

    if (!groups.has(hash)) {
      groups.set(hash, []);
    }

    groups.get(hash)!.push(question);
  }

  return groups;
}

/**
 * Find duplicate question groups
 */
export function findDuplicates(questions: Question[]): Map<string, Question[]> {
  const groups = groupByHash(questions, generateQuestionHash);

  // Filter to only groups with more than one question
  const duplicates = new Map<string, Question[]>();

  for (const [hash, group] of groups) {
    if (group.length > 1) {
      duplicates.set(hash, group);
    }
  }

  return duplicates;
}

/**
 * Deduplicate questions keeping the first occurrence
 */
export function deduplicateByHash(questions: Question[]): {
  unique: Question[];
  duplicates: Question[];
} {
  const seen = new Set<string>();
  const unique: Question[] = [];
  const duplicates: Question[] = [];

  for (const question of questions) {
    const hash = generateQuestionHash(question);

    if (!seen.has(hash)) {
      seen.add(hash);
      unique.push(question);
    } else {
      duplicates.push(question);
    }
  }

  return { unique, duplicates };
}

/**
 * Deduplicate questions by ID
 */
export function deduplicateById(questions: Question[]): {
  unique: Question[];
  duplicates: Question[];
} {
  const seen = new Set<string>();
  const unique: Question[] = [];
  const duplicates: Question[] = [];

  for (const question of questions) {
    if (!seen.has(question.id)) {
      seen.add(question.id);
      unique.push(question);
    } else {
      duplicates.push(question);
    }
  }

  return { unique, duplicates };
}

/**
 * Smart deduplication using similarity threshold
 */
export function deduplicateSmart(
  questions: Question[],
  threshold: number = 0.9
): {
  unique: Question[];
  duplicates: Question[];
} {
  const unique: Question[] = [];
  const duplicates: Question[] = [];

  for (const question of questions) {
    let isDuplicate = false;

    for (const existing of unique) {
      if (areQuestionsSimilar(question, existing, threshold)) {
        duplicates.push(question);
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(question);
    }
  }

  return { unique, duplicates };
}

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';
import { Question } from './hash.js';
import { getLogger } from './logger.js';

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  modified: Date;
}

/**
 * Find all files matching a pattern in a directory
 */
export function findFiles(
  directory: string,
  pattern: string | RegExp,
  recursive: boolean = false
): FileInfo[] {
  const logger = getLogger();
  const files: FileInfo[] = [];

  if (!existsSync(directory)) {
    logger.error(`Directory not found: ${directory}`);
    return files;
  }

  try {
    const entries = readdirSync(directory);

    for (const entry of entries) {
      const fullPath = join(directory, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory() && recursive) {
        files.push(...findFiles(fullPath, pattern, recursive));
      } else if (stat.isFile()) {
        const matches = typeof pattern === 'string'
          ? entry.includes(pattern)
          : pattern.test(entry);

        if (matches) {
          files.push({
            path: fullPath,
            name: entry,
            size: stat.size,
            modified: stat.mtime
          });
        }
      }
    }
  } catch (error: any) {
    logger.error(`Error reading directory: ${directory}`, error.message);
  }

  return files;
}

/**
 * Read and parse a JSON file
 */
export function readJsonFile<T = any>(filePath: string): T | null {
  const logger = getLogger();

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      logger.error(`Invalid JSON in ${basename(filePath)}`, {
        file: filePath,
        error: error.message
      });
    } else {
      logger.error(`Error reading file ${basename(filePath)}`, {
        file: filePath,
        error: error.message
      });
    }
    return null;
  }
}

/**
 * Read a JSON file containing questions
 * Supports both array format and object with "questions" key
 */
export function readQuestionsFile(filePath: string): Question[] {
  const logger = getLogger();
  const data = readJsonFile<any>(filePath);

  if (!data) {
    return [];
  }

  // Handle different JSON structures
  if (Array.isArray(data)) {
    logger.debug(`File ${basename(filePath)}: Array format with ${data.length} questions`);
    return data;
  } else if (data.questions && Array.isArray(data.questions)) {
    logger.debug(`File ${basename(filePath)}: Object format with ${data.questions.length} questions`);
    return data.questions;
  } else if (typeof data === 'object') {
    // Try to find any array property that looks like questions
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key]) && data[key].length > 0) {
        // Check if first item looks like a question
        const first = data[key][0];
        if (first.text && first.correct_answer) {
          logger.debug(`File ${basename(filePath)}: Found questions in "${key}" property`);
          return data[key];
        }
      }
    }
  }

  logger.warn(`File ${basename(filePath)}: No questions found or unrecognized format`);
  return [];
}

/**
 * Write questions to a JSON file with pretty formatting
 */
export function writeQuestionsFile(
  filePath: string,
  questions: Question[],
  pretty: boolean = true
): boolean {
  const logger = getLogger();

  try {
    const content = pretty
      ? JSON.stringify(questions, null, 2)
      : JSON.stringify(questions);

    writeFileSync(filePath, content, 'utf-8');
    logger.success(`Wrote ${questions.length} questions to ${basename(filePath)}`);
    return true;
  } catch (error: any) {
    logger.error(`Error writing file ${basename(filePath)}`, error.message);
    return false;
  }
}

/**
 * Write any data to a JSON file
 */
export function writeJsonFile(
  filePath: string,
  data: any,
  pretty: boolean = true
): boolean {
  const logger = getLogger();

  try {
    const content = pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    writeFileSync(filePath, content, 'utf-8');
    logger.debug(`Wrote JSON to ${basename(filePath)}`);
    return true;
  } catch (error: any) {
    logger.error(`Error writing JSON file ${basename(filePath)}`, error.message);
    return false;
  }
}

/**
 * Get file statistics
 */
export function getFileStats(filePath: string): {
  exists: boolean;
  size: number;
  modified: Date | null;
} {
  if (!existsSync(filePath)) {
    return { exists: false, size: 0, modified: null };
  }

  const stat = statSync(filePath);
  return {
    exists: true,
    size: stat.size,
    modified: stat.mtime
  };
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate file path and extension
 */
export function validateFilePath(
  filePath: string,
  expectedExtension?: string
): { valid: boolean; error?: string } {
  if (!filePath) {
    return { valid: false, error: 'File path is empty' };
  }

  if (!existsSync(filePath)) {
    return { valid: false, error: 'File does not exist' };
  }

  const stat = statSync(filePath);
  if (!stat.isFile()) {
    return { valid: false, error: 'Path is not a file' };
  }

  if (expectedExtension) {
    const ext = extname(filePath);
    if (ext !== expectedExtension) {
      return { valid: false, error: `Expected ${expectedExtension} file, got ${ext}` };
    }
  }

  return { valid: true };
}

/**
 * Batch process files with error handling
 */
export async function processBatchFiles<T>(
  files: FileInfo[],
  processor: (file: FileInfo) => Promise<T>,
  onProgress?: (current: number, total: number) => void
): Promise<{ results: T[]; errors: { file: string; error: any }[] }> {
  const results: T[] = [];
  const errors: { file: string; error: any }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      const result = await processor(file);
      results.push(result);
    } catch (error) {
      errors.push({ file: file.path, error });
    }

    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }

  return { results, errors };
}

/**
 * Create directory if it doesn't exist
 */
export function ensureDirectory(dirPath: string): boolean {
  const logger = getLogger();

  try {
    if (!existsSync(dirPath)) {
      const { mkdirSync } = require('fs');
      mkdirSync(dirPath, { recursive: true });
      logger.debug(`Created directory: ${dirPath}`);
    }
    return true;
  } catch (error: any) {
    logger.error(`Error creating directory: ${dirPath}`, error.message);
    return false;
  }
}

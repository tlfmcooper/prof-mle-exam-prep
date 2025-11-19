import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  [key: string]: any;
}

function checkQuestionSequence(filePath: string): void {
  console.log(`\n📋 Checking question sequence in: ${path.basename(filePath)}\n`);

  // Read the JSON file
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const questions: Question[] = JSON.parse(fileContent);

  if (!Array.isArray(questions) || questions.length === 0) {
    console.log('❌ Error: File does not contain a valid array of questions');
    return;
  }

  console.log(`Total questions found: ${questions.length}\n`);

  // Track issues
  const issues: string[] = [];
  const questionNumbers: number[] = [];

  // Check each question
  questions.forEach((question, index) => {
    const questionNumber = question.question_number;
    const questionId = question.id;

    if (questionNumber === undefined) {
      issues.push(`❌ Question at index ${index} (ID: ${questionId}) is missing question_number`);
    } else {
      questionNumbers.push(questionNumber);
    }
  });

  // Sort question numbers to check sequence
  const sortedNumbers = [...questionNumbers].sort((a, b) => a - b);
  
  console.log('Question Number Range:');
  console.log(`  First: ${sortedNumbers[0]}`);
  console.log(`  Last: ${sortedNumbers[sortedNumbers.length - 1]}`);
  console.log(`  Total questions: ${sortedNumbers.length}\n`);

  // Check for gaps (non-sequential numbers)
  const gaps: number[] = [];
  for (let i = 0; i < sortedNumbers.length - 1; i++) {
    const current = sortedNumbers[i];
    const next = sortedNumbers[i + 1];
    const expected = current + 1;

    if (next !== expected) {
      // Found a gap - questions are not sequential
      gaps.push(current);
    }
  }

  // Check for duplicates
  const duplicates = new Map<number, number>();
  questionNumbers.forEach(num => {
    duplicates.set(num, (duplicates.get(num) || 0) + 1);
  });

  const duplicateNumbers = Array.from(duplicates.entries())
    .filter(([_, count]) => count > 1)
    .map(([num, count]) => ({ num, count }));

  // Check if questions are in order in the file
  const orderIssues: string[] = [];
  for (let i = 0; i < questions.length - 1; i++) {
    const current = questions[i].question_number;
    const next = questions[i + 1].question_number;
    
    if (current !== undefined && next !== undefined && current >= next) {
      orderIssues.push(
        `❌ Question ${current} (index ${i}) comes before question ${next} (index ${i + 1})`
      );
    }
  }

  // Report findings
  console.log('═'.repeat(60));
  console.log('SEQUENCE CHECK RESULTS');
  console.log('═'.repeat(60));

  if (gaps.length > 0) {
    console.log('\n❌ SEQUENCE BROKEN:');
    console.log(`  Found ${gaps.length} gap(s) in sequence:`);
    gaps.forEach(gap => {
      const index = sortedNumbers.indexOf(gap);
      const next = sortedNumbers[index + 1];
      console.log(`    - After question ${gap}, next is ${next} (expected ${gap + 1})`);
    });
  }

  if (duplicateNumbers.length > 0) {
    console.log('\n❌ DUPLICATES FOUND:');
    duplicateNumbers.forEach(({ num, count }) => {
      console.log(`    - Question ${num} appears ${count} times`);
    });
  }

  if (orderIssues.length > 0) {
    console.log('\n❌ ORDER ISSUES:');
    orderIssues.forEach(issue => {
      console.log(`  ${issue}`);
    });
  }

  if (issues.length > 0) {
    console.log('\n❌ OTHER ISSUES:');
    issues.forEach(issue => {
      console.log(`  ${issue}`);
    });
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  const isSequential = gaps.length === 0 && duplicateNumbers.length === 0 && orderIssues.length === 0 && issues.length === 0;
  
  if (isSequential) {
    console.log('✅ SUCCESS: Questions are sequential from first to last!');
    console.log(`   Questions ${sortedNumbers[0]} to ${sortedNumbers[sortedNumbers.length - 1]} are all present and in order.`);
  } else {
    console.log('❌ FAILED: Questions are NOT sequential!');
    console.log(`   Total issues found: ${gaps.length + duplicateNumbers.length + orderIssues.length + issues.length}`);
  }
  console.log('═'.repeat(60) + '\n');
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: npx tsx scripts/check-question-sequence.ts <file-path>');
  console.error('Example: npx tsx scripts/check-question-sequence.ts miscellaneous_files/q122-200.json');
  process.exit(1);
}

const inputPath = args[0];
const targetFile = path.isAbsolute(inputPath) 
  ? inputPath 
  : path.join(process.cwd(), inputPath);

if (!fs.existsSync(targetFile)) {
  console.error(`❌ Error: File not found: ${targetFile}`);
  process.exit(1);
}

checkQuestionSequence(targetFile);

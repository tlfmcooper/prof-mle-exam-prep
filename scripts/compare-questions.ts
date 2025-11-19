import * as fs from 'fs';
import * as path from 'path';

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  question_type: string;
  options: Array<{
    id: string;
    text: string;
    is_correct: boolean;
  }>;
  correct_answer_ids: string[];
  explanation: string;
  difficulty: string;
  topics: string[];
  source?: {
    pdf_name: string;
    page_number: number | null;
    section: string;
    extraction_date: string;
    extraction_method: string;
  };
  created_at: string;
}

async function compareQuestions() {
  console.log('🔍 Comparing questions from merged-questions.json and improved-questions.json...\n');

  // Read both files
  const dataDir = path.join(process.cwd(), 'data');
  const mergedPath = path.join(dataDir, 'merged-questions.json');
  const improvedPath = path.join(dataDir, 'improved-questions.json');
  const outputPath = path.join(dataDir, 'missing-questions.json');

  // Load the JSON files
  const mergedContent = fs.readFileSync(mergedPath, 'utf-8');
  const improvedContent = fs.readFileSync(improvedPath, 'utf-8');

  const mergedQuestions: Question[] = JSON.parse(mergedContent);
  const improvedQuestions: Question[] = JSON.parse(improvedContent);

  console.log(`📊 Loaded ${mergedQuestions.length} questions from merged-questions.json`);
  console.log(`📊 Loaded ${improvedQuestions.length} questions from improved-questions.json\n`);

  // Create a Set of question IDs from improved-questions.json for fast lookup
  const improvedIds = new Set(improvedQuestions.map(q => q.id));

  // Find questions in merged-questions.json that are NOT in improved-questions.json
  const missingQuestions = mergedQuestions.filter(q => !improvedIds.has(q.id));

  console.log(`✅ Found ${missingQuestions.length} questions in merged-questions.json that are NOT in improved-questions.json\n`);

  // Sort by question number for better readability
  missingQuestions.sort((a, b) => a.question_number - b.question_number);

  // Display summary
  if (missingQuestions.length > 0) {
    console.log('📋 Missing question IDs:');
    const ids = missingQuestions.map(q => q.id);
    console.log(ids.join(', '));
    console.log();
    
    console.log('📋 Missing question numbers:');
    const numbers = missingQuestions.map(q => q.question_number);
    console.log(numbers.join(', '));
    console.log();
  }

  // Write the result to a new JSON file
  fs.writeFileSync(outputPath, JSON.stringify(missingQuestions, null, 2), 'utf-8');

  console.log(`💾 Saved missing questions to: ${outputPath}`);
  console.log(`\n✨ Comparison complete!`);
}

// Run the comparison
compareQuestions().catch(error => {
  console.error('❌ Error during comparison:', error);
  process.exit(1);
});

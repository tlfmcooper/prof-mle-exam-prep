
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


interface Option {
  id: string;
  text: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  question_text: string;
  options: Option[];
  correct_answer_ids: string[];
  [key: string]: any;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function main() {
  const inputPath = path.resolve(__dirname, '../data/improved-questions.json');
  const outputPath = path.resolve(__dirname, '../data/questions_shuffled.json');

  console.log(`Reading questions from ${inputPath}...`);
  const content = readFileSync(inputPath, 'utf-8');
  const questions: Question[] = JSON.parse(content);

  console.log(`Processing ${questions.length} questions...`);

  const shuffledQuestions = questions.map(q => {
    if (!q.options || !Array.isArray(q.options)) {
        console.warn(`Warning: Question ${q.id} has no options. Skipping.`);
        return q;
    }

    // Create mapping from old ID to new ID
    const idMapping = new Map<string, string>();
    
    // Shuffle options
    const shuffledOptions = shuffleArray(q.options);

    // Re-assign IDs (A, B, C, D...) and build the mapping
    const newOptions = shuffledOptions.map((opt, index) => {
        const oldId = opt.id;
        const newId = String.fromCharCode(65 + index); // A, B, C...
        idMapping.set(oldId, newId);
        return {
            ...opt,
            id: newId
        };
    });

    const newCorrectAnswerIds = newOptions
        .filter(opt => opt.is_correct)
        .map(opt => opt.id);

    // Update explanation to reflect new IDs
    let updatedExplanation = q.explanation || '';
    
    // PHASE 1: Replace Old IDs with Unique Placeholders
    // We use a placeholder format that won't appear in normal text, e.g., {{OPT_A}}
    idMapping.forEach((newId, oldId) => {
        const regex = new RegExp(
            `\\b${oldId}\\b(?=\\s+(is|are|and|or|provides|ensures|allows|because|since|as|requires|causes|refers|means|would|should|can|will|might|may)|[\\.,:;\\)]|$)`,
            'g'
        );
        updatedExplanation = updatedExplanation.replace(regex, `{{OPT_${oldId}}}`);
    });

    // PHASE 2: Replace Placeholders with New IDs
    idMapping.forEach((newId, oldId) => {
        updatedExplanation = updatedExplanation.replace(new RegExp(`{{OPT_${oldId}}}`, 'g'), newId);
    });

    return {
      ...q,
      options: newOptions,
      correct_answer_ids: newCorrectAnswerIds,
      explanation: updatedExplanation
    };
  });

  console.log(`Writing shuffled questions to ${outputPath}...`);
  writeFileSync(outputPath, JSON.stringify(shuffledQuestions, null, 2));
  console.log('Done.');

  // Verification
  console.log('Verifying...');
  const originalQuestionsMap = new Map(questions.map(q => [q.id, q]));
  let errors = 0;

  shuffledQuestions.forEach(sq => {
      const oq = originalQuestionsMap.get(sq.id);
      if (!oq) {
          console.error(`Error: Question ${sq.id} not found in original.`);
          errors++;
          return;
      }

      // Find correct answer text in original
      const originalCorrectOptions = oq.options.filter(o => o.is_correct);
      const originalCorrectTexts = originalCorrectOptions.map(o => o.text).sort();

      // Find correct answer text in new
      const newCorrectOptions = sq.options.filter(o => o.is_correct);
      const newCorrectTexts = newCorrectOptions.map(o => o.text).sort();

      // Compare
      if (JSON.stringify(originalCorrectTexts) !== JSON.stringify(newCorrectTexts)) {
          console.error(`Mismatch for question ${sq.id}:`);
          console.error(`Original: ${JSON.stringify(originalCorrectTexts)}`);
          console.error(`New:      ${JSON.stringify(newCorrectTexts)}`);
          errors++;
      }
  });

  if (errors === 0) {
      console.log('Verification successful: All correct answers match.');
  } else {
      console.error(`Verification failed with ${errors} errors.`);
      process.exit(1);
  }
}

main();

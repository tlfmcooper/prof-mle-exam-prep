
import { readFileSync } from 'fs';
import path from 'path';

const filePath = path.resolve(__dirname, '../data/improved-questions.json');
const content = readFileSync(filePath, 'utf-8');
const questions = JSON.parse(content);

let missingTopics = 0;
let totalQuestions = questions.length;

questions.forEach((q: any) => {
  if (!q.topics || q.topics.length === 0) {
    missingTopics++;
    // console.log(`Question ${q.id} is missing topics`);
  }
});

console.log(`Total Questions: ${totalQuestions}`);
console.log(`Questions missing topics: ${missingTopics}`);

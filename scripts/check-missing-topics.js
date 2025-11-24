
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.resolve(__dirname, '../data/improved-questions.json');
const content = readFileSync(filePath, 'utf-8');
const questions = JSON.parse(content);

let missingTopics = 0;
let totalQuestions = questions.length;
let uniqueTopics = new Set();

questions.forEach((q) => {
  if (!q.topics || q.topics.length === 0) {
    missingTopics++;
  } else {
    q.topics.forEach(t => uniqueTopics.add(t));
  }
});

console.log(`Total Questions: ${totalQuestions}`);
console.log(`Questions missing topics: ${missingTopics}`);
console.log(`Unique topics found: ${uniqueTopics.size}`);

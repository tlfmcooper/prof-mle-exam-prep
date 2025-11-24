
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const questionsPath = path.resolve(__dirname, '../data/improved-questions.json');
const topicsPath = path.resolve(__dirname, '../data/topics.json');

const questions = JSON.parse(readFileSync(questionsPath, 'utf-8'));
const topicsData = JSON.parse(readFileSync(topicsPath, 'utf-8'));

const validTopicNames = new Set(topicsData.topics.map(t => t.name));
const validTopicIds = new Set(topicsData.topics.map(t => t.id));

let mismatchCount = 0;
let missingTopics = new Set();

questions.forEach(q => {
  if (q.topics) {
    q.topics.forEach(t => {
      if (!validTopicNames.has(t) && !validTopicIds.has(t)) {
        mismatchCount++;
        missingTopics.add(t);
      }
    });
  }
});

console.log(`Total Questions: ${questions.length}`);
console.log(`Topic Mismatches: ${mismatchCount}`);
console.log(`Unique Unknown Topics: ${missingTopics.size}`);
if (missingTopics.size > 0) {
    console.log('First 20 unknown topics:', Array.from(missingTopics).slice(0, 20));
}


import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const questionsPath = path.resolve(__dirname, '../data/improved-questions.json');
const topicsPath = path.resolve(__dirname, '../data/topics.json');

const questions = JSON.parse(readFileSync(questionsPath, 'utf-8'));
const topicsData = JSON.parse(readFileSync(topicsPath, 'utf-8'));

// Create a map of valid topic names/IDs to their IDs
const validTopicMap = new Map();
topicsData.topics.forEach(t => {
  validTopicMap.set(t.id.toLowerCase(), t.id);
  validTopicMap.set(t.name.toLowerCase(), t.id);
});

// Manual mappings for common mismatches found in the previous step
const manualMappings = {
  'vertex ai': 'low_code_ai', // Fallback or specific sub-topic
  'bigquery': 'bigquery_ml',
  'data management': 'data_collaboration',
  'ml metadata': 'metadata_tracking',
  'lineage': 'metadata_tracking',
  'data preparation': 'data_prep',
  'data labeling': 'data_prep', // Close enough
  'data splitting': 'data_prep',
  'imbalanced data': 'data_prep',
  'iam': 'security', // Assuming security topic exists or similar
  'cross-project': 'security',
  'compliance': 'responsible_ai',
  'audit logs': 'monitoring',
  'security': 'risk_identification',
  'feature store': 'feature_store',
  'mlops': 'mlops',
  'latency optimization': 'model_optimization',
  'governance': 'responsible_ai',
  'cloud dlp': 'data_privacy',
  'privacy': 'data_privacy',
  'computer vision': 'computer_vision',
  'nlp': 'low_code_ai', // Or specific NLP topic
  'tensorflow': 'tensorflow',
  'pytorch': 'pytorch',
  'automl': 'automl',
  'hyperparameter tuning': 'hyperparameter_tuning',
  'distributed training': 'distributed_training',
  'model training': 'model_training',
  'model serving': 'model_serving',
  'batch prediction': 'batch_prediction',
  'online prediction': 'online_prediction',
  'vertex ai pipelines': 'vertex_ai_pipelines',
  'kubeflow': 'kubeflow',
  'tfx': 'tfx',
  'ci/cd': 'cicd',
  'monitoring': 'monitoring',
  'model monitoring': 'model_monitoring',
  'explainable ai': 'model_explainability',
  'bias': 'bias_fairness',
  'fairness': 'bias_fairness',
  'tensorboard': 'tensorboard'
};

let updatedCount = 0;

questions.forEach(q => {
  if (q.topics) {
    const newTopics = new Set();
    q.topics.forEach(t => {
      const lowerT = t.toLowerCase();
      
      // 1. Check exact match (case-insensitive)
      if (validTopicMap.has(lowerT)) {
        newTopics.add(validTopicMap.get(lowerT));
      } 
      // 2. Check manual mapping
      else if (manualMappings[lowerT]) {
        newTopics.add(manualMappings[lowerT]);
      }
      // 3. Check partial matches (e.g. "Vertex AI Feature Store" -> "feature_store")
      else {
        let found = false;
        for (const [key, value] of Object.entries(manualMappings)) {
            if (lowerT.includes(key)) {
                newTopics.add(value);
                found = true;
                break;
            }
        }
        // If still not found, maybe try to map to a default or log it
        if (!found) {
            // console.log(`Could not map topic: ${t}`);
        }
      }
    });
    
    if (newTopics.size > 0) {
        q.topics = Array.from(newTopics);
        updatedCount++;
    }
  }
});

console.log(`Updated topics for ${updatedCount} questions.`);

// Write back to file
writeFileSync(questionsPath, JSON.stringify(questions, null, 2));
console.log('Saved updated questions to improved-questions.json');

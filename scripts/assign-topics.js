import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const questionsPath = path.resolve(__dirname, '../data/improved-questions.json');
const topicsPath = path.resolve(__dirname, '../data/topics.json');

const questions = JSON.parse(readFileSync(questionsPath, 'utf-8'));
const topicsData = JSON.parse(readFileSync(topicsPath, 'utf-8'));

// Create comprehensive topic mapping with keywords from exam guide
const topicKeywords = {
  // Section 1: Low-code AI (13%)
  'low_code_ai': ['low-code', 'no-code', 'low code', 'automl', 'bigquery ml', 'foundation model', 'model garden', 'agent builder'],
  'bigquery_ml': ['bigquery ml', 'bqml', 'bigquery machine learning', 'linear regression', 'binary classification', 'time-series', 'matrix factorization', 'boosted tree', 'autoencoder'],
  'automl': ['automl', 'auto ml', 'automated machine learning', 'tabular workflow', 'forecasting model'],
  'ml_apis': ['ml api', 'machine learning api', 'pre-built api', 'pretrained'],
  'foundation_models': ['foundation model', 'large language model', 'llm', 'palm', 'gemini'],
  'rag': ['rag', 'retrieval augmented generation', 'retrieval-augmented', 'agent builder'],
  
  // Section 2: Data collaboration (14%)
  'data_collaboration': ['data collaboration', 'team collaboration', 'data sharing'],
  'data_prep': ['data prep', 'data preprocessing', 'preprocessing', 'data cleaning', 'data preparation', 'data organization', 'data labeling'],
  'data_privacy': ['privacy', 'pii', 'phi', 'personally identifiable', 'protected health', 'sensitive data', 'gdpr', 'compliance'],
  'feature_engineering': ['feature engineering', 'feature selection', 'feature creation', 'feature extraction'],
  'feature_store': ['feature store', 'vertex ai feature store', 'feature management', 'feature serving'],
  'jupyter_notebooks': ['jupyter', 'notebook', 'vertex ai workbench', 'colab enterprise', 'dataproc notebook'],
  'experiment_tracking': ['experiment', 'vertex ai experiments', 'tensorboard', 'tracking experiments', 'ml experiments'],
  
  // Section 3: Model development (18%)
  'model_dev': ['model development', 'prototype', 'scaling prototype'],
  'model_architecture': ['architecture', 'model architecture', 'framework selection'],
  'model_training': ['training', 'model training', 'train model', 'training data', 'training pipeline'],
  'distributed_training': ['distributed training', 'multi-gpu', 'multi-node', 'horovod', 'reduction server'],
  'hyperparameter_tuning': ['hyperparameter', 'hyperparameter tuning', 'tuning', 'optimization'],
  'tensorflow': ['tensorflow', 'tf', 'keras'],
  'pytorch': ['pytorch', 'torch'],
  'regularization': ['regularization', 'l1', 'l2', 'dropout', 'overfitting'],
  'model_optimization': ['optimization', 'model optimization', 'latency', 'performance tuning', 'throughput'],
  
  // Section 4: Model serving (20%)
  'model_serving': ['serving', 'model serving', 'deployment', 'inference'],
  'batch_prediction': ['batch', 'batch prediction', 'batch inference', 'offline inference'],
  'online_prediction': ['online', 'real-time', 'online prediction', 'real-time inference'],
  'vertex_ai_endpoints': ['endpoint', 'vertex ai endpoint', 'prediction endpoint'],
  'model_registry': ['registry', 'model registry', 'artifact', 'model versioning'],
  'ab_testing': ['a/b test', 'a/b testing', 'canary', 'blue-green'],
  
  // Section 5: MLOps (22%)
  'mlops': ['mlops', 'ml ops', 'pipeline', 'automation', 'orchestration'],
  'vertex_ai_pipelines': ['vertex ai pipeline', 'vertex pipeline', 'pipeline orchestration'],
  'kubeflow': ['kubeflow', 'kfp', 'kubeflow pipeline'],
  'tfx': ['tfx', 'tensorflow extended', 'tf extended'],
  'cicd': ['ci/cd', 'continuous integration', 'continuous delivery', 'continuous deployment', 'cloud build', 'jenkins'],
  'model_retraining': ['retraining', 'model retraining', 'retrain', 'retraining policy'],
  'metadata_tracking': ['metadata', 'lineage', 'artifact tracking', 'vertex ml metadata', 'data lineage'],
  'deployment_strategies': ['deployment', 'deployment strategy'],
  
  // Section 6: Monitoring (13%)
  'monitoring': ['monitoring', 'observability', 'metrics'],
  'model_monitoring': ['model monitoring', 'vertex ai model monitoring', 'monitoring performance'],
  'training_serving_skew': ['training-serving skew', 'skew', 'data drift'],
  'feature_drift': ['feature drift', 'drift detection', 'feature attribution drift'],
  'responsible_ai': ['responsible ai', 'fairness', 'bias', 'ethics', 'explainability'],
  'model_explainability': ['explainability', 'explainable ai', 'interpretability', 'shap', 'lime'],
  'bias_fairness': ['bias', 'fairness', 'bias detection'],
  'tensorboard': ['tensorboard', 'visualization'],
  
  // Additional topics
  'computer_vision': ['computer vision', 'image', 'vision', 'object detection', 'image classification', 'segmentation'],
};

// Reverse mapping: free-text -> topic ID
const textToTopicId = {};

// Add all topic names and IDs
topicsData.topics.forEach(t => {
  textToTopicId[t.id.toLowerCase()] = t.id;
  textToTopicId[t.name.toLowerCase()] = t.id;
});

// Manual mappings for common free-text topics
const manualMappings = {
  'vertex ai': 'low_code_ai',
  'bigquery': 'bigquery_ml',
  'data management': 'data_prep',
  'ml metadata': 'metadata_tracking',
  'lineage': 'metadata_tracking',
  'data preparation': 'data_prep',
  'data labeling': 'data_prep',
  'data splitting': 'data_prep',
  'imbalanced data': 'data_prep',
  'iam': 'responsible_ai',
  'cross-project': 'data_collaboration',
 'compliance': 'data_privacy',
  'audit logs': 'monitoring',
  'security': 'responsible_ai',
  'latency optimization': 'model_optimization',
  'governance': 'responsible_ai',
  'cloud dlp': 'data_privacy',
  'privacy': 'data_privacy',
  'nlp': 'low_code_ai',
  'natural language': 'low_code_ai',
  'batch inference': 'batch_prediction',
  'online serving': 'online_prediction',
  'model performance': 'model_monitoring',
  'ml engineering': 'model_dev',
  'data engineering': 'data_prep',
  'feature management': 'feature_store',
  'vertex': 'low_code_ai',
  'gcp': 'low_code_ai',
  'google cloud': 'low_code_ai',
  'cloud storage': 'data_prep',
  'dataflow': 'data_prep',
  'databricks': 'data_prep',
  'spark': 'data_prep',
  'hadoop': 'data_prep',
};

function assignTopicsToQuestion(question) {
  const assignedTopics = new Set();
  const questionText = `${question.question_text} ${question.explanation || ''}`.toLowerCase();
  
  // 1. Check existing topics and normalize them
  if (question.topics && question.topics.length > 0) {
    question.topics.forEach(t => {
      const lowerT = t.toLowerCase();
      
      // Check if it's already a valid ID
      if (textToTopicId[lowerT]) {
        assignedTopics.add(textToTopicId[lowerT]);
      }
      // Check manual mapping
      else if (manualMappings[lowerT]) {
        assignedTopics.add(manualMappings[lowerT]);
      }
    });
  }
  
  // 2. Keyword-based assignment from question content
  for (const [topicId, keywords] of Object.entries(topicKeywords)) {
    for (const keyword of keywords) {
      if (questionText.includes(keyword.toLowerCase())) {
        assignedTopics.add(topicId);
        break;
      }
    }
  }
  
  // 3. If still no topics, assign a default based on question text analysis
  if (assignedTopics.size === 0) {
    // Fallback: assign to the most general topic
    assignedTopics.add('model_dev');
  }
  
  return Array.from(assignedTopics);
}

// Process all questions
let updatedCount = 0;
let questionsWithoutTopics = 0;

questions.forEach(q => {
  const originalTopics = q.topics ? q.topics.length : 0;
  q.topics = assignTopicsToQuestion(q);
  
  if (q.topics.length > originalTopics) {
    updatedCount++;
  }
  
  if (q.topics.length === 0) {
    questionsWithoutTopics++;
    console.log(`Warning: Question ${q.id} still has no topics`);
  }
});

console.log(`\n=== Topic Assignment Summary ===`);
console.log(`Total questions: ${questions.length}`);
console.log(`Questions updated: ${updatedCount}`);
console.log(`Questions without topics: ${questionsWithoutTopics}`);

// Get topic distribution
const topicCounts = {};
questions.forEach(q => {
  q.topics.forEach(t => {
    topicCounts[t] = (topicCounts[t] || 0) + 1;
  });
});

console.log(`\n=== Topic Distribution ===`);
Object.entries(topicCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([topic, count]) => {
    console.log(`${topic}: ${count}`);
  });

// Write back to file
writeFileSync(questionsPath, JSON.stringify(questions, null, 2));
console.log('\n✅ Saved updated questions to improved-questions.json');

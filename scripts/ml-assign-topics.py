#!/usr/bin/env -S uvx --with transformers --with torch
# /// script
# dependencies = [
#   "transformers>=4.30.0",
#   "torch>=2.0.0",
# ]
# ///
"""
ML-based topic assignment for questions using zero-shot classification.
Uses pre-trained HuggingFace model to assign topics to questions without them.
"""

import json
from pathlib import Path
from transformers import pipeline
from collections import defaultdict

# Load questions
questions_path = Path(__file__).parent.parent / 'data' / 'improved-questions.json'
topics_path = Path(__file__).parent.parent / 'data' / 'topics.json'

with open(questions_path, 'r', encoding='utf-8') as f:
    questions = json.load(f)

with open(topics_path, 'r', encoding='utf-8') as f:
    topics_data = json.load(f)

# Create topic labels with descriptions
topic_labels = {}
for topic in topics_data['topics']:
    topic_labels[topic['id']] = {
        'name': topic['name'],
        'description': topic.get('description', topic['name'])
    }

# Main topic IDs (exclude sub-topics for simpler classification)
main_topics = [
    'low_code_ai',
    'data_collaboration', 
    'model_dev',
    'model_serving',
    'mlops',
    'monitoring'
]

# Create descriptive labels for classification
candidate_labels = [topic_labels[tid]['name'] for tid in main_topics if tid in topic_labels]

print(f"Initializing zero-shot classification model...")
print(f"   Using {len(candidate_labels)} main topic categories")
print(f"   This will download ~1.6GB model on first run...")

# Load zero-shot classification pipeline
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli", device=-1)

# Find questions without topics or with empty topics
questions_to_classify = []
questions_with_topics = []

for q in questions:
    if not q.get('topics') or len(q['topics']) == 0:
        questions_to_classify.append(q)
    else:
        questions_with_topics.append(q)

print(f"\nQuestion Statistics:")
print(f"   Questions with topics: {len(questions_with_topics)}")
print(f"   Questions to classify: {len(questions_to_classify)}")
print(f"   Total questions: {len(questions)}")

if len(questions_to_classify) == 0:
    print("\nAll questions already have topics!")
    exit(0)

print(f"\nClassifying {len(questions_to_classify)} questions...")
print(f"   (This may take a few minutes...)")

# Process each question
for idx, q in enumerate(questions_to_classify):
    # Create text to classify (question + explanation if available)
    text = q['question_text']
    if q.get('explanation'):
        text += " " + q['explanation']
    
    # Truncate if too long (BART has 1024 token limit)
    text = text[:2000]
    
    # Classify
    try:
        result = classifier(text, candidate_labels, multi_label=True)
        
        # Get top 2-3 topics with score > 0.3
        predicted_topics = []
        for label, score in zip(result['labels'], result['scores']):
            if score > 0.3 and len(predicted_topics) < 3:
                # Map label back to topic ID
                for tid in main_topics:
                    if tid in topic_labels and topic_labels[tid]['name'] == label:
                        predicted_topics.append(tid)
                        break
        
        # If no topics with high confidence, take top 1
        if not predicted_topics:
            top_label = result['labels'][0]
            for tid in main_topics:
                if tid in topic_labels and topic_labels[tid]['name'] == top_label:
                    predicted_topics.append(tid)
                    break
        
        # Assign topics
        q['topics'] = predicted_topics
        
        if (idx + 1) % 50 == 0:
            print(f"   Processed {idx + 1}/{len(questions_to_classify)} questions...")
            
    except Exception as e:
        print(f"   Warning: Error classifying question {q['id']}: {e}")
        # Fallback: assign model_dev as default
        q['topics'] = ['model_dev']

print(f"\nClassification complete!")

# Statistics
topic_counts = defaultdict(int)
for q in questions:
    for topic in q.get('topics', []):
        topic_counts[topic] += 1

print(f"\nTopic Distribution:")
for topic, count in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:15]:
    topic_name = topic_labels.get(topic, {}).get('name', topic)
    print(f"   {topic_name}: {count}")

# Verify all questions have topics
questions_without_topics = sum(1 for q in questions if not q.get('topics') or len(q['topics']) == 0)
print(f"\nFinal Check:")
print(f"   Questions with topics: {len(questions) - questions_without_topics}/{len(questions)}")
print(f"   Questions without topics: {questions_without_topics}")

# Save updated questions
with open(questions_path, 'w', encoding='utf-8') as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)

print(f"\nSaved updated questions to {questions_path.name}")
print(f"\nReady for re-ingestion!")

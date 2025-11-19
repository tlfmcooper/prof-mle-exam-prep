"""
Transform basic questions in missing-questions.json to professional GCP ML Engineer exam quality.

This script applies the following transformations:
1. Adds organizational/business context (e.g., "Your retail company...")
2. Injects 2-3 realistic constraints (cost, latency, compliance, expertise)
3. Expands to 3-5 sentence paragraph-length scenarios
4. Specifies scale metrics (e.g., "1000 stores", "< 100ms latency")
5. Integrates multiple GCP services where appropriate
6. Creates sophisticated distractors (plausible anti-patterns, service confusion)
7. Enhances explanations with architectural trade-offs
"""

import json
import random
from typing import Dict, List, Any

# Professional transformation templates and patterns
BUSINESS_CONTEXTS = [
    "Your retail company",
    "Your healthcare organization",
    "Your financial services company",
    "Your e-commerce platform",
    "Your insurance company",
    "Your manufacturing company",
    "Your media streaming service",
    "Your telecommunications provider",
    "Your logistics company",
    "Your real estate platform"
]

CONSTRAINT_TEMPLATES = {
    "cost": [
        "while minimizing costs",
        "within a tight budget of ${budget}/month",
        "without provisioning expensive infrastructure",
        "keeping training costs under ${budget}",
        "optimizing for cost-effectiveness"
    ],
    "time": [
        "with a deadline of {timeframe}",
        "launching next week",
        "within a {duration} training window",
        "as quickly as possible",
        "before the {event} campaign"
    ],
    "latency": [
        "with < {ms}ms latency requirements",
        "requiring sub-{ms}ms response times",
        "maintaining p99 latency under {ms}ms",
        "ensuring predictions complete within {ms}ms",
        "achieving {ms}ms or better latency"
    ],
    "scale": [
        "serving {number} predictions per day",
        "handling {number} concurrent requests",
        "processing data from {number} {entities}",
        "supporting {number} {unit}",
        "scaling to {number} transactions"
    ],
    "expertise": [
        "with limited ML expertise on the team",
        "without Kubernetes knowledge",
        "with minimal data science resources",
        "requiring no deep learning expertise",
        "minimizing the need for specialized ML skills"
    ],
    "compliance": [
        "meeting HIPAA compliance requirements",
        "ensuring GDPR compliance",
        "adhering to data residency regulations",
        "maintaining SOC 2 certification",
        "complying with financial regulations"
    ],
    "maintenance": [
        "requiring minimal operational overhead",
        "with limited DevOps resources",
        "minimizing ongoing maintenance",
        "reducing operational complexity",
        "without dedicated MLOps engineers"
    ]
}

SCALE_VALUES = {
    "budget": ["500", "1000", "2000", "5000"],
    "timeframe": ["2 weeks", "1 month", "next quarter"],
    "duration": ["5-hour", "overnight", "weekend"],
    "event": ["holiday", "quarterly", "product launch", "seasonal"],
    "ms": ["10", "50", "100", "200"],
    "number": ["1000", "10000", "100000", "1 million", "5 million"],
    "entities": ["stores", "customers", "users", "devices", "transactions"],
    "unit": ["users", "requests per second", "models", "endpoints"]
}


def apply_professional_transformation(question: Dict[str, Any]) -> Dict[str, Any]:
    """Transform a basic question into professional exam-quality format."""
    
    # Extract current question components
    current_text = question["question_text"]
    current_options = question["options"]
    current_explanation = question["explanation"]
    topics = question.get("topics", [])
    
    # Determine transformation strategy based on topics and current structure
    transformed_text = transform_question_text(current_text, topics)
    transformed_options = transform_options(current_options, topics)
    transformed_explanation = transform_explanation(current_explanation, transformed_options)
    
    # Update the question
    question["question_text"] = transformed_text
    question["options"] = transformed_options
    question["explanation"] = transformed_explanation
    
    return question


def transform_question_text(text: str, topics: List[str]) -> str:
    """Transform question text into paragraph-length professional scenario."""
    
    # Select business context
    business_context = random.choice(BUSINESS_CONTEXTS)
    
    # Determine service/product from topics
    primary_service = identify_primary_service(topics)
    
    # Add 2-3 constraints
    constraint_types = random.sample(list(CONSTRAINT_TEMPLATES.keys()), min(3, len(CONSTRAINT_TEMPLATES)))
    constraints = []
    
    for constraint_type in constraint_types:
        template = random.choice(CONSTRAINT_TEMPLATES[constraint_type])
        # Replace placeholders with actual values
        for placeholder, values in SCALE_VALUES.items():
            if f"{{{placeholder}}}" in template:
                template = template.replace(f"{{{placeholder}}}", random.choice(values))
        constraints.append(template)
    
    # Build enhanced scenario
    if "dataset" in text.lower() or "data" in text.lower():
        enhanced = build_data_scenario(business_context, text, topics, constraints)
    elif "model" in text.lower() and ("train" in text.lower() or "build" in text.lower()):
        enhanced = build_training_scenario(business_context, text, topics, constraints)
    elif "feature" in text.lower() or "Feature Store" in text:
        enhanced = build_feature_scenario(business_context, text, topics, constraints)
    elif "deploy" in text.lower() or "serving" in text.lower():
        enhanced = build_serving_scenario(business_context, text, topics, constraints)
    elif "monitor" in text.lower() or "drift" in text.lower():
        enhanced = build_monitoring_scenario(business_context, text, topics, constraints)
    else:
        enhanced = build_general_scenario(business_context, text, topics, constraints)
    
    return enhanced


def identify_primary_service(topics: List[str]) -> str:
    """Identify the primary GCP service from topics."""
    service_keywords = {
        "Vertex AI": ["Vertex AI", "AutoML", "Custom Training"],
        "BigQuery": ["BigQuery", "BigQuery ML"],
        "Feature Store": ["Feature Store"],
        "Cloud Composer": ["Cloud Composer", "Airflow"],
        "Dataflow": ["Dataflow"],
        "TensorFlow": ["TensorFlow"],
        "PyTorch": ["PyTorch"]
    }
    
    for service, keywords in service_keywords.items():
        for keyword in keywords:
            if any(keyword in topic for topic in topics):
                return service
    return "Vertex AI"


def build_data_scenario(context: str, original: str, topics: List[str], constraints: List[str]) -> str:
    """Build a professional data management scenario."""
    scenarios = [
        f"{context} operates {random.choice(['1500', '2000', '5000'])} {random.choice(['retail locations', 'distribution centers', 'service points'])} generating {random.choice(['500GB', '2TB', '10TB'])} of transactional data daily stored in BigQuery. Your data science team needs to train multiple ML models on this constantly updated dataset {', '.join(constraints[:2])}. The current approach of exporting CSV files creates data synchronization issues and storage bloat. What should you implement?",
        
        f"{context} has customer behavioral data across web analytics (BigQuery), CRM systems (Cloud SQL), and purchase history (Cloud Storage). Your ML team needs unified access to this data for training recommendation models, {', '.join(constraints[:2])}. Data scientists currently waste hours writing custom ETL scripts for each model. How should you architect the data management solution?",
        
        f"{context}'s data engineering team maintains product catalog data that updates hourly via API feeds. Your ML models for search ranking and personalization need access to the latest product attributes {', '.join(constraints[:2])}. The current batch export process causes models to use stale data for up to 24 hours. What's the best approach to enable near-real-time data access?"
    ]
    return random.choice(scenarios)


def build_training_scenario(context: str, original: str, topics: List[str], constraints: List[str]) -> str:
    """Build a professional model training scenario."""
    scenarios = [
        f"{context} needs to build a demand forecasting model using {random.choice(['3 years', '5 years', '10 years'])} of historical sales data ({random.choice(['100GB', '500GB', '2TB'])} in BigQuery). Your data science team has limited ML expertise and needs to deliver a working prototype {', '.join(constraints[:2])}. The VP of Engineering mandates using managed services to reduce operational overhead. What training approach should you use?",
        
        f"{context}'s ML team is developing a {random.choice(['churn prediction', 'fraud detection', 'recommendation'])} model using tabular customer data. The model must train on {random.choice(['50 million', '100 million', '500 million'])} records {', '.join(constraints[:2])}. Your team needs to experiment with different feature sets and hyperparameters rapidly. Which training framework and infrastructure combination is most appropriate?",
        
        f"{context} operates {random.choice(['15', '25', '50'])} distinct ML models for different business units. Each model requires monthly retraining on updated datasets. Your small MLOps team ({random.choice(['2', '3', '4'])} engineers) struggles to maintain custom training scripts across all models, {', '.join(constraints[:2])}. What solution minimizes maintenance while enabling consistent training workflows?"
    ]
    return random.choice(scenarios)


def build_feature_scenario(context: str, original: str, topics: List[str], constraints: List[str]) -> str:
    """Build a professional feature engineering/store scenario."""
    scenarios = [
        f"{context} operates {random.choice(['15', '25', '40'])} ML models for personalization (recommendations, email targeting, churn prediction, pricing optimization). Each model team independently calculates 'customer_lifetime_value' and 'days_since_last_purchase' features, leading to inconsistent definitions across models and duplication of compute resources. Your VP of Engineering mandates centralizing feature definitions {', '.join(constraints[:2])}. The solution must support both batch training (nightly) and real-time prediction. What should you implement?",
        
        f"{context}'s fraud detection system requires features combining user profile data (updated monthly) and recent transaction patterns (updated every minute). The system serves {random.choice(['1 million', '5 million', '10 million'])} predictions daily {', '.join(constraints[:2])}. Your current architecture duplicates feature logic between training and serving, causing training-serving skew. How should you redesign the feature infrastructure?",
        
        f"{context} has customer demographic features stored in BigQuery that {random.choice(['5', '10', '15'])} different ML models need to access. Each team currently copies data and implements their own feature transformations, resulting in inconsistent preprocessing {', '.join(constraints[:2])}. You need to enable feature reuse while maintaining low-latency access for online predictions. What's the best architectural approach?"
    ]
    return random.choice(scenarios)


def build_serving_scenario(context: str, original: str, topics: List[str], constraints: List[str]) -> str:
    """Build a professional model serving scenario."""
    scenarios = [
        f"{context}'s production recommendation model deployed on Vertex AI Endpoint experiences p99 latency of {random.choice(['500ms', '800ms', '1200ms'])} during peak traffic ({random.choice(['10000', '50000', '100000'])} requests per minute). Monitoring shows cold-start delays when autoscaling triggers. You need to reduce latency to < {random.choice(['100ms', '50ms', '200ms'])} {', '.join(constraints[:2])}. What optimization strategy should you implement?",
        
        f"{context} operates a fraud detection model that needs to return predictions within {random.choice(['50ms', '100ms', '150ms'])} for real-time transaction approval. The model requires {random.choice(['50', '100', '200'])} features from multiple sources: user profiles (BigQuery), recent activity (Cloud Bigtable), and merchant data (Cloud Storage). Your current approach queries each source synchronously, causing unacceptable latency {', '.join(constraints[:2])}. How should you redesign the serving architecture?",
        
        f"{context} needs to deploy a new version of a critical pricing model that serves {random.choice(['1 million', '5 million', '10 million'])} predictions daily. The model update changes the prediction logic significantly, and you're concerned about business impact if the new version underperforms. You want to test it against real traffic without affecting customer experience initially {', '.join(constraints[:2])}. Which deployment strategy is most appropriate?"
    ]
    return random.choice(scenarios)


def build_monitoring_scenario(context: str, original: str, topics: List[str], constraints: List[str]) -> str:
    """Build a professional monitoring/MLOps scenario."""
    scenarios = [
        f"{context}'s production recommendation model has been deployed for {random.choice(['6 months', '1 year', '18 months'])}. Recent business metrics show declining click-through rates, but model accuracy metrics appear stable. You suspect feature distribution drift in user behavior patterns due to seasonal changes {', '.join(constraints[:2])}. You need to implement comprehensive monitoring that detects drift and automatically triggers retraining. What monitoring architecture should you deploy?",
        
        f"{context} operates {random.choice(['20', '35', '50'])} production ML models across different business units. Your small MLOps team ({random.choice(['2', '3', '4'])} engineers) struggles to manually monitor model performance and investigate prediction quality issues {', '.join(constraints[:2])}. Models serve predictions to external customers, making reliability critical. What centralized monitoring solution provides visibility across all models?",
        
        f"{context}'s fraud detection model was trained on data from {random.choice(['Q1 2024', 'Q2 2024', 'Q3 2024'])}. Three months into production, the false positive rate has increased from {random.choice(['2%', '3%', '5%'])} to {random.choice(['15%', '20%', '25%'])}, blocking legitimate transactions and frustrating customers. Investigation reveals that fraud patterns have evolved significantly {', '.join(constraints[:2])}. How should you prevent this type of model degradation in the future?"
    ]
    return random.choice(scenarios)


def build_general_scenario(context: str, original: str, topics: List[str], constraints: List[str]) -> str:
    """Build a general professional scenario."""
    # Extract key elements from original question
    if "?" in original:
        core_question = original.split("?")[0]
    else:
        core_question = original
    
    # Add context and constraints
    enhanced = f"{context} {core_question.replace('You', 'your team').replace('need to', 'needs to')} {', '.join(constraints[:2])}. What should you do?"
    
    return enhanced


def transform_options(options: List[Dict], topics: List[str]) -> List[Dict]:
    """Transform options to include sophisticated distractors."""
    
    for option in options:
        if not option["is_correct"]:
            # Enhance incorrect options with plausible but wrong approaches
            option["text"] = make_distractor_sophisticated(option["text"], topics)
        else:
            # Enhance correct option with specific technical details
            option["text"] = add_technical_specificity(option["text"], topics)
    
    return options


def make_distractor_sophisticated(text: str, topics: List[str]) -> str:
    """Make incorrect options more sophisticated (plausible anti-patterns)."""
    
    # Service confusion patterns
    if "Feature Store" in text and "model" in text.lower():
        return text.replace("Feature Store", "Cloud Storage")
    
    # Add unnecessary complexity
    if "simple" in text.lower() or "directly" in text.lower():
        complexity_additions = [
            " by first exporting to Cloud Storage, then processing with Dataflow, before loading",
            " using a custom Kubernetes cluster with manual scaling configuration",
            " after setting up a complex ETL pipeline with multiple intermediate tables"
        ]
        if not any(addition in text for addition in complexity_additions):
            text = text.replace(".", random.choice(complexity_additions) + ".")
    
    # Incomplete solutions
    if "configure" in text.lower() or "enable" in text.lower():
        if "IAM" not in text and "permissions" not in text and random.random() > 0.5:
            text = text.replace(".", " without configuring appropriate IAM permissions.")
    
    return text


def add_technical_specificity(text: str, topics: List[str]) -> str:
    """Add specific technical details to correct answers."""
    
    # Add specific API or parameter names
    if "Vertex AI" in text and "train" in text.lower():
        if "enable_caching" not in text:
            text = text.replace(".", ", ensuring enable_caching=True for pipeline efficiency.")
    
    # Add monitoring or validation details
    if "deploy" in text.lower() and "monitor" not in text.lower():
        text = text.replace(".", ", with continuous evaluation enabled for production monitoring.")
    
    return text


def transform_explanation(explanation: str, options: List[Dict]) -> str:
    """Transform explanation to include architectural trade-offs."""
    
    # Keep the core explanation structure but enhance with trade-offs
    parts = explanation.split(". ")
    
    enhanced_parts = []
    for part in parts:
        if "is correct because" in part.lower():
            # Add architectural reasoning
            part += " This approach balances operational efficiency, cost-effectiveness, and scalability"
        elif "is not correct because" in part.lower():
            # Add trade-off reasoning
            if "would" not in part and "could" not in part:
                part = part.replace("is not correct because", "is not correct because this approach")
    
        enhanced_parts.append(part)
    
    return ". ".join(enhanced_parts)


def main():
    """Main transformation function."""
    
    # Load the missing questions
    input_file = r"c:\Users\Ali Kone\OneDrive\ALKHAF\LnD\prof-mle-exam-prep\data\missing-questions.json"
    
    print("Loading missing-questions.json...")
    with open(input_file, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    print(f"Loaded {len(questions)} questions")
    print("Applying professional transformations...")
    
    # Transform each question
    transformed_questions = []
    for i, question in enumerate(questions):
        try:
            transformed = apply_professional_transformation(question)
            transformed_questions.append(transformed)
            
            if (i + 1) % 10 == 0:
                print(f"  Transformed {i + 1}/{len(questions)} questions...")
        
        except Exception as e:
            print(f"  Error transforming question {question.get('id', 'unknown')}: {e}")
            transformed_questions.append(question)  # Keep original on error
    
    print(f"Transformation complete. Saving {len(transformed_questions)} questions...")
    
    # Save back to the same file
    with open(input_file, 'w', encoding='utf-8') as f:
        json.dump(transformed_questions, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Successfully transformed and saved questions to {input_file}")


if __name__ == "__main__":
    main()

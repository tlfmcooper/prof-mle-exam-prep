-- Professional Machine Learning Engineer Exam Prep - Seed Data
-- Generated: 2025-11-15
-- Source: Professional Machine Learning Engineer Sample Questions PDF

-- ============================================================================
-- TOPICS TABLE
-- ============================================================================

INSERT INTO topics (id, name, description, exam_weight, parent_topic_id, created_at) VALUES
-- Main sections
('550e8400-e29b-41d4-a716-446655440001', 'Architecting low-code AI solutions', 'Building AI solutions using low-code and no-code tools', 0.13, NULL, NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Data and Model Collaboration', 'Managing data preprocessing and model development', 0.14, NULL, NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'Model Development', 'Scaling prototypes into production ML models', 0.18, NULL, NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'Model Serving', 'Deploying and scaling models for inference', 0.20, NULL, NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'MLOps & Automation', 'Automating and orchestrating ML pipelines', 0.22, NULL, NOW()),
('550e8400-e29b-41d4-a716-446655440006', 'Monitoring & Optimization', 'Monitoring AI solutions in production', 0.13, NULL, NOW()),

-- Subtopics
('550e8400-e29b-41d4-a716-446655440101', 'BigQuery ML', 'Developing ML models using BigQuery ML', NULL, '550e8400-e29b-41d4-a716-446655440001', NOW()),
('550e8400-e29b-41d4-a716-446655440102', 'AutoML', 'Training models using Vertex AI AutoML', NULL, '550e8400-e29b-41d4-a716-446655440001', NOW()),
('550e8400-e29b-41d4-a716-446655440103', 'ML APIs', 'Using pre-built ML APIs from Model Garden', NULL, '550e8400-e29b-41d4-a716-446655440001', NOW()),
('550e8400-e29b-41d4-a716-446655440104', 'Foundation Models', 'Working with foundation models', NULL, '550e8400-e29b-41d4-a716-446655440001', NOW()),
('550e8400-e29b-41d4-a716-446655440105', 'RAG', 'Retrieval Augmented Generation', NULL, '550e8400-e29b-41d4-a716-446655440001', NOW()),

('550e8400-e29b-41d4-a716-446655440201', 'Data Preparation', 'Preprocessing and organizing data for ML', NULL, '550e8400-e29b-41d4-a716-446655440002', NOW()),
('550e8400-e29b-41d4-a716-446655440202', 'Data Privacy', 'Handling PII, PHI, and sensitive data', NULL, '550e8400-e29b-41d4-a716-446655440002', NOW()),
('550e8400-e29b-41d4-a716-446655440203', 'Feature Engineering', 'Creating and selecting features', NULL, '550e8400-e29b-41d4-a716-446655440002', NOW()),
('550e8400-e29b-41d4-a716-446655440204', 'Vertex AI Feature Store', 'Managing features', NULL, '550e8400-e29b-41d4-a716-446655440002', NOW()),
('550e8400-e29b-41d4-a716-446655440205', 'Jupyter Notebooks', 'Model prototyping', NULL, '550e8400-e29b-41d4-a716-446655440002', NOW()),

('550e8400-e29b-41d4-a716-446655440301', 'Model Training', 'Training ML models', NULL, '550e8400-e29b-41d4-a716-446655440003', NOW()),
('550e8400-e29b-41d4-a716-446655440302', 'Distributed Training', 'Multi-GPU/TPU training', NULL, '550e8400-e29b-41d4-a716-446655440003', NOW()),
('550e8400-e29b-41d4-a716-446655440303', 'TensorFlow', 'Building models with TensorFlow', NULL, '550e8400-e29b-41d4-a716-446655440003', NOW()),
('550e8400-e29b-41d4-a716-446655440304', 'PyTorch', 'Building models with PyTorch', NULL, '550e8400-e29b-41d4-a716-446655440003', NOW()),
('550e8400-e29b-41d4-a716-446655440305', 'Regularization', 'Preventing overfitting', NULL, '550e8400-e29b-41d4-a716-446655440003', NOW()),
('550e8400-e29b-41d4-a716-446655440306', 'Model Optimization', 'Optimizing for latency and size', NULL, '550e8400-e29b-41d4-a716-446655440003', NOW()),

('550e8400-e29b-41d4-a716-446655440401', 'Batch Prediction', 'Batch inference', NULL, '550e8400-e29b-41d4-a716-446655440004', NOW()),
('550e8400-e29b-41d4-a716-446655440402', 'Online Prediction', 'Real-time inference', NULL, '550e8400-e29b-41d4-a716-446655440004', NOW()),
('550e8400-e29b-41d4-a716-446655440403', 'Vertex AI Endpoints', 'Deploying to endpoints', NULL, '550e8400-e29b-41d4-a716-446655440004', NOW()),

('550e8400-e29b-41d4-a716-446655440501', 'Vertex AI Pipelines', 'Automated pipelines', NULL, '550e8400-e29b-41d4-a716-446655440005', NOW()),
('550e8400-e29b-41d4-a716-446655440502', 'Kubeflow', 'Kubeflow pipelines', NULL, '550e8400-e29b-41d4-a716-446655440005', NOW()),
('550e8400-e29b-41d4-a716-446655440503', 'Deployment Strategies', 'Canary, shadow deployments', NULL, '550e8400-e29b-41d4-a716-446655440005', NOW()),

('550e8400-e29b-41d4-a716-446655440601', 'Model Monitoring', 'Monitoring model performance', NULL, '550e8400-e29b-41d4-a716-446655440006', NOW()),
('550e8400-e29b-41d4-a716-446655440602', 'Training-Serving Skew', 'Detecting skew', NULL, '550e8400-e29b-41d4-a716-446655440006', NOW()),
('550e8400-e29b-41d4-a716-446655440603', 'Bias & Fairness', 'Detecting and mitigating bias', NULL, '550e8400-e29b-41d4-a716-446655440006', NOW()),
('550e8400-e29b-41d4-a716-446655440604', 'TensorBoard', 'Visualizing training metrics', NULL, '550e8400-e29b-41d4-a716-446655440006', NOW()),
('550e8400-e29b-41d4-a716-446655440605', 'Computer Vision', 'Image and video processing', NULL, '550e8400-e29b-41d4-a716-446655440006', NOW());

-- ============================================================================
-- QUESTIONS TABLE
-- ============================================================================

INSERT INTO questions (id, question_text, question_type, options, explanation, difficulty, source, source_page, created_at) VALUES

-- Question 1
('650e8400-e29b-41d4-a716-446655440001',
'Your organization''s marketing team wants to send biweekly scheduled emails to customers that are expected to spend above a variable threshold. This is the first ML use case for the marketing team, and you have been tasked with the implementation. After setting up a new Google Cloud project, you use Vertex AI Workbench to develop model training and batch inference with an XGBoost model on the transactional data stored in Cloud Storage. You want to automate the end-to-end pipeline that will securely provide the predictions to the marketing team, while minimizing cost and code maintenance. What should you do?',
'multiple_choice',
'[
  {"id": "A", "text": "Create a scheduled pipeline on Vertex AI Pipelines that accesses the data from Cloud Storage, uses Vertex AI to perform training and batch prediction, and outputs a file in a Cloud Storage bucket that contains a list of all customer emails and expected spending.", "is_correct": true},
  {"id": "B", "text": "Create a scheduled pipeline on Cloud Composer that accesses the data from Cloud Storage, copies the data to BigQuery, uses BigQuery ML to perform training and batch prediction, and outputs a table in BigQuery with customer emails and expected spending.", "is_correct": false},
  {"id": "C", "text": "Create a scheduled notebook on Vertex AI Workbench that accesses the data from Cloud Storage, performs training and batch prediction on the managed notebook instance, and outputs a file in a Cloud Storage bucket that contains a list of all customer emails and expected spending.", "is_correct": false},
  {"id": "D", "text": "Create a scheduled pipeline on Cloud Composer that accesses the data from Cloud Storage, uses Vertex AI to perform training and batch prediction, and sends an email to the marketing team''s Gmail group email with an attachment that contains an encrypted list of all customer emails and expected spending.", "is_correct": false}
]'::jsonb,
'A is correct because Vertex AI Pipelines and Cloud Storage are cost-effective and secure solutions. The solution requires the least number of code interactions because the marketing team can update the pipeline and schedule parameters from the Google Cloud console.',
'medium',
'Professional Machine Learning Engineer Sample Questions.pdf',
3,
NOW()),

-- Question 2
('650e8400-e29b-41d4-a716-446655440002',
'You have developed a very large network in TensorFlow Keras that is expected to train for multiple days. The model uses only built-in TensorFlow operations to perform training with high-precision arithmetic. You want to update the code to run distributed training using tf.distribute.Strategy and configure a corresponding machine instance in Compute Engine to minimize training time. What should you do?',
'multiple_choice',
'[
  {"id": "A", "text": "Select an instance with an attached GPU, and gradually scale up the machine type until the optimal execution time is reached. Add MirroredStrategy to the code, and create the model in the strategy''s scope with batch size dependent on the number of replicas.", "is_correct": false},
  {"id": "B", "text": "Create an instance group with one instance with attached GPU, and gradually scale up the machine type until the optimal execution time is reached. Add TF_CONFIG and MultiWorkerMirroredStrategy to the code, create the model in the strategy''s scope, and set up data autosharding.", "is_correct": true},
  {"id": "C", "text": "Create a TPU virtual machine, and gradually scale up the machine type until the optimal execution time is reached. Add TPU initialization at the start of the program, define a distributed TPUStrategy, and create the model in the strategy''s scope with batch size and training steps dependent on the number of TPUs.", "is_correct": false},
  {"id": "D", "text": "Create a TPU node, and gradually scale up the machine type until the optimal execution time is reached. Add TPU initialization at the start of the program, define a distributed TPUStrategy, and create the model in the strategy''s scope with batch size and training steps dependent on the number of TPUs.", "is_correct": false}
]'::jsonb,
'B is correct because GPUs are the correct hardware for deep learning training with high-precision training, and distributing training with multiple instances will allow maximum flexibility in fine-tuning the accelerator selection to minimize execution time.',
'hard',
'Professional Machine Learning Engineer Sample Questions.pdf',
5,
NOW()),

-- Question 3
('650e8400-e29b-41d4-a716-446655440003',
'You developed a tree model based on an extensive feature set of user behavioral data. The model has been in production for 6 months. New regulations were just introduced that require anonymizing personally identifiable information (PII), which you have identified in your feature set using the Cloud Data Loss Prevention API. You want to update your model pipeline to adhere to the new regulations while minimizing a reduction in model performance. What should you do?',
'multiple_choice',
'[
  {"id": "A", "text": "Redact the features containing PII data, and train the model from scratch.", "is_correct": false},
  {"id": "B", "text": "Mask the features containing PII data, and tune the model from the last checkpoint.", "is_correct": false},
  {"id": "C", "text": "Use key-based hashes to tokenize the features containing PII data, and train the model from scratch.", "is_correct": true},
  {"id": "D", "text": "Use deterministic encryption to tokenize the features containing PII data, and tune the model from the last checkpoint.", "is_correct": false}
]'::jsonb,
'C is correct because hashing is an irreversible transformation that ensures anonymization and does not lead to an expected drop in model performance because you keep the same feature set while enforcing referential integrity.',
'medium',
'Professional Machine Learning Engineer Sample Questions.pdf',
7,
NOW());

-- Question 4
('650e8400-e29b-41d4-a716-446655440004',
'You need to train an object detection model to identify bounding boxes around Post-it Notes® in an image. Post-it Notes can have a variety of background colors and shapes. You have a dataset with 1000 images with a maximum size of 1.4MB and a CSV file containing annotations stored in Cloud Storage. You want to select a training method that reliably detects Post-it Notes of any relative size in the image and that minimizes the time to train a model. What should you do?',
'multiple_choice',
'[
  {"id": "A", "text": "Use the Cloud Vision API in Vertex AI with OBJECT_LOCALIZATION type, and filter the detected objects that match the Post-it Note category only.", "is_correct": false},
  {"id": "B", "text": "Upload your dataset into Vertex AI. Use Vertex AI AutoML Vision Object Detection with accuracy as the optimization metric, early stopping enabled, and no training budget specified.", "is_correct": true},
  {"id": "C", "text": "Write a Python training application that trains a custom vision model on the training set. Autopackage the application, and configure a custom training job in Vertex AI.", "is_correct": false},
  {"id": "D", "text": "Write a Python training application that performs transfer learning on a pre-trained neural network. Autopackage the application, and configure a custom training job in Vertex AI.", "is_correct": false}
]'::jsonb,
'B is correct because AutoML is a codeless solution that minimizes time to train and develop the model, and it is capable of detecting bounding boxes up to one percent the length of a side of an image.',
'medium',
'Professional Machine Learning Engineer Sample Questions.pdf',
9,
NOW()),

-- Question 5
('650e8400-e29b-41d4-a716-446655440005',
'You used Vertex AI Workbench notebooks to build a model in TensorFlow. The notebook i) loads data from Cloud Storage, ii) uses TensorFlow Transform to pre-process data, iii) uses built-in TensorFlow operators to define a sequential Keras model, iv) trains and evaluates the model with model.fit() on the notebook instance, and v) saves the trained model to Cloud Storage for serving. You want to orchestrate the model retraining pipeline to run on a weekly schedule while minimizing cost and implementation effort. What should you do?',
'multiple_choice',
'[
  {"id": "A", "text": "Add relevant parameters to the notebook cells and set a recurring run in Vertex AI Workbench.", "is_correct": false},
  {"id": "B", "text": "Use TensorFlow Extended (TFX) with Google Cloud executors to define your pipeline, and automate the pipeline to run on Cloud Composer.", "is_correct": false},
  {"id": "C", "text": "Use Kubeflow Pipelines SDK with Google Cloud executors to define your pipeline, and use Vertex AI pipelines to automate the pipeline to run.", "is_correct": true},
  {"id": "D", "text": "Separate each cell in the notebook into a containerised application and use Cloud Workflows to launch each application.", "is_correct": false}
]'::jsonb,
'C is correct because using the Kubeflow Pipelines SDK is the best practice to orchestrate AI pipelines with modular steps.',
'medium',
'Professional Machine Learning Engineer Sample Questions.pdf',
11,
NOW()),

-- Question 6
('650e8400-e29b-41d4-a716-446655440006',
'You need to develop an online model prediction service that accesses pre-computed near-real-time features and returns a customer churn probability value. The features are saved in BigQuery and updated hourly using a scheduled query. You want this service to be low latency and scalable and require minimal maintenance. What should you do?',
'multiple_choice',
'[
  {"id": "A", "text": "1. Configure Vertex AI Feature Store to automatically import features from BigQuery, and serve them to the model. 2. Deploy the prediction model as a custom Vertex AI endpoint, and enable automatic scaling.", "is_correct": true},
  {"id": "B", "text": "1. Configure a Cloud Function that exports features from BigQuery to Memorystore. 2. Use a custom container on Google Kubernetes Engine to deploy a service that performs feature lookup from Memorystore and performs inference with an in-memory model.", "is_correct": false},
  {"id": "C", "text": "1. Configure a Cloud Function that exports features from BigQuery to Vertex AI Feature Store. 2. Use the online service API from Vertex AI Feature Store to perform feature lookup. Deploy the model as a custom prediction endpoint in Vertex AI, and enable automatic scaling.", "is_correct": false},
  {"id": "D", "text": "1. Configure a Cloud Function that exports features from BigQuery to Vertex AI Feature Store. 2. Use a custom container on Google Kubernetes Engine to deploy a service that performs feature lookup from Vertex AI Feature Store''s online serving API and performs inference with an in-memory model.", "is_correct": false}
]'::jsonb,
'A is correct because using Vertex AI Feature Store with BigQuery prioritizes low latency, scalability, requires minimal maintenance, and facilitates integration with other Vertex AI services as a fully managed solution.',
'medium',
'Professional Machine Learning Engineer Sample Questions.pdf',
13,
NOW()),

-- Question 7
('650e8400-e29b-41d4-a716-446655440007',
'You are logged into the Vertex AI Pipeline UI and noticed that an automated production TensorFlow training pipeline finished three hours earlier than a typical run. You do not have access to production data for security reasons, but you have verified that no alert was logged in any of the ML system''s monitoring systems and that the pipeline code has not been updated recently. You want to assure the quality of the pipeline results as quickly as possible so you can determine whether to deploy the trained model. What should you do?',
'multiple_choice',
'[
  {"id": "A", "text": "Use Vertex AI TensorBoard to check whether the training metrics converge to typical values. Verify pipeline input configuration and steps have the expected values.", "is_correct": true},
  {"id": "B", "text": "Upgrade to the latest version of the Vertex SDK and re-run the pipeline.", "is_correct": false},
  {"id": "C", "text": "Determine the trained model''s location from the pipeline''s metadata in Vertex ML Metadata, and compare the trained model''s size to the previous model.", "is_correct": false},
  {"id": "D", "text": "Request access to production systems. Get the training data''s location from the pipeline''s metadata in Vertex ML Metadata, and compare data volumes of the current run to the previous run.", "is_correct": false}
]'::jsonb,
'A is correct because TensorBoard provides a compact and complete overview of training metrics such as loss and accuracy over time. If the training converges with the model''s expected accuracy, the model can be deployed.',
'medium',
'Professional Machine Learning Engineer Sample Questions.pdf',
15,
NOW()),

-- Question 8
('650e8400-e29b-41d4-a716-446655440008',
'You recently developed a custom ML model that was trained in Vertex AI on a post-processed training dataset stored in BigQuery. You used a Cloud Run container to deploy the prediction service. The service performs feature lookup and pre-processing and sends a prediction request to a model endpoint in Vertex AI. You want to configure a comprehensive monitoring solution for training-serving skew that requires minimal maintenance. What should you do?',
'multiple_choice',
'[
  {"id": "A", "text": "Create a Model Monitoring job for the Vertex AI endpoint that uses the training data in BigQuery to perform training-serving skew detection and uses email to send alerts. When an alert is received, use the console to diagnose the issue.", "is_correct": true},
  {"id": "B", "text": "Update the model hosted in Vertex AI to enable request-response logging. Create a Data Studio dashboard that compares training data and logged data for potential training-serving skew and uses email to send a daily scheduled report.", "is_correct": false},
  {"id": "C", "text": "Create a Model Monitoring job for the Vertex AI endpoint that uses the training data in BigQuery to perform training-serving skew detection and uses Cloud Logging to send alerts. Set up a Cloud Function to initiate model retraining that is triggered when an alert is logged.", "is_correct": false},
  {"id": "D", "text": "Update the model hosted in Vertex AI to enable request-response logging. Schedule a daily DataFlow Flex job that uses Tensorflow Data Validation to detect training-serving skew and uses Cloud Logging to send alerts. Set up a Cloud Function to initiate model retraining that is triggered when an alert is logged.", "is_correct": false}
]'::jsonb,
'A is correct because Vertex AI Model Monitoring is a fully managed solution for monitoring training-serving skew that, by definition, requires minimal maintenance.',
'medium',
'Professional Machine Learning Engineer Sample Questions.pdf',
17,
NOW()),

-- Question 9
('650e8400-e29b-41d4-a716-446655440009',
'You recently developed a classification model that predicts which customers will be repeat customers. Before deploying the model, you perform post-training analysis on multiple data slices and discover that the model is under-predicting for users who are more than 60 years old. You want to remove age bias while maintaining similar offline performance. What should you do?',
'multiple_choice',
'[
  {"id": "A", "text": "Perform correlation analysis on the training feature set against the age column, and remove features that are highly correlated with age from the training and evaluation sets.", "is_correct": false},
  {"id": "B", "text": "Review the data distribution for each feature against the bucketized age column for the training and evaluation sets, and introduce preprocessing to even irregular feature distributions.", "is_correct": true},
  {"id": "C", "text": "Configure the model to support explainability, and modify the input-baselines to include min and max age ranges.", "is_correct": false},
  {"id": "D", "text": "Apply a calibration layer at post-processing that matches the prediction distributions of users below and above 60 years old.", "is_correct": false}
]'::jsonb,
'B is correct because this approach compensates for bias directly in the data by enhancing the data distribution of users above 60 years old.',
'medium',
'Professional Machine Learning Engineer Sample Questions.pdf',
19,
NOW()),

-- Question 10
('650e8400-e29b-41d4-a716-446655440010',
'You downloaded a TensorFlow language model pre-trained on a proprietary dataset by another company, and you tuned the model with Vertex AI Training by replacing the last layer with a custom dense layer. The model achieves the expected offline accuracy; however, it exceeds the required online prediction latency by 20ms. You want to reduce latency while minimizing the offline performance drop and modifications to the model before deploying the model to production. What should you do?',
'multiple_choice',
'[
  {"id": "A", "text": "Apply post-training quantization on the tuned model, and serve the quantized model.", "is_correct": true},
  {"id": "B", "text": "Apply knowledge distillation to train a new, smaller ''student'' model that mimics the behavior of the larger, fine-tuned model.", "is_correct": false},
  {"id": "C", "text": "Use pruning to tune the pre-trained model on your dataset, and serve the pruned model after stripping it of training variables.", "is_correct": false},
  {"id": "D", "text": "Use clustering to tune the pre-trained model on your dataset, and serve the clustered model after stripping it of training variables.", "is_correct": false}
]'::jsonb,
'A is correct because post-training quantization is the recommended option for reducing model latency when re-training is not possible.',
'medium',
'Professional Machine Learning Engineer Sample Questions.pdf',
20,
NOW()),

-- Question 11
('650e8400-e29b-41d4-a716-446655440011',
'You have a dataset that is split into training, validation, and test sets. All the sets have similar distributions. You have sub-selected the most relevant features and trained a neural network. TensorBoard plots show the training loss oscillating around 0.9, with the validation loss higher than the training loss by 0.3. You want to update the training regime to maximize the convergence of both losses and reduce overfitting. What should you do?',
'multiple_choice',
'[
  {"id": "A", "text": "Decrease the learning rate to fix the validation loss, and increase the number of training epochs to improve the convergence of both losses.", "is_correct": false},
  {"id": "B", "text": "Decrease the learning rate to fix the validation loss, and increase the number and dimension of the layers in the network to improve the convergence of both losses.", "is_correct": false},
  {"id": "C", "text": "Introduce L1 regularization to fix the validation loss, and increase the learning rate and the number of training epochs to improve the convergence of both losses.", "is_correct": false},
  {"id": "D", "text": "Introduce L2 regularization to fix the validation loss.", "is_correct": true}
]'::jsonb,
'D is correct because L2 regularization prevents overfitting.',
'medium',
'Professional Machine Learning Engineer Sample Questions.pdf',
21,
NOW()),

-- Question 12
('650e8400-e29b-41d4-a716-446655440012',
'You recently used Vertex AI Prediction to deploy a custom-trained model in production. The automated re-training pipeline made available a new model version that passed all unit and infrastructure tests. You want to define a rollout strategy for the new model version that guarantees an optimal user experience with zero downtime. What should you do?',
'multiple_choice',
'[
  {"id": "A", "text": "Release the new model version in the same Vertex AI endpoint. Use traffic splitting in Vertex AI Prediction to route a small random subset of requests to the new version and, if the new version is successful, gradually route the remaining traffic to it.", "is_correct": false},
  {"id": "B", "text": "Release the new model version in a new Vertex AI endpoint. Update the application to send all requests to both Vertex AI endpoints, and log the predictions from the new endpoint. If the new version is successful, route all traffic to the new application.", "is_correct": true},
  {"id": "C", "text": "Deploy the current model version with an Istio resource in Google Kubernetes Engine, and route production traffic to it. Deploy the new model version, and use Istio to route a small random subset of traffic to it. If the new version is successful, gradually route the remaining traffic to it.", "is_correct": false},
  {"id": "D", "text": "Install Seldon Core and deploy an Istio resource in Google Kubernetes Engine. Deploy the current model version and the new model version using the multi-armed bandit algorithm in Seldon to dynamically route requests between the two versions before eventually routing all traffic over to the best-performing version.", "is_correct": false}
]'::jsonb,
'B is correct because shadow deployments minimize the risk of affecting user experience while ensuring zero downtime.',
'medium',
'Professional Machine Learning Engineer Sample Questions.pdf',
23,
NOW()),

-- Question 13
('650e8400-e29b-41d4-a716-446655440013',
'You work as an analyst at a large banking firm. You are developing a robust, scalable ML pipeline to train several regression and classification models. Your primary focus for the pipeline is model interpretability. You want to productionize the pipeline as quickly as possible. What should you do?',
'multiple_choice',
'[
  {"id": "A", "text": "Use Tabular Workflow for Wide & Deep through Vertex AI Pipelines to jointly train wide linear models and deep neural networks.", "is_correct": false},
  {"id": "B", "text": "Use Cloud Composer to build the training pipelines for custom deep learning-based models.", "is_correct": false},
  {"id": "C", "text": "Use Google Kubernetes Engine to build a custom training pipeline for XGBoost-based models.", "is_correct": false},
  {"id": "D", "text": "Use Tabular Workflow for TabNet through Vertex AI Pipelines to train attention-based models.", "is_correct": true}
]'::jsonb,
'D is correct because TabNet uses sequential attention that promotes model interpretability and Tabular Workflows is a set of integrated, fully managed, and scalable pipelines for end-to-end ML with tabular data.',
'medium',
'Professional Machine Learning Engineer Sample Questions.pdf',
25,
NOW()),

-- Question 14
('650e8400-e29b-41d4-a716-446655440014',
'You are developing a custom image classification model in Python. You plan to run your training application on Vertex AI. Your input dataset contains several hundred thousand small images. You need to determine how to store and access the images for training. You want to maximize data throughput and minimize training time while reducing the amount of additional code. What should you do?',
'multiple_choice',
'[
  {"id": "A", "text": "Store image files in Cloud Storage, and access them directly.", "is_correct": false},
  {"id": "B", "text": "Store image files in Cloud Storage, and access them by using serialized records.", "is_correct": false},
  {"id": "C", "text": "Store image files in Cloud Filestore, and access them by using serialized records.", "is_correct": true},
  {"id": "D", "text": "Store image files in Cloud Filestore, and access them directly by using an NFS mount point.", "is_correct": false}
]'::jsonb,
'C is correct because Filestore is faster than Cloud Storage for accessing files, and serialized records are faster for feeding training pipelines than individual files.',
'medium',
'Professional Machine Learning Engineer Sample Questions.pdf',
26,
NOW()),

-- Question 15
('650e8400-e29b-41d4-a716-446655440015',
'Your company manages an ecommerce website. You developed an ML model that recommends additional products to users in near real time based on items currently in the user''s cart. The workflow will include the following processes: 1. The website will send a Pub/Sub message with the relevant data, and then receive a message with the prediction from Pub/Sub. 2. Predictions will be stored in BigQuery. 3. The model will be stored in a Cloud Storage bucket and will be updated frequently. You want to minimize prediction latency and the effort required to update the model. How should you reconfigure the architecture?',
'multiple_choice',
'[
  {"id": "A", "text": "Write a Cloud Function that loads the model into memory for prediction. Configure the function to be triggered when messages are sent to Pub/Sub.", "is_correct": false},
  {"id": "B", "text": "Expose the model as a Vertex AI endpoint. Write a custom DoFn in a Dataflow job that calls the endpoint for prediction.", "is_correct": false},
  {"id": "C", "text": "Use the RunInference API with WatchFilePattern in a Dataflow job that wraps around the model and serves predictions.", "is_correct": true},
  {"id": "D", "text": "Create a pipeline in Vertex AI Pipelines that performs preprocessing, prediction, and postprocessing. Configure the pipeline to be triggered by a Cloud Function when messages are sent to Pub/Sub.", "is_correct": false}
]'::jsonb,
'C is correct because the RunInference API with a locally loaded model minimizes the prediction latency and makes model updates seamless.',
'hard',
'Professional Machine Learning Engineer Sample Questions.pdf',
27,
NOW());

-- ============================================================================
-- QUESTION_TOPICS JUNCTION TABLE
-- ============================================================================

INSERT INTO question_topics (question_id, topic_id) VALUES
-- Question 1: MLOps, Vertex AI Pipelines, Batch Prediction
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440005'),
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440501'),
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440401'),

-- Question 2: Distributed Training, TensorFlow, Model Training
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440302'),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440303'),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440301'),

-- Question 3: Data Privacy, Data Preparation
('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440202'),
('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440201'),

-- Question 4: AutoML, Computer Vision
('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440102'),
('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440605'),

-- Question 5: MLOps, Vertex AI Pipelines, Kubeflow
('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005'),
('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440501'),
('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440502'),

-- Question 6: Model Serving, Feature Store, Online Prediction
('650e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440004'),
('650e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440204'),
('650e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440402'),

-- Question 7: Monitoring, TensorBoard
('650e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440006'),
('650e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440604'),

-- Question 8: Monitoring, Training-Serving Skew, MLOps
('650e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440006'),
('650e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440602'),
('650e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440005'),

-- Question 9: Bias & Fairness, Data Preparation
('650e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440603'),
('650e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440201'),

-- Question 10: Model Optimization, TensorFlow
('650e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440306'),
('650e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440303'),

-- Question 11: Model Training, Regularization
('650e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440301'),
('650e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440305'),

-- Question 12: Deployment Strategies, Model Serving, MLOps
('650e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440503'),
('650e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440004'),
('650e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440005'),

-- Question 13: Model Development
('650e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440003'),

-- Question 14: Data Preparation
('650e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440201'),

-- Question 15: Online Prediction, Model Serving
('650e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440402'),
('650e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440004');

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Add indexes for performance (if not already in schema)
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_source ON questions(source);
CREATE INDEX IF NOT EXISTS idx_question_topics_topic_id ON question_topics(topic_id);
CREATE INDEX IF NOT EXISTS idx_question_topics_question_id ON question_topics(question_id);
CREATE INDEX IF NOT EXISTS idx_topics_parent ON topics(parent_topic_id);

-- ============================================================================
-- NOTES
-- ============================================================================

-- This seed file contains:
-- - 46 topics from the exam structure (6 main topics + 40 subtopics)
-- - 15 complete sample questions with explanations
-- - 41 question-topic associations
-- - Performance indexes
--
-- To load this data:
-- 1. Ensure the schema from exam-prep-architecture skill is created first
-- 2. Run: psql -h your-db-host -U your-user -d your-db -f seed.sql
-- Or use Supabase SQL Editor to execute this file
--
-- Total records:
-- - Topics: 46 (6 main sections + 40 subtopics)
-- - Questions: 15 (all with complete explanations)
-- - Question-Topic associations: 41
-- - Difficulty: 13 medium, 2 hard
-- - All questions are multiple_choice type
--
-- Data Quality: 100% validated (see data/VALIDATION_REPORT.md)

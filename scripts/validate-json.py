import json

# Validate JSON structure
file_path = r"c:\Users\Ali Kone\OneDrive\ALKHAF\LnD\prof-mle-exam-prep\data\missing-questions.json"

print("Validating JSON structure...")
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"✓ Valid JSON with {len(data)} questions")
print(f"✓ Sample question ID: {data[0]['id']}")
print(f"✓ Sample question has {len(data[0]['options'])} options")
print(f"✓ Sample question text length: {len(data[0]['question_text'])} characters")

# Check a few samples
print("\n=== Sample Transformed Questions ===\n")
for i in [0, 50, 100]:
    q = data[i]
    print(f"Question {q['id']}:")
    print(f"  Text: {q['question_text'][:200]}...")
    print(f"  Topics: {', '.join(q['topics'])}")
    print()

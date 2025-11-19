import json
try:
    with open('data/missing-questions.json', 'r') as f:
        data = json.load(f)
        print(f"Total questions: {len(data)}")
except Exception as e:
    print(f"Error: {e}")

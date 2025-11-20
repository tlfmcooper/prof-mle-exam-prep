import json
import sys

def count_questions(filename):
    try:
        with open(f'data/{filename}', 'r') as f:
            data = json.load(f)
            print(f"Total questions: {len(data)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    filename = sys.argv[1]  # Replace with your actual filename
    count_questions(filename)
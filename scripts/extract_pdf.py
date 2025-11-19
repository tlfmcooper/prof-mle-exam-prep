import pypdf
import os

pdf_files = [
    "Professional Machine Learning Engineer Sample Questions.pdf",
    "professional_machine_learning_engineer_exam_guide_english.pdf"
]

for pdf_file in pdf_files:
    if os.path.exists(pdf_file):
        print(f"--- Extracting from {pdf_file} ---")
        try:
            reader = pypdf.PdfReader(pdf_file)
            for page in reader.pages[:5]: # Read first 5 pages to get an idea
                print(page.extract_text())
        except Exception as e:
            print(f"Error reading {pdf_file}: {e}")
    else:
        print(f"File not found: {pdf_file}")

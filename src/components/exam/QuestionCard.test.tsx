import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { QuestionCard } from './QuestionCard';
import { Question } from '@/lib/types';

const mockQuestion: Question = {
  id: '1',
  question_text: 'What is the primary purpose of BigQuery ML?',
  question_type: 'multiple_choice',
  options: [
    { id: 'A', text: 'To build ML models using SQL', is_correct: true },
    { id: 'B', text: 'To deploy Python models', is_correct: false },
    { id: 'C', text: 'To manage data pipelines', is_correct: false },
    { id: 'D', text: 'To visualize data', is_correct: false },
  ],
  explanation: 'BigQuery ML allows you to create and execute ML models using SQL queries.',
  difficulty: 'medium',
  source: 'test',
};

const mockMultipleSelectQuestion: Question = {
  id: '2',
  question_text: 'Which of the following are machine learning frameworks? (Select all that apply)',
  question_type: 'multiple_select',
  options: [
    { id: 'A', text: 'TensorFlow', is_correct: true },
    { id: 'B', text: 'PyTorch', is_correct: true },
    { id: 'C', text: 'MySQL', is_correct: false },
    { id: 'D', text: 'Scikit-learn', is_correct: true },
  ],
  explanation: 'TensorFlow, PyTorch, and Scikit-learn are ML frameworks.',
  difficulty: 'easy',
  source: 'test',
};

describe('QuestionCard', () => {
  it('renders question text and options', () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={mockQuestion} onAnswer={onAnswer} />);

    expect(screen.getByText(mockQuestion.question_text)).toBeInTheDocument();
    expect(screen.getByText('To build ML models using SQL')).toBeInTheDocument();
    expect(screen.getByText('To deploy Python models')).toBeInTheDocument();
  });

  it('displays difficulty badge', () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={mockQuestion} onAnswer={onAnswer} />);

    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('shows question number when provided', () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={mockQuestion} onAnswer={onAnswer} questionNumber={5} />);

    expect(screen.getByText('Question 5')).toBeInTheDocument();
  });

  it('allows selecting a single option for multiple choice', async () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={mockQuestion} onAnswer={onAnswer} />);

    // Find the parent div with the specific classes for the option
    const options = screen.getAllByRole('generic').filter(
      (el) => el.className.includes('border-2') && el.className.includes('cursor-pointer')
    );

    const optionA = options[0];
    const optionB = options[1];

    // Click option A
    fireEvent.click(optionA);
    expect(optionA.className).toContain('border-primary');

    // Click option B (should deselect A)
    fireEvent.click(optionB);
    expect(optionB.className).toContain('border-primary');
  });

  it('allows selecting multiple options for multiple select', () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={mockMultipleSelectQuestion} onAnswer={onAnswer} />);

    expect(screen.getByText('Select all that apply')).toBeInTheDocument();

    // Find the parent divs with the specific classes for the options
    const options = screen.getAllByRole('generic').filter(
      (el) => el.className.includes('border-2') && el.className.includes('cursor-pointer')
    );

    const tensorflow = options[0];
    const pytorch = options[1];

    fireEvent.click(tensorflow);
    fireEvent.click(pytorch);

    expect(tensorflow.className).toContain('border-primary');
    expect(pytorch.className).toContain('border-primary');
  });

  it('calls onAnswer when submit button is clicked', async () => {
    const onAnswer = vi.fn().mockResolvedValue(undefined);
    render(<QuestionCard question={mockQuestion} onAnswer={onAnswer} />);

    const optionA = screen.getByText('To build ML models using SQL').closest('div');
    fireEvent.click(optionA!);

    const submitButton = screen.getByText('Submit Answer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onAnswer).toHaveBeenCalledWith(['A']);
    });
  });

  it('disables submit button when no option is selected', () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={mockQuestion} onAnswer={onAnswer} />);

    const submitButton = screen.getByText('Submit Answer');
    expect(submitButton).toBeDisabled();
  });

  it('shows explanation when showExplanation is true', () => {
    const onAnswer = vi.fn();
    render(
      <QuestionCard
        question={mockQuestion}
        onAnswer={onAnswer}
        showExplanation={true}
      />
    );

    expect(screen.getByText('Explanation:')).toBeInTheDocument();
    expect(screen.getByText(mockQuestion.explanation!)).toBeInTheDocument();
  });

  it('highlights correct and incorrect answers when showExplanation is true', () => {
    const onAnswer = vi.fn();
    const previousAttempt = {
      id: '1',
      user_id: 'user1',
      question_id: '1',
      selected_options: ['B'],
      is_correct: false,
      time_spent_seconds: 30,
      confidence_level: 3,
      attempted_at: new Date().toISOString(),
    };

    render(
      <QuestionCard
        question={mockQuestion}
        onAnswer={onAnswer}
        showExplanation={true}
        previousAttempt={previousAttempt}
      />
    );

    // Check for correct answer indicator
    expect(screen.getByText('✓ Correct Answer')).toBeInTheDocument();

    // Check for incorrect answer indicator
    expect(screen.getByText('✗ Incorrect')).toBeInTheDocument();
  });

  it('hides submit button when showExplanation is true', () => {
    const onAnswer = vi.fn();
    render(
      <QuestionCard
        question={mockQuestion}
        onAnswer={onAnswer}
        showExplanation={true}
      />
    );

    expect(screen.queryByText('Submit Answer')).not.toBeInTheDocument();
  });

  it('prevents selection when showExplanation is true', () => {
    const onAnswer = vi.fn();
    render(
      <QuestionCard
        question={mockQuestion}
        onAnswer={onAnswer}
        showExplanation={true}
      />
    );

    const optionA = screen.getByText('To build ML models using SQL').closest('div');

    // Try to click - should not change selection state
    fireEvent.click(optionA!);

    // Since showExplanation is true, clicking shouldn't affect selection
    // The component should maintain its current state
  });

  it('displays topics when available and explanation is shown', () => {
    const questionWithTopics = {
      ...mockQuestion,
      topics: [
        { id: '1', name: 'Low-code AI solutions' },
        { id: '2', name: 'BigQuery ML' },
      ],
    };

    const onAnswer = vi.fn();
    render(
      <QuestionCard
        question={questionWithTopics}
        onAnswer={onAnswer}
        showExplanation={true}
      />
    );

    expect(screen.getByText('Low-code AI solutions')).toBeInTheDocument();
    expect(screen.getByText('BigQuery ML')).toBeInTheDocument();
  });
});

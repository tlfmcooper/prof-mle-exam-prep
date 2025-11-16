import { useState } from 'react';
import { Question, UserAttempt } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { checkAnswer, getDifficultyColor } from '@/lib/utils';

interface QuestionCardProps {
  question: Question;
  onAnswer: (selectedOptions: string[]) => Promise<void>;
  showExplanation?: boolean;
  previousAttempt?: UserAttempt;
  questionNumber?: number;
}

export function QuestionCard({
  question,
  onAnswer,
  showExplanation = false,
  previousAttempt,
  questionNumber,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string[]>(previousAttempt?.selected_options || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMultipleSelect = question.question_type === 'multiple_select';
  const correctOptions = question.options.filter(o => o.is_correct).map(o => o.id);
  const isCorrect = previousAttempt?.is_correct ?? checkAnswer(selected, correctOptions);

  const handleSelectOption = (optionId: string) => {
    if (showExplanation) return;

    if (isMultipleSelect) {
      setSelected(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelected([optionId]);
    }
  };

  const handleSubmit = async () => {
    if (selected.length === 0 || showExplanation) return;

    setIsSubmitting(true);
    try {
      await onAnswer(selected);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          {questionNumber && (
            <span className="text-sm text-muted-foreground">Question {questionNumber}</span>
          )}
          {question.difficulty && (
            <span className={`text-xs font-medium px-2 py-1 rounded ${getDifficultyColor(question.difficulty)}`}>
              {question.difficulty.toUpperCase()}
            </span>
          )}
        </div>
        <CardTitle className="text-lg font-medium mt-2">
          {question.question_text}
        </CardTitle>
        {isMultipleSelect && (
          <p className="text-sm text-muted-foreground">
            Select all that apply
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {question.options.map((option) => {
          const isSelected = selected.includes(option.id);
          const isCorrectOption = option.is_correct;

          let optionStyle = 'border-2 p-4 rounded-lg cursor-pointer transition-all';

          if (showExplanation) {
            if (isCorrectOption) {
              optionStyle += ' border-green-500 bg-green-50';
            } else if (isSelected && !isCorrectOption) {
              optionStyle += ' border-red-500 bg-red-50';
            } else {
              optionStyle += ' border-gray-200';
            }
          } else {
            optionStyle += isSelected
              ? ' border-primary bg-primary/10'
              : ' border-gray-200 hover:border-primary/50';
          }

          return (
            <div
              key={option.id}
              className={optionStyle}
              onClick={() => handleSelectOption(option.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center font-semibold text-sm">
                  {option.id}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{option.text}</p>
                  {showExplanation && isCorrectOption && (
                    <span className="text-xs text-green-600 font-medium mt-1 inline-block">
                      ✓ Correct Answer
                    </span>
                  )}
                  {showExplanation && isSelected && !isCorrectOption && (
                    <span className="text-xs text-red-600 font-medium mt-1 inline-block">
                      ✗ Incorrect
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {showExplanation && question.explanation && (
          <div className={`mt-6 p-4 rounded-lg ${isCorrect ? 'bg-green-50 border-l-4 border-green-500' : 'bg-blue-50 border-l-4 border-blue-500'}`}>
            <h4 className="font-semibold text-sm mb-2">Explanation:</h4>
            <p className="text-sm text-gray-700">{question.explanation}</p>
          </div>
        )}

        {showExplanation && question.topics && question.topics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {question.topics.map((topic) => (
              <span
                key={topic.id}
                className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
              >
                {topic.name}
              </span>
            ))}
          </div>
        )}
      </CardContent>

      {!showExplanation && (
        <CardFooter>
          <Button
            onClick={handleSubmit}
            disabled={selected.length === 0 || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

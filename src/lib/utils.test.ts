import { describe, it, expect } from 'vitest';
import { checkAnswer } from './utils';

describe('checkAnswer', () => {
  it('returns true for correct single answer', () => {
    const selected = ['A'];
    const correct = ['A'];
    expect(checkAnswer(selected, correct)).toBe(true);
  });

  it('returns false for incorrect single answer', () => {
    const selected = ['B'];
    const correct = ['A'];
    expect(checkAnswer(selected, correct)).toBe(false);
  });

  it('returns true for correct multiple answers in same order', () => {
    const selected = ['A', 'C', 'D'];
    const correct = ['A', 'C', 'D'];
    expect(checkAnswer(selected, correct)).toBe(true);
  });

  it('returns true for correct multiple answers in different order', () => {
    const selected = ['D', 'A', 'C'];
    const correct = ['A', 'C', 'D'];
    expect(checkAnswer(selected, correct)).toBe(true);
  });

  it('returns false when missing a correct answer', () => {
    const selected = ['A', 'C'];
    const correct = ['A', 'C', 'D'];
    expect(checkAnswer(selected, correct)).toBe(false);
  });

  it('returns false when including an incorrect answer', () => {
    const selected = ['A', 'B', 'C'];
    const correct = ['A', 'C'];
    expect(checkAnswer(selected, correct)).toBe(false);
  });

  it('returns false when selecting too many answers', () => {
    const selected = ['A', 'B', 'C', 'D'];
    const correct = ['A', 'C'];
    expect(checkAnswer(selected, correct)).toBe(false);
  });

  it('returns false when selecting too few answers', () => {
    const selected = ['A'];
    const correct = ['A', 'C', 'D'];
    expect(checkAnswer(selected, correct)).toBe(false);
  });

  it('returns false for empty selection when answer is required', () => {
    const selected: string[] = [];
    const correct = ['A'];
    expect(checkAnswer(selected, correct)).toBe(false);
  });

  it('handles duplicate selections by treating them as unique', () => {
    const selected = ['A', 'A', 'C'];
    const correct = ['A', 'C'];
    // This should return false because the length check will fail
    expect(checkAnswer(selected, correct)).toBe(false);
  });
});

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date to readable string
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Format time spent in seconds to readable format
export function formatTimeSpent(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

// Calculate accuracy percentage
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
}

// Determine mastery level based on accuracy and attempts
export function determineMasteryLevel(
  accuracy: number,
  attempts: number
): 'novice' | 'learning' | 'proficient' | 'mastered' {
  if (attempts < 3) return 'novice'
  if (accuracy >= 90) return 'mastered'
  if (accuracy >= 75) return 'proficient'
  return 'learning'
}

// Calculate days until exam
export function daysUntilExam(targetDate: string): number {
  const target = new Date(targetDate)
  const today = new Date()
  const diffTime = target.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Shuffle array (for randomizing questions)
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Check if answer is correct
export function checkAnswer(selectedOptions: string[], correctOptions: string[]): boolean {
  if (selectedOptions.length !== correctOptions.length) return false
  return selectedOptions.every(option => correctOptions.includes(option))
}

// Get color for accuracy (for UI)
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 90) return 'text-green-600'
  if (accuracy >= 75) return 'text-blue-600'
  if (accuracy >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

// Get color for difficulty (for UI)
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return 'text-green-600 bg-green-50'
    case 'medium':
      return 'text-yellow-600 bg-yellow-50'
    case 'hard':
      return 'text-red-600 bg-red-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

# Exam Prep Architecture Skill

## Overview
Comprehensive full-stack architecture patterns for building production-grade exam preparation applications using React, TypeScript, Supabase, and Vercel.

## Technology Stack

### Frontend
- **React 18+** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **TailwindCSS** for styling
- **React Router v6** for routing
- **Zustand** or **React Query** for state management
- **shadcn/ui** for accessible component library

### Backend
- **Supabase** for:
  - PostgreSQL database
  - Row Level Security (RLS)
  - Authentication
  - Real-time subscriptions
  - Edge Functions for serverless logic

### Deployment
- **Vercel** for:
  - Automatic deployments
  - Edge caching
  - Environment variable management
  - Preview deployments

## Database Schema

### Core Tables

```sql
-- Users are managed by Supabase Auth
-- Extended user profile
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  target_exam_date DATE,
  study_goal_hours_per_week INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Question bank
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'multiple_select', 'case_study')),
  options JSONB, -- Array of option objects: [{id: 'A', text: '...', is_correct: boolean}]
  explanation TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  source TEXT, -- e.g., 'official_sample', 'practice_test_1'
  source_page INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Topics/domains
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  exam_weight DECIMAL(3,2), -- percentage of exam (0.00 to 1.00)
  parent_topic_id UUID REFERENCES topics(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Question-Topic mapping (many-to-many)
CREATE TABLE question_topics (
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, topic_id)
);

-- User attempts/answers
CREATE TABLE user_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  selected_options JSONB, -- Array of selected option IDs
  is_correct BOOLEAN,
  time_spent_seconds INTEGER,
  confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study sessions
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT CHECK (session_type IN ('practice', 'timed_exam', 'review')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  total_questions INTEGER,
  correct_answers INTEGER,
  score_percentage DECIMAL(5,2)
);

-- Session attempts junction
CREATE TABLE session_attempts (
  session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES user_attempts(id) ON DELETE CASCADE,
  sequence_number INTEGER,
  PRIMARY KEY (session_id, attempt_id)
);

-- User bookmarks/favorites
CREATE TABLE bookmarks (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);

-- Study plans
CREATE TABLE study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id),
  target_date DATE,
  target_mastery_percentage INTEGER,
  status TEXT CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes for Performance

```sql
-- Optimize common queries
CREATE INDEX idx_user_attempts_user_id ON user_attempts(user_id);
CREATE INDEX idx_user_attempts_question_id ON user_attempts(question_id);
CREATE INDEX idx_user_attempts_attempted_at ON user_attempts(attempted_at DESC);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_question_topics_topic_id ON question_topics(topic_id);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read/update their own
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- User attempts: Users can only manage their own
CREATE POLICY "Users can view own attempts"
  ON user_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON user_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Questions: Public read access
CREATE POLICY "Anyone can view questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

-- Similar policies for other tables...
```

## Frontend Architecture

### Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components (Header, Sidebar, etc.)
│   ├── exam/            # Exam-specific components
│   │   ├── QuestionCard.tsx
│   │   ├── AnswerOptions.tsx
│   │   ├── ExplanationPanel.tsx
│   │   └── ProgressBar.tsx
│   └── analytics/       # Analytics/dashboard components
├── pages/
│   ├── Dashboard.tsx
│   ├── Practice.tsx
│   ├── Review.tsx
│   ├── Analytics.tsx
│   └── Settings.tsx
├── hooks/
│   ├── useQuestions.ts
│   ├── useAttempts.ts
│   ├── useStudySession.ts
│   └── useAuth.ts
├── lib/
│   ├── supabase.ts      # Supabase client
│   ├── types.ts         # TypeScript types
│   └── utils.ts         # Utility functions
├── stores/              # Zustand stores (if using)
│   ├── examStore.ts
│   └── userStore.ts
└── App.tsx
```

### Key Components

#### QuestionCard Component
```typescript
import { Question, UserAttempt } from '@/lib/types';

interface QuestionCardProps {
  question: Question;
  onAnswer: (selectedOptions: string[]) => Promise<void>;
  showExplanation?: boolean;
  previousAttempt?: UserAttempt;
}

export function QuestionCard({
  question,
  onAnswer,
  showExplanation = false,
  previousAttempt
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onAnswer(selected);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Question text */}
      <div className="prose max-w-none">
        <p>{question.question_text}</p>
      </div>

      {/* Answer options */}
      <AnswerOptions
        options={question.options}
        selected={selected}
        onSelect={setSelected}
        disabled={isSubmitting}
        showCorrect={showExplanation}
      />

      {/* Submit button */}
      {!showExplanation && (
        <Button
          onClick={handleSubmit}
          disabled={selected.length === 0 || isSubmitting}
        >
          Submit Answer
        </Button>
      )}

      {/* Explanation */}
      {showExplanation && (
        <ExplanationPanel
          explanation={question.explanation}
          isCorrect={previousAttempt?.is_correct}
        />
      )}
    </div>
  );
}
```

### TypeScript Types

```typescript
// lib/types.ts
export interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'multiple_select' | 'case_study';
  options: QuestionOption[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  source: string;
  source_page?: number;
  topics?: Topic[];
}

export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  exam_weight?: number;
  parent_topic_id?: string;
}

export interface UserAttempt {
  id: string;
  user_id: string;
  question_id: string;
  selected_options: string[];
  is_correct: boolean;
  time_spent_seconds: number;
  confidence_level: number;
  attempted_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  session_type: 'practice' | 'timed_exam' | 'review';
  started_at: string;
  ended_at?: string;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
}
```

### Supabase Client Setup

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types'; // Generated types

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper to generate types:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

### React Query Hooks

```typescript
// hooks/useQuestions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Question } from '@/lib/types';

export function useQuestions(filters?: {
  difficulty?: string;
  topicIds?: string[];
  excludeAnswered?: boolean;
}) {
  return useQuery({
    queryKey: ['questions', filters],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select('*, topics:question_topics(topic:topics(*))');

      if (filters?.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters?.topicIds?.length) {
        query = query.in('question_topics.topic_id', filters.topicIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Question[];
    },
  });
}

// hooks/useAttempts.ts
export function useSubmitAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attempt: Omit<UserAttempt, 'id' | 'attempted_at'>) => {
      const { data, error } = await supabase
        .from('user_attempts')
        .insert(attempt)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_attempts'] });
      queryClient.invalidateQueries({ queryKey: ['user_stats'] });
    },
  });
}
```

## Authentication Patterns

### Auth Context

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

## API Design Patterns

### Supabase Edge Functions

```typescript
// supabase/functions/generate-study-plan/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { userId, targetDate, weakTopics } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Analyze user performance
  const { data: attempts } = await supabase
    .from('user_attempts')
    .select('*, question:questions(topics:question_topics(topic:topics(*)))')
    .eq('user_id', userId);

  // Calculate topic mastery
  const topicStats = calculateTopicMastery(attempts);

  // Generate personalized study plan
  const studyPlan = generatePlan(topicStats, targetDate, weakTopics);

  return new Response(JSON.stringify(studyPlan), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## Deployment Configuration

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

### Environment Variables

```env
# .env.local (local development)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Add these to Vercel project settings
```

## Performance Optimizations

1. **Code Splitting**: Use React.lazy for route-based splitting
2. **Image Optimization**: Use Vercel Image Optimization for diagrams
3. **Caching**: Leverage React Query caching with appropriate staleTime
4. **Database Indexes**: Add indexes on frequently queried columns
5. **Real-time Subscriptions**: Use sparingly, only for critical updates

## Testing Strategy

```typescript
// __tests__/QuestionCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionCard } from '@/components/exam/QuestionCard';

describe('QuestionCard', () => {
  const mockQuestion = {
    id: '1',
    question_text: 'What is ML?',
    question_type: 'multiple_choice',
    options: [
      { id: 'A', text: 'Machine Learning', is_correct: true },
      { id: 'B', text: 'Manual Labor', is_correct: false },
    ],
    explanation: 'ML stands for Machine Learning',
    difficulty: 'easy',
    source: 'test',
  };

  it('renders question and options', () => {
    render(<QuestionCard question={mockQuestion} onAnswer={jest.fn()} />);
    expect(screen.getByText('What is ML?')).toBeInTheDocument();
    expect(screen.getByText('Machine Learning')).toBeInTheDocument();
  });

  it('calls onAnswer when submitted', async () => {
    const onAnswer = jest.fn();
    render(<QuestionCard question={mockQuestion} onAnswer={onAnswer} />);

    fireEvent.click(screen.getByText('Machine Learning'));
    fireEvent.click(screen.getByText('Submit Answer'));

    expect(onAnswer).toHaveBeenCalledWith(['A']);
  });
});
```

## Common Pitfalls & Solutions

1. **RLS Policies**: Always test with authenticated users, not service role
2. **N+1 Queries**: Use Supabase's select with joins to avoid multiple queries
3. **Stale Data**: Configure proper cache invalidation in React Query
4. **Type Safety**: Generate Supabase types regularly as schema evolves
5. **Auth State**: Handle loading states properly to avoid flashes

## Integration Checklist

- [ ] Supabase project created with database schema
- [ ] RLS policies configured and tested
- [ ] Environment variables set in Vercel
- [ ] Auth flows implemented (sign up, sign in, sign out)
- [ ] Protected routes configured
- [ ] Error boundary components added
- [ ] Loading states handled
- [ ] Responsive design implemented
- [ ] Accessibility tested (keyboard navigation, screen readers)
- [ ] Performance optimized (Lighthouse score > 90)

## References

- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Vercel Deployment Docs](https://vercel.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

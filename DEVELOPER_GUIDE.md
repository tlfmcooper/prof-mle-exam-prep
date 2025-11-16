# Developer Guide - Authentication & Database

Quick reference for working with the authentication and database system.

## 🔐 Using Authentication

### Get Current User

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, profile, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return <div>Hello, {profile?.full_name}!</div>;
}
```

### Sign In

```typescript
const { signIn } = useAuth();

try {
  await signIn('user@example.com', 'password123');
  // Redirect handled automatically
} catch (error) {
  console.error('Sign in failed:', error.message);
}
```

### Sign Up

```typescript
const { signUp } = useAuth();

try {
  await signUp('user@example.com', 'password123', 'John Doe');
  // Profile created automatically via trigger
} catch (error) {
  console.error('Sign up failed:', error.message);
}
```

### Sign Out

```typescript
const { signOut } = useAuth();

await signOut();
// Redirected to /login automatically
```

### Update Profile

```typescript
const { updateProfile } = useAuth();

await updateProfile({
  full_name: 'New Name',
  target_exam_date: '2025-12-31',
  study_goal_hours_per_week: 10,
});
```

## 🗄️ Database Operations

### Query Questions

```typescript
import { useQuestions } from '@/hooks/useQuestions';

function QuestionList() {
  const { data: questions, isLoading } = useQuestions({
    difficulty: 'medium',
    limit: 10,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {questions?.map(q => (
        <div key={q.id}>{q.question_text}</div>
      ))}
    </div>
  );
}
```

### Submit User Attempt

```typescript
import { useSubmitAttempt } from '@/hooks/useAttempts';

function QuestionCard() {
  const submitAttempt = useSubmitAttempt();
  const { user } = useAuth();

  const handleSubmit = async (selectedOptions: string[]) => {
    await submitAttempt.mutateAsync({
      user_id: user!.id,
      question_id: 'question-uuid',
      selected_options: ['A'],
      is_correct: true,
      time_spent_seconds: 45,
      confidence_level: 4,
    });
  };

  return <button onClick={() => handleSubmit(['A'])}>Submit</button>;
}
```

### Direct Supabase Queries

```typescript
import { supabase } from '@/lib/supabase';

// Type-safe query
const { data, error } = await supabase
  .from('questions')  // Autocompletes table names
  .select('*')
  .eq('difficulty', 'hard')  // Autocompletes column names
  .limit(5);

// Insert with types
const { error } = await supabase
  .from('user_attempts')
  .insert({
    user_id: user.id,
    question_id: questionId,
    selected_options: ['A', 'B'],
    is_correct: true,
    time_spent_seconds: 60,
    confidence_level: 3,
  });
```

## 🛡️ Protected Routes

### Protect a Page

```typescript
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

<Route
  path="/practice"
  element={
    <ProtectedRoute>
      <PracticePage />
    </ProtectedRoute>
  }
/>
```

### Public Route (Login/Signup)

```typescript
import { PublicRoute } from '@/components/auth/PublicRoute';

<Route
  path="/login"
  element={
    <PublicRoute>
      <LoginPage />
    </PublicRoute>
  }
/>
```

## 📝 TypeScript Types

### Import Types

```typescript
import type { Profile, Question, UserAttempt } from '@/lib/supabase';

// Or for specific operations
import type { Inserts, Updates } from '@/lib/supabase';

type NewAttempt = Inserts<'user_attempts'>;
type ProfileUpdate = Updates<'profiles'>;
```

### Using Database Types

```typescript
import { Database } from '@/lib/database.types';

type QuestionRow = Database['public']['Tables']['questions']['Row'];
type QuestionInsert = Database['public']['Tables']['questions']['Insert'];
```

## ⚠️ Common Patterns

### Check Auth Before Action

```typescript
function DeleteButton() {
  const { user } = useAuth();

  const handleDelete = async () => {
    if (!user) {
      alert('Please sign in first');
      return;
    }

    // Perform delete
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

### Loading States

```typescript
function DataComponent() {
  const { data, isLoading, error } = useQuestions();

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  if (!data) return <EmptyState />;

  return <DataDisplay data={data} />;
}
```

### Error Handling

```typescript
try {
  await supabase.from('questions').insert(newQuestion);
} catch (error) {
  if (error.code === '23505') {
    // Unique constraint violation
    console.error('Question already exists');
  } else if (error.code === '42501') {
    // RLS policy violation
    console.error('Permission denied');
  } else {
    console.error('Unknown error:', error);
  }
}
```

## 🔍 Debugging Tips

### Check Auth State

```typescript
import { supabase } from '@/lib/supabase';

// Get current session
const { data: { session } } = await supabase.auth.getSession();
console.log('Current user:', session?.user);

// Listen to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session);
});
```

### Check RLS Policies

```typescript
// If query returns empty but data exists:
// 1. Check if RLS policy allows access
// 2. Verify user is authenticated
// 3. Check if user_id matches auth.uid()

const { data, error } = await supabase
  .from('user_attempts')
  .select('*');

if (data?.length === 0) {
  console.log('Check RLS policies!');
}
```

### Inspect Database Types

```typescript
import { supabase } from '@/lib/supabase';

// Hover over this in VSCode to see available tables
supabase.from('...')

// Hover to see available columns
supabase.from('questions').select('...')
```

## 📚 Resources

### Internal Docs:
- [Setup Guide](./SETUP.md)
- [Authentication Testing](./AUTHENTICATION_TESTING.md)
- [Implementation Details](./DATABASE_AUTH_IMPLEMENTATION.md)

### External Docs:
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [React Query Docs](https://tanstack.com/query/latest)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## ❓ FAQ

**Q: How do I get the current user's ID?**
```typescript
const { user } = useAuth();
const userId = user?.id;
```

**Q: How do I check if user is authenticated?**
```typescript
const { user } = useAuth();
const isAuthenticated = !!user;
```

**Q: How do I access user's email?**
```typescript
const { user, profile } = useAuth();
const email = user?.email || profile?.email;
```

**Q: How do I refresh user data?**
```typescript
const { refreshProfile } = useAuth();
await refreshProfile();
```

**Q: How do I handle "Too Many Requests" errors?**
- Wait 60 seconds before retrying
- Implement exponential backoff
- Check if you're in a request loop

**Q: Why can't I see data in the database?**
- Check RLS policies
- Verify you're authenticated
- Ensure `user_id` matches `auth.uid()`
- Check Supabase logs

---

**Last Updated:** 2025-11-15
**Version:** 1.0.0

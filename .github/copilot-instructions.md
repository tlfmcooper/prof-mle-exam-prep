# GitHub Copilot Instructions for Professional ML Engineer Exam Prep

## 🏗 Project Architecture & Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend/Data**: Supabase (PostgreSQL, Auth, RLS).
- **State Management**: 
  - **Server State**: TanStack Query (React Query v5) via custom hooks in `src/hooks/`.
  - **Client State**: Zustand (`src/stores/examStore.ts`) for active exam sessions.
- **Testing**: Vitest (`npm test`).

## 🧠 Key Concepts & Data Flow
- **Data Access**: ALWAYS use the typed Supabase client from `src/lib/supabase.ts`.
  - Do NOT use `supabase-js` directly; import `supabase` from `@/lib/supabase`.
  - Use `src/lib/database.types.ts` for raw DB types and `src/lib/types.ts` for domain interfaces.
- **Question Handling**:
  - Questions have `options` stored as JSON/arrays. Hooks like `useQuestions` parse this automatically.
  - **Topic Mapping**: `TOPIC_MAPPINGS` in `src/hooks/useQuestions.ts` handles duplicate/orphan topics. logic MUST be preserved when querying questions by topic.
- **Exam Logic**:
  - `useExamQuestions` implements weighted distribution logic based on exam sections.
  - `useAttempts` handles recording user answers and invalidating relevant queries (progress, analytics).

## 💻 Developer Workflows
- **Dev Server**: `npm run dev`
- **Testing**: `npm test` (Vitest)
- **Data Ingestion**: Scripts in `scripts/` (e.g., `npm run ingest-all`) handle importing questions from JSON to Supabase.
- **Database Types**: Regenerate with `npx supabase gen types typescript ... > src/lib/database.types.ts`.

## 🧩 Coding Conventions
- **React Query**:
  - Encapsulate queries in custom hooks (e.g., `useUserStats`, `useQuestions`).
  - Use `queryKey` factories or consistent arrays (e.g., `['questions', filters, userId]`).
  - Invalidate queries in `onSuccess` of mutations to keep UI fresh.
- **Styling**:
  - Use Tailwind utility classes.
  - Use `cn()` utility for class merging (shadcn/ui pattern).
- **Error Handling**:
  - Log errors in mutations/queries but handle UI feedback gracefully (toasts/alerts).
  - `useSubmitAttempt` should not block the user flow on failure (silent fail or non-blocking toast).

## 📂 Important Directories
- `src/hooks/`: Data fetching logic (React Query).
- `src/stores/`: Global client state (Zustand).
- `src/lib/`: Utilities, Supabase client, Types.
- `scripts/`: Node.js scripts for data maintenance/ingestion.
- `supabase/`: Migrations and SQL functions.

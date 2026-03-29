# FamilyOS Frontend Architecture

## Tech Stack
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Auth**: @supabase/supabase-js (client-side auth)
- **File Upload**: react-dropzone
- **Markdown**: react-markdown (for chat responses)

## Project Structure
```
frontend/
  app/
    layout.tsx            -- Root layout with sidebar nav
    page.tsx              -- Redirect to /documents or /login
    login/page.tsx        -- Login form
    signup/page.tsx       -- Signup form (creates family)
    documents/page.tsx    -- Upload zone + categorized document grid
    chat/page.tsx         -- RAG chatbot interface
    family/page.tsx       -- Family member management (admin)
  components/
    FileUpload.tsx        -- Drag-and-drop PDF upload zone
    DocumentCard.tsx      -- Single document card in grid
    CategoryFilter.tsx    -- Horizontal category pill filter
    ChatMessage.tsx       -- Chat bubble (user/assistant)
    Sidebar.tsx           -- Navigation sidebar
    ProtectedRoute.tsx    -- Auth guard wrapper
  lib/
    supabase.ts           -- Browser Supabase client init
    api.ts                -- Fetch wrapper for FastAPI backend calls
    types.ts              -- Shared TypeScript types
```

## API Communication
- All backend calls go through `lib/api.ts`
- Base URL: `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`)
- Auth: JWT token from Supabase passed as `Authorization: Bearer <token>`
- File uploads: `multipart/form-data` via fetch

## Shared contract

Autofill provenance and correction flows should use the shared contract in:
- `../shared/autofill/CONTRACT.md`
- `../shared/autofill/schemas/autofill-response.schema.json`

Frontend note:
- `source_type`, `profile_key`, `reason`, and `requires_review` are shared UX fields, not frontend-local inventions.

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Key Patterns
- **Auth state**: Use Supabase `onAuthStateChange` listener in root layout
- **Protected routes**: Redirect to /login if no session
- **Role-based UI**: Hide admin features (upload, delete, family mgmt) for child role
- **Optimistic updates**: Show uploaded doc immediately, update category when pipeline finishes
- **Error handling**: shadcn toast for user-facing errors

## Setup Commands
```bash
npx create-next-app@latest frontend --typescript --tailwind --app --eslint --src-dir=false --import-alias="@/*"
cd frontend
npx shadcn@latest init
npx shadcn@latest add button card input badge dialog dropdown-menu sheet avatar toast
npm install react-dropzone react-markdown @supabase/supabase-js
```

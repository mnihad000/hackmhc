# FamilyOS — UI Directions for Vibe-Coding

## Design Philosophy
- **Warm, trustworthy, family-friendly** — think of a digital filing cabinet that feels approachable
- Clean and modern, not sterile — soft rounded corners, gentle shadows
- Color palette: deep navy primary (#1e3a5f), warm amber accent (#f59e0b), soft gray backgrounds (#f8fafc)
- Typography: Inter or system font stack, clear hierarchy

## Layout
- **Sidebar navigation** (collapsible on mobile): Dashboard, Documents, Chat, Family
- **Top bar**: FamilyOS logo (left), user avatar + role badge (right)
- Mobile-first responsive — works on tablets too (parents filling forms on iPad)

---

## Pages

### 1. Login / Signup (`/login`, `/signup`)
- Centered card layout, max-width 400px
- Logo above form
- Signup asks: full name, email, password, family name (creates family)
- Login: email + password
- Supabase auth — use `@supabase/supabase-js` client-side
- After login, redirect to `/documents`

### 2. Dashboard / Documents (`/documents`)
**This is the main page.**

- **Top section**: Drag-and-drop upload zone
  - Large dashed-border area: "Drop PDFs here or click to upload"
  - Show upload progress bar per file
  - After upload completes, show a toast: "W-2_2025.pdf categorized as Finance"
  - Use `react-dropzone` — accept only `.pdf`

- **Category filter bar** (below upload):
  - Horizontal pill/chip buttons: All | Finance | Education | Medical | Identity | Legal | Other
  - Active pill is filled, others are outlined
  - Clicking filters the grid below

- **Document grid**:
  - Card layout (3 columns desktop, 2 tablet, 1 mobile)
  - Each card shows:
    - PDF icon (color-coded by category: green=finance, blue=education, red=medical, purple=identity, orange=legal, gray=other)
    - Filename (truncated)
    - Category badge
    - Upload date
    - Uploaded by (avatar + name)
    - "..." menu: View, Download, Delete (admin only)
  - Empty state: illustration + "Upload your first family document"

### 3. Chat (`/chat`)
- Full-height chat interface (like ChatGPT/iMessage)
- Left side: chat messages (scrollable)
- Bottom: input bar with send button
- Messages:
  - User messages: right-aligned, colored bubble
  - Assistant messages: left-aligned, white bubble
  - Source citations below assistant messages: small linked pills showing "W-2_2025.pdf" — clicking opens the doc
- Suggested starter questions: "What was my total income?", "When is my child's birthday?", "Summarize my medical records"
- Loading state: typing indicator (3 bouncing dots)

### 4. Family Management (`/family`)
- **Family name** at top (editable by admin)
- **Members list**: table or card list
  - Each row: avatar, name, email, role badge (Admin/Member/Child), joined date
  - Admin actions: change role dropdown, remove button (with confirmation modal)
- **Invite section** (admin only):
  - Email input + role selector + "Send Invite" button
  - Show pending invites list

---

## Components to Build

### FileUpload
- `react-dropzone` wrapper
- States: idle, drag-over (highlight border), uploading (progress), done (checkmark)
- Accept: `application/pdf` only
- Max file size: 10MB
- Multiple file upload supported

### DocumentCard
- shadcn `Card` component
- Props: filename, category, uploadDate, uploadedBy, onDelete, onView
- Category-colored left border or icon

### CategoryFilter
- Horizontal scrollable on mobile
- shadcn `Badge` or `Button` variant="outline" / variant="default"
- Props: categories[], activeCategory, onChange

### ChatMessage
- Distinguish user vs assistant via alignment + color
- Markdown rendering for assistant messages (use `react-markdown`)
- Source citation pills below assistant messages

### Sidebar / Navigation
- shadcn `Sheet` for mobile, fixed sidebar for desktop
- Icons: FileText (Documents), MessageCircle (Chat), Users (Family)
- Active page highlighted
- User info + logout at bottom

---

## UI Library Setup
```bash
# After create-next-app:
npx shadcn@latest init
npx shadcn@latest add button card input badge dialog dropdown-menu sheet avatar toast
npm install react-dropzone react-markdown
```

## Theming (tailwind.config.ts)
```ts
// Extend with FamilyOS colors:
colors: {
  primary: { DEFAULT: '#1e3a5f', light: '#2d5a8e' },
  accent: { DEFAULT: '#f59e0b', light: '#fbbf24' },
  category: {
    finance: '#22c55e',
    education: '#3b82f6',
    medical: '#ef4444',
    identity: '#a855f7',
    legal: '#f97316',
    other: '#6b7280',
  }
}
```

## Animation / Polish (if time allows)
- Framer Motion for page transitions
- Upload zone pulse animation on drag-over
- Skeleton loading cards while documents load
- Toast notifications (shadcn toast) for upload success/error
- Confetti on first document upload (optional, fun for demo)

## Key UX Decisions
1. **No separate "upload page"** — upload zone lives on the documents page for speed
2. **Chat is its own page**, not a sidebar widget — gives it proper real estate
3. **Category auto-assigned** — users never manually pick a category (the AI does it)
4. **Source citations in chat are clickable** — builds trust and lets users verify
5. **Role-based UI**: children see documents + chat only, no upload/delete/family management

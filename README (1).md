# FamilyOS

## Overview
FamilyOS is a family document operating system built for busy households.

It has two main parts:

1. **Web app** where families can upload important PDFs such as W-2s, birth certificates, report cards, bills, prescriptions, and other household records.
2. **Chrome extension** that helps autofill forms using structured data extracted from those documents.

The goal is to make family paperwork easier to organize, search, and reuse.

For the hackathon, the product should stay focused on one core promise:

> Upload family PDFs, organize them automatically, ask questions over them, and reuse extracted data to save time on forms.

---

## Problem
Families have important documents scattered across email inboxes, downloads folders, cloud drives, and paper stacks. When they need something later, they waste time:

- finding the right file
- remembering what document contains what information
- retyping the same data into forms again and again
- managing access between parents and children

FamilyOS solves that by turning uploaded files into:

- organized folders/sections
- searchable knowledge
- reusable autofill-ready data

---

## Target Users
### Primary users
- Parents / head of household
- Families managing shared records

### Secondary users
- Children or other household members with limited access
- Students storing school-related files

### UX requirement
The UI must be extremely simple, clear, and low-friction.
This product is aimed at families, including non-technical and older users, so clarity matters more than feature density.

---

## Hackathon Scope
This project is being built at a hackathon with roughly **12 hours**, a **4-person team**, and a strict need to prioritize the MVP.

### Must-have MVP
- Upload PDF file
- Drag-and-drop PDF upload
- Parse PDF content
- Extract structured data from documents
- Automatically assign documents into family-friendly sections/folders
- Store uploaded file metadata and extracted structured fields in Supabase
- Store embeddings / chunks for RAG
- Basic chat over uploaded documents
- Chrome extension for autofill using stored data
- Simple front-end for browsing folders/files and uploading files

### Nice-to-have if time permits
- Manual override to move a file into a different folder
- Confidence score on extracted fields
- Review screen before accepting autofill
- Per-member visibility controls
- Basic admin/member role management

### Explicitly out of scope for the first hackathon build
These are good future directions, but should not distract from the MVP:

- Gmail integration
- Medical portal integrations
- Utility integrations like EZPass, Con Edison, Spectrum, etc.
- Google Calendar event suggestions
- Complex multi-step agent workflows
- Full OCR-heavy pipeline for messy scans unless absolutely needed
- Broad support for non-PDF file types

---

## Product Vision
FamilyOS should feel like a simple operating system for family records.

A user should be able to:

1. upload a document
2. have the system understand what it is
3. see it appear in the correct section
4. ask questions about it later
5. reuse the extracted information in forms through the extension

The product should combine:

- **document organization**
- **RAG-based Q&A**
- **structured data extraction**
- **autofill assistance**

---

## Core Features

### 1. Document upload and organization
Users upload PDFs through the web app.
The system parses the document, extracts text and key fields, creates embeddings, classifies the document, and stores it in the correct family section.

Examples:
- W-2 -> Finance / Taxes
- Birth certificate -> Identity / Family Records
- Report card -> Children / School
- Bill -> Utilities / Expenses
- Prescription or doctor note -> Health

### 2. RAG chatbot
Users can ask questions about their uploaded documents.
The chatbot should answer strictly from uploaded family files and retrieved context.

Examples:
- “What was our adjusted gross income on the uploaded tax form?”
- “When is my child’s report card dated?”
- “What address is listed on the birth certificate?”

### 3. Structured data extraction
FamilyOS should not only store raw files. It should extract key-value data that becomes reusable.

Examples:
- full name
- email
- phone number
- address
- birthday
- tax identifiers when appropriate and safe
- school info
- document dates

### 4. Chrome autofill extension
When a user is on a form, the extension can prompt:

> “Want to autofill with FamilyOS?”

If the user says yes, the extension pulls the best available structured data from FamilyOS and fills supported fields.

The extension should prefer:
- reviewed / structured data from Supabase
- high-confidence extracted values
- user-confirmed reusable profile fields

---

## User Roles and Permissions
FamilyOS uses a family-based account model.

### Head of household / admin
- Creates the family workspace
- Invites family members
- Has full permission management
- Can control visibility of shared sections
- Can manage which members can view or upload into certain areas

### Member
- Can upload documents if allowed
- Can view folders/files they have permission to access
- Can ask questions over documents they are allowed to see
- Can maintain personal/private folders if product supports it

### Example permission rules
- Parents can hide finance folders from children
- Children can have private school or personal folders
- Non-admin members cannot change household-wide permissions

For the MVP, keep permissioning minimal but design the data model so it can expand cleanly.

---

## Suggested Information Architecture
These are example default sections the system can auto-classify into:

- **Finance**
- **Taxes**
- **Identity**
- **Health**
- **School**
- **Bills & Utilities**
- **Insurance**
- **Housing**
- **Family Records**
- **Personal / Other**

Each uploaded document should belong to:
- a family workspace
- an uploader
- a section/folder
- a visibility scope
- extracted structured fields
- vectorized chunks for retrieval

---

## High-Level Architecture

```text
[User uploads PDF in web app]
        -> [Upload endpoint]
        -> [PDF parsing / text extraction]
        -> [Chunking + embeddings]
        -> [Document classification / section assignment]
        -> [Structured field extraction to JSON]
        -> [Store file metadata + extracted fields in Supabase]
        -> [Store embeddings / retrieval chunks]
        -> [Render document inside correct folder in frontend]

[User asks chatbot question]
        -> [Query embeddings]
        -> [Retrieve relevant chunks]
        -> [LLM answers using only retrieved context]

[User opens external web form in Chrome]
        -> [Extension detects fillable fields]
        -> [User chooses FamilyOS autofill]
        -> [Extension requests structured data from backend]
        -> [Field mapping + autofill]
```

---

## Recommended MVP System Design

### Frontend
**Suggested stack:** React or Next.js

Responsibilities:
- authentication flow
- upload page
- drag-and-drop upload component
- folders/files view
- document cards/list view
- simple chatbot UI
- permission-aware rendering

Key pages:
- **Upload page**
- **Folders / Files page**
- **Document detail page** (optional if time allows)
- **Chat / Ask your documents page** (can be embedded in dashboard)

### Backend
**Suggested stack:** FastAPI + Supabase

Responsibilities:
- file upload handling
- PDF parsing pipeline
- document classification
- structured field extraction
- embedding generation
- retrieval endpoints for chat
- structured field endpoints for autofill
- auth-aware access control

### Database / Storage
**Suggested platform:** Supabase

Use Supabase for:
- auth
- Postgres tables
- row-level security if possible
- file metadata
- extracted structured fields
- user / family relationships
- optionally vector storage depending on implementation

### Vector / RAG layer
Use an embedding model to store document chunks and power retrieval.

Possible options mentioned by team:
- Arctic Embed
- small Hugging Face embedding model
- other lightweight embeddings suitable for hackathon speed

Recommendation:
Use the simplest reliable embedding setup that works quickly with your stack.
Do not overcomplicate model selection during the hackathon.

### Extension
**Suggested stack:** JavaScript / React for extension UI if needed

Responsibilities:
- detect form fields
- allow user-triggered autofill
- call FamilyOS backend for structured data
- map returned values to browser fields
- require user confirmation when confidence is low

---

## Data Flow Details

### Flow 1: Upload and classify
1. User uploads PDF.
2. Backend stores raw file or file reference.
3. PDF text is extracted.
4. Text is chunked for retrieval.
5. Embeddings are generated for each chunk.
6. A classifier or extraction step identifies document type.
7. A structured extraction step generates JSON.
8. Backend stores:
   - raw file metadata
   - extracted text / summary if needed
   - structured JSON fields
   - document type
   - folder/section assignment
   - embeddings or chunk references
9. Frontend shows file inside the assigned section.
10. User can manually move document if classification is wrong.

### Flow 2: Chat with documents
1. User asks a question.
2. Backend embeds the question.
3. System retrieves relevant chunks from that family’s allowed documents.
4. LLM answers using retrieved chunks only.
5. Response includes citations or document references if time permits.

### Flow 3: Autofill
1. User opens a form.
2. Extension checks for relevant input fields.
3. User clicks FamilyOS autofill.
4. Extension sends field hints to backend.
5. Backend returns best matching structured values.
6. Extension fills supported inputs.
7. User reviews before submitting.

---

## AI / NLP Approach
The system needs three different AI-like jobs. Keep them separate conceptually.

### 1. Extraction
Goal: turn document text into structured JSON.

Examples:
- name
- DOB
- address
- employer
- school
- tax year
- document type

Recommendation:
Use a prompt-based structured extraction step that outputs strict JSON.
Validate the JSON server-side before storing it.

### 2. Classification
Goal: decide what section/folder a document belongs in.

This can be done using:
- rules / keywords for speed
- lightweight model classification
- embedding similarity against known folder categories

Recommendation:
For hackathon MVP, use a hybrid approach:
- rule-based shortcuts for obvious docs
- fallback classifier or embedding similarity for ambiguous docs

### 3. Retrieval / RAG
Goal: answer user questions from uploaded document content.

Recommendation:
Keep retrieval strict.
Do not allow generic hallucinated answers when context is missing.
The chatbot should say it could not find enough evidence when needed.

---

## Engineering Recommendations

### Keep the MVP narrow
Do not try to build every integration idea.
The cleanest demo is:
- upload PDF
- auto-organize it
- ask a question about it
- autofill a form with extracted data

### Prefer deterministic systems where possible
For demo reliability:
- use rule-based field mapping in extension
- use explicit JSON schemas for extracted data
- use known folder labels
- keep fallbacks simple

### Make reviewability visible
Trust matters a lot for family documents.
Whenever possible, show:
- extracted fields
- confidence or source document
- ability to edit or confirm extracted values

### Design for sensitive data
This product handles personal family records.
Even in the MVP, be careful with:
- auth
- document access separation
- not exposing one family’s data to another
- only retrieving data user is allowed to see

### Optimize for demo, not theoretical perfection
At a hackathon, reliability beats complexity.
A smaller but clean demo is much better than a larger but unstable system.

---

## Suggested Backend Concepts
This README is the project-level reference. More implementation detail should live in `backend.md`.

Suggested backend domains:
- auth and family membership
- documents and file metadata
- extracted fields JSON
- embeddings / chunks
- folder classification
- chat retrieval pipeline
- autofill API

Suggested API groups:
- `/auth`
- `/families`
- `/documents`
- `/folders`
- `/chat`
- `/autofill`

Suggested core entities:
- `users`
- `families`
- `family_members`
- `documents`
- `document_sections`
- `document_chunks`
- `document_extractions`
- `autofill_profiles`

---

## Suggested Frontend Concepts
This README gives product context. More UI detail can later live in `UI.md`.

Minimum frontend needs:
- clean landing/dashboard
- drag-and-drop upload component
- folder sidebar or cards
- file list/grid
- simple family-friendly labels
- chatbot panel
- permission-aware visibility

UI principles:
- large buttons
- obvious upload entry point
- low clutter
- clear folder naming
- avoid technical language
- keep actions obvious for older users

---

## Chrome Extension Notes
The extension should be framed as an assistive autofill layer, not a fully autonomous form submitter.

Recommended MVP behavior:
- detect common fields like name, email, address, DOB, phone
- prompt user before filling
- fill only supported visible inputs
- skip low-confidence fields
- never auto-submit forms

This makes the demo safer and easier to trust.

---

## Demo Story
A strong hackathon demo could follow this flow:

1. Parent uploads a W-2 and a child report card.
2. FamilyOS automatically places them in **Taxes** and **School**.
3. User opens chat and asks a question about one document.
4. FamilyOS answers using the uploaded content.
5. User opens a scholarship or school form.
6. Chrome extension offers autofill.
7. Fields like name, address, email, and school-related info get filled from FamilyOS.

This shows the full loop from ingestion to reuse.

---

## Future Expansion Ideas
These are good long-term ideas, but not part of the MVP:

- Gmail attachment import
- one-click ingestion from external portals
- medical document workflows
- utility bill syncing
- calendar event suggestion from detected dates/times
- stronger household workflows and reminders
- more advanced role-based permissions
- broader file support beyond PDF

---

## Team Roles
Current role split based on notes:

- **Thierno** -> Chrome extension (React / JS)
- **Nihad** -> Supabase backend / FastAPI
- **Kenneth** -> TBD
- **Rasul** -> TBD

If needed, assign the remaining work across:
- frontend UI
- AI / RAG pipeline
- integration / demo stitching

---

## Success Criteria for the Hackathon
FamilyOS is successful if the team can demo all of the following reliably:

- upload a PDF
- parse and classify it into the right section
- store extracted data
- answer at least one grounded question from uploaded docs
- autofill at least a few real form fields from stored data

That is enough for a strong, coherent demo.

---

## Working Assumptions
These assumptions were made while writing this README:

- only PDFs are supported in the MVP
- extracted data is stored in Supabase in structured form
- embeddings are stored in or alongside the retrieval layer used by backend
- the frontend is React or Next.js
- the backend is FastAPI
- the extension is a Chrome extension in JS/React
- users belong to family workspaces with role-based access

If any of these change, update this README and the implementation docs.

---

## Repo Direction
Recommended top-level project structure:

```text
/frontend     -> web app
/backend      -> FastAPI app, parsing, extraction, retrieval, APIs
/extension    -> Chrome extension
/docs         -> optional docs like backend.md, UI.md, data-model.md
README.md     -> overall product and architecture reference
```

This `README.md` should serve as the main high-level context file for Codex and new contributors.


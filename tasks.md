# FamilyOS Startup Tasks

## Product Strategy
- [ ] Define v1 wedge: "Family command center for documents + deadlines + calendar + autofill."
- [ ] Define success metrics: activation, weekly retention, autofill acceptance, answer trust.
- [ ] Prioritize one hero workflow: inbox/upload -> extract -> task/event creation -> assistant answer -> autofill.

## Core Platform Fixes
- [ ] Align autofill contract end-to-end between extension, backend, and shared schemas.
- [ ] Implement missing `/api/autofill/feedback` backend endpoint.
- [ ] Resolve RAG architecture split (`public.document_chunks` vs `rag.*`) and standardize one path.
- [ ] Standardize retrieval ownership boundaries (`family` vs `user`) with explicit policy.

## Ingestion and Data Pipeline
- [ ] Move PDF processing off request path to async job workers.
- [ ] Add ingestion states: `queued`, `processing`, `completed`, `failed`.
- [ ] Add retries, dead-letter handling, and idempotency keys.
- [ ] Build structured extraction for people, schools, deadlines, bills, exams, insurance details.
- [ ] Add OCR fallback path for scanned/low-text PDFs.

## Assistant Quality and Trust
- [ ] Add citation-grounded response validation.
- [ ] Add "insufficient evidence" response mode when retrieval is weak.
- [ ] Add correction UI for wrong/missing extracted values.
- [ ] Feed user corrections into extraction quality pipeline.
- [ ] Create regression eval set for family-specific Q&A.

## Integrations Roadmap
- [ ] Gmail integration (read, parse, classify relevant family messages).
- [ ] Google Calendar integration (read/write events with approval flow).
- [ ] Google Drive integration (sync files into document pipeline).
- [ ] Google People/Contacts integration (household profile graph + autofill).
- [ ] Google Tasks integration (task sync and unified task bar).
- [ ] Google Classroom integration (assignments/exams ingestion).
- [ ] Canvas LMS integration (school deadlines/events).
- [ ] Microsoft Outlook integration (mail + calendar parity).
- [ ] Plaid integration (bills/subscriptions/cashflow reminders).
- [ ] Todoist integration (external task sync).
- [ ] Notion integration (optional workspace sync).
- [ ] iCloud calendar compatibility strategy (import/sync path).

## Security and Governance
- [ ] Implement audit logs for auth, data access, sharing, assistant actions.
- [ ] Harden secrets management and key rotation policy.
- [ ] Enforce strict least-privilege service role usage.
- [ ] Add environment isolation (dev/staging/prod) with explicit access policy.
- [ ] Add sensitive-data encryption strategy for high-risk fields.
- [ ] Add data retention, export, and verified delete workflows.
- [ ] Tighten extension permissions over time (reduce broad host scope).

## Access Control and Multi-User
- [ ] Expand RBAC beyond admin/member/child where needed.
- [ ] Add category/document-level visibility controls per family member.
- [ ] Add approval flows for critical assistant actions.
- [ ] Add household-level policy settings (who can see/edit/share what).

## Reliability and Operations
- [ ] Add API rate limiting and abuse protection.
- [ ] Add full observability: request tracing, queue metrics, model call metrics.
- [ ] Define SLOs and error budgets for ingest/chat/autofill.
- [ ] Add backup and restore drills with runbooks.
- [ ] Create incident response process and alerting.

## Testing and Quality Gates
- [ ] Add backend unit tests for routers/services.
- [ ] Add integration tests for Supabase + RAG + auth flows.
- [ ] Add contract tests for all shared schema versions in CI.
- [ ] Add E2E tests for signup, upload, chat, dashboard actions, autofill.
- [ ] Add hallucination and wrong-fill regression tests.

## UX and Adoption
- [ ] Improve onboarding to first value in <10 minutes.
- [ ] Add guided setup checklist for connectors (Gmail/Calendar/Drive).
- [ ] Add proactive assistant suggestions with clear approval UX.
- [ ] Add actionable dashboards for deadlines, missing docs, and family workload.
- [ ] Add in-product feedback loop (NPS + issue reporting).

## Business and Growth
- [ ] Instrument growth funnel and retention cohorts.
- [ ] Define initial pricing and packaging.
- [ ] Add billing infrastructure and entitlement checks.
- [ ] Add referral/waitlist loops for family growth.
- [ ] Add support workflow and knowledge base.

## Suggested Build Order (Execution Priority)
- [ ] P0: Contract alignment + missing feedback endpoint + RAG path consolidation.
- [ ] P0: Async ingestion pipeline + ingestion statuses.
- [ ] P0: Gmail + Google Calendar integrations (read-first, then write with approvals).
- [ ] P1: Drive + People + Tasks integrations.
- [ ] P1: Assistant trust layer + correction loop + eval harness.
- [ ] P1: Observability, rate limits, audit logs.
- [ ] P2: Classroom + Canvas + Outlook.
- [ ] P2: Plaid + Todoist + Notion + iCloud compatibility.

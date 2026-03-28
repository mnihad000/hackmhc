# FamilyOS Chrome Extension

This folder contains the FamilyOS Chrome extension for precision-first autofill.

## MVP goal

Help users fill repetitive form fields using FamilyOS data while avoiding incorrect autofill.

## Product behavior (MVP)

1. Detect fillable fields on the active page.
2. Prompt user to autofill with FamilyOS.
3. Request backend suggestions with confidence per field.
4. Show preview with high-confidence suggestions preselected.
5. Fill only user-approved fields.
6. Send fill outcomes and manual corrections back to backend.

## Design principles

- Precision over coverage.
- User approval before fill.
- Confidence-gated suggestions.
- Clear source/reason metadata for trust.

## Confidence thresholds (initial)

- `>= 0.85`: preselect in preview.
- `0.65 - 0.84`: show unchecked.
- `< 0.65`: do not suggest/fill.

## Backend contract needed

Cross-team source of truth:
- `../shared/autofill/CONTRACT.md`
- `../shared/autofill/schemas/autofill-request.schema.json`
- `../shared/autofill/schemas/autofill-response.schema.json`
- `../shared/autofill/schemas/autofill-feedback.schema.json`

Important boundary:
- `extension/shared/` contains extension runtime helpers.
- `../shared/` contains the contract with backend and frontend.
- The extension should rely on contract fields, not on vector DB or retrieval internals.

## Planned extension structure

```text
extension/
  manifest.json
  background/
    background.js
  content/
    content_script.js
  popup/
    popup.html
    popup.js
    popup.css
  shared/
    field_normalization.js
    confidence.js
    feedback_queue.js
```

## First implementation milestones

1. Scaffold MV3 extension files.
2. Implement field extraction and normalization.
3. Implement popup approve flow.
4. Integrate `/api/autofill` and confidence gating.
5. Implement feedback events and `/api/autofill/feedback`.
6. Validate on target forms (school, healthcare, tax, contact).

## TDD status

- Baseline unit tests are in `tests/unit/`:
  - `field_normalization.test.js`
  - `confidence.test.js`
  - `feedback_queue.test.js`
- Mock fixtures are in `tests/fixtures/`:
  - `forms/` (12 HTML fixtures)
  - `profiles/` (canonical profile variants)
  - `autofill/` (mocked backend responses)
  - `feedback/` (mocked outcome payloads)
- Run tests:
  - `npm test`

## Team alignment notes

- Keep field taxonomy consistent with backend and frontend.
- Version schema changes (no silent breaking changes).
- Use weekly sync to align on confidence, naming, and feedback signals.


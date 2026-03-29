# FamilyOS Chrome Extension

This folder contains the FamilyOS Chrome extension for precision-first autofill.

## MVP goal

Help users fill repetitive form fields using FamilyOS data while avoiding incorrect autofill.

## Team install

For teammates pulling this branch for the demo:

1. Pull the branch and open the repo locally.
2. In Chrome, open `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the repo's `extension/` folder.
6. Pin the `FamilyOS Autofill` extension in the Chrome toolbar.
7. Reload the extension after pulling new changes.

Recommended for local fixture testing:

1. On the extension card in `chrome://extensions`, enable `Allow access to file URLs` if you plan to open `file://` fixtures directly.
2. Refresh the form page after every extension reload so the latest content script is attached.

## Product behavior (MVP)

1. Detect fillable fields on the active page.
2. Open the popup from the Chrome toolbar to scan the current page.
3. Request suggestions for detected fields.
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

## Demo mode

- The current demo build uses bundled mock suggestion data by default.
- The bundled demo profile is in `shared/mock_profiles/housing_application_profile.js`.
- The popup does not expose a mock-mode toggle in this branch.
- Live backend auth is still available from the popup if needed for later testing.

## Manual fixture testing

For browser testing without a live backend:

1. Load `extension/` as an unpacked Chrome extension.
2. Serve `tests/fixtures/forms/`, for example:
   - `cd extension/tests/fixtures/forms`
   - `python -m http.server 5501`
3. Open one of the fixture pages in Chrome.
4. Open the extension popup.
5. Click `Scan this form`.

Fixture response data for this flow lives in:
- `tests/fixtures/autofill/manual_fixture_responses.json`

## Team alignment notes

- Keep field taxonomy consistent with backend and frontend.
- Version schema changes (no silent breaking changes).
- Use weekly sync to align on confidence, naming, and feedback signals.


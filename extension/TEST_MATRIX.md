# FamilyOS Extension Test Matrix (v1)

This matrix defines the first 12 precision-first fixtures for extension TDD.

## Fixture Groups

- Forms: HTML pages used to test extraction and fill behavior.
- Profiles: canonical family profile test data.
- Autofill: mocked backend suggestion payloads.
- Feedback: mocked user outcome payloads.

## Cases

1. `school_enrollment_basic.html`
   - Expect high-confidence guardian/student fields to be preselected.
2. `school_enrollment_split_name.html`
   - Expect name decomposition support with no incorrect concatenation.
3. `healthcare_intake_basic.html`
   - Expect patient/emergency fields not to cross-map.
4. `healthcare_insurance_member_fields.html`
   - Expect strict validation for member/group id style fields.
5. `tax_w4_like.html`
   - Expect conservative suggestions for legal identity fields.
6. `contact_form_basic.html`
   - Expect strong precision for name/email/phone.
7. `react_controlled_inputs.html`
   - Expect input/change events during fill flow.
8. `ambiguous_labels_only.html`
   - Expect low confidence and limited preselection.
9. `weird_field_names_legacy.html`
   - Expect label/context to dominate over raw field key.
10. `required_dropdown_radio_checkbox.html`
    - Expect select/radio/checkbox compatibility checks.
11. `missing_labels_placeholder_only.html`
    - Expect placeholder and aria fallback behavior.
12. `iframe_or_unsupported_context.html`
    - Expect safe skip and non-crashing status messaging.

## Assertions (Cross-Cutting)

- Extraction:
  - Captures `field_name`, `label`, `type`, `placeholder`, `section`.
- Scoring:
  - Buckets suggestions into high/medium/low confidence correctly.
- Filling:
  - Fills only selected and validated fields.
- Feedback:
  - Emits accepted/rejected/manual payloads for backend learning queue.

## Confidence Buckets (Initial)

- `>= 0.85`: preselected.
- `0.65 - 0.84`: suggestion only.
- `< 0.65`: ignored.


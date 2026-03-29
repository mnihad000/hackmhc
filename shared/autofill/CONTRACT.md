# FamilyOS Autofill Contract

Contract version: `familyos.autofill.v1`

This contract defines the boundary between:
- the Chrome extension
- the FastAPI backend
- the FamilyOS frontend

The goal is to keep autofill behavior stable even if backend implementation details change.

## Core rule

The vector database is a backend implementation detail.

The extension must not care whether a suggestion came from:
- canonical profile data
- vector search / RAG
- deterministic rules
- learned mappings

All of those paths must resolve to the same response shape.

## Ownership

### Extension owns

- extracting page field descriptors
- generating stable `field_id` values per page scan
- sending `familyos.autofill.v1` requests
- enforcing UI approval before fill
- refusing low-confidence or invalid suggestions
- applying fills safely in the page
- emitting feedback events after user action

### Backend owns

- mapping descriptors to profile-backed suggestions
- deciding whether canonical data, vector retrieval, or rules are used
- computing final confidence
- returning provenance fields (`source_type`, `source_ref`, `profile_key`, `reason`)
- ingesting feedback safely
- deciding if learned mappings can be promoted

### Frontend owns

- showing profile/source provenance using the same response fields
- exposing profile correction tools for bad or stale values
- staying aligned on `profile_key`, `source_type`, and confidence labels

## Non-negotiable guarantees

1. Breaking contract changes require a version bump.
2. Every response includes `contract_version`.
3. Every suggestion is tied to a specific `field_id`.
4. Low-confidence or unsupported fields are omitted, not hallucinated.
5. Sensitive/high-risk fields may be returned with `requires_review=true`.
6. Backend internals can change without changing this contract.

## Request shape

The extension sends one request per page scan.

Top-level fields:
- `contract_version`
- `request_id`
- `page_url`
- `page_title`
- `fields`

Each field descriptor includes:
- `field_id`: extension-generated stable identifier for the current scan
- `field_name`: raw DOM `name` or `id`
- `label`
- `type`
- `placeholder`
- `section`
- `normalized_key`
- `context`
- `required`
- `autocomplete`
- `options`: only for `select`, `radio`, `checkbox` groups when relevant

## Response shape

The backend returns suggestions only for fields it is willing to support.

Top-level fields:
- `contract_version`
- `request_id`
- `suggestions`

Each suggestion includes:
- `suggestion_id`: backend-generated stable identifier for feedback
- `field_id`
- `field_name`
- `value`
- `confidence`
- `confidence_bucket`: `high` | `medium` | `low`
- `source_type`: `canonical` | `rag` | `inferred` | `learned`
- `source_ref`
- `profile_key`
- `reason`
- `fill_strategy`
- `requires_review`

## Feedback shape

The extension sends feedback after user action, not during retrieval.

Each event includes:
- `event_id`
- `timestamp`
- `field_id`
- `field_name`
- `action`: `accepted` | `rejected` | `edited` | `manual`
- `suggestion_id` when feedback refers to a backend suggestion
- `original_value` when a suggestion was shown
- `final_value` when the user changed or entered a value

## Confidence ownership

The backend is the source of truth for `confidence` and `confidence_bucket`.

The extension may add local safety checks before applying values, but it must not silently reinterpret the backend score into a different schema.

Initial UX policy:
- `high`: preselected in preview
- `medium`: shown unchecked
- `low`: not shown or not fillable

## Fill strategy rules

Allowed `fill_strategy` values:
- `text`
- `select_by_value`
- `select_by_label`
- `check`
- `uncheck`
- `skip`

The extension may ignore a suggestion if:
- the target field no longer exists
- the field type is incompatible with `fill_strategy`
- the option set no longer matches
- `requires_review=true` and the user did not explicitly approve it

## Team workflow

When someone changes autofill behavior:
1. update the JSON schema in `schemas/`
2. update or add an example in `examples/`
3. bump the contract version if the change is breaking
4. tell the extension owner before merging

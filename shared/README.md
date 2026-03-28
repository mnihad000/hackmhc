# Shared Contracts

This folder is the cross-team contract surface for FamilyOS.

Use it for:
- versioned request/response schemas
- enum ownership
- example payloads
- rules about which team owns which behavior

Do not use this folder for app-specific runtime helpers. Those stay inside each app, for example `extension/shared/`.

Current contracts:
- `shared/autofill/`: extension <-> backend <-> frontend autofill contract

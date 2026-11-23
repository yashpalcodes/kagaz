# Data packs

All scheme and document data is plain YAML under `data/`. No code change is needed to add or
edit data. `npm run data:validate` checks every file, and CI runs it on every push.

## Layout

```text
data/
├── profile_fields.json
├── document_types.yaml
├── central/
│   ├── document_variants/
│   └── schemes/
└── states/
    └── <CODE>/
        ├── state.yaml
        ├── document_variants/
        └── schemes/
```

## Document variants

```yaml
variants:
  - type: income_certificate
    issuer: Revenue Department (Tahsildar), Karnataka
    portal_url: https://nadakacheri.karnataka.gov.in
    validity_months: 36 # optional
    source_url: https://... # official page that confirms the details
    last_verified: 2026-11-23 # needs source_url
    prerequisites:
      - [aadhaar] # must have
      - [ration_card, residence_certificate] # must have any one of these
```

- Outer list is AND, inner list is OR.
- A state variant replaces the central variant of the same type for that state.
- Every prerequisite must resolve to a variant in the same scope (state or central).
- Circular prerequisites are rejected.

## Verification

A variant without `source_url` and `last_verified` is treated as **not yet verified**. It still
works in plans, and the UI will show it as unverified. Add both fields only after checking the
details against the issuing office or its official portal.

## Adding a state

1. Create `data/states/<CODE>/state.yaml`.
2. Add variants only for documents that differ from the central default.
3. Run `npm run data:validate`.

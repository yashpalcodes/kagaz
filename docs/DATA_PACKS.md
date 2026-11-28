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

## Schemes

Scheme files live in `data/central/schemes/*.yaml` and `data/states/<CODE>/schemes/*.yaml`.

```yaml
schemes:
  - id: central.pm_kisan # central.<name> or <STATE>.<name>
    name: PM-KISAN Samman Nidhi
    level: central # central | state
    category: agriculture
    description: Plain-language summary, including what the rule does not cover.
    benefit_summary: ₹6,000 per year
    nodal_agency: Ministry of Agriculture and Farmers Welfare
    apply_portal: https://pmkisan.gov.in
    source_url: https://... # official page the rule was checked against
    last_verified: "2026-11-28" # required
    rule: # see docs/RULE_DSL.md
      all:
        - { field: owns_agricultural_land, op: eq, value: true }
    documents: # outer = AND, inner = OR
      - [aadhaar]
      - [bank_account]
```

- `source_url` and `last_verified` are required for every scheme, because eligibility rules are
  the part users act on.
- A state scheme sets `state`, lives in its own state folder, and can use `extends` and
  `overrides` instead of `rule` (see `docs/RULE_DSL.md`).
- Rules may only use fields from `data/profile_fields.json`.
- Exclusions that cannot be expressed with profile fields are described in `description` and
  left out of the rule. The UI treats a match as "likely eligible, verify at the office".

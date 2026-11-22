# Eligibility rule DSL

Rules are JSON. A rule is a condition on one profile field, or a group of rules.
Profile fields are declared in `data/profile_fields.json`, and every rule is checked against it.

## Rule forms

| Form                                           | Meaning                      |
| ---------------------------------------------- | ---------------------------- |
| `{ "field": "age", "op": "gte", "value": 60 }` | One condition                |
| `{ "all": [rule, ...] }`                       | Every rule must hold (AND)   |
| `{ "any": [rule, ...] }`                       | At least one rule holds (OR) |
| `{ "not": rule }`                              | The rule must not hold       |

Groups need at least one entry. Nesting is limited to 6 levels.

## Operators

| Operator                 | Value          | Allowed on            |
| ------------------------ | -------------- | --------------------- |
| `eq`, `neq`              | single value   | number, boolean, enum |
| `lt`, `lte`, `gt`, `gte` | number         | number                |
| `in`, `not_in`           | non-empty list | number, enum          |

## Field types

- `number`: optional `min`, `max`, `unit`
- `boolean`
- `enum`: closed list in `values`; rule values must come from it

## Example

```json
{
  "all": [
    { "field": "age", "op": "gte", "value": 60 },
    { "field": "annual_family_income", "op": "lt", "value": 120000 },
    { "not": { "field": "occupation", "op": "eq", "value": "salaried" } }
  ]
}
```

## Central scheme with state overlay

A state scheme names its central parent in `extends` and describes only the difference
in `overrides`. It never carries its own `rule`.

```json
{
  "id": "KA.example_pension",
  "extends": "central.example_pension",
  "overrides": {
    "rule_mode": "and",
    "rule": { "field": "annual_family_income", "op": "lt", "value": 120000 }
  }
}
```

| `rule_mode`    | Effective rule                                              |
| -------------- | ----------------------------------------------------------- |
| `and`          | Parent rule AND the override rule (flattened when possible) |
| `replace`      | The override rule alone                                     |
| (no overrides) | The parent rule unchanged                                   |

Constraints enforced by the validator:

- A scheme without `extends` must have a `rule` and no `overrides`.
- A scheme with `extends` must not have a `rule`.
- The parent must exist. Chains are at most 3 schemes long and cannot be circular.

## Evaluation (engine, Week 2)

Each condition evaluates to one of three results: `pass`, `fail` or `unknown`. A missing profile
value is `unknown`, so an incomplete profile never produces a false "not eligible".
Group results combine with three-valued logic: `all` fails if any child fails, `any` passes if
any child passes, otherwise unknown propagates.

## Code

- `backend/src/rules/schema.ts`: JSON Schema for rule structure
- `backend/src/rules/validate.ts`: field, operator and value checks
- `backend/src/rules/resolve.ts`: overlay resolution
- `backend/src/rules/validateSchemes.ts`: whole-set validation, used by the seed validator

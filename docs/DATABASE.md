# Database design

PostgreSQL 16, plain SQL migrations in `backend/migrations`, applied by `npm run db:migrate`.

## Key decisions

- **No personal data on the server.** A family's profile lives only in the browser.
- **Central and state schemes share one table.** `level` and `state_code` are enforced by a
  CHECK constraint. A state variant of a central scheme points to it through `parent_scheme_id`.
- **DocumentType vs DocumentVariant.** A type (e.g. `income_certificate`) is abstract. A variant
  holds the state-specific issuer, validity and source. A variant with `state_code` NULL is the
  central default.
- **AND/OR prerequisites.** Rows with the same `group_no` are alternatives (OR). Different
  groups must all be satisfied (AND). This is why the dependency structure is an AND/OR graph
  and not a plain DAG.
- **Every record carries `source_url` and `last_verified`.**

## Local development

```bash
npm run db:up        # start Postgres in Docker on port 5433
npm run db:migrate   # apply pending migrations
npm run db:down      # stop the container (data is kept in a volume)
```

## Seeding

```bash
npm run db:seed      # validates data/, applies migrations, replaces the data tables
```

The YAML and JSON files in `data/` are the source of truth. Seeding clears the data tables and
reloads them in one transaction, so it can be repeated safely. It refuses to run if validation
fails. State schemes without their own `documents` get their parent's document groups copied.

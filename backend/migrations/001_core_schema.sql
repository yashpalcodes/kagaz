-- States that have a data pack. "status" controls whether the UI offers the state.
CREATE TABLE states (
  code      text PRIMARY KEY CHECK (code ~ '^[A-Z]{2}$'),
  name      text NOT NULL,
  status    text NOT NULL DEFAULT 'partial' CHECK (status IN ('verified', 'partial', 'community')),
  languages text[] NOT NULL DEFAULT '{}'
);

-- Abstract document kinds, e.g. income_certificate.
CREATE TABLE document_types (
  id          text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9_]*$'),
  name        text NOT NULL,
  description text
);

-- How a document type is actually obtained. state_code NULL = central/default variant.
CREATE TABLE document_variants (
  id              bigserial PRIMARY KEY,
  document_type_id text NOT NULL REFERENCES document_types (id) ON DELETE CASCADE,
  state_code      text REFERENCES states (code),
  issuer          text NOT NULL,
  portal_url      text,
  validity_months integer CHECK (validity_months > 0),
  source_url      text NOT NULL,
  last_verified   date NOT NULL
);

CREATE UNIQUE INDEX document_variants_type_state_uq
  ON document_variants (document_type_id, COALESCE(state_code, '--'));

-- AND/OR prerequisites: rows sharing a group_no are alternatives (OR);
-- different group_no values must all be satisfied (AND).
CREATE TABLE document_prerequisites (
  variant_id       bigint  NOT NULL REFERENCES document_variants (id) ON DELETE CASCADE,
  group_no         integer NOT NULL CHECK (group_no >= 1),
  required_type_id text    NOT NULL REFERENCES document_types (id),
  PRIMARY KEY (variant_id, group_no, required_type_id)
);

CREATE TABLE schemes (
  id               text PRIMARY KEY CHECK (id ~ '^[A-Za-z][A-Za-z0-9_.]*$'),
  name             text NOT NULL,
  level            text NOT NULL CHECK (level IN ('central', 'state')),
  state_code       text REFERENCES states (code),
  parent_scheme_id text REFERENCES schemes (id),
  category         text NOT NULL,
  description      text NOT NULL,
  benefit_summary  text,
  nodal_agency     text,
  apply_portal     text,
  source_url       text NOT NULL,
  last_verified    date NOT NULL,
  rule             jsonb,
  overrides        jsonb,
  CHECK (
    (level = 'central' AND state_code IS NULL) OR
    (level = 'state' AND state_code IS NOT NULL)
  ),
  CHECK (parent_scheme_id IS NULL OR parent_scheme_id <> id)
);

-- Documents a scheme needs, with the same AND/OR grouping as prerequisites.
CREATE TABLE scheme_documents (
  scheme_id        text    NOT NULL REFERENCES schemes (id) ON DELETE CASCADE,
  group_no         integer NOT NULL CHECK (group_no >= 1),
  document_type_id text    NOT NULL REFERENCES document_types (id),
  PRIMARY KEY (scheme_id, group_no, document_type_id)
);

-- Benefits that cannot be combined.
CREATE TABLE scheme_exclusions (
  scheme_id           text NOT NULL REFERENCES schemes (id) ON DELETE CASCADE,
  excluded_scheme_id  text NOT NULL REFERENCES schemes (id) ON DELETE CASCADE,
  PRIMARY KEY (scheme_id, excluded_scheme_id),
  CHECK (scheme_id <> excluded_scheme_id)
);

CREATE INDEX schemes_state_idx ON schemes (state_code);
CREATE INDEX schemes_parent_idx ON schemes (parent_scheme_id);

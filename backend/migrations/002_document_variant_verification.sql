-- Variants can be seeded before they are checked against an official source.
-- A variant that claims a verification date must name its source.
ALTER TABLE document_variants ALTER COLUMN last_verified DROP NOT NULL;
ALTER TABLE document_variants ALTER COLUMN source_url DROP NOT NULL;
ALTER TABLE document_variants
  ADD CONSTRAINT document_variants_verified_has_source
  CHECK (last_verified IS NULL OR source_url IS NOT NULL);

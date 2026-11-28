import type { Pool } from "pg";
import type { ScopedScheme } from "../data/schemeTypes";
import type { DataPack, DocumentVariantDef } from "../data/types";

export interface SeedCounts {
  states: number;
  documentTypes: number;
  variants: number;
  schemes: number;
}

// Children before parents, so foreign keys never block a delete.
const CLEAR_ORDER = [
  "scheme_exclusions",
  "scheme_documents",
  "schemes",
  "document_prerequisites",
  "document_variants",
  "document_types",
  "states",
];

/** Replaces the contents of the data tables with the given data pack and schemes. */
export async function seedDatabase(
  pool: Pool,
  pack: DataPack,
  schemes: readonly ScopedScheme[],
): Promise<SeedCounts> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const table of CLEAR_ORDER) await client.query(`DELETE FROM ${table}`);

    for (const { meta } of pack.states) {
      await client.query(
        "INSERT INTO states (code, name, status, languages) VALUES ($1, $2, $3, $4)",
        [meta.code, meta.name, meta.status, meta.languages],
      );
    }

    for (const t of pack.types) {
      await client.query("INSERT INTO document_types (id, name, description) VALUES ($1, $2, $3)", [
        t.id,
        t.name,
        t.description ?? null,
      ]);
    }

    const insertVariant = async (v: DocumentVariantDef, stateCode: string | null) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO document_variants
           (document_type_id, state_code, issuer, portal_url, validity_months, source_url, last_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          v.type,
          stateCode,
          v.issuer,
          v.portal_url ?? null,
          v.validity_months ?? null,
          v.source_url ?? null,
          v.last_verified ?? null,
        ],
      );
      const variantId = rows[0].id;
      for (const [i, group] of (v.prerequisites ?? []).entries()) {
        for (const required of group) {
          await client.query(
            "INSERT INTO document_prerequisites (variant_id, group_no, required_type_id) VALUES ($1, $2, $3)",
            [variantId, i + 1, required],
          );
        }
      }
    };

    let variantCount = 0;
    for (const v of pack.central) {
      await insertVariant(v, null);
      variantCount++;
    }
    for (const state of pack.states) {
      for (const v of state.variants) {
        await insertVariant(v, state.meta.code);
        variantCount++;
      }
    }

    // Schemes that do not extend another scheme go first, so parents always exist.
    const ordered = [...schemes].sort(
      (a, b) => Number(Boolean(a.scheme.extends)) - Number(Boolean(b.scheme.extends)),
    );
    const byId = new Map(schemes.map(({ scheme }) => [scheme.id, scheme] as const));

    for (const { scheme: s } of ordered) {
      await client.query(
        `INSERT INTO schemes
           (id, name, level, state_code, parent_scheme_id, category, description, benefit_summary,
            nodal_agency, apply_portal, source_url, last_verified, rule, overrides)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb)`,
        [
          s.id,
          s.name,
          s.level,
          s.state ?? null,
          s.extends ?? null,
          s.category,
          s.description,
          s.benefit_summary ?? null,
          s.nodal_agency ?? null,
          s.apply_portal ?? null,
          s.source_url,
          s.last_verified,
          s.rule ? JSON.stringify(s.rule) : null,
          s.overrides ? JSON.stringify(s.overrides) : null,
        ],
      );

      // A state scheme without its own document list inherits its parent's.
      const groups = s.documents ?? (s.extends ? byId.get(s.extends)?.documents : undefined) ?? [];
      for (const [i, group] of groups.entries()) {
        for (const type of group) {
          await client.query(
            "INSERT INTO scheme_documents (scheme_id, group_no, document_type_id) VALUES ($1, $2, $3)",
            [s.id, i + 1, type],
          );
        }
      }
    }

    await client.query("COMMIT");
    return {
      states: pack.states.length,
      documentTypes: pack.types.length,
      variants: variantCount,
      schemes: schemes.length,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

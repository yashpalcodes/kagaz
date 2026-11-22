import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "./migrate";
import { createPool } from "./pool";

const pool = createPool();

beforeAll(async () => {
  await migrate(pool);
});

afterAll(async () => {
  await pool.end();
});

/** Runs setup statements, then expects the final statement to fail. Always rolls back. */
async function expectRejected(setup: string[], failing: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const sql of setup) await client.query(sql);
    await expect(client.query(failing)).rejects.toThrow();
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
}

const insertScheme = (id: string, level: string, stateCode: string | null) =>
  `INSERT INTO schemes (id, name, level, state_code, category, description, source_url, last_verified)
   VALUES ('${id}', 'Test', '${level}', ${stateCode ? `'${stateCode}'` : "NULL"}, 'test', 'd',
           'https://example.org', '2026-01-01')`;

const insertState = "INSERT INTO states (code, name) VALUES ('ZZ', 'Test State')";

describe("core schema", () => {
  it("creates all expected tables", async () => {
    const { rows } = await pool.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    const names = rows.map((r) => r.table_name);
    for (const t of [
      "states",
      "document_types",
      "document_variants",
      "document_prerequisites",
      "schemes",
      "scheme_documents",
      "scheme_exclusions",
    ]) {
      expect(names).toContain(t);
    }
  });

  it("rejects a state-level scheme without a state", async () => {
    await expectRejected([], insertScheme("t.bad1", "state", null));
  });

  it("rejects a central scheme that carries a state", async () => {
    await expectRejected([insertState], insertScheme("t.bad2", "central", "ZZ"));
  });

  it("rejects two central variants of the same document type", async () => {
    const variant = `INSERT INTO document_variants (document_type_id, issuer, source_url, last_verified)
      VALUES ('t_doc', 'Office', 'https://example.org', '2026-01-01')`;
    await expectRejected(
      ["INSERT INTO document_types (id, name) VALUES ('t_doc', 'T')", variant],
      variant,
    );
  });

  it("rejects a scheme that excludes itself", async () => {
    await expectRejected(
      [insertScheme("t.self", "central", null)],
      "INSERT INTO scheme_exclusions VALUES ('t.self', 't.self')",
    );
  });
});

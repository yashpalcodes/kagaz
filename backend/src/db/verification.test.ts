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

const addType = "INSERT INTO document_types (id, name) VALUES ('t_doc', 'T')";

describe("document_variants verification columns", () => {
  it("allows a variant that has not been verified yet", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(addType);
      await client.query(
        "INSERT INTO document_variants (document_type_id, issuer) VALUES ('t_doc', 'Office')",
      );
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("rejects a verification date without a source", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(addType);
      await expect(
        client.query(
          `INSERT INTO document_variants (document_type_id, issuer, last_verified)
           VALUES ('t_doc', 'Office', '2026-01-01')`,
        ),
      ).rejects.toThrow();
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});

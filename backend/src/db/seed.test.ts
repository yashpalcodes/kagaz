import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAndValidate } from "../data/loadAll";
import { migrate } from "./migrate";
import { createPool } from "./pool";
import { seedDatabase } from "./seed";

const pool = createPool();

beforeAll(async () => {
  await migrate(pool);
});

afterAll(async () => {
  await pool.end();
});

const count = async (table: string) =>
  Number((await pool.query<{ n: string }>(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);

describe("seedDatabase", () => {
  it("loads every data file into the tables", async () => {
    const { pack, schemes, errors } = await loadAndValidate();
    expect(errors).toEqual([]);
    const counts = await seedDatabase(pool, pack, schemes);

    expect(counts.schemes).toBe(schemes.length);
    expect(await count("schemes")).toBe(schemes.length);
    expect(await count("document_types")).toBe(pack.types.length);
    expect(await count("states")).toBe(pack.states.length);
    expect(await count("document_variants")).toBe(
      pack.central.length + pack.states.reduce((n, s) => n + s.variants.length, 0),
    );
  });

  it("stores scheme document groups in order", async () => {
    const { rows } = await pool.query(
      `SELECT group_no, document_type_id FROM scheme_documents
       WHERE scheme_id = 'central.pm_kisan' ORDER BY group_no`,
    );
    expect(rows).toEqual([
      { group_no: 1, document_type_id: "aadhaar" },
      { group_no: 2, document_type_id: "bank_account" },
      { group_no: 3, document_type_id: "land_record" },
    ]);
  });

  it("stores AND/OR prerequisites of a state variant", async () => {
    const { rows } = await pool.query(
      `SELECT p.group_no, p.required_type_id
       FROM document_prerequisites p JOIN document_variants v ON v.id = p.variant_id
       WHERE v.document_type_id = 'income_certificate' AND v.state_code = 'KA'
       ORDER BY p.group_no, p.required_type_id`,
    );
    expect(rows).toEqual([
      { group_no: 1, required_type_id: "aadhaar" },
      { group_no: 2, required_type_id: "ration_card" },
      { group_no: 2, required_type_id: "residence_certificate" },
    ]);
  });

  it("can be run again without changing the result", async () => {
    const { pack, schemes } = await loadAndValidate();
    const first = await seedDatabase(pool, pack, schemes);
    const second = await seedDatabase(pool, pack, schemes);
    expect(second).toEqual(first);
    expect(await count("schemes")).toBe(schemes.length);
  });
});

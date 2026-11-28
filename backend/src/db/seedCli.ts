import { loadAndValidate } from "../data/loadAll";
import { migrate } from "./migrate";
import { createPool } from "./pool";
import { seedDatabase } from "./seed";

const { pack, schemes, errors } = await loadAndValidate();

if (errors.length > 0) {
  console.error("Refusing to seed: the data files have problems.");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const pool = createPool();
try {
  await migrate(pool);
  const c = await seedDatabase(pool, pack, schemes);
  console.log(
    `Seeded database: ${c.states} states, ${c.documentTypes} document types, ` +
      `${c.variants} variants, ${c.schemes} schemes.`,
  );
} finally {
  await pool.end();
}

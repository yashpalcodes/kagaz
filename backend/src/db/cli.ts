import { migrate } from "./migrate";
import { createPool } from "./pool";

const pool = createPool();
try {
  const applied = await migrate(pool);
  console.log(
    applied.length ? `Applied migrations: ${applied.join(", ")}` : "Database is up to date.",
  );
} finally {
  await pool.end();
}

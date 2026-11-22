import pg from "pg";

export const DEFAULT_DATABASE_URL = "postgres://kagaz:kagaz@localhost:5433/kagaz";

export function createPool(): pg.Pool {
  return new pg.Pool({ connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL });
}

import { readdir } from "node:fs/promises";
import path from "node:path";
import { DATA_DIR, listYaml, readYaml } from "./load";
import type { SchemeDef, ScopedScheme } from "./schemeTypes";

async function readScope(scope: string, dir: string): Promise<ScopedScheme[]> {
  const out: ScopedScheme[] = [];
  for (const file of await listYaml(dir)) {
    const doc = await readYaml<{ schemes?: SchemeDef[] }>(file);
    for (const scheme of doc?.schemes ?? []) out.push({ scope, scheme });
  }
  return out;
}

/** Reads data/central/schemes and data/states/<CODE>/schemes. */
export async function loadSchemes(dataDir = DATA_DIR): Promise<ScopedScheme[]> {
  const stateRoot = path.join(dataDir, "states");
  const codes = (await readdir(stateRoot, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const result = await readScope("central", path.join(dataDir, "central", "schemes"));
  for (const code of codes) {
    result.push(...(await readScope(code, path.join(stateRoot, code, "schemes"))));
  }
  return result;
}

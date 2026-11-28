import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { DataPack, DocumentTypeDef, DocumentVariantDef, StateEntry, StateMeta } from "./types";

export const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../data");

export async function readYaml<T>(file: string): Promise<T | null> {
  return (parse(await readFile(file, "utf8")) as T | null) ?? null;
}

export async function listYaml(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir))
      .filter((f) => f.endsWith(".yaml"))
      .sort()
      .map((f) => path.join(dir, f));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function loadVariants(dir: string): Promise<DocumentVariantDef[]> {
  const variants: DocumentVariantDef[] = [];
  for (const file of await listYaml(dir)) {
    const doc = await readYaml<{ variants?: DocumentVariantDef[] }>(file);
    variants.push(...(doc?.variants ?? []));
  }
  return variants;
}

export async function loadDataPack(dataDir = DATA_DIR): Promise<DataPack> {
  const typesDoc = await readYaml<{ document_types?: DocumentTypeDef[] }>(
    path.join(dataDir, "document_types.yaml"),
  );
  const central = await loadVariants(path.join(dataDir, "central", "document_variants"));

  const stateRoot = path.join(dataDir, "states");
  const dirs = (await readdir(stateRoot, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const states: StateEntry[] = [];
  for (const dir of dirs) {
    const meta = await readYaml<StateMeta>(path.join(stateRoot, dir, "state.yaml"));
    if (!meta) throw new Error(`data/states/${dir}/state.yaml is missing or empty`);
    const variants = await loadVariants(path.join(stateRoot, dir, "document_variants"));
    states.push({ dir, meta, variants });
  }

  return { types: typesDoc?.document_types ?? [], central, states };
}

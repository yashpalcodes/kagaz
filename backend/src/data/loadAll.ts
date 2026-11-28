import path from "node:path";
import { loadProfileFields } from "../rules/fields";
import { DATA_DIR, loadDataPack } from "./load";
import { loadSchemes } from "./loadSchemes";
import type { ScopedScheme } from "./schemeTypes";
import type { DataPack } from "./types";
import { validateDataPack } from "./validate";
import { validateDocumentCoverage } from "./validateCoverage";
import { validateSchemeData } from "./validateSchemeData";

export interface LoadedData {
  pack: DataPack;
  schemes: ScopedScheme[];
  errors: string[];
}

/** Loads every data file and runs all validators. Nothing is written anywhere. */
export async function loadAndValidate(dataDir = DATA_DIR): Promise<LoadedData> {
  const [pack, schemes, fields] = await Promise.all([
    loadDataPack(dataDir),
    loadSchemes(dataDir),
    loadProfileFields(path.join(dataDir, "profile_fields.json")),
  ]);
  const typeIds = new Set(pack.types.map((t) => t.id));
  const errors = [
    ...validateDataPack(pack),
    ...validateSchemeData(schemes, typeIds, fields),
    ...validateDocumentCoverage(pack, schemes),
  ];
  return { pack, schemes, errors };
}

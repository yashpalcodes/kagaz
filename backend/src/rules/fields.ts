import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldDef } from "./types";

export const DEFAULT_FIELDS_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../data/profile_fields.json",
);

/** Loads the profile field registry that every rule is validated against. */
export async function loadProfileFields(
  file = DEFAULT_FIELDS_FILE,
): Promise<Map<string, FieldDef>> {
  const raw = JSON.parse(await readFile(file, "utf8")) as { fields: FieldDef[] };
  const fields = new Map<string, FieldDef>();
  for (const field of raw.fields) {
    if (fields.has(field.id)) throw new Error(`Duplicate profile field: ${field.id}`);
    if (field.type === "enum" && !field.values?.length) {
      throw new Error(`Enum field ${field.id} needs a non-empty values list`);
    }
    fields.set(field.id, field);
  }
  return fields;
}

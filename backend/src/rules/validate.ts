import { structuralErrors } from "./schema";
import type { Condition, FieldDef, Rule } from "./types";

export const MAX_RULE_DEPTH = 6;

const LIST_OPS = new Set(["in", "not_in"]);
const ORDER_OPS = new Set(["lt", "lte", "gt", "gte"]);

/** Validates a rule's shape and then its meaning against the profile field registry. */
export function validateRule(rule: unknown, fields: ReadonlyMap<string, FieldDef>): string[] {
  const shape = structuralErrors(rule);
  if (shape.length > 0) return shape;
  const errors: string[] = [];
  walk(rule as Rule, "rule", 1, fields, errors);
  return errors;
}

function walk(
  node: Rule,
  path: string,
  depth: number,
  fields: ReadonlyMap<string, FieldDef>,
  errors: string[],
): void {
  if (depth > MAX_RULE_DEPTH) {
    errors.push(`${path}: nested deeper than ${MAX_RULE_DEPTH} levels`);
    return;
  }
  if ("all" in node) {
    node.all.forEach((child, i) => walk(child, `${path}.all[${i}]`, depth + 1, fields, errors));
  } else if ("any" in node) {
    node.any.forEach((child, i) => walk(child, `${path}.any[${i}]`, depth + 1, fields, errors));
  } else if ("not" in node) {
    walk(node.not, `${path}.not`, depth + 1, fields, errors);
  } else {
    checkCondition(node, path, fields, errors);
  }
}

function checkCondition(
  c: Condition,
  path: string,
  fields: ReadonlyMap<string, FieldDef>,
  errors: string[],
): void {
  const def = fields.get(c.field);
  if (!def) {
    errors.push(`${path}: unknown field "${c.field}"`);
    return;
  }
  const where = `${path} (${c.field})`;
  const isList = LIST_OPS.has(c.op);

  if (isList !== Array.isArray(c.value)) {
    errors.push(`${where}: operator "${c.op}" needs ${isList ? "a list" : "a single value"}`);
    return;
  }
  if (def.type !== "number" && ORDER_OPS.has(c.op)) {
    errors.push(`${where}: operator "${c.op}" only works on number fields`);
    return;
  }
  if (def.type === "boolean" && isList) {
    errors.push(`${where}: lists are not allowed for boolean fields`);
    return;
  }

  const values = Array.isArray(c.value) ? c.value : [c.value];
  for (const v of values) {
    if (def.type === "number" && typeof v !== "number") {
      errors.push(`${where}: expected a number, got ${JSON.stringify(v)}`);
    } else if (def.type === "boolean" && typeof v !== "boolean") {
      errors.push(`${where}: expected true or false, got ${JSON.stringify(v)}`);
    } else if (def.type === "enum" && (typeof v !== "string" || !def.values?.includes(v))) {
      errors.push(`${where}: ${JSON.stringify(v)} is not one of: ${def.values?.join(", ")}`);
    }
  }
}

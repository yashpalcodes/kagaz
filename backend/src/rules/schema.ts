import Ajv from "ajv";

/** JSON Schema for the structure of a rule expression. Semantics are checked in validate.ts. */
export const ruleSchema = {
  oneOf: [
    {
      type: "object",
      required: ["all"],
      additionalProperties: false,
      properties: { all: { type: "array", minItems: 1, items: { $ref: "#" } } },
    },
    {
      type: "object",
      required: ["any"],
      additionalProperties: false,
      properties: { any: { type: "array", minItems: 1, items: { $ref: "#" } } },
    },
    {
      type: "object",
      required: ["not"],
      additionalProperties: false,
      properties: { not: { $ref: "#" } },
    },
    {
      type: "object",
      required: ["field", "op", "value"],
      additionalProperties: false,
      properties: {
        field: { type: "string", pattern: "^[a-z][a-z0-9_]*$" },
        op: { enum: ["eq", "neq", "lt", "lte", "gt", "gte", "in", "not_in"] },
        value: {
          oneOf: [
            { type: "string" },
            { type: "number" },
            { type: "boolean" },
            { type: "array", minItems: 1, items: { type: ["string", "number"] } },
          ],
        },
      },
    },
  ],
};

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const check = ajv.compile(ruleSchema);

/** Returns human-readable structural errors, or an empty list when the shape is valid. */
export function structuralErrors(rule: unknown): string[] {
  if (check(rule)) return [];
  const messages = (check.errors ?? []).map((e) => {
    const extra =
      e.keyword === "additionalProperties"
        ? ` "${String((e.params as { additionalProperty: string }).additionalProperty)}"`
        : "";
    return `${e.instancePath || "(root)"} ${e.message ?? "is invalid"}${extra}`;
  });
  return [...new Set(messages)].slice(0, 5);
}

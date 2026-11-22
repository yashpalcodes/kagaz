import { describe, expect, it } from "vitest";
import { loadProfileFields } from "./fields";
import { validateRule } from "./validate";
import type { FieldDef } from "./types";

const defs: FieldDef[] = [
  { id: "age", type: "number", label: "Age" },
  { id: "area_type", type: "enum", label: "Area", values: ["rural", "urban"] },
  { id: "has_bank_account", type: "boolean", label: "Bank account" },
];
const fields = new Map(defs.map((d) => [d.id, d]));

describe("validateRule", () => {
  it("accepts a valid compound rule", () => {
    const rule = {
      all: [
        { field: "age", op: "gte", value: 60 },
        { any: [{ field: "area_type", op: "in", value: ["rural", "urban"] }] },
        { not: { field: "has_bank_account", op: "eq", value: false } },
      ],
    };
    expect(validateRule(rule, fields)).toEqual([]);
  });

  it("rejects unknown fields", () => {
    const errors = validateRule({ field: "height", op: "gt", value: 150 }, fields);
    expect(errors[0]).toContain('unknown field "height"');
  });

  it("rejects a value of the wrong type", () => {
    const errors = validateRule({ field: "age", op: "gte", value: "sixty" }, fields);
    expect(errors[0]).toContain("expected a number");
  });

  it("rejects enum values that are not allowed", () => {
    const errors = validateRule({ field: "area_type", op: "eq", value: "suburb" }, fields);
    expect(errors[0]).toContain("is not one of: rural, urban");
  });

  it("rejects ordering operators on non-number fields", () => {
    const errors = validateRule({ field: "area_type", op: "gt", value: "rural" }, fields);
    expect(errors[0]).toContain("only works on number fields");
  });

  it("rejects lists on boolean fields", () => {
    const errors = validateRule({ field: "has_bank_account", op: "in", value: [1, 2] }, fields);
    expect(errors[0]).toContain("lists are not allowed for boolean fields");
  });

  it("requires a list for in and a single value for eq", () => {
    expect(validateRule({ field: "age", op: "in", value: 5 }, fields)[0]).toContain("needs a list");
    expect(validateRule({ field: "age", op: "eq", value: [5] }, fields)[0]).toContain(
      "needs a single value",
    );
  });

  it("rejects malformed structure", () => {
    expect(validateRule({ all: [] }, fields).length).toBeGreaterThan(0);
    expect(
      validateRule({ field: "age", op: "gte", value: 1, extra: true }, fields).join(),
    ).toContain("extra");
    expect(validateRule("age >= 60", fields).length).toBeGreaterThan(0);
  });

  it("rejects rules nested too deeply", () => {
    let rule: object = { field: "age", op: "gte", value: 1 };
    for (let i = 0; i < 7; i++) rule = { not: rule };
    expect(validateRule(rule, fields)[0]).toContain("nested deeper than");
  });
});

describe("profile_fields.json", () => {
  it("loads and has unique, well-formed fields", async () => {
    const loaded = await loadProfileFields();
    expect(loaded.size).toBeGreaterThan(10);
    expect(loaded.get("age")?.type).toBe("number");
    expect(loaded.get("social_category")?.values).toContain("sc");
  });
});

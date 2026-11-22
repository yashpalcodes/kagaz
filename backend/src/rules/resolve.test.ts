import { describe, expect, it } from "vitest";
import { resolveRule } from "./resolve";
import { validateSchemeRules } from "./validateSchemes";
import type { FieldDef, SchemeRuleSource } from "./types";

const defs: FieldDef[] = [
  { id: "age", type: "number", label: "Age" },
  { id: "annual_family_income", type: "number", label: "Income" },
  { id: "area_type", type: "enum", label: "Area", values: ["rural", "urban"] },
];
const fields = new Map(defs.map((d) => [d.id, d]));

const ageRule = { field: "age", op: "gte", value: 60 } as const;
const incomeRule = { field: "annual_family_income", op: "lt", value: 120000 } as const;

const toMap = (list: SchemeRuleSource[]) => new Map(list.map((s) => [s.id, s]));

describe("resolveRule", () => {
  it("returns the own rule of a base scheme", () => {
    const m = toMap([{ id: "central.a", rule: ageRule }]);
    expect(resolveRule("central.a", m)).toEqual(ageRule);
  });

  it("inherits the parent rule when there are no overrides", () => {
    const m = toMap([
      { id: "central.a", rule: ageRule },
      { id: "KA.a", extends: "central.a" },
    ]);
    expect(resolveRule("KA.a", m)).toEqual(ageRule);
  });

  it("adds a condition in and mode", () => {
    const m = toMap([
      { id: "central.a", rule: ageRule },
      { id: "KA.a", extends: "central.a", overrides: { rule_mode: "and", rule: incomeRule } },
    ]);
    expect(resolveRule("KA.a", m)).toEqual({ all: [ageRule, incomeRule] });
  });

  it("flattens when the parent rule is already an all-group", () => {
    const m = toMap([
      { id: "central.a", rule: { all: [ageRule, incomeRule] } },
      {
        id: "RJ.a",
        extends: "central.a",
        overrides: { rule_mode: "and", rule: { field: "area_type", op: "eq", value: "rural" } },
      },
    ]);
    expect(resolveRule("RJ.a", m)).toEqual({
      all: [ageRule, incomeRule, { field: "area_type", op: "eq", value: "rural" }],
    });
  });

  it("replaces the rule in replace mode", () => {
    const m = toMap([
      { id: "central.a", rule: ageRule },
      { id: "KA.a", extends: "central.a", overrides: { rule_mode: "replace", rule: incomeRule } },
    ]);
    expect(resolveRule("KA.a", m)).toEqual(incomeRule);
  });

  it("detects circular extends", () => {
    const m = toMap([
      { id: "a", extends: "b" },
      { id: "b", extends: "a" },
    ]);
    expect(() => resolveRule("a", m)).toThrow("Circular extends");
  });

  it("fails on a missing parent or a missing rule", () => {
    expect(() => resolveRule("x", toMap([{ id: "x", extends: "nope" }]))).toThrow("Unknown scheme");
    expect(() => resolveRule("x", toMap([{ id: "x" }]))).toThrow("has no rule");
  });
});

describe("validateSchemeRules", () => {
  it("passes for a consistent central and state pair", () => {
    const list: SchemeRuleSource[] = [
      { id: "central.a", rule: ageRule },
      { id: "KA.a", extends: "central.a", overrides: { rule_mode: "and", rule: incomeRule } },
    ];
    expect(validateSchemeRules(list, fields)).toEqual([]);
  });

  it("reports a state scheme that defines its own rule", () => {
    const list: SchemeRuleSource[] = [
      { id: "central.a", rule: ageRule },
      { id: "KA.a", extends: "central.a", rule: incomeRule },
    ];
    expect(validateSchemeRules(list, fields).join()).toContain("must use overrides");
  });

  it("reports unknown parents, bad modes and invalid override rules", () => {
    const list = [
      { id: "KA.a", extends: "central.missing" },
      { id: "central.b", rule: ageRule },
      {
        id: "KA.b",
        extends: "central.b",
        overrides: { rule_mode: "merge", rule: { field: "height", op: "gt", value: 1 } },
      },
    ] as unknown as SchemeRuleSource[];
    const text = validateSchemeRules(list, fields).join("\n");
    expect(text).toContain('extends unknown scheme "central.missing"');
    expect(text).toContain("rule_mode must be");
    expect(text).toContain('unknown field "height"');
  });

  it("reports duplicate ids and circular chains", () => {
    const list: SchemeRuleSource[] = [
      { id: "a", extends: "b" },
      { id: "b", extends: "a" },
      { id: "a", rule: ageRule },
    ];
    const text = validateSchemeRules(list, fields).join("\n");
    expect(text).toContain("duplicate scheme id");
  });
});

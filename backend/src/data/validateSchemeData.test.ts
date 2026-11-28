import { describe, expect, it } from "vitest";
import type { FieldDef } from "../rules/types";
import type { SchemeDef, ScopedScheme } from "./schemeTypes";
import { validateSchemeData } from "./validateSchemeData";

const defs: FieldDef[] = [
  { id: "age", type: "number", label: "Age" },
  { id: "has_bank_account", type: "boolean", label: "Bank account" },
];
const fields = new Map(defs.map((d) => [d.id, d]));
const typeIds = new Set(["aadhaar", "bank_account"]);

const base: SchemeDef = {
  id: "central.test_scheme",
  name: "Test scheme",
  level: "central",
  category: "test",
  description: "A scheme used in tests",
  source_url: "https://example.org/scheme",
  last_verified: "2026-01-01",
  rule: { field: "age", op: "gte", value: 60 },
  documents: [["aadhaar"], ["bank_account"]],
};

const central = (over: Partial<SchemeDef> = {}): ScopedScheme => ({
  scope: "central",
  scheme: { ...base, ...over },
});

const stateScheme: ScopedScheme = {
  scope: "KA",
  scheme: {
    id: "KA.test_scheme",
    name: "Test scheme (Karnataka)",
    level: "state",
    state: "KA",
    category: "test",
    description: "State variant",
    source_url: "https://example.org/ka",
    last_verified: "2026-01-01",
    extends: "central.test_scheme",
    overrides: { rule_mode: "and", rule: { field: "has_bank_account", op: "eq", value: true } },
  },
};

const run = (items: ScopedScheme[]) => validateSchemeData(items, typeIds, fields).join("\n");

describe("validateSchemeData", () => {
  it("accepts a central scheme and its state variant", () => {
    expect(validateSchemeData([central(), stateScheme], typeIds, fields)).toEqual([]);
  });

  it("checks the id format and its prefix", () => {
    expect(run([central({ id: "pm-kisan" })])).toContain("id must look like");
    expect(run([central({ id: "KA.test_scheme" })])).toContain('id must start with "central."');
  });

  it("checks that level, state and folder agree", () => {
    expect(run([central({ state: "KA" })])).toContain("must not have a state");
    expect(run([{ scope: "KA", scheme: base }])).toContain('stored under "KA"');
    const noState = { ...stateScheme.scheme, state: undefined };
    expect(run([central(), { scope: "KA", scheme: noState }])).toContain("needs a state code");
  });

  it("requires text, an https source and a valid past verification date", () => {
    const out = run([
      central({ name: " ", source_url: "http://example.org", last_verified: "2999-01-01" }),
    ]);
    expect(out).toContain("name is required");
    expect(out).toContain("source_url must be an https URL");
    expect(out).toContain("last_verified must be a valid past date");
    expect(run([central({ apply_portal: "portal.example" })])).toContain("apply_portal");
  });

  it("checks document groups", () => {
    const out = run([central({ documents: [["nope"], [], ["aadhaar", "aadhaar"]] })]);
    expect(out).toContain('"nope" is not a known document type');
    expect(out).toContain("non-empty list");
    expect(out).toContain("same document twice");
  });

  it("reports rule problems through the rule validator", () => {
    const out = run([central({ rule: { field: "height", op: "gt", value: 1 } })]);
    expect(out).toContain('unknown field "height"');
  });

  it("rejects duplicate ids and a state scheme used as a parent", () => {
    expect(run([central(), central()])).toContain("duplicate scheme id");
    const child: ScopedScheme = {
      scope: "KA",
      scheme: { ...stateScheme.scheme, id: "KA.child", extends: "KA.test_scheme" },
    };
    expect(run([central(), stateScheme, child])).toContain("which is not a central scheme");
  });
});

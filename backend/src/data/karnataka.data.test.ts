import { describe, expect, it } from "vitest";
import { resolveRule } from "../rules/resolve";
import { loadSchemes } from "./loadSchemes";

describe("Karnataka scheme pack", () => {
  it("has its schemes in the KA folder", async () => {
    const ids = (await loadSchemes()).filter((s) => s.scope === "KA").map((s) => s.scheme.id);
    expect(ids).toEqual(
      expect.arrayContaining(["KA.gruha_lakshmi", "KA.gruha_jyothi", "KA.shakti", "KA.ignoaps"]),
    );
  });

  it("resolves the pension overlay on top of the central rule", async () => {
    const all = new Map((await loadSchemes()).map(({ scheme }) => [scheme.id, scheme]));
    expect(resolveRule("KA.ignoaps", all)).toEqual({
      all: [
        { field: "age", op: "gte", value: 60 },
        { field: "is_bpl_household", op: "eq", value: true },
        { field: "annual_family_income", op: "lte", value: 120000 },
      ],
    });
  });
});

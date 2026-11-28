import { describe, expect, it } from "vitest";
import { loadProfileFields } from "../rules/fields";
import { loadDataPack } from "./load";
import { loadSchemes } from "./loadSchemes";
import { validateSchemeData } from "./validateSchemeData";

describe("scheme data in data/", () => {
  it("loads and validates without errors", async () => {
    const [pack, fields, schemes] = await Promise.all([
      loadDataPack(),
      loadProfileFields(),
      loadSchemes(),
    ]);
    const typeIds = new Set(pack.types.map((t) => t.id));
    expect(validateSchemeData(schemes, typeIds, fields)).toEqual([]);
  });

  it("includes the seeded central schemes", async () => {
    const ids = (await loadSchemes()).filter((s) => s.scope === "central").map((s) => s.scheme.id);
    expect(ids.length).toBeGreaterThanOrEqual(9);
    expect(ids).toContain("central.pm_kisan");
    expect(ids).toContain("central.pmuy");
  });
});

import { describe, expect, it } from "vitest";
import { loadDataPack } from "./load";
import { validateDataPack } from "./validate";

describe("data packs in data/", () => {
  it("load and validate without errors", async () => {
    const pack = await loadDataPack();
    expect(validateDataPack(pack)).toEqual([]);
  });

  it("include Karnataka with its core documents", async () => {
    const pack = await loadDataPack();
    const ka = pack.states.find((s) => s.meta.code === "KA");
    expect(ka).toBeDefined();
    const kinds = ka?.variants.map((x) => x.type) ?? [];
    expect(kinds).toContain("income_certificate");
    expect(kinds).toContain("caste_certificate");
  });
});

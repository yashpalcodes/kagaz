import { describe, expect, it } from "vitest";
import type { SchemeDef, ScopedScheme } from "./schemeTypes";
import type { DataPack, DocumentVariantDef, StateEntry } from "./types";
import { validateDocumentCoverage } from "./validateCoverage";

const variant = (type: string): DocumentVariantDef => ({ type, issuer: "Office" });

const state = (code: string, types: string[]): StateEntry => ({
  dir: code,
  meta: { code, name: code, status: "partial", languages: ["en"] },
  variants: types.map(variant),
});

const pack = (centralTypes: string[], states: StateEntry[]): DataPack => ({
  types: [],
  central: centralTypes.map(variant),
  states,
});

const scheme = (id: string, over: Partial<SchemeDef> = {}): SchemeDef => ({
  id,
  name: id,
  level: id.startsWith("central.") ? "central" : "state",
  category: "test",
  description: "d",
  source_url: "https://example.org",
  last_verified: "2026-01-01",
  ...over,
});

const central = (documents: string[][]): ScopedScheme => ({
  scope: "central",
  scheme: scheme("central.s", { documents }),
});

describe("validateDocumentCoverage", () => {
  it("passes when the document has a central variant", () => {
    const p = pack(["aadhaar"], [state("KA", [])]);
    expect(validateDocumentCoverage(p, [central([["aadhaar"]])])).toEqual([]);
  });

  it("flags a state that lacks a variant the scheme needs", () => {
    const p = pack(["aadhaar"], [state("KA", ["ration_card"]), state("RJ", [])]);
    const out = validateDocumentCoverage(p, [central([["ration_card"]])]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("RJ:");
    expect(out[0]).toContain('needs "ration_card"');
  });

  it("accepts an alternatives group when one option exists", () => {
    const groups = [["voter_id", "ration_card"]];
    expect(
      validateDocumentCoverage(pack([], [state("RJ", ["ration_card"])]), [central(groups)]),
    ).toEqual([]);
    const out = validateDocumentCoverage(pack([], [state("RJ", [])]), [central(groups)]);
    expect(out[0]).toContain('one of "voter_id", "ration_card"');
  });

  it("checks a state scheme only for its own state", () => {
    const own: ScopedScheme = {
      scope: "KA",
      scheme: scheme("KA.s", { state: "KA", documents: [["income_certificate"]] }),
    };
    const out = validateDocumentCoverage(pack([], [state("KA", []), state("RJ", [])]), [own]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("KA:");
  });

  it("uses the parent documents when a state scheme has none", () => {
    const child: ScopedScheme = {
      scope: "KA",
      scheme: scheme("KA.s", { state: "KA", extends: "central.s" }),
    };
    const out = validateDocumentCoverage(pack([], [state("KA", [])]), [
      central([["land_record"]]),
      child,
    ]);
    expect(out.join()).toContain("KA: KA.s needs");
  });
});

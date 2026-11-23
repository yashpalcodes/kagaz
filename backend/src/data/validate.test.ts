import { describe, expect, it } from "vitest";
import { validateDataPack } from "./validate";
import type { DataPack, DocumentVariantDef, StateEntry } from "./types";

const types = ["a", "b", "c"].map((id) => ({ id, name: id.toUpperCase() }));

const v = (type: string, extra: Partial<DocumentVariantDef> = {}): DocumentVariantDef => ({
  type,
  issuer: "Test Office",
  ...extra,
});

const state = (code: string, variants: DocumentVariantDef[]): StateEntry => ({
  dir: code,
  meta: { code, name: code, status: "partial", languages: ["en"] },
  variants,
});

const pack = (over: Partial<DataPack> = {}): DataPack => ({
  types,
  central: [],
  states: [],
  ...over,
});

const text = (p: DataPack) => validateDataPack(p).join("\n");

describe("validateDataPack", () => {
  it("accepts a consistent pack", () => {
    const p = pack({
      central: [
        v("a", { source_url: "https://example.org/a", last_verified: "2026-01-01" }),
        v("b", { prerequisites: [["a"]], validity_months: 12 }),
      ],
      states: [state("KA", [v("c", { prerequisites: [["b"]] })])],
    });
    expect(validateDataPack(p)).toEqual([]);
  });

  it("lets a state variant override the central one", () => {
    const p = pack({
      central: [v("a")],
      states: [state("KA", [v("a", { prerequisites: [["b"]] }), v("b")])],
    });
    expect(validateDataPack(p)).toEqual([]);
  });

  it("reports duplicate type ids and bad id format", () => {
    const p = pack({ types: [...types, { id: "a", name: "Again" }, { id: "Bad-Id", name: "X" }] });
    const out = text(p);
    expect(out).toContain("duplicate id");
    expect(out).toContain("lower_snake_case");
  });

  it("reports unknown types and duplicate variants", () => {
    const out = text(pack({ central: [v("zzz"), v("a"), v("a")] }));
    expect(out).toContain("unknown document type");
    expect(out).toContain("duplicate variant");
  });

  it("checks validity, urls and verification fields", () => {
    const out = text(
      pack({
        central: [
          v("a", { validity_months: 0 }),
          v("b", { portal_url: "http://insecure.example" }),
          v("c", { last_verified: "2026-01-01" }),
        ],
      }),
    );
    expect(out).toContain("validity_months must be a positive whole number");
    expect(out).toContain("portal_url must be an https URL");
    expect(out).toContain("last_verified requires a source_url");
  });

  it("rejects future and malformed verification dates", () => {
    const base = { source_url: "https://example.org/x" };
    expect(text(pack({ central: [v("a", { ...base, last_verified: "2999-01-01" })] }))).toContain(
      "valid past date",
    );
    expect(text(pack({ central: [v("a", { ...base, last_verified: "01/02/2026" })] }))).toContain(
      "valid past date",
    );
  });

  it("checks prerequisite groups", () => {
    const out = text(
      pack({
        central: [
          v("a", { prerequisites: [["a"]] }),
          v("b", { prerequisites: [[]] }),
          v("c", { prerequisites: [["a", "a"], ["nope"]] }),
        ],
      }),
    );
    expect(out).toContain("cannot require itself");
    expect(out).toContain("non-empty list");
    expect(out).toContain("same document twice");
    expect(out).toContain('"nope" is not a known document type');
  });

  it("reports a prerequisite with no variant in scope", () => {
    const out = text(pack({ central: [v("a", { prerequisites: [["b"]] })] }));
    expect(out).toContain('prerequisite "b" has no variant in this scope');
  });

  it("detects circular prerequisites", () => {
    const out = text(
      pack({ central: [v("a", { prerequisites: [["b"]] }), v("b", { prerequisites: [["a"]] })] }),
    );
    expect(out).toContain("circular prerequisites");
  });

  it("detects a cycle that only exists inside a state", () => {
    const p = pack({
      central: [v("a"), v("b", { prerequisites: [["a"]] })],
      states: [state("KA", [v("a", { prerequisites: [["b"]] })])],
    });
    expect(text(p)).toContain("KA: circular prerequisites");
  });

  it("checks state metadata", () => {
    const bad: StateEntry = {
      dir: "KA",
      meta: { code: "XX", name: "", status: "unknown" as never, languages: [] },
      variants: [],
    };
    const out = text(pack({ states: [bad] }));
    expect(out).toContain("does not match folder name");
    expect(out).toContain("name is required");
    expect(out).toContain("status must be one of");
    expect(out).toContain("languages must be a non-empty list");
  });
});

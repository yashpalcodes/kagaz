import { describe, expect, it } from "vitest";
import { MODULE_NAME } from "./index";

describe("rules module", () => {
  it("exposes its module name", () => {
    expect(MODULE_NAME).toBe("rules");
  });
});

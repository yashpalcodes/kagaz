import type { ScopedScheme } from "./schemeTypes";
import type { DataPack } from "./types";

/**
 * Every document group a scheme needs must be obtainable in each state the scheme applies to.
 * A group (OR list) is satisfied when at least one of its document types has a variant there.
 */
export function validateDocumentCoverage(
  pack: DataPack,
  schemes: readonly ScopedScheme[],
): string[] {
  const errors: string[] = [];
  const centralTypes = pack.central.map((v) => v.type);
  const byId = new Map(schemes.map(({ scheme }) => [scheme.id, scheme] as const));

  for (const state of pack.states) {
    const available = new Set([...centralTypes, ...state.variants.map((v) => v.type)]);
    for (const { scope, scheme } of schemes) {
      if (scope !== "central" && scope !== state.dir) continue;
      const groups =
        scheme.documents ??
        (scheme.extends ? byId.get(scheme.extends)?.documents : undefined) ??
        [];
      if (!Array.isArray(groups)) continue;
      for (const group of groups) {
        if (!Array.isArray(group) || group.some((type) => available.has(type))) continue;
        const need =
          group.length === 1 ? `"${group[0]}"` : `one of ${group.map((t) => `"${t}"`).join(", ")}`;
        errors.push(
          `${state.dir}: ${scheme.id} needs ${need}, which has no variant for this state`,
        );
      }
    }
  }
  return errors;
}

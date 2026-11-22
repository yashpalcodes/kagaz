import { resolveRule, RuleError } from "./resolve";
import type { FieldDef, SchemeRuleSource } from "./types";
import { validateRule } from "./validate";

/** Validates the rules of a whole set of schemes, including extends/overrides integrity. */
export function validateSchemeRules(
  schemes: readonly SchemeRuleSource[],
  fields: ReadonlyMap<string, FieldDef>,
): string[] {
  const errors: string[] = [];
  const byId = new Map<string, SchemeRuleSource>();

  for (const s of schemes) {
    if (byId.has(s.id)) errors.push(`${s.id}: duplicate scheme id`);
    byId.set(s.id, s);
  }

  for (const s of schemes) {
    const report = (list: string[]) => list.forEach((e) => errors.push(`${s.id}: ${e}`));

    if (!s.extends) {
      if (s.overrides) errors.push(`${s.id}: overrides need an "extends" parent`);
      if (s.rule === undefined) errors.push(`${s.id}: a scheme without "extends" needs a rule`);
      else report(validateRule(s.rule, fields));
      continue;
    }

    if (s.rule !== undefined) {
      errors.push(`${s.id}: a scheme with "extends" must use overrides instead of its own rule`);
    }
    if (!byId.has(s.extends)) {
      errors.push(`${s.id}: extends unknown scheme "${s.extends}"`);
      continue;
    }
    if (s.overrides) {
      const mode: unknown = s.overrides.rule_mode;
      if (mode !== "and" && mode !== "replace") {
        errors.push(`${s.id}: overrides.rule_mode must be "and" or "replace"`);
      }
      report(validateRule(s.overrides.rule, fields));
    }
    try {
      resolveRule(s.id, byId);
    } catch (err) {
      if (err instanceof RuleError) errors.push(`${s.id}: ${err.message}`);
      else throw err;
    }
  }
  return errors;
}

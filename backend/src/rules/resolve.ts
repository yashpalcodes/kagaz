import type { Rule, SchemeRuleSource } from "./types";

export const MAX_EXTENDS_DEPTH = 3;

export class RuleError extends Error {}

/**
 * Produces the effective rule of a scheme.
 * - A scheme without `extends` uses its own rule.
 * - A scheme with `extends` inherits the parent's effective rule, then applies `overrides`:
 *   "and" adds a further condition, "replace" swaps the whole rule.
 */
export function resolveRule(id: string, schemes: ReadonlyMap<string, SchemeRuleSource>): Rule {
  return resolve(id, schemes, []);
}

function resolve(
  id: string,
  schemes: ReadonlyMap<string, SchemeRuleSource>,
  trail: string[],
): Rule {
  if (trail.includes(id)) {
    throw new RuleError(`Circular extends: ${[...trail, id].join(" -> ")}`);
  }
  if (trail.length >= MAX_EXTENDS_DEPTH) {
    throw new RuleError(
      `extends chain longer than ${MAX_EXTENDS_DEPTH}: ${[...trail, id].join(" -> ")}`,
    );
  }
  const scheme = schemes.get(id);
  if (!scheme) throw new RuleError(`Unknown scheme: ${id}`);

  if (!scheme.extends) {
    if (!scheme.rule) throw new RuleError(`Scheme ${id} has no rule`);
    return scheme.rule;
  }

  const base = resolve(scheme.extends, schemes, [...trail, id]);
  const override = scheme.overrides;
  if (!override) return base;
  if (override.rule_mode === "replace") return override.rule;
  return "all" in base ? { all: [...base.all, override.rule] } : { all: [base, override.rule] };
}

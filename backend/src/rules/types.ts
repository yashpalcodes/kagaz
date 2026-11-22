export type Op = "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "in" | "not_in";

export type Scalar = string | number | boolean;

export interface Condition {
  field: string;
  op: Op;
  value: Scalar | Array<string | number>;
}

export type Rule = { all: Rule[] } | { any: Rule[] } | { not: Rule } | Condition;

export type FieldType = "number" | "boolean" | "enum";

export interface FieldDef {
  id: string;
  type: FieldType;
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  values?: string[];
}

export type RuleMode = "and" | "replace";

export interface RuleOverride {
  rule_mode: RuleMode;
  rule: Rule;
}

/** The parts of a scheme record that the rule system cares about. */
export interface SchemeRuleSource {
  id: string;
  extends?: string;
  rule?: Rule;
  overrides?: RuleOverride;
}

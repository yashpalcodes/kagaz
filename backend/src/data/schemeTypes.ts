import type { SchemeRuleSource } from "../rules/types";

export interface SchemeDef extends SchemeRuleSource {
  name: string;
  level: "central" | "state";
  /** Two-letter state code. Required for state schemes, absent for central ones. */
  state?: string;
  category: string;
  description: string;
  benefit_summary?: string;
  nodal_agency?: string;
  apply_portal?: string;
  source_url: string;
  last_verified: string;
  /** Outer list = AND (every group is needed). Inner list = OR (any one document works). */
  documents?: string[][];
}

/** A scheme together with the folder it was loaded from ("central" or a state code). */
export interface ScopedScheme {
  scope: string;
  scheme: SchemeDef;
}

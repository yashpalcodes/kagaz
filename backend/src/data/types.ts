export type StateStatus = "verified" | "partial" | "community";

export interface StateMeta {
  code: string;
  name: string;
  status: StateStatus;
  languages: string[];
}

export interface DocumentTypeDef {
  id: string;
  name: string;
  description?: string;
}

export interface DocumentVariantDef {
  type: string;
  issuer: string;
  portal_url?: string;
  validity_months?: number;
  source_url?: string;
  last_verified?: string;
  prerequisites?: string[][];
}

export interface StateEntry {
  dir: string;
  meta: StateMeta;
  variants: DocumentVariantDef[];
}

export interface DataPack {
  types: DocumentTypeDef[];
  central: DocumentVariantDef[];
  states: StateEntry[];
}

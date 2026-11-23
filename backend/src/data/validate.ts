import type { DataPack, DocumentVariantDef } from "./types";

const ID_RE = /^[a-z][a-z0-9_]*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ["verified", "partial", "community"];

export function validateDataPack(pack: DataPack, today = new Date()): string[] {
  const errors: string[] = [];
  const typeIds = new Set<string>();

  for (const t of pack.types) {
    if (!ID_RE.test(t.id)) errors.push(`type "${t.id}": id must be lower_snake_case`);
    if (typeIds.has(t.id)) errors.push(`type "${t.id}": duplicate id`);
    typeIds.add(t.id);
    if (!t.name?.trim()) errors.push(`type "${t.id}": name is required`);
  }

  checkVariants("central", pack.central, typeIds, today, errors);
  checkGraph("central", resolveFor(pack.central, []), errors);

  const codes = new Set<string>();
  for (const s of pack.states) {
    const scope = s.dir;
    if (!/^[A-Z]{2}$/.test(s.meta.code))
      errors.push(`${scope}: state code must be two capital letters`);
    if (s.meta.code !== s.dir)
      errors.push(`${scope}: state.yaml code "${s.meta.code}" does not match folder name`);
    if (codes.has(s.meta.code)) errors.push(`${scope}: duplicate state code "${s.meta.code}"`);
    codes.add(s.meta.code);
    if (!s.meta.name?.trim()) errors.push(`${scope}: state name is required`);
    if (!STATUSES.includes(s.meta.status)) {
      errors.push(`${scope}: status must be one of ${STATUSES.join(", ")}`);
    }
    if (!Array.isArray(s.meta.languages) || s.meta.languages.length === 0) {
      errors.push(`${scope}: languages must be a non-empty list`);
    }
    checkVariants(scope, s.variants, typeIds, today, errors);
    checkGraph(scope, resolveFor(pack.central, s.variants), errors);
  }
  return errors;
}

function checkVariants(
  scope: string,
  variants: readonly DocumentVariantDef[],
  typeIds: ReadonlySet<string>,
  today: Date,
  errors: string[],
): void {
  const seen = new Set<string>();
  for (const v of variants) {
    const label = `${scope}/${v.type}`;
    if (!typeIds.has(v.type)) errors.push(`${label}: unknown document type`);
    if (seen.has(v.type)) errors.push(`${label}: duplicate variant`);
    seen.add(v.type);
    if (!v.issuer?.trim()) errors.push(`${label}: issuer is required`);

    if (v.validity_months !== undefined) {
      if (!Number.isInteger(v.validity_months) || v.validity_months <= 0) {
        errors.push(`${label}: validity_months must be a positive whole number`);
      }
    }
    for (const key of ["portal_url", "source_url"] as const) {
      const url = v[key];
      if (url !== undefined && !/^https:\/\/\S+$/.test(url)) {
        errors.push(`${label}: ${key} must be an https URL`);
      }
    }
    if (v.last_verified !== undefined) {
      const date = new Date(`${v.last_verified}T00:00:00Z`);
      if (!DATE_RE.test(v.last_verified) || Number.isNaN(date.getTime()) || date > today) {
        errors.push(`${label}: last_verified must be a valid past date (YYYY-MM-DD)`);
      }
      if (!v.source_url) errors.push(`${label}: last_verified requires a source_url`);
    }

    const groups = v.prerequisites ?? [];
    if (!Array.isArray(groups)) {
      errors.push(`${label}: prerequisites must be a list of lists`);
      continue;
    }
    groups.forEach((group, i) => {
      if (!Array.isArray(group) || group.length === 0 || group.some((g) => typeof g !== "string")) {
        errors.push(`${label}: prerequisites[${i}] must be a non-empty list of document types`);
        return;
      }
      if (new Set(group).size !== group.length) {
        errors.push(`${label}: prerequisites[${i}] lists the same document twice`);
      }
      for (const id of group) {
        if (!typeIds.has(id))
          errors.push(`${label}: prerequisite "${id}" is not a known document type`);
        if (id === v.type) errors.push(`${label}: a document cannot require itself`);
      }
    });
  }
}

function resolveFor(
  central: readonly DocumentVariantDef[],
  state: readonly DocumentVariantDef[],
): Map<string, DocumentVariantDef> {
  const resolved = new Map<string, DocumentVariantDef>();
  for (const v of central) resolved.set(v.type, v);
  for (const v of state) resolved.set(v.type, v);
  return resolved;
}

function checkGraph(
  scope: string,
  resolved: ReadonlyMap<string, DocumentVariantDef>,
  errors: string[],
): void {
  for (const v of resolved.values()) {
    for (const group of v.prerequisites ?? []) {
      for (const id of group) {
        if (!resolved.has(id)) {
          errors.push(`${scope}/${v.type}: prerequisite "${id}" has no variant in this scope`);
        }
      }
    }
  }

  const mark = new Map<string, "visiting" | "done">();
  const visit = (id: string, trail: string[]): void => {
    const current = mark.get(id);
    if (current === "done") return;
    if (current === "visiting") {
      errors.push(
        `${scope}: circular prerequisites ${[...trail.slice(trail.indexOf(id)), id].join(" -> ")}`,
      );
      return;
    }
    mark.set(id, "visiting");
    for (const group of resolved.get(id)?.prerequisites ?? []) {
      for (const dep of group) if (resolved.has(dep)) visit(dep, [...trail, id]);
    }
    mark.set(id, "done");
  };
  for (const id of resolved.keys()) visit(id, []);
}

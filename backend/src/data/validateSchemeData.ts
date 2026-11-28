import type { FieldDef } from "../rules/types";
import { validateSchemeRules } from "../rules/validateSchemes";
import type { ScopedScheme } from "./schemeTypes";

const ID_RE = /^(central|[A-Z]{2})\.[a-z][a-z0-9_]*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS_RE = /^https:\/\/\S+$/;

/** Checks scheme records, their documents and their rules. An empty list means all valid. */
export function validateSchemeData(
  items: readonly ScopedScheme[],
  typeIds: ReadonlySet<string>,
  fields: ReadonlyMap<string, FieldDef>,
  today = new Date(),
): string[] {
  const errors: string[] = [];
  const byId = new Map(items.map(({ scheme }) => [scheme.id, scheme] as const));

  for (const { scope, scheme: s } of items) {
    const label = s.id || "(scheme without id)";
    const fail = (msg: string) => errors.push(`${label}: ${msg}`);

    if (s.level !== "central" && s.level !== "state") {
      fail('level must be "central" or "state"');
      continue;
    }

    const owner = s.level === "central" ? "central" : s.state;
    if (s.level === "central" && s.state) fail("a central scheme must not have a state");
    if (s.level === "state" && !s.state) fail("a state scheme needs a state code");
    if (owner && scope !== owner) fail(`is stored under "${scope}" but declared for "${owner}"`);

    if (!ID_RE.test(label)) fail("id must look like central.some_name or KA.some_name");
    else if (owner && !label.startsWith(`${owner}.`)) fail(`id must start with "${owner}."`);

    for (const key of ["name", "category", "description"] as const) {
      if (!s[key]?.trim()) fail(`${key} is required`);
    }
    if (!HTTPS_RE.test(s.source_url ?? "")) fail("source_url must be an https URL");
    if (s.apply_portal !== undefined && !HTTPS_RE.test(s.apply_portal)) {
      fail("apply_portal must be an https URL");
    }

    const verified = String(s.last_verified ?? "");
    const date = new Date(`${verified}T00:00:00Z`);
    if (!DATE_RE.test(verified) || Number.isNaN(date.getTime()) || date > today) {
      fail("last_verified must be a valid past date (YYYY-MM-DD)");
    }

    const groups = s.documents ?? [];
    if (!Array.isArray(groups)) {
      fail("documents must be a list of lists");
    } else {
      groups.forEach((group, i) => {
        if (!Array.isArray(group) || group.length === 0) {
          fail(`documents[${i}] must be a non-empty list of document types`);
          return;
        }
        if (new Set(group).size !== group.length)
          fail(`documents[${i}] lists the same document twice`);
        for (const id of group) {
          if (!typeIds.has(id)) fail(`documents[${i}]: "${id}" is not a known document type`);
        }
      });
    }

    if (s.extends) {
      const parent = byId.get(s.extends);
      if (parent && parent.level !== "central")
        fail(`extends "${s.extends}", which is not a central scheme`);
    }
  }

  errors.push(
    ...validateSchemeRules(
      items.map((i) => i.scheme),
      fields,
    ),
  );
  return errors;
}

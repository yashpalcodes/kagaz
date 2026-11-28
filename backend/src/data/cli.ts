import { loadProfileFields } from "../rules/fields";
import { loadDataPack } from "./load";
import { loadSchemes } from "./loadSchemes";
import { validateDataPack } from "./validate";
import { validateSchemeData } from "./validateSchemeData";

const pack = await loadDataPack();
const fields = await loadProfileFields();
const schemes = await loadSchemes();
const typeIds = new Set(pack.types.map((t) => t.id));

const errors = [...validateDataPack(pack), ...validateSchemeData(schemes, typeIds, fields)];

if (errors.length > 0) {
  console.error(
    `Data validation failed (${errors.length} problem${errors.length === 1 ? "" : "s"}):`,
  );
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const variants = [...pack.central, ...pack.states.flatMap((s) => s.variants)];
const unverified = variants.filter((v) => !v.last_verified).length;
const central = schemes.filter((s) => s.scope === "central").length;
console.log(
  `Data OK: ${pack.types.length} document types, ${variants.length} variants ` +
    `(${unverified} not yet verified), ${schemes.length} schemes (${central} central, ` +
    `${schemes.length - central} state).`,
);

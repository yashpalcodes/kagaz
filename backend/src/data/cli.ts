import { loadDataPack } from "./load";
import { validateDataPack } from "./validate";

const pack = await loadDataPack();
const errors = validateDataPack(pack);

if (errors.length > 0) {
  console.error(
    `Data validation failed (${errors.length} problem${errors.length === 1 ? "" : "s"}):`,
  );
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const variants = [...pack.central, ...pack.states.flatMap((s) => s.variants)];
const unverified = variants.filter((v) => !v.last_verified).length;
console.log(
  `Data OK: ${pack.types.length} document types, ${variants.length} variants ` +
    `(central + ${pack.states.length} state pack${pack.states.length === 1 ? "" : "s"}), ` +
    `${unverified} not yet verified.`,
);

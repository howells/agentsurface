// Render the area card artwork from src/data/area-patterns.ts into src/assets/areas/*.svg.
// Run with `pnpm patterns:render` after changing a preset in the studio at /patterns.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AREA_PATTERNS } from "../src/data/area-patterns.ts";
import { rileySvg } from "../src/lib/riley.ts";

const outDir = path.join(import.meta.dirname, "../src/assets/areas");
await mkdir(outDir, { recursive: true });

for (const pattern of AREA_PATTERNS) {
  if (pattern.id === "hatch") {
    continue;
  }
  const file = path.join(outDir, `${pattern.id}.svg`);
  await writeFile(file, rileySvg(pattern.params));
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}

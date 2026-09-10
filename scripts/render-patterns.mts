// Render the glossary line fields from src/data/glossary-patterns.ts into src/assets/glossary/*.svg.
// Run with `pnpm patterns:render` after changing a preset in the studio at /patterns.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GLOSSARY_PATTERNS } from "../src/data/glossary-patterns.ts";
import { rileySvg } from "../src/lib/riley.ts";

const assets = path.join(import.meta.dirname, "../src/assets");

async function render(
  dir: string,
  entries: { slug: string; params: Parameters<typeof rileySvg>[0] }[],
) {
  const outDir = path.join(assets, dir);
  await mkdir(outDir, { recursive: true });
  for (const entry of entries) {
    const file = path.join(outDir, `${entry.slug}.svg`);
    await writeFile(file, rileySvg(entry.params));
    console.log(`wrote ${path.relative(process.cwd(), file)}`);
  }
}

await render("glossary", GLOSSARY_PATTERNS);

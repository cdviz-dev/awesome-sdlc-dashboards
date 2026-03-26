import { readdir, readFile } from "fs/promises";
import { join } from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ROOT = new URL("..", import.meta.url).pathname;
const CATALOG_DIR = join(ROOT, "catalog");
const SCHEMA_PATH = join(ROOT, "schema", "entry.json");

async function main(): Promise<void> {
  const schema = JSON.parse(await readFile(SCHEMA_PATH, "utf-8"));

  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const slugDirs = await readdir(CATALOG_DIR, { withFileTypes: true });
  let errors = 0;

  for (const dirent of slugDirs) {
    if (!dirent.isDirectory()) continue;
    const slug = dirent.name;
    const yamlPath = join(CATALOG_DIR, slug, "index.yaml");

    let raw: string;
    try {
      raw = await readFile(yamlPath, "utf-8");
    } catch {
      console.warn(`  skip ${slug}: no index.yaml`);
      continue;
    }

    const data = Bun.YAML.parse(raw);
    const valid = validate(data);

    if (valid) {
      console.log(`✓ ${slug}`);
    } else {
      errors++;
      console.error(`✗ ${slug}:`);
      for (const err of validate.errors ?? []) {
        const path = err.instancePath || "/";
        console.error(`    ${path}: ${err.message}`);
      }
    }
  }

  if (errors > 0) {
    console.error(`\n${errors} invalid ${errors === 1 ? "entry" : "entries"}.`);
    process.exit(1);
  }

  console.log(`\nAll ${slugDirs.filter((d) => d.isDirectory()).length} entries valid.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

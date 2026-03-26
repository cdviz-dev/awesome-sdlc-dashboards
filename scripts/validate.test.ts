import { describe, test, expect } from "bun:test";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFile } from "fs/promises";
import { join } from "path";

const ROOT = new URL("..", import.meta.url).pathname;

async function makeValidator() {
  const schema = JSON.parse(
    await readFile(join(ROOT, "schema", "entry.json"), "utf-8"),
  );
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

describe("entry schema", () => {
  test("rejects missing required fields", async () => {
    const validate = await makeValidator();
    expect(validate({})).toBe(false);
    expect(validate.errors?.map((e) => e.params)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ missingProperty: "title" }),
        expect.objectContaining({ missingProperty: "kind" }),
      ]),
    );
  });

  test("rejects invalid kind value", async () => {
    const validate = await makeValidator();
    expect(validate({ title: "Test", kind: "invalid" })).toBe(false);
    expect(validate.errors?.some((e) => e.instancePath === "/kind")).toBe(true);
  });

  test("rejects unknown extra fields", async () => {
    const validate = await makeValidator();
    expect(validate({ title: "Test", kind: "dashboard", unknown: true })).toBe(false);
  });

  test("rejects malformed link url", async () => {
    const validate = await makeValidator();
    expect(
      validate({
        title: "Test",
        kind: "panel",
        links: [{ rel: "live", url: "not-a-url" }],
      }),
    ).toBe(false);
  });

  test("accepts a minimal valid dashboard entry", async () => {
    const validate = await makeValidator();
    expect(validate({ title: "My Dashboard", kind: "dashboard" })).toBe(true);
  });

  test("accepts a full valid panel entry", async () => {
    const validate = await makeValidator();
    expect(
      validate({
        title: "My Panel",
        kind: "panel",
        panel_type: "stat",
        source: "grafana",
        links: [{ rel: "live", url: "https://example.com/dashboard" }],
        tags: ["topic:ci", "github-actions"],
        images: ["images/screenshot.png"],
        related_dashboard: "my-dashboard",
        description: "A useful panel.",
      }),
    ).toBe(true);
  });

  test("all catalog entries pass validation", async () => {
    const validate = await makeValidator();
    const { readdir } = await import("fs/promises");
    const catalogDir = join(ROOT, "catalog");
    const slugs = (await readdir(catalogDir, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    expect(slugs.length).toBeGreaterThan(0);

    for (const slug of slugs) {
      const raw = await readFile(join(catalogDir, slug, "index.yaml"), "utf-8");
      const data = Bun.YAML.parse(raw);
      const valid = validate(data);
      if (!valid) {
        console.error(`${slug}:`, validate.errors);
      }
      expect(valid, `${slug} should be valid`).toBe(true);
    }
  });
});

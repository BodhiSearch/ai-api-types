import { writeFileSync, mkdirSync } from "node:fs";
import { parse as parseYaml } from "yaml";

export interface OpenAPISpec {
  openapi: string;
  info: Record<string, unknown>;
  paths: Record<string, unknown>;
  components: { schemas: Record<string, unknown> };
}

export function collectRefs(obj: unknown, refs: Set<string>): void {
  if (obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
    for (const item of obj) collectRefs(item, refs);
    return;
  }
  if (typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    if (typeof record["$ref"] === "string") {
      refs.add(record["$ref"]);
    }
    for (const value of Object.values(record)) {
      collectRefs(value, refs);
    }
  }
}

export function resolveTransitiveSchemas(
  allSchemas: Record<string, unknown>,
  seedRefs: Set<string>
): Set<string> {
  const resolved = new Set<string>();
  const queue = [...seedRefs];

  while (queue.length > 0) {
    const ref = queue.pop()!;
    const prefix = "#/components/schemas/";
    if (!ref.startsWith(prefix)) continue;

    const name = ref.slice(prefix.length);
    if (resolved.has(name)) continue;
    if (!(name in allSchemas)) {
      console.warn(`Warning: schema "${name}" referenced but not found in components/schemas`);
      continue;
    }
    resolved.add(name);

    const nested = new Set<string>();
    collectRefs(allSchemas[name], nested);
    for (const r of nested) {
      if (r.startsWith(prefix) && !resolved.has(r.slice(prefix.length))) {
        queue.push(r);
      }
    }
  }

  return resolved;
}

export function parseSpec(text: string): OpenAPISpec {
  if (text.trimStart().startsWith("{")) {
    return JSON.parse(text);
  }
  return parseYaml(text) as OpenAPISpec;
}

export function filterSpec(spec: OpenAPISpec, keepPaths: string[]): OpenAPISpec {
  const filteredPaths: Record<string, unknown> = {};
  for (const path of keepPaths) {
    if (path in spec.paths) {
      filteredPaths[path] = spec.paths[path];
      console.log(`  Keeping path: ${path}`);
    } else {
      console.warn(`  Warning: path "${path}" not found in spec`);
    }
  }

  const seedRefs = new Set<string>();
  collectRefs(filteredPaths, seedRefs);
  console.log(`Seed $ref count: ${seedRefs.size}`);

  const needed = resolveTransitiveSchemas(spec.components.schemas, seedRefs);
  console.log(`Transitively resolved schemas: ${needed.size}`);

  const filteredSchemas: Record<string, unknown> = {};
  const sortedNames = [...needed].sort();
  for (const name of sortedNames) {
    filteredSchemas[name] = spec.components.schemas[name];
  }

  return {
    openapi: spec.openapi,
    info: spec.info,
    paths: filteredPaths,
    components: { schemas: filteredSchemas },
  };
}

export async function downloadAndFilter(
  specUrl: string,
  keepPaths: string[],
  outDir: string
): Promise<string> {
  console.log("Downloading OpenAPI spec...");
  const response = await fetch(specUrl);
  if (!response.ok) {
    throw new Error(`Failed to download spec: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  console.log(`Downloaded ${(text.length / 1024).toFixed(0)} KB`);

  const spec = parseSpec(text);
  console.log(`Spec version: ${spec.openapi}`);
  console.log(`Total paths: ${Object.keys(spec.paths).length}`);
  console.log(`Total schemas: ${Object.keys(spec.components.schemas).length}`);

  const filtered = filterSpec(spec, keepPaths);
  const schemaCount = Object.keys(filtered.components.schemas).length;

  mkdirSync(outDir, { recursive: true });
  const json = JSON.stringify(filtered, null, 2);
  const outPath = `${outDir}/filtered-openapi.json`;
  writeFileSync(outPath, json);
  console.log(`\nWrote ${outPath} with ${schemaCount} schemas`);

  return json;
}

import { parse as parseYaml } from "yaml";
import { downloadAndFilter } from "../lib/filter.js";
import { md5, readHashes, writeHashes } from "../lib/hash.js";
import {
  KEEP_PATHS,
  GENERATED_DIR,
  HASHES_PATH,
  STATS_URL,
} from "./config.js";

interface StatsYml {
  openapi_spec_url: string;
  openapi_spec_hash: string;
}

async function fetchStats(): Promise<StatsYml> {
  console.log("Fetching upstream .stats.yml...");
  const response = await fetch(STATS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch .stats.yml: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const parsed = parseYaml(text) as Record<string, string>;

  if (!parsed.openapi_spec_url || !parsed.openapi_spec_hash) {
    throw new Error("Missing openapi_spec_url or openapi_spec_hash in .stats.yml");
  }

  return {
    openapi_spec_url: parsed.openapi_spec_url,
    openapi_spec_hash: parsed.openapi_spec_hash,
  };
}

async function main() {
  const force = !!process.env.FORCE;
  const stats = await fetchStats();
  const current = readHashes(HASHES_PATH);

  console.log(`Upstream spec hash: ${stats.openapi_spec_hash}`);
  console.log(`Stored spec hash:   ${current.openapi_spec_hash || "(none)"}`);

  if (!force && stats.openapi_spec_hash === current.openapi_spec_hash) {
    console.log("\nNo upstream spec changes detected.");
    process.exit(0);
  }

  if (force) {
    console.log("\nForce mode: skipping hash comparison.");
  } else {
    console.log("\nUpstream spec hash changed, downloading and filtering...");
  }

  const filteredJson = await downloadAndFilter(stats.openapi_spec_url, KEEP_PATHS, GENERATED_DIR);
  const newTypesHash = md5(filteredJson);

  console.log(`\nFiltered types hash: ${newTypesHash}`);
  console.log(`Stored types hash:   ${current.types_hash || "(none)"}`);

  if (!force && newTypesHash === current.types_hash) {
    console.log("\nFiltered types unchanged (only non-target endpoints changed upstream).");
    writeHashes(HASHES_PATH, {
      openapi_spec_hash: stats.openapi_spec_hash,
      types_hash: current.types_hash,
    });
    console.log("Updated openapi_spec_hash only.");
    process.exit(0);
  }

  writeHashes(HASHES_PATH, {
    openapi_spec_hash: stats.openapi_spec_hash,
    types_hash: newTypesHash,
  });
  console.log("\nHashes updated. Types need regeneration.");
  process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { downloadAndFilter } from "../lib/filter.js";
import { md5, readHashes, writeHashes } from "../lib/hash.js";
import { KEEP_PATHS, GENERATED_DIR, HASHES_PATH, SPEC_URL } from "./config.js";

async function main() {
  const force = !!process.env.FORCE;
  const current = readHashes(HASHES_PATH);

  console.log("Downloading OpenAI spec to check for changes...");
  const specResponse = await fetch(SPEC_URL);
  if (!specResponse.ok) {
    throw new Error(`Failed to download spec: ${specResponse.status} ${specResponse.statusText}`);
  }
  const specText = await specResponse.text();
  const newSpecHash = md5(specText);

  console.log(`Downloaded spec hash: ${newSpecHash}`);
  console.log(`Stored spec hash:    ${current.openapi_spec_hash || "(none)"}`);

  if (!force && newSpecHash === current.openapi_spec_hash) {
    console.log("\nNo upstream spec changes detected.");
    process.exit(0);
  }

  if (force) {
    console.log("\nForce mode: skipping hash comparison.");
  } else {
    console.log("\nUpstream spec changed, filtering...");
  }

  const filteredJson = await downloadAndFilter(SPEC_URL, KEEP_PATHS, GENERATED_DIR);
  const newTypesHash = md5(filteredJson);

  console.log(`\nFiltered types hash: ${newTypesHash}`);
  console.log(`Stored types hash:   ${current.types_hash || "(none)"}`);

  if (!force && newTypesHash === current.types_hash) {
    console.log("\nFiltered types unchanged (only non-target endpoints changed upstream).");
    writeHashes(HASHES_PATH, {
      openapi_spec_hash: newSpecHash,
      types_hash: current.types_hash,
    });
    console.log("Updated openapi_spec_hash only.");
    process.exit(0);
  }

  writeHashes(HASHES_PATH, {
    openapi_spec_hash: newSpecHash,
    types_hash: newTypesHash,
  });
  console.log("\nHashes updated. Types need regeneration.");
  process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

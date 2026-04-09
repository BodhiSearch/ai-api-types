import { downloadAndFilter } from "../lib/filter.js";
import { KEEP_PATHS, GENERATED_DIR, HARDCODED_SPEC_URL } from "./config.js";

async function main() {
  await downloadAndFilter(HARDCODED_SPEC_URL, KEEP_PATHS, GENERATED_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

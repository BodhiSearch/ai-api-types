import { extractSchemas } from "../lib/extract-schemas.js";
import { FILTERED_SPEC_PATH, SCHEMAS_DIR, TOP_LEVEL_SCHEMAS } from "./config.js";

extractSchemas(FILTERED_SPEC_PATH, SCHEMAS_DIR, TOP_LEVEL_SCHEMAS);

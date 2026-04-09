export const PROVIDER = "openai";

export const KEEP_PATHS = [
  "/chat/completions",
  "/models",
  "/models/{model}",
  "/responses",
  "/responses/{response_id}",
  "/responses/{response_id}/input_items",
  "/responses/{response_id}/cancel",
];

export const SPEC_URL =
  "https://app.stainless.com/api/spec/documented/openai/openapi.documented.yml";

export const GENERATED_DIR = "generated/openai";
export const HASHES_PATH = `${GENERATED_DIR}/hashes.json`;
export const FILTERED_SPEC_PATH = `${GENERATED_DIR}/filtered-openapi.json`;
export const SCHEMAS_DIR = `${GENERATED_DIR}/schemas`;

export const CRATE_DIR = "crates/openai";
export const TYPES_RS_PATH = `${CRATE_DIR}/src/types.rs`;

export const TOP_LEVEL_SCHEMAS = [
  "CreateChatCompletionRequest",
  "CreateChatCompletionResponse",
  "ListModelsResponse",
  "Model",
  "CreateResponse",
  "Response",
  "ResponseStreamEvent",
];

export const RUST_SCHEMA_FILES = TOP_LEVEL_SCHEMAS.map((s) => `${s}.rs`);

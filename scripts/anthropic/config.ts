export const PROVIDER = "anthropic";

export const KEEP_PATHS = ["/v1/messages", "/v1/models", "/v1/models/{model_id}"];

export const GENERATED_DIR = "generated/anthropic";
export const HASHES_PATH = `${GENERATED_DIR}/hashes.json`;
export const FILTERED_SPEC_PATH = `${GENERATED_DIR}/filtered-openapi.json`;
export const SCHEMAS_DIR = `${GENERATED_DIR}/schemas`;

export const CRATE_DIR = "crates/anthropic";
export const TYPES_RS_PATH = `${CRATE_DIR}/src/types.rs`;

export const TOP_LEVEL_SCHEMAS = [
  "CreateMessageParams",
  "Message",
  "ListResponse_ModelInfo_",
  "ModelInfo",
  "ErrorResponse",
];

export const RUST_SCHEMA_FILES = [
  "CreateMessageParams.rs",
  "Message.rs",
  "ListResponse_ModelInfo_.rs",
  "ModelInfo.rs",
  "ErrorResponse.rs",
];

export const STATS_URL =
  "https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/refs/heads/main/.stats.yml";

export const HARDCODED_SPEC_URL =
  "https://storage.googleapis.com/stainless-sdk-openapi-specs/anthropic%2Fanthropic-69486316563eb49043ec1ef0b8e1d4164b6fadb58c7ae27477f9971448ede066.yml";

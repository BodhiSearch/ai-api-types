set dotenv-load := false

export CONFIRM := env("CONFIRM", "")

# Show available targets
default:
  @just --list

# Install dependencies
setup:
  npm ci

# ─── Sync (all providers) ─────────────────────────────────────────────

# Check all upstream specs for changes and regenerate if needed
sync *flags:
  just sync-anthropic {{flags}}
  just sync-openai {{flags}}

# ─── Anthropic ─────────────────────────────────────────────────────────

# Check upstream Anthropic spec for changes and regenerate if needed
sync-anthropic *flags:
  #!/usr/bin/env bash
  set -uo pipefail
  FORCE=""
  for arg in {{flags}}; do
    case "$arg" in
      --force|-f) FORCE="1" ;;
    esac
  done
  if [ -n "$FORCE" ]; then
    export FORCE=1
  fi
  npx tsx scripts/anthropic/sync.ts
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 2 ]; then
    echo ""
    echo "Anthropic types need regeneration, running generate..."
    just generate-anthropic
  elif [ $EXIT_CODE -eq 0 ]; then
    echo "Anthropic: no regeneration needed."
  else
    echo "Anthropic sync failed with exit code $EXIT_CODE"
    exit $EXIT_CODE
  fi

# Download and filter the Anthropic OpenAPI spec (standalone, no hash checks)
filter-anthropic:
  npx tsx scripts/anthropic/filter.ts

# Generate both TypeScript and Rust types for Anthropic
generate-anthropic: generate-anthropic-ts generate-anthropic-rust

# Generate Anthropic TypeScript types from filtered OpenAPI spec
generate-anthropic-ts:
  cd packages/anthropic && npm run generate

# Generate Anthropic Rust types from filtered OpenAPI spec
generate-anthropic-rust:
  #!/usr/bin/env bash
  set -euo pipefail
  npx tsx scripts/anthropic/extract-schemas.ts
  SCHEMAS_DIR="generated/anthropic/schemas"
  for schema in CreateMessageParams Message ListResponse_ModelInfo_ ModelInfo ErrorResponse; do
    echo "  Generating $schema..."
    quicktype -s schema -l rs -t "$schema" -o "${SCHEMAS_DIR}/${schema}.rs" "${SCHEMAS_DIR}/${schema}.json" 2>&1 || true
  done
  npx tsx scripts/anthropic/merge-rust.ts
  cargo run --manifest-path scripts/add-utoipa-annotations/Cargo.toml --quiet -- crates/anthropic/src/types.rs
  cargo fmt -p anthropic-api-types

# ─── OpenAI ────────────────────────────────────────────────────────────

# Check upstream OpenAI spec for changes and regenerate if needed
sync-openai *flags:
  #!/usr/bin/env bash
  set -uo pipefail
  FORCE=""
  for arg in {{flags}}; do
    case "$arg" in
      --force|-f) FORCE="1" ;;
    esac
  done
  if [ -n "$FORCE" ]; then
    export FORCE=1
  fi
  npx tsx scripts/openai/sync.ts
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 2 ]; then
    echo ""
    echo "OpenAI types need regeneration, running generate..."
    just generate-openai
  elif [ $EXIT_CODE -eq 0 ]; then
    echo "OpenAI: no regeneration needed."
  else
    echo "OpenAI sync failed with exit code $EXIT_CODE"
    exit $EXIT_CODE
  fi

# Download and filter the OpenAI OpenAPI spec (standalone, no hash checks)
filter-openai:
  npx tsx scripts/openai/filter.ts

# Generate both TypeScript and Rust types for OpenAI
generate-openai: generate-openai-ts generate-openai-rust

# Generate OpenAI TypeScript types from filtered OpenAPI spec
generate-openai-ts:
  cd packages/openai && npm run generate

# Generate OpenAI Rust types from filtered OpenAPI spec
generate-openai-rust:
  #!/usr/bin/env bash
  set -euo pipefail
  npx tsx scripts/openai/extract-schemas.ts
  SCHEMAS_DIR="generated/openai/schemas"
  for schema in CreateChatCompletionRequest CreateChatCompletionResponse ListModelsResponse Model CreateResponse Response ResponseStreamEvent; do
    echo "  Generating $schema..."
    quicktype -s schema -l rs -t "$schema" -o "${SCHEMAS_DIR}/${schema}.rs" "${SCHEMAS_DIR}/${schema}.json" 2>&1 || true
  done
  npx tsx scripts/openai/merge-rust.ts
  cargo run --manifest-path scripts/add-utoipa-annotations/Cargo.toml --quiet -- crates/openai/src/types.rs
  cargo fmt -p openai-api-types

# ─── Combined ──────────────────────────────────────────────────────────

# Generate all types (both providers)
generate: generate-anthropic generate-openai

# Type-check TypeScript and Rust (both providers)
check:
  cd packages/anthropic && npx tsc --noEmit
  cd packages/openai && npx tsc --noEmit
  cargo check --workspace

# ─── Release ───────────────────────────────────────────────────────────

# Release all packages via tags
release *flags:
  #!/usr/bin/env bash
  set -euo pipefail
  for arg in {{flags}}; do
    case "$arg" in
      -y|--yes) export CONFIRM="y" ;;
    esac
  done
  just release-anthropic-ts
  just release-anthropic-rust
  just release-openai-ts
  just release-openai-rust

# Release Anthropic TypeScript package via tag push
release-anthropic-ts *flags:
  #!/usr/bin/env bash
  set -euo pipefail
  for arg in {{flags}}; do
    case "$arg" in
      -y|--yes) export CONFIRM="y" ;;
    esac
  done
  echo "Preparing Anthropic TypeScript release..."
  node scripts/git-check-sync.js
  CURRENT=$(node scripts/get-npm-version.js @bodhiapp/anthropic-api-types)
  NEXT=$(node scripts/increment-version.js "$CURRENT")
  echo "Current npm version: $CURRENT"
  echo "Next version:        $NEXT"
  TAG_NAME="anthropic-ts/v$NEXT"
  if [ "$CONFIRM" != "y" ]; then
    read -rp "Release Anthropic TypeScript v$NEXT? [y/N] " answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
      echo "Skipping Anthropic TypeScript release."
      exit 0
    fi
  fi
  node scripts/delete-tag-if-exists.js "$TAG_NAME"
  git tag "$TAG_NAME"
  git push origin "$TAG_NAME"
  echo "Tag $TAG_NAME pushed. GitHub workflow will handle publishing."

# Release Anthropic Rust crate via tag push
release-anthropic-rust *flags:
  #!/usr/bin/env bash
  set -euo pipefail
  for arg in {{flags}}; do
    case "$arg" in
      -y|--yes) export CONFIRM="y" ;;
    esac
  done
  echo "Preparing Anthropic Rust release..."
  node scripts/git-check-sync.js
  CURRENT=$(node scripts/get-crate-version.js anthropic-api-types)
  NEXT=$(node scripts/increment-version.js "$CURRENT")
  echo "Current crates.io version: $CURRENT"
  echo "Next version:              $NEXT"
  TAG_NAME="anthropic-rs/v$NEXT"
  if [ "$CONFIRM" != "y" ]; then
    read -rp "Release Anthropic Rust v$NEXT? [y/N] " answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
      echo "Skipping Anthropic Rust release."
      exit 0
    fi
  fi
  node scripts/delete-tag-if-exists.js "$TAG_NAME"
  git tag "$TAG_NAME"
  git push origin "$TAG_NAME"
  echo "Tag $TAG_NAME pushed. GitHub workflow will handle publishing."

# Release OpenAI TypeScript package via tag push
release-openai-ts *flags:
  #!/usr/bin/env bash
  set -euo pipefail
  for arg in {{flags}}; do
    case "$arg" in
      -y|--yes) export CONFIRM="y" ;;
    esac
  done
  echo "Preparing OpenAI TypeScript release..."
  node scripts/git-check-sync.js
  CURRENT=$(node scripts/get-npm-version.js @bodhiapp/openai-api-types)
  NEXT=$(node scripts/increment-version.js "$CURRENT")
  echo "Current npm version: $CURRENT"
  echo "Next version:        $NEXT"
  TAG_NAME="openai-ts/v$NEXT"
  if [ "$CONFIRM" != "y" ]; then
    read -rp "Release OpenAI TypeScript v$NEXT? [y/N] " answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
      echo "Skipping OpenAI TypeScript release."
      exit 0
    fi
  fi
  node scripts/delete-tag-if-exists.js "$TAG_NAME"
  git tag "$TAG_NAME"
  git push origin "$TAG_NAME"
  echo "Tag $TAG_NAME pushed. GitHub workflow will handle publishing."

# Release OpenAI Rust crate via tag push
release-openai-rust *flags:
  #!/usr/bin/env bash
  set -euo pipefail
  for arg in {{flags}}; do
    case "$arg" in
      -y|--yes) export CONFIRM="y" ;;
    esac
  done
  echo "Preparing OpenAI Rust release..."
  node scripts/git-check-sync.js
  CURRENT=$(node scripts/get-crate-version.js openai-api-types)
  NEXT=$(node scripts/increment-version.js "$CURRENT")
  echo "Current crates.io version: $CURRENT"
  echo "Next version:              $NEXT"
  TAG_NAME="openai-rs/v$NEXT"
  if [ "$CONFIRM" != "y" ]; then
    read -rp "Release OpenAI Rust v$NEXT? [y/N] " answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
      echo "Skipping OpenAI Rust release."
      exit 0
    fi
  fi
  node scripts/delete-tag-if-exists.js "$TAG_NAME"
  git tag "$TAG_NAME"
  git push origin "$TAG_NAME"
  echo "Tag $TAG_NAME pushed. GitHub workflow will handle publishing."

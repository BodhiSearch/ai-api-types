import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

export interface Hashes {
  openapi_spec_hash: string;
  types_hash: string;
}

export function md5(content: string): string {
  return createHash("md5").update(content).digest("hex");
}

export function readHashes(hashesPath: string): Hashes {
  if (!existsSync(hashesPath)) {
    return { openapi_spec_hash: "", types_hash: "" };
  }
  const raw = JSON.parse(readFileSync(hashesPath, "utf-8"));
  return {
    openapi_spec_hash: raw.openapi_spec_hash ?? "",
    types_hash: raw.types_hash ?? raw.anthropic_types_hash ?? "",
  };
}

export function writeHashes(hashesPath: string, hashes: Hashes): void {
  mkdirSync(dirname(hashesPath), { recursive: true });
  writeFileSync(hashesPath, JSON.stringify(hashes, null, 2) + "\n");
}

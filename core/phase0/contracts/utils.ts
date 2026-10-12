import { createHash } from "node:crypto";
import type {
  CanonicalModel,
  EvidenceManifest,
  HistoryEvent,
} from "./model";

export function canonicalize(value: unknown, omitPaths: string[] = []): string {
  const omit = new Set(omitPaths);

  function normalize(input: unknown, path: string): unknown {
    if (input === null || typeof input !== "object") {
      if (typeof input === "number" && !Number.isFinite(input)) {
        throw new Error(`Non-standard JSON number at ${path || "root"}`);
      }
      if (typeof input === "bigint" || typeof input === "function" || typeof input === "symbol") {
        throw new Error(`Non-standard JSON value at ${path || "root"}`);
      }
      return input;
    }

    if (Array.isArray(input)) {
      return input.map((item, index) => normalize(item, `${path}[${index}]`));
    }

    const source = input as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort(compareUnicodeCodePointKeys)) {
      const childPath = path ? `${path}.${key}` : key;
      if (omit.has(childPath)) continue;
      const valueAtKey = source[key];
      if (valueAtKey === undefined) continue;
      result[key] = normalize(valueAtKey, childPath);
    }
    return result;
  }

  return JSON.stringify(normalize(value, ""));
}

export function compareUnicodeCodePointKeys(left: string, right: string): number {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0) as number);
  const rightPoints = Array.from(right, (character) => character.codePointAt(0) as number);
  const sharedLength = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < sharedLength; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) return leftPoints[index] - rightPoints[index];
  }
  return leftPoints.length - rightPoints.length;
}

export function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha256Text(text: string): string {
  return sha256Bytes(Buffer.from(text, "utf8"));
}

export function canonicalModelBytes(model: CanonicalModel): Buffer {
  return Buffer.from(canonicalize(model, ["canonicalState.integrity.modelHash"]), "utf8");
}

export function computeModelHash(model: CanonicalModel): string {
  return sha256Bytes(canonicalModelBytes(model));
}

export function serializeHistory(events: HistoryEvent[]): Buffer {
  const text = events.map((event) => canonicalize(event)).join("\n") + (events.length ? "\n" : "");
  return Buffer.from(text, "utf8");
}

export function computeHistoryHash(events: HistoryEvent[]): string {
  return sha256Bytes(serializeHistory(events));
}

export function computeEvidenceManifestHash(manifest: EvidenceManifest): string {
  return sha256Text(canonicalize(manifest));
}

export function cloneWithModelHash(model: CanonicalModel): CanonicalModel {
  const clone = JSON.parse(JSON.stringify(model)) as CanonicalModel;
  clone.canonicalState.integrity.modelHash = computeModelHash(clone);
  return clone;
}

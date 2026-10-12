"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareSemanticCodePoints = compareSemanticCodePoints;
exports.normalizeSemanticText = normalizeSemanticText;
exports.assertSafeSemanticText = assertSafeSemanticText;
exports.assertBoundedSemanticIdentity = assertBoundedSemanticIdentity;
exports.canonicalSemanticValue = canonicalSemanticValue;
exports.canonicalSemanticText = canonicalSemanticText;
exports.canonicalSemanticSet = canonicalSemanticSet;
exports.canonicalSemanticStringSet = canonicalSemanticStringSet;
exports.sha256LengthPrefixedFrames = sha256LengthPrefixedFrames;
exports.normalizeProjectRelativePath = normalizeProjectRelativePath;
const node_crypto_1 = require("node:crypto");
const FORBIDDEN_CONTENT_PATTERNS = [
    { label: "private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i },
    { label: "provider credential", pattern: /\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{8,}\b/ },
    { label: "bearer credential", pattern: /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}\b/i },
    { label: "assigned secret", pattern: /\b(?:password|passwd|secret|credential|access[_ -]?token)\s*[:=]\s*\S+/i },
    { label: "personal email address", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
];
function compareSemanticCodePoints(left, right) {
    const leftPoints = Array.from(left, (character) => character.codePointAt(0));
    const rightPoints = Array.from(right, (character) => character.codePointAt(0));
    const shared = Math.min(leftPoints.length, rightPoints.length);
    for (let index = 0; index < shared; index += 1) {
        if (leftPoints[index] !== rightPoints[index])
            return leftPoints[index] - rightPoints[index];
    }
    return leftPoints.length - rightPoints.length;
}
function normalizeSemanticText(value) {
    return value.normalize("NFC").replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
}
function assertSafeSemanticText(value, label) {
    const normalized = normalizeSemanticText(value);
    for (const forbidden of FORBIDDEN_CONTENT_PATTERNS) {
        if (forbidden.pattern.test(normalized)) {
            throw new Error(`HITO semantic canonicalization rejects ${forbidden.label} content at ${label}`);
        }
    }
    return normalized;
}
function assertBoundedSemanticIdentity(value, label) {
    const normalized = assertSafeSemanticText(value, label);
    if (!normalized || normalized.length > 512 || !/^[\p{L}\p{N}][\p{L}\p{N}._:/+ -]*$/u.test(normalized)) {
        throw new Error(`HITO semantic canonicalization requires a bounded non-secret identity at ${label}`);
    }
    return normalized;
}
function canonicalSemanticValue(value, path = "root") {
    if (value === null || typeof value === "boolean" || typeof value === "string") {
        return typeof value === "string" ? assertSafeSemanticText(value, path) : value;
    }
    if (typeof value === "number") {
        if (!Number.isFinite(value))
            throw new Error(`HITO semantic canonicalization rejects a non-finite number at ${path}`);
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item, index) => canonicalSemanticValue(item, `${path}[${index}]`));
    }
    if (typeof value !== "object" || value === undefined) {
        throw new Error(`HITO semantic canonicalization rejects a non-JSON value at ${path}`);
    }
    const source = value;
    const result = {};
    for (const key of Object.keys(source).sort(compareSemanticCodePoints)) {
        const normalizedKey = assertSafeSemanticText(key, `${path}.key`);
        const child = source[key];
        if (child === undefined)
            continue;
        result[normalizedKey] = canonicalSemanticValue(child, `${path}.${normalizedKey}`);
    }
    return result;
}
function canonicalSemanticText(value) {
    return JSON.stringify(canonicalSemanticValue(value));
}
/**
 * Treats the supplied collection as a semantic set: exact duplicates collapse,
 * while entries that share a domain identifier but differ in meaning remain.
 */
function canonicalSemanticSet(values) {
    const entries = values.map((value) => ({
        value: canonicalSemanticValue(value),
        canonical: canonicalSemanticText(value),
    }));
    entries.sort((left, right) => compareSemanticCodePoints(left.canonical, right.canonical));
    const result = [];
    let previous;
    for (const entry of entries) {
        if (entry.canonical === previous)
            continue;
        result.push(entry.value);
        previous = entry.canonical;
    }
    return result;
}
function canonicalSemanticStringSet(values, label) {
    return canonicalSemanticSet(values.map((value, index) => assertSafeSemanticText(value, `${label}[${index}]`)));
}
function updateLengthPrefixed(hash, bytes) {
    const length = Buffer.alloc(8);
    length.writeBigUInt64BE(BigInt(bytes.length));
    hash.update(length);
    hash.update(bytes);
}
/** SHA-256 over UTF-8 NFC/LF canonical frames, each preceded by an unsigned 64-bit byte length. */
function sha256LengthPrefixedFrames(frames) {
    const hash = (0, node_crypto_1.createHash)("sha256");
    const count = Buffer.alloc(8);
    count.writeBigUInt64BE(BigInt(frames.length));
    hash.update(count);
    for (const frame of frames) {
        updateLengthPrefixed(hash, Buffer.from(assertBoundedSemanticIdentity(frame.label, "frame.label"), "utf8"));
        updateLengthPrefixed(hash, Buffer.from(canonicalSemanticText(frame.value), "utf8"));
    }
    return hash.digest("hex");
}
function slashNormalized(value) {
    return normalizeSemanticText(value).replaceAll("\\", "/").replace(/\/+/g, "/");
}
/** Returns a project-relative slash path, or null when a machine/root/escape path cannot be safely reduced. */
function normalizeProjectRelativePath(value, projectRoot = ".") {
    let candidate = slashNormalized(value);
    const root = slashNormalized(projectRoot).replace(/\/$/, "");
    if (root && root !== "." && candidate.toLocaleLowerCase().startsWith(`${root.toLocaleLowerCase()}/`)) {
        candidate = candidate.slice(root.length + 1);
    }
    candidate = candidate.replace(/^(\.\/)+/, "");
    if (!candidate
        || candidate.startsWith("/")
        || candidate.startsWith("//")
        || /^[A-Za-z]:/.test(candidate))
        return null;
    const segments = candidate.split("/").filter((segment) => segment !== ".");
    if (segments.length === 0 || segments.some((segment) => !segment || segment === ".."))
        return null;
    return segments.join("/");
}

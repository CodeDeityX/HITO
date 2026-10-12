"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalize = canonicalize;
exports.compareUnicodeCodePointKeys = compareUnicodeCodePointKeys;
exports.sha256Bytes = sha256Bytes;
exports.sha256Text = sha256Text;
exports.canonicalModelBytes = canonicalModelBytes;
exports.computeModelHash = computeModelHash;
exports.serializeHistory = serializeHistory;
exports.computeHistoryHash = computeHistoryHash;
exports.computeEvidenceManifestHash = computeEvidenceManifestHash;
exports.cloneWithModelHash = cloneWithModelHash;
const node_crypto_1 = require("node:crypto");
function canonicalize(value, omitPaths = []) {
    const omit = new Set(omitPaths);
    function normalize(input, path) {
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
        const source = input;
        const result = {};
        for (const key of Object.keys(source).sort(compareUnicodeCodePointKeys)) {
            const childPath = path ? `${path}.${key}` : key;
            if (omit.has(childPath))
                continue;
            const valueAtKey = source[key];
            if (valueAtKey === undefined)
                continue;
            result[key] = normalize(valueAtKey, childPath);
        }
        return result;
    }
    return JSON.stringify(normalize(value, ""));
}
function compareUnicodeCodePointKeys(left, right) {
    const leftPoints = Array.from(left, (character) => character.codePointAt(0));
    const rightPoints = Array.from(right, (character) => character.codePointAt(0));
    const sharedLength = Math.min(leftPoints.length, rightPoints.length);
    for (let index = 0; index < sharedLength; index += 1) {
        if (leftPoints[index] !== rightPoints[index])
            return leftPoints[index] - rightPoints[index];
    }
    return leftPoints.length - rightPoints.length;
}
function sha256Bytes(bytes) {
    return (0, node_crypto_1.createHash)("sha256").update(bytes).digest("hex");
}
function sha256Text(text) {
    return sha256Bytes(Buffer.from(text, "utf8"));
}
function canonicalModelBytes(model) {
    return Buffer.from(canonicalize(model, ["canonicalState.integrity.modelHash"]), "utf8");
}
function computeModelHash(model) {
    return sha256Bytes(canonicalModelBytes(model));
}
function serializeHistory(events) {
    const text = events.map((event) => canonicalize(event)).join("\n") + (events.length ? "\n" : "");
    return Buffer.from(text, "utf8");
}
function computeHistoryHash(events) {
    return sha256Bytes(serializeHistory(events));
}
function computeEvidenceManifestHash(manifest) {
    return sha256Text(canonicalize(manifest));
}
function cloneWithModelHash(model) {
    const clone = JSON.parse(JSON.stringify(model));
    clone.canonicalState.integrity.modelHash = computeModelHash(clone);
    return clone;
}

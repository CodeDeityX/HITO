export type SemanticJson = null | boolean | number | string | SemanticJson[] | {
    [key: string]: SemanticJson;
};
export interface SemanticHashFrame {
    label: string;
    value: unknown;
}
export declare function compareSemanticCodePoints(left: string, right: string): number;
export declare function normalizeSemanticText(value: string): string;
export declare function assertSafeSemanticText(value: string, label: string): string;
export declare function assertBoundedSemanticIdentity(value: string, label: string): string;
export declare function canonicalSemanticValue(value: unknown, path?: string): SemanticJson;
export declare function canonicalSemanticText(value: unknown): string;
/**
 * Treats the supplied collection as a semantic set: exact duplicates collapse,
 * while entries that share a domain identifier but differ in meaning remain.
 */
export declare function canonicalSemanticSet<T>(values: readonly T[]): T[];
export declare function canonicalSemanticStringSet(values: readonly string[], label: string): string[];
/** SHA-256 over UTF-8 NFC/LF canonical frames, each preceded by an unsigned 64-bit byte length. */
export declare function sha256LengthPrefixedFrames(frames: readonly SemanticHashFrame[]): string;
/** Returns a project-relative slash path, or null when a machine/root/escape path cannot be safely reduced. */
export declare function normalizeProjectRelativePath(value: string, projectRoot?: string): string | null;

import type { CanonicalModel, EvidenceManifest, HistoryEvent } from "./model";
export declare const GENESIS_EVENT_HASH = "GENESIS";
export declare const MALFORMED_LOCK_GRACE_MS = 30000;
type CanonicalEntityId = string;
/**
 * Returns the bounded set of typed canonical entity identities whose semantic
 * value changed between two model revisions. Persistence-derived heads/hashes
 * and the revision counter itself are intentionally excluded.
 */
export declare function canonicalChangeSet(previous: CanonicalModel, next: CanonicalModel): Set<CanonicalEntityId>;
/**
 * Returns type-resolved, event-authorized canonical identities using the
 * governed previous/candidate model identity context. Context-free calls are
 * intentionally impossible because raw IDs are not canonical identities.
 */
export declare function historyCoverage(previous: CanonicalModel, next: CanonicalModel, appendedEvents: HistoryEvent[]): Set<CanonicalEntityId>;
export declare function validateCausalHistoryCoverage(previous: PersistenceSnapshot, next: PersistenceSnapshot): string[];
export interface PersistenceSnapshot {
    model: CanonicalModel;
    history: HistoryEvent[];
    evidenceManifest: EvidenceManifest;
}
export interface PersistenceValidationOptions {
    projectRoot?: string;
    verifyEvidenceBytes?: boolean;
}
export interface PersistenceValidation {
    valid: boolean;
    divergence: string[];
}
export type TransactionState = "NO_CANONICAL_STATE" | "HEALTHY_CANONICAL_STATE" | "PENDING_STAGE" | "PENDING_JOURNAL" | "PARTIAL_PROMOTION" | "DIVERGENT_LIVE_STATE" | "QUARANTINED_CANDIDATE" | "VALID_PREVIOUS_REVISION" | "UNRECOVERABLE_DIVERGENCE";
export interface TransactionStateClassification {
    state: TransactionState;
    reason: string;
    pendingFiles: string[];
    liveFiles: string[];
    previousFiles: string[];
}
export type DurabilityRole = "STAGED_MODEL" | "STAGED_HISTORY" | "STAGED_EVIDENCE_MANIFEST" | "STAGED_JOURNAL" | "PREVIOUS_MODEL" | "PREVIOUS_HISTORY" | "PREVIOUS_EVIDENCE_MANIFEST" | "RESTORED_MODEL" | "RESTORED_HISTORY" | "RESTORED_EVIDENCE_MANIFEST";
export interface DurabilityObserver {
    onDurableWrite?: (filePath: string, role: DurabilityRole) => void | Promise<void>;
    onDirectorySync?: (directoryPath: string) => void | Promise<void>;
}
export interface RecoveryResult {
    status: "COMPLETED" | "NOTHING_TO_RECOVER" | "QUARANTINED";
    state?: TransactionState;
    quarantinePath?: string;
    reason?: string;
}
export interface PersistencePaths {
    maatRoot: string;
    model: string;
    history: string;
    evidenceManifest: string;
    lock: string;
    journal: string;
    stagedModel: string;
    stagedHistory: string;
    stagedEvidenceManifest: string;
    stagedJournal: string;
    previousModel: string;
    previousHistory: string;
    previousEvidenceManifest: string;
}
export declare function persistencePaths(root: string): PersistencePaths;
export declare function hashHistoryEvent(sequence: number, type: string, payload: unknown, previousEventHash: string | null): string;
export declare function buildHistoryEvent(sequence: number, type: string, payload: unknown, previousEventHash: string | null): HistoryEvent;
export declare function validateHistoryChain(history: HistoryEvent[]): string[];
export declare function validateRevisionTransition(previous: PersistenceSnapshot, next: PersistenceSnapshot): string[];
export declare function prepareCanonicalRevision(snapshot: PersistenceSnapshot): PersistenceSnapshot;
export declare function validatePersistenceSnapshot(snapshot: PersistenceSnapshot, options?: PersistenceValidationOptions): PersistenceValidation;
export type CommitFailpoint = "AFTER_STAGED_JOURNAL" | "AFTER_JOURNAL" | "AFTER_MODEL_RENAME" | "AFTER_HISTORY_RENAME" | "AFTER_EVIDENCE_RENAME";
interface StageCanonicalRevisionOptions {
    failAfterStage?: boolean;
    failpoint?: CommitFailpoint;
    durabilityObserver?: DurabilityObserver;
    recoveryHistoryOnly?: boolean;
}
export declare function stageCanonicalRevision(root: string, snapshot: PersistenceSnapshot, options?: StageCanonicalRevisionOptions): Promise<PersistencePaths>;
export declare function readCanonicalRevisionRaw(root: string): Promise<PersistenceSnapshot>;
export declare function readCanonicalRevisionValidated(root: string): Promise<PersistenceSnapshot>;
/** Canonical/current reads are validated; use readCanonicalRevisionRaw only for diagnostics. */
export declare function readCanonicalRevision(root: string): Promise<PersistenceSnapshot>;
export declare function classifyPersistenceState(root: string): Promise<TransactionStateClassification>;
export declare function recoverStagedRevision(root: string, quarantineLabel?: string, options?: {
    durabilityObserver?: DurabilityObserver;
    allowMalformedLockRecovery?: boolean;
}): Promise<RecoveryResult>;
export {};

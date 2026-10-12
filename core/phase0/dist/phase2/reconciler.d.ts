import type { CanonicalModel, ReconciliationAmbiguity, ReconciliationCandidate, ReconciliationConflict } from "../contracts/model";
import { type PersistencePaths, type PersistenceSnapshot } from "../contracts/persistence";
import type { Phase1ScanResult } from "../phase1/scanner";
export type Phase2Ambiguity = ReconciliationAmbiguity;
export type Phase2Conflict = ReconciliationConflict;
export type Phase2Candidate = ReconciliationCandidate;
export interface Phase2ReconciliationOptions {
    root: string;
    persist?: boolean;
    initializeMaat?: boolean;
    allowExistingMaatRead?: boolean;
}
export interface Phase2ReconciliationResult {
    scanFingerprint: string;
    model: CanonicalModel;
    snapshot: PersistenceSnapshot;
    candidates: Phase2Candidate[];
    ambiguities: Phase2Ambiguity[];
    conflicts: Phase2Conflict[];
    identityStability: {
        projectId: string;
        subsystemIds: string[];
        capabilityIds: string[];
        runtimeHomeIds: string[];
        matchedPriorIds: string[];
        introducedIds: string[];
        historicalIds: string[];
    };
    moveContinuity: Array<{
        previousId: string;
        currentId: string;
        sourcePath: string;
        matchedBy: "CONTENT_HASH";
    }>;
    persistence: {
        written: boolean;
        paths?: PersistencePaths;
        maatRoot: string;
    };
    validation: {
        valid: boolean;
        issues: string[];
    };
}
export declare function phase2ObservationFingerprint(scan: Phase1ScanResult): string;
export declare function reconcilePhase2Snapshot(scan: Phase1ScanResult, previous?: PersistenceSnapshot): Phase2ReconciliationResult;
export declare function reconcilePhase2(scan: Phase1ScanResult, options: Phase2ReconciliationOptions): Promise<Phase2ReconciliationResult>;

import { type CanonicalModel } from "../contracts";
import { type Phase4DecisionReport } from "../phase4/decision-engine";
import { type G8EngineeringRealityProjection } from "./g8-engineering-reality";
import { type G9TransitionCompletionAssessment } from "./g9-transition-completion";
import { type G10SemanticHistoryDiffProjection } from "./g10-semantic-history-diff";
export declare const G11_SEMANTIC_CONFLICT_RULESET_VERSION: "hito-semantic-conflict-detection-research-v1";
export declare const G11_SEMANTIC_CONFLICT_AUTHORITY: "BOUNDED CONFLICT DETECTION / DERIVED / DETERMINISTIC / READ_ONLY / NON_CANONICAL / NON_EXECUTING";
export declare const G11_RESEARCH_REPORT_SHA256: "4b650aa0c7d1cc84763c2cbd0136093ea33b0f535df97fb0c40c434a87bf404a";
export declare const G11_MODEL_SHA256: "496fc64b59e0df7902ac5c8373cc5767b17ad680ad3205d767d41f492c49102d";
export declare const G11_CASES_SHA256: "c6e73778b25c41b9e308317e084869e1bb9c17de912e1895b54301ea92253de6";
export declare const G11_TRACEABILITY_SHA256: "319f34fb1981da7470fe4c829f9503f48e28ff29fc970babb7ff8a57f5c019a4";
export declare const G11_CONTINUITY_SHA256: "cc13474c05c8549ffd86e07ad4b6ceff5c06591ce5bed759d9d829201390d32c";
export declare const G11_MANIFEST_SHA256: "892cc8386404c87d6f3b5c0c29eb1721aae961b1ae7b9e35a03b738d6862a60f";
export type G11ConflictAssessment = "NO_CONFLICT" | "CONFLICT_DETECTED" | "INDETERMINATE";
export type G11Applicability = "REQUIRED" | "NOT_REQUIRED";
export type G11FactSetCompleteness = "COMPLETE" | "INCOMPLETE" | "UNKNOWN";
export type G11FactAuthorityState = "CURRENT" | "STALE" | "UNAVAILABLE" | "UNAUTHENTICATED" | "CONFLICTING" | "INVALID" | "UNKNOWN";
export interface G11FactAuthority {
    authorityId: string;
    state: G11FactAuthorityState;
    sourceRevision: number;
    boundRealityIdentity: string;
}
export interface G11BoundedSemanticFact {
    factId: string;
    projectId: string;
    subjectId: string;
    scopeIdentity: string;
    targetIdentity: string;
    semanticKey: string;
    acceptedMeaningIdentity: string;
    sourceBytesIdentity: string;
    causalPositionEventHash: string;
    authority: G11FactAuthority;
}
export interface G11ConflictDetectionRequest {
    projectId: string;
    subjectId: string;
    scopeIdentity: string;
    targetIdentity: string;
    semanticKey: string;
    factSetCompleteness: G11FactSetCompleteness;
    applicability: {
        phase2Reconciliation: G11Applicability;
        phase4ProtectedAuthority: G11Applicability;
        g9TransitionCompletion: G11Applicability;
    };
    facts: G11BoundedSemanticFact[];
}
export interface G11ConflictDetectionInput {
    model: CanonicalModel;
    g8Successor: G8EngineeringRealityProjection;
    g9?: G9TransitionCompletionAssessment;
    g10: G10SemanticHistoryDiffProjection;
    phase4?: Phase4DecisionReport;
    request: G11ConflictDetectionRequest;
}
export interface G11RelevantFact {
    factId: string;
    authorityId: string;
    acceptedMeaningIdentity: string;
    sourceBytesIdentity: string;
    causalPositionEventHash: string;
}
export interface G11ZeroEffectCounters {
    canonicalWriteCount: 0;
    governedTargetMutationCount: 0;
    targetExecutionCount: 0;
    providerModelCallCount: 0;
    unauthorizedNetworkCallCount: 0;
    namespaceMigrationCount: 0;
}
export interface G11SemanticConflictDetectionResult {
    kind: "HITO_G11_BOUNDED_SEMANTIC_CONFLICT_DETECTION";
    rulesetVersion: typeof G11_SEMANTIC_CONFLICT_RULESET_VERSION;
    authority: typeof G11_SEMANTIC_CONFLICT_AUTHORITY;
    assessmentId: string;
    conflictAssessment: G11ConflictAssessment;
    normalizedBoundedClaimKey: string;
    relevantFacts: G11RelevantFact[];
    ignoredUnrelatedFactIds: string[];
    phase2: {
        ambiguityAnchors: string[];
        conflictAnchors: string[];
    };
    phase4: {
        present: boolean;
        protectedSubject: boolean;
        relevantContradictionIds: string[];
        relevantContradictionCodes: string[];
    };
    sources: {
        canonicalModelRevision: number;
        canonicalModelIntegrityHash: string;
        g8SemanticRealityIdentity: string;
        g9AssessmentId: string | null;
        g10ProjectionId: string;
        causalPositionEventHash: string;
    };
    reasonCodes: string[];
    governanceBoundary: {
        detectionOnly: true;
        resolutionAuthority: false;
        resolutionPerformed: false;
        winnerSelectionPerformed: false;
        mutationEmitted: false;
    };
    zeroEffectCounters: G11ZeroEffectCounters;
    truthBoundary: string;
    limitations: string[];
}
/**
 * Detects bounded semantic conflicts without selecting a winner or changing governance.
 * Byte identities are retained only as evidence metadata; accepted semantic meaning decides compatibility.
 */
export declare function detectG11BoundedSemanticConflict(input: G11ConflictDetectionInput): G11SemanticConflictDetectionResult;

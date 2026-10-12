import type { CanonicalModel, DerivedOutput, FindingSeverity, Mutation, StalenessState } from "../contracts";
/** HITO Phase 4: deterministic derived intelligence over validated canonical truth only. */
export declare const PHASE4_RULESET_VERSION = "hito-phase4-semantic-decision-v1-repair2";
export declare const PHASE4_GENERATED_AT = "1970-01-01T00:00:00.000Z";
export type Phase4ReconciliationState = "LIVE" | "PARTIAL" | "DISCONNECTED" | "DUPLICATED" | "SUPERSEDED" | "NOT_FOUND" | "UNKNOWN";
export type Phase4NoDoubleWorkAction = "VERIFY_EXISTING" | "CONNECT_EXISTING" | "PROMOTE_TO_CANONICAL" | "ADAPT_EXISTING" | "COMPLETE_PARTIAL" | "REMOVE_DUPLICATE_AFTER_PARITY" | "RESTORE_SUPERSEDED" | "BUILD_MISSING" | "BLOCKED" | "RECOVERY_REQUIRED";
export type Phase4ContradictionCode = "COMPETING_PRIMARY_OWNER" | "COMPETING_RUNTIME_HOME" | "EQUIVALENT_CAPABILITY_CANDIDATES" | "INTENT_UNCONFIRMED" | "INTEGRATION_EXPECTATION_MISSING_EDGE" | "EVIDENCE_CLAIM_MISMATCH" | "DO_NOT_TOUCH_CONFLICT" | "LINEAGE_BLOCKS_BUILD_MISSING";
export type Phase4DriftKind = "CLAIM_DRIFT" | "MOCK_DRIFT" | "INTEGRATION_DRIFT" | "RUNTIME_GAP" | "OWNERSHIP_DRIFT" | "ROADMAP_DRIFT" | "EVIDENCE_DRIFT" | "CONFIGURATION_DRIFT" | "DUPLICATION_DRIFT" | "SCOPE_DRIFT";
export declare const PHASE4_CONTRADICTION_REPRESENTABILITY: {
    readonly COMPETING_PRIMARY_OWNER: "NOT_REPRESENTABLE_BY_CURRENT_CANONICAL_INPUT";
    readonly COMPETING_RUNTIME_HOME: "IMPLEMENTED_FROM_RECONCILIATION_TRACE";
    readonly EQUIVALENT_CAPABILITY_CANDIDATES: "IMPLEMENTED_FROM_CANONICAL_CAPABILITY_IDENTITIES";
    readonly INTENT_UNCONFIRMED: "IMPLEMENTED_FROM_CANONICAL_INTENT_AUTHORITY";
    readonly INTEGRATION_EXPECTATION_MISSING_EDGE: "NOT_REPRESENTABLE_BY_CURRENT_CANONICAL_INPUT";
    readonly EVIDENCE_CLAIM_MISMATCH: "IMPLEMENTED_FROM_CANONICAL_CLAIMS";
    readonly DO_NOT_TOUCH_CONFLICT: "IMPLEMENTED_FROM_CANONICAL_IMPLEMENTATION_REFS";
    readonly LINEAGE_BLOCKS_BUILD_MISSING: "IMPLEMENTED_FROM_CANONICAL_LINEAGE_AND_LIFECYCLE";
};
export interface Phase4EvaluationRequest {
    requestId: string;
    requestedCapability: {
        capabilityId?: string;
        name: string;
        aliases?: string[];
        promiseId?: string;
    };
    generatedAt?: string;
}
export interface Phase4Reconciliation {
    state: Phase4ReconciliationState;
    candidateCapabilityIds: string[];
    relatedCapabilityIds: string[];
    owningSubsystemIds: string[];
    currentRuntimeHomeIds: string[];
    historicalRuntimeHomeIds: string[];
    evidenceIds: string[];
    verificationStates: string[];
    claimBoundaries: string[];
    unknowns: string[];
    lineageEventIds: string[];
    relatedAmbiguityAnchors: string[];
    relatedConflictAnchors: string[];
    reason: string;
}
export interface Phase4Contradiction {
    contradictionId: string;
    code: Phase4ContradictionCode;
    severity: FindingSeverity;
    confidence: number;
    affectedEntityIds: string[];
    summary: string;
}
export interface Phase4DriftFinding {
    driftId: string;
    kind: Phase4DriftKind;
    severity: FindingSeverity;
    confidence: number;
    affectedEntityIds: string[];
    summary: string;
}
export interface Phase4DoNotTouchBoundary {
    protectedCapabilityIds: string[];
    currentRuntimeHomeIds: string[];
    stateAuthorities: string[];
    eventAuthorities: string[];
    persistenceAuthorities: string[];
    evidenceAuthorityIds: string[];
    redZones: string[];
    unaffectedCapabilityIds: string[];
}
export interface Phase4NextSafeMutation {
    mutation: Mutation;
    plainLanguageAction: string;
    reasonNextSafe: string;
    affectedPromiseId?: string;
    affectedCapabilityId?: string;
    affectedSubsystemId?: string;
    affectedRuntimePath?: string;
    expectedFiles: string[];
    expectedApis: string[];
    expectedStateAuthorities: string[];
    expectedEventAuthorities: string[];
    expectedConfiguration: string[];
    expectedDependencies: string[];
    safeZone: string[];
    unsafeZone: string[];
    userVisibleEffect: string;
    expectedRuntimeEffect: string;
    expectedEvidence: string[];
    regressionScope: string[];
    rollbackRecoveryPlan: string;
    doNotTouch: Phase4DoNotTouchBoundary;
    approvalExecutionStatus: "NON_EXECUTING_PROPOSAL";
}
export interface Phase4DecisionReport {
    kind: "HITO_PHASE4_DECISION_REPORT";
    source: {
        modelRevision: number;
        historySequence: number;
        evidenceSequence: number;
        derivedOutput: DerivedOutput;
        semanticHash: string;
    };
    request: Phase4EvaluationRequest;
    reconciliation: Phase4Reconciliation;
    noDoubleWork: {
        action: Phase4NoDoubleWorkAction;
        buildMissingBlocked: boolean;
        reason: string;
    };
    contradictions: Phase4Contradiction[];
    driftFindings: Phase4DriftFinding[];
    proposal: Phase4NextSafeMutation;
    truthBoundary: string;
}
export declare function derivePhase4Decision(model: CanonicalModel, request: Phase4EvaluationRequest): Phase4DecisionReport;
export declare function evaluatePhase4DecisionStaleness(report: Phase4DecisionReport, model: CanonicalModel): StalenessState;

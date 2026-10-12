import type { CanonicalModel } from "../contracts";
import { type Phase4DecisionReport } from "../phase4/decision-engine";
import { type Phase5ClaimRequest, type Phase5JudgeResult } from "../phase5/reality-judge";
export declare const PHASE7_RULESET_VERSION = "hito-phase7-pre-effect-assessment-v1-repair5";
export declare const PHASE7_CONTRACT_VERSION = "1.2.0";
export declare const PHASE7_AUTHORITY: "DERIVED / READ_ONLY / ADVISORY / NON_EXECUTING / NON_MUTATING";
export type EffectClass = "CREATE" | "MODIFY" | "CONNECT" | "DISCONNECT" | "CONFIGURE" | "VERIFY" | "EXECUTE_COMMAND" | "MOVE" | "REPLACE" | "DELETE" | "RECOVER" | "MIGRATE" | "OTHER_BOUNDED";
export type ObservationProvenance = "DIRECT" | "DERIVED" | "DECLARED";
export type CollectionOutcome = "OBSERVED" | "UNAVAILABLE" | "UNKNOWN";
export type ObservationFreshness = "CURRENT" | "STALE" | "UNKNOWN";
export type SemanticPermissibility = "ALLOW" | "WARN" | "BLOCK" | "UNKNOWN";
export type OperationalReadiness = "READY" | "WARN" | "BLOCK" | "UNKNOWN";
export type InformationAuthority = "SUFFICIENT" | "INSUFFICIENT" | "UNAVAILABLE" | "MALFORMED_INPUT" | "AUTHORITY_MISMATCH" | "NOT_APPLICABLE";
export type Phase5ApplicabilityState = "APPLICABLE_AUTHENTICATED_PHASE5_JUDGMENT" | "NO_APPLICABLE_PHASE5_JUDGMENT" | "UNKNOWN_PHASE5_APPLICABILITY" | "STALE_PHASE5_AUTHORITY";
export type OperationalFactKind = "REPOSITORY_BINDING" | "CWD_BINDING" | "PATH_CONTAINMENT" | "SYMLINK_CONTAINMENT" | "PROTECTED_WORKTREE_STATE" | "TOOLCHAIN_AVAILABILITY" | "EXECUTABLE_AVAILABILITY" | "SERVICE_AVAILABILITY" | "PORT_AVAILABILITY" | "PERMISSION_SUFFICIENCY";
export type PermissionOperation = "CREATE_PATH" | "MODIFY_PATH" | "CONFIGURE_SCOPE" | "CONNECT_TARGET" | "DISCONNECT_TARGET" | "VERIFY_SUBJECT" | "EXECUTE_COMMAND_ATTEMPT";
export declare const OPERATIONAL_FACT_KINDS: readonly OperationalFactKind[];
export declare const SEMANTIC_REASON_CODES: readonly ["SEM_ALREADY_SATISFIED", "SEM_DUPLICATE_CAPABILITY", "SEM_OWNER_MISMATCH", "SEM_RUNTIME_HOME_MISMATCH", "SEM_DO_NOT_TOUCH_CONFLICT", "SEM_PHASE4_ACTION_INCOMPATIBLE", "SEM_DECLARED_INTENT_CONTRADICTION", "SEM_CONTINUITY_CONTRADICTION", "SEM_UNSUPPORTED_COMPLETION_INTENT"];
export declare const OPERATIONAL_REASON_CODES: readonly ["OPS_REPOSITORY_MISMATCH", "OPS_CWD_MISMATCH", "OPS_EXECUTABLE_UNAVAILABLE", "OPS_TOOLCHAIN_UNAVAILABLE", "OPS_PROTECTED_DIRTY_STATE", "OPS_SERVICE_UNAVAILABLE", "OPS_PORT_UNAVAILABLE", "OPS_PERMISSION_INSUFFICIENT", "OPS_PATH_ESCAPE", "OPS_SYMLINK_ESCAPE"];
export declare const FRESHNESS_REASON_CODES: readonly ["FRESH_PHASE4_STALE", "FRESH_PHASE5_STALE", "FRESH_OBSERVATION_STALE"];
export declare const INFORMATION_AUTHORITY_REASON_CODES: readonly ["AUTH_PHASE4_MISMATCH", "AUTH_PHASE5_MISMATCH", "AUTH_CROSS_PROJECT_MIX", "AUTH_RULESET_MISMATCH", "AUTH_RULESET_DOWNGRADE", "PHASE4_NOT_APPLICABLE", "PHASE4_APPLICABILITY_UNKNOWN", "PHASE5_NOT_APPLICABLE", "PHASE5_APPLICABILITY_UNKNOWN", "OBSERVATION_UNAVAILABLE", "OBSERVATION_UNKNOWN", "INPUT_UNTRUSTED_CONTENT", "INPUT_MALFORMED", "INFO_INSUFFICIENT", "DIAGNOSTIC_REJECTED", "DIAGNOSTIC_SPOOFED", "OUTPUT_TAMPERED"];
export type SemanticReasonCode = typeof SEMANTIC_REASON_CODES[number];
export type OperationalReasonCode = typeof OPERATIONAL_REASON_CODES[number];
export type FreshnessReasonCode = typeof FRESHNESS_REASON_CODES[number];
export type InformationAuthorityReasonCode = typeof INFORMATION_AUTHORITY_REASON_CODES[number];
export interface BoundedActionProposal {
    subject: "ONE_BOUNDED_PROPOSED_ACTION";
    objective: string;
    effectClass: EffectClass;
    targetScope: {
        capabilityId?: string;
        ownerSubsystemId?: string;
        runtimeHomeId?: string;
        promiseId?: string;
        repositoryIdentity?: string;
        cwd?: string;
        paths?: string[];
        command?: string;
        /** Unsupported policy-bearing fields are intentionally represented so they can be rejected. */
        requiredObservationKeys?: string[];
        requiredFacts?: unknown;
        requiredChecks?: unknown;
        expectedValue?: unknown;
        expectedState?: unknown;
        expectedPredicate?: unknown;
        readinessPolicy?: unknown;
        policyOverride?: unknown;
        forceReady?: unknown;
    };
    references: string[];
    payload: unknown;
    actorClass?: string;
}
export type FactValue = {
    kind: "REPOSITORY_BINDING";
    repositoryIdentity: string;
    repositoryRoot: string;
} | {
    kind: "CWD_BINDING";
    cwd: string;
} | {
    kind: "PATH_CONTAINMENT";
    path: string;
    containment: "CONTAINED" | "ESCAPES_ROOT";
} | {
    kind: "SYMLINK_CONTAINMENT";
    path: string;
    resolution: "CONTAINED" | "ESCAPES_ROOT" | "UNRESOLVED";
} | {
    kind: "PROTECTED_WORKTREE_STATE";
    state: "CLEAN" | "DIRTY" | "PROTECTED_CONFLICT";
    protectedAuthorityIds: string[];
} | {
    kind: "TOOLCHAIN_AVAILABILITY";
    toolchainId: string;
    state: "AVAILABLE" | "UNAVAILABLE";
} | {
    kind: "EXECUTABLE_AVAILABILITY";
    executable: string;
    state: "AVAILABLE" | "UNAVAILABLE";
} | {
    kind: "SERVICE_AVAILABILITY";
    serviceId: string;
    state: "AVAILABLE" | "UNAVAILABLE";
} | {
    kind: "PORT_AVAILABILITY";
    port: number;
    state: "AVAILABLE" | "OCCUPIED" | "REACHABLE" | "UNREACHABLE";
} | {
    kind: "PERMISSION_SUFFICIENCY";
    operation: PermissionOperation;
    scope: string;
    state: "SUFFICIENT" | "INSUFFICIENT";
};
export interface BoundedObservation {
    observationKey: string;
    normalizedValue?: FactValue;
    /** Caller expectation is a forbidden structured policy-bearing field. */
    expectedValue?: unknown;
    observationProvenance: ObservationProvenance;
    collectionOutcome: CollectionOutcome;
    observationFreshness: ObservationFreshness;
    dependencyKeys?: string[];
    repositoryIdentity?: string;
    repositoryRoot?: string;
    cwd?: string;
    boundedScope: string;
    collectorIdentity: string;
    sourceIdentity: string;
    permissionBasis: string;
    limitations?: string[];
    observedAt: string;
    presentEquivalenceVerified?: boolean;
    /** Current bounded proposal association; missing association cannot qualify an observation. */
    proposalIdentity?: string;
}
export interface GenericDiagnosticInput {
    collectorIdentity: string;
    sourceKind: string;
    boundedScope: string;
    records: Array<{
        code: string;
        message: string;
        severity?: string;
    }>;
    observationProvenance: ObservationProvenance;
    collectionOutcome: CollectionOutcome;
    observationFreshness: ObservationFreshness;
    permissionBasis: string;
    observedAt: string;
    limitations?: string[];
    rejected?: boolean;
    spoofed?: boolean;
}
export interface Phase5Input {
    state: Phase5ApplicabilityState;
    request?: Phase5ClaimRequest;
    result?: Phase5JudgeResult;
}
export interface Phase7AssessmentInput {
    model: CanonicalModel;
    proposal: BoundedActionProposal;
    phase4: Phase4DecisionReport;
    phase5: Phase5Input;
    observations: BoundedObservation[];
    diagnostics?: GenericDiagnosticInput;
}
export interface Phase7ZeroEffectCounters {
    canonicalModelMutation: false;
    governedTargetSourceMutation: false;
    targetExecutionCount: 0;
    environmentWriteCount: 0;
    providerModelCallCount: 0;
    unauthorizedNetworkCallCount: 0;
    humanCommitmentImplied: false;
    executionPermissionImplied: false;
}
export interface Phase7Assessment {
    kind: "HITO_PHASE7_PRE_EFFECT_ASSESSMENT";
    assessmentId: string;
    rulesetVersion: typeof PHASE7_RULESET_VERSION;
    authority: typeof PHASE7_AUTHORITY;
    proposalIdentity: string;
    observationSetIdentity: string;
    diagnosticSetIdentity: string | "ABSENT";
    semanticPermissibility: SemanticPermissibility;
    operationalReadiness: OperationalReadiness;
    freshness: ObservationFreshness;
    contradiction: "NONE" | "PRESENT" | "UNKNOWN";
    informationAuthority: InformationAuthority;
    phase4State: "AUTHENTICATED_APPLICABLE_PHASE4" | "STALE_PHASE4_AUTHORITY" | "AUTHORITY_MISMATCH" | "NOT_APPLICABLE" | "UNKNOWN";
    phase5State: Phase5ApplicabilityState | "AUTHORITY_MISMATCH";
    semanticReasonCodes: SemanticReasonCode[];
    operationalReasonCodes: OperationalReasonCode[];
    freshnessReasonCodes: FreshnessReasonCode[];
    informationAuthorityReasonCodes: InformationAuthorityReasonCode[];
    nextGovernedRoute: "HUMAN_REVIEW_REQUIRED" | "REFRESH_AUTHORITY_REQUIRED" | "RESOLVE_CONTRADICTION_REQUIRED" | "COLLECT_PERMITTED_OBSERVATION_REQUIRED" | "NOT_APPLICABLE";
    source: {
        modelRevision: number;
        historySequence: number;
        evidenceSequence: number;
        phase4Identity: string;
        phase5IdentityOrState: string;
    };
    /** Present only after the authenticated applicable Phase-4 adapter invokes the W classifier. */
    protectedAuthorityApplicability?: ProtectedAuthorityApplicability;
    limitations: string[];
    zeroEffectCounters: Phase7ZeroEffectCounters;
}
export type ProtectedApplicabilityState = "APPLIES" | "DOES_NOT_APPLY" | "UNKNOWN";
export declare const PROTECTED_APPLICABILITY_BASIS_CODES: readonly ["CAPABILITY_PROTECTED_EXACT", "RUNTIME_HOME_PROTECTED_EXACT", "CAPABILITY_EXPLICITLY_UNAFFECTED", "PATH_APPLICABILITY_UNREPRESENTABLE", "OWNER_APPLICABILITY_UNREPRESENTABLE", "NO_EXPLICIT_NEGATIVE_AUTHORITY", "AUTHORITY_CONFLICT", "NO_TARGET_ANCHOR", "MALFORMED_PROTECTED_AUTHORITY_IDENTIFIER"];
export type ProtectedApplicabilityBasisCode = typeof PROTECTED_APPLICABILITY_BASIS_CODES[number];
export interface ProtectedAuthorityApplicability {
    state: ProtectedApplicabilityState;
    matchedScopeBasis: ProtectedApplicabilityBasisCode[];
    expectedProtectedAuthorityIds: string[];
}
type ProposalValidation = {
    valid: boolean;
    command?: NormalizedCommandSubject;
    paths: string[];
    reason?: "INPUT_MALFORMED";
};
export type NormalizedCommandSubject = {
    kind: "NORMALIZED_COMMAND_SUBJECT";
    executable: string;
    pathSubjects: string[];
    cwdDependence: "REQUIRED" | "NOT_REQUIRED";
    sourceKind: "STRUCTURED_COMMAND_REFERENCE";
};
export declare function proposalIdentity(proposal: BoundedActionProposal): string;
export declare function observationRecordContentIdentity(record: BoundedObservation, boundProposalIdentity: string): string;
export declare function observationSetIdentity(proposal: BoundedActionProposal, observations: BoundedObservation[], boundProposalIdentity?: string): string;
export declare function diagnosticSetIdentity(input: GenericDiagnosticInput | undefined): string | "ABSENT";
export declare function isClosedFactValue(value: unknown): value is FactValue;
export declare function assessPhase7PreEffect(input: Phase7AssessmentInput): Phase7Assessment;
/** Test-scoped normalized authenticated fixture; production callers use assessPhase7PreEffect. */
export declare function __testOnlyDeriveProtectedAuthorityApplicability(phase4: Phase4DecisionReport, proposal: BoundedActionProposal, validation: ProposalValidation): ProtectedAuthorityApplicability;
/** Recomputes immutable advisory output; a non-equal supplied result is explicitly untrusted. */
export declare function verifyPhase7AssessmentOutput(input: Phase7AssessmentInput, supplied: Phase7Assessment): {
    valid: boolean;
    reasonCodes: InformationAuthorityReasonCode[];
};
export {};

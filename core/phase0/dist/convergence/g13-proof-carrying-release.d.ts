import { type CanonicalModel } from "../contracts";
import { type G8EngineeringRealityProjection } from "./g8-engineering-reality";
import { type G9TransitionCompletionAssessment } from "./g9-transition-completion";
import { type G10SemanticHistoryDiffProjection } from "./g10-semantic-history-diff";
import { type G11SemanticConflictDetectionResult } from "./g11-semantic-conflict-detection";
import { type G12SemanticBranchMergeAssessment } from "./g12-semantic-branch-merge";
export declare const G13_PROOF_CARRYING_RELEASE_RULESET_VERSION: "hito-proof-carrying-release-v1";
export declare const G13_PROOF_CARRYING_RELEASE_AUTHORITY: "DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / ELIGIBILITY_ONLY";
export declare const G13_CONTRACT_SHA256: "ad7db98125cdc636dcfc0ef9b259b37aa25d54125deb9ad5517262e08ba50eca";
export declare const G13_MODEL_SHA256: "5626bf504457e14036ba16191f3de3068e4ea593949030901bddfa1106de8809";
export declare const G13_CASES_SHA256: "578573d0a1ad835d23be33480977a80c107185a834c8cc9c34fa02a63c5bdc0b";
export declare const G13_TRACEABILITY_SHA256: "fb853dd49fd1d1ba3fe3db43515e1ffb8f6337011a01df1eaddaf45a5fcdb279";
export declare const G13_CONTINUITY_SHA256: "32259af3c0349e650df503298f908fd033774a9e5c962b4faf9a7c6d668783c0";
export declare const G13_MANIFEST_SHA256: "e7cee322677057bcfbaad3a24f07bdf7a5fa2438ab0bc6bfe6a22c570b56a079";
export declare const G13_PROOF_DIMENSIONS: readonly ["INTEGRITY", "PRODUCER_AUTHENTICITY", "PRODUCER_AUTHORITY", "SUBJECT_TARGET_BINDING", "ENVIRONMENT_BINDING", "REALITY_REVISION_BINDING", "ATTEMPT_EFFECT_BINDING", "FRESHNESS_APPLICABILITY", "CHAIN_OF_CUSTODY", "REPLAY_RESISTANCE", "INDEPENDENCE_DIVERSITY", "COMPROMISE_STATUS", "PROOF_CLASS_COVERAGE", "CLAIM_SCOPE_COVERAGE", "CONTRADICTION_CONFLICT_STATUS"];
export type G13ProofDimension = typeof G13_PROOF_DIMENSIONS[number];
export type G13ReleaseEligibility = "ELIGIBLE_FOR_GOVERNED_RELEASE" | "BLOCKED" | "INDETERMINATE" | "NO_RELEASE_REQUIRED";
export type G13Applicability = "REQUIRED" | "NOT_REQUIRED";
export type G13ProofSetCompleteness = "COMPLETE" | "INCOMPLETE" | "UNKNOWN";
export type G13ProofState = "ESTABLISHED" | "MISSING" | "STALE" | "UNAVAILABLE" | "UNAUTHENTICATED" | "CONFLICTING" | "COMPROMISED" | "INSUFFICIENT" | "INVALID" | "UNKNOWN" | "NOT_REQUIRED";
export type G13EffectiveDimensionState = "ESTABLISHED" | "BLOCKED" | "INDETERMINATE" | "NOT_REQUIRED";
export interface G13ProofRequirement {
    dimension: G13ProofDimension;
    applicability: G13Applicability;
    acceptedEvidenceIdentities: string[];
    acceptedProofClasses: string[];
    acceptedProducerIdentities: string[];
    acceptedProducerAuthorityIdentities: string[];
}
export interface G13ProofEvidence {
    dimension: G13ProofDimension;
    state: G13ProofState;
    evidenceIdentity?: string;
    proofClass?: string;
    producerIdentity?: string;
    producerAuthorityIdentity?: string;
    projectId?: string;
    subjectId?: string;
    scopeIdentity?: string;
    targetIdentity?: string;
    environmentIdentity?: string;
    sourceRevision?: number;
    boundRealityIdentity?: string;
    dimensionBindingIdentity?: string;
    attemptIdentity?: string;
    effectIdentity?: string;
    limitations: string[];
}
export interface G13RequiredBindings {
    integrityIdentity: string;
    subjectTargetBindingIdentity: string;
    environmentBindingIdentity: string;
    realityRevisionBindingIdentity: string;
    attemptIdentity: string;
    effectIdentity: string;
    freshnessApplicabilityIdentity: string;
    chainOfCustodyIdentity: string;
    replayProtectionIdentity: string;
    independenceDiversityIdentity: string;
    compromiseStatusIdentity: string;
    claimScopeIdentity: string;
    contradictionConflictIdentity: string;
}
export interface G13ProofCarryingReleaseRequest {
    releaseId: string;
    projectId: string;
    subjectId: string;
    scopeIdentity: string;
    targetIdentity: string;
    environmentIdentity: string;
    realityRevision: number;
    semanticRealityIdentity: string;
    releaseApplicability: G13Applicability;
    proofSetCompleteness: G13ProofSetCompleteness;
    sourceApplicability: {
        g9TransitionCompletion: G13Applicability;
        g11ConflictDetection: G13Applicability;
    };
    requiredBindings?: G13RequiredBindings;
    requirements: G13ProofRequirement[];
    proofs: G13ProofEvidence[];
}
export interface G13ProofCarryingReleaseInput {
    model: CanonicalModel;
    g8Successor: G8EngineeringRealityProjection;
    g9?: G9TransitionCompletionAssessment;
    g10: G10SemanticHistoryDiffProjection;
    g11?: G11SemanticConflictDetectionResult;
    g12: G12SemanticBranchMergeAssessment;
    request: G13ProofCarryingReleaseRequest;
}
export interface G13ProofDimensionResult {
    dimension: G13ProofDimension;
    applicability: G13Applicability;
    declaredState: G13ProofState;
    effectiveState: G13EffectiveDimensionState;
    evidenceIdentity: string | null;
    proofClass: string | null;
    producerIdentity: string | null;
    reasonCodes: string[];
    limitations: string[];
}
export interface G13ZeroEffectCounters {
    canonicalWriteCount: 0;
    governedTargetMutationCount: 0;
    targetExecutionCount: 0;
    deploymentExecutionCount: 0;
    providerModelCallCount: 0;
    unauthorizedNetworkCallCount: 0;
    namespaceMigrationCount: 0;
}
export interface G13ProofCarryingReleaseAssessment {
    kind: "HITO_G13_PROOF_CARRYING_RELEASE_ASSESSMENT";
    rulesetVersion: typeof G13_PROOF_CARRYING_RELEASE_RULESET_VERSION;
    authority: typeof G13_PROOF_CARRYING_RELEASE_AUTHORITY;
    assessmentId: string;
    releaseId: string;
    releaseEligibility: G13ReleaseEligibility;
    proofDimensions: G13ProofDimensionResult[];
    sources: {
        canonicalModelRevision: number;
        canonicalModelIntegrityHash: string;
        semanticRealityIdentity: string;
        g9AssessmentId: string | null;
        g10ProjectionId: string;
        g11AssessmentId: string | null;
        g12AssessmentId: string;
    };
    semanticTruthBoundary: {
        integrityEstablished: boolean;
        integrityProvesSemanticTruth: false;
        testProofAloneSufficient: false;
        gitStateIsReleaseTruth: false;
    };
    governanceBoundary: {
        releaseEligibilityOnly: true;
        deploymentAuthority: false;
        deploymentExecuted: false;
        deploymentSucceeded: false;
        targetExecuted: false;
    };
    reasonCodes: string[];
    zeroEffectCounters: G13ZeroEffectCounters;
    truthBoundary: string;
    limitations: string[];
}
/**
 * Assesses proof-carrying release eligibility. It does not authorize, execute,
 * or report deployment, and it never treats integrity alone as semantic truth.
 */
export declare function assessG13ProofCarryingRelease(input: G13ProofCarryingReleaseInput): G13ProofCarryingReleaseAssessment;

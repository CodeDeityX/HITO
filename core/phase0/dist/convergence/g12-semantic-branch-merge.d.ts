import { type CanonicalModel } from "../contracts";
import { type G8EngineeringRealityComparisonResult, type G8EngineeringRealityProjection } from "./g8-engineering-reality";
import { type G9TransitionCompletionAssessment } from "./g9-transition-completion";
import { type G10SemanticHistoryDiffProjection } from "./g10-semantic-history-diff";
import { type G11SemanticConflictDetectionResult } from "./g11-semantic-conflict-detection";
export declare const G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION: "hito-semantic-branching-merge-v1";
export declare const G12_SEMANTIC_BRANCH_MERGE_AUTHORITY: "DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / CANDIDATE_ONLY";
export declare const G12_CONTRACT_SHA256: "664d6ac61a98250850a4984ce868cd136e6d283b534c4f9c4173b2b4b23591e1";
export declare const G12_MODEL_SHA256: "d9486db0ddfd108533b79d7df81a191c3dd284620a51f4d00dcd7950d4ea070d";
export declare const G12_CASES_SHA256: "7d82f2eb64b58eb43017542d7d94742f1c93192a6b3a573b618cf0f560364b4f";
export declare const G12_TRACEABILITY_SHA256: "cb6211e0a4882d4c53eb9783f4b0f8325eef725e0614638a2a4c97cc2c7bde66";
export declare const G12_CONTINUITY_SHA256: "8f3a982b4302e4206da24f78f86a746d01d4dd8b1b19fca9b99bb225e880cada";
export declare const G12_MANIFEST_SHA256: "d7cafe77117ae9c90b7d80f0de3ae630ac2db7c49661138e1fcf93363f94f9db";
export type G12BranchRelation = "SAME_LINEAGE" | "DIVERGED" | "INDETERMINATE";
export type G12MergeEligibility = "ELIGIBLE_FOR_GOVERNED_MERGE" | "BLOCKED" | "INDETERMINATE" | "NO_MERGE_REQUIRED";
export type G12Applicability = "REQUIRED" | "NOT_REQUIRED";
export type G12CommonBaseState = "ESTABLISHED" | "UNRESOLVED" | "UNAVAILABLE" | "NOT_REQUIRED";
export type G12ProtectedAuthorityState = "CURRENT" | "CONFLICTING" | "STALE" | "UNAVAILABLE" | "UNAUTHENTICATED" | "UNKNOWN" | "NOT_REQUIRED";
export interface G12BranchTipRequest {
    branchId: string;
    projectId: string;
    historyHeadEventHash: string;
    semanticRealityIdentity: string;
    sourceBytesIdentity: string;
    lineageEventIds: string[];
}
export interface G12CommonBaseEvidence {
    applicability: G12Applicability;
    state: G12CommonBaseState;
    eventHash?: string;
    lineageEventId?: string;
}
export interface G12ProtectedAuthorityEvidence {
    applicability: G12Applicability;
    state: G12ProtectedAuthorityState;
    authorityId?: string;
    projectId?: string;
    subjectId?: string;
    scopeIdentity?: string;
    targetIdentity?: string;
    sourceRevision?: number;
    boundRealityIdentity?: string;
}
export interface G12SemanticBranchMergeRequest {
    projectId: string;
    subjectId: string;
    scopeIdentity: string;
    targetIdentity: string;
    mergeApplicability: G12Applicability;
    g9CompletionApplicability: G12Applicability;
    g11ConflictApplicability: G12Applicability;
    predecessorTip: G12BranchTipRequest;
    successorTip: G12BranchTipRequest;
    commonBase: G12CommonBaseEvidence;
    protectedAuthority: G12ProtectedAuthorityEvidence;
}
export interface G12SemanticBranchMergeInput {
    model: CanonicalModel;
    predecessor: G8EngineeringRealityProjection;
    successor: G8EngineeringRealityProjection;
    comparison: G8EngineeringRealityComparisonResult;
    g9?: G9TransitionCompletionAssessment;
    g10: G10SemanticHistoryDiffProjection;
    g11?: G11SemanticConflictDetectionResult;
    request: G12SemanticBranchMergeRequest;
}
export interface G12ZeroEffectCounters {
    canonicalWriteCount: 0;
    governedTargetMutationCount: 0;
    targetExecutionCount: 0;
    mergeExecutionCount: 0;
    providerModelCallCount: 0;
    unauthorizedNetworkCallCount: 0;
    namespaceMigrationCount: 0;
}
export interface G12SemanticBranchMergeAssessment {
    kind: "HITO_G12_SEMANTIC_BRANCH_MERGE_ASSESSMENT";
    rulesetVersion: typeof G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION;
    authority: typeof G12_SEMANTIC_BRANCH_MERGE_AUTHORITY;
    assessmentId: string;
    branchRelation: G12BranchRelation;
    semanticTipRelation: G8EngineeringRealityComparisonResult["semanticComparison"];
    mergeEligibility: G12MergeEligibility;
    branchTips: {
        predecessor: G12BranchTipRequest;
        successor: G12BranchTipRequest;
    };
    commonBase: {
        applicability: G12Applicability;
        state: G12CommonBaseState;
        eventHash: string | null;
        lineageEventId: string | null;
        establishedByExistingHistoryAndLineage: boolean;
    };
    protectedAuthority: {
        applicability: G12Applicability;
        state: G12ProtectedAuthorityState;
        authorityId: string | null;
    };
    mergeCandidate: {
        present: boolean;
        candidateId: string | null;
        provesMergedReality: false;
        mergedReality: false;
    };
    g9CompletionOwner: {
        remainsG9: true;
        assessmentId: string | null;
        completionAssessment: G9TransitionCompletionAssessment["completionAssessment"] | null;
        provesMergeCompletion: false;
    };
    sources: {
        canonicalModelRevision: number;
        canonicalModelIntegrityHash: string;
        predecessorSemanticRealityIdentity: string;
        successorSemanticRealityIdentity: string;
        g8ComparisonId: string;
        g9AssessmentId: string | null;
        g10ProjectionId: string;
        g11AssessmentId: string | null;
    };
    reasonCodes: string[];
    governanceBoundary: {
        derivedOnly: true;
        canonicalAuthority: false;
        mergeAuthority: false;
        mergeExecuted: false;
        mergedRealityFabricated: false;
        g9RemainsCompletionOwner: true;
    };
    zeroEffectCounters: G12ZeroEffectCounters;
    truthBoundary: string;
    limitations: string[];
}
/**
 * Assesses branch relation and a bounded merge candidate from existing G8-G11,
 * canonical lineage, and G10 history authority. It cannot produce merged reality.
 */
export declare function assessG12SemanticBranchMerge(input: G12SemanticBranchMergeInput): G12SemanticBranchMergeAssessment;

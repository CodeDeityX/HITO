import { type CanonicalModel } from "../contracts";
import type { Phase4DecisionReport } from "../phase4/decision-engine";
import type { Phase5JudgeResult } from "../phase5/reality-judge";
import type { Phase7Assessment } from "../phase7/peg";
import { type G8EngineeringRealityComparisonResult, type G8EngineeringRealityProjection } from "./g8-engineering-reality";
export declare const G9_TRANSITION_COMPLETION_RULESET_VERSION: "hito-semantic-transition-completion-v1-repair1";
export declare const G9_TRANSITION_COMPLETION_AUTHORITY: "DERIVED / READ_ONLY / ASSESSMENT_ONLY / NON_CANONICAL / NON_EXECUTING";
export type G9CompletionAssessment = "COMPLETE" | "NOT_COMPLETE" | "INDETERMINATE" | "NO_SEMANTIC_TRANSITION";
export type G9TransitionDisposition = "SUCCEEDED" | "FAILED" | "ABORTED" | "ROLLED_BACK" | "PARTIAL" | "NONE";
export type G9Applicability = "REQUIRED" | "NOT_REQUIRED";
export type G9CriterionState = "ESTABLISHED" | "NOT_ESTABLISHED" | "INDETERMINATE" | "NOT_REQUIRED";
export type G9AuthorityState = "CURRENT" | "STALE" | "UNAVAILABLE" | "UNAUTHENTICATED" | "CONFLICTING" | "INVALID" | "UNKNOWN";
export type G9RecoveryState = "NOT_REQUIRED" | "NOT_INVOKED" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "INDETERMINATE";
export type G9StageState = G9CriterionState;
export declare const G9_COMPLETION_CRITERIA: readonly ["GOVERNED_MUTATION_INTENT", "COMMITMENT_AUTHORITY", "AUTHORIZED_ATTEMPT_EFFECT", "POST_EFFECT_OBSERVATION", "REQUIRED_INTEGRATION", "EVIDENCE_PLAN_SATISFIED", "PHASE5_BOUNDED_CLAIM_SUPPORT", "CAUSAL_ATTRIBUTION", "NO_BLOCKING_CONTRADICTION", "NO_AUTHORITY_CONFLICT", "CORRECT_TARGET", "NO_REQUIRED_UNRESOLVED_UNKNOWN", "NO_STALE_REQUIRED_PROOF", "NO_PROTECTED_AUTHORITY_VIOLATION", "NO_UNAUTHORIZED_DUPLICATE", "BOUNDED_CLAIM_AND_LIMITATIONS", "NO_DOUBLE_WORK_VIOLATION"];
export type G9CompletionCriterion = typeof G9_COMPLETION_CRITERIA[number];
export type G9AuthorityKind = "GOVERNED_MUTATION_INTENT" | "ACCEPTED_COMMITMENT" | "AUTHORIZED_ATTEMPT_EFFECT" | "POST_EFFECT_OBSERVATION" | "INTEGRATION_CONFIRMATION" | "EVIDENCE_PLAN_ATTESTATION" | "PHASE5_BOUNDED_SUPPORT" | "CAUSAL_ATTRIBUTION" | "CONTRADICTION_CLEARANCE" | "AUTHORITY_CONFLICT_CLEARANCE" | "TARGET_BINDING" | "UNKNOWN_CLEARANCE" | "FRESHNESS_CLEARANCE" | "PROTECTED_AUTHORITY_CLEARANCE" | "DUPLICATE_CLEARANCE" | "BOUNDED_CLAIM_AUTHORITY" | "NO_DOUBLE_WORK_CLEARANCE" | "OPERATIONAL_DISPOSITION" | "RECOVERY_AUTHORITY";
export declare const G9_CRITERION_AUTHORITY_KINDS: Readonly<Record<G9CompletionCriterion, G9AuthorityKind>>;
export interface G9BoundAuthority {
    authorityId: string;
    kind: G9AuthorityKind;
    state: G9AuthorityState;
    subjectId: string;
    scopeIdentity: string;
    targetIdentity: string;
    sourceRevision: number;
    boundRealityIdentity: string;
}
export interface G9CriterionAssessmentInput {
    applicability: G9Applicability;
    state: G9CriterionState;
    authority?: G9BoundAuthority;
    limitations: string[];
}
export type G9CriteriaInput = Record<G9CompletionCriterion, G9CriterionAssessmentInput>;
export interface G9DispositionEvidence {
    state: "ESTABLISHED" | "NOT_ESTABLISHED" | "INDETERMINATE";
    disposition: G9TransitionDisposition;
    authority?: G9BoundAuthority;
}
export interface G9RecoveryInput {
    applicability: G9Applicability;
    state: G9RecoveryState;
    authority?: G9BoundAuthority;
}
export interface G9BoundedClaim {
    claimIdentity: string;
    subjectId: string;
    scopeIdentity: string;
    limitations: string[];
}
export interface G9TransitionAssessmentRequest {
    transitionId: string;
    subjectId: string;
    scopeIdentity: string;
    targetIdentity: string;
    executionApplicability: G9Applicability;
    boundedClaim: G9BoundedClaim;
    criteria: G9CriteriaInput;
    dispositionEvidence: G9DispositionEvidence;
    recovery: G9RecoveryInput;
}
export interface G9TransitionAssessmentInput {
    predecessorModel: CanonicalModel;
    successorModel: CanonicalModel;
    predecessor: G8EngineeringRealityProjection;
    successor: G8EngineeringRealityProjection;
    comparison: G8EngineeringRealityComparisonResult;
    request: G9TransitionAssessmentRequest;
    phase4?: Phase4DecisionReport;
    phase5?: Phase5JudgeResult;
    phase7?: Phase7Assessment;
}
export interface G9CriterionResult {
    criterion: G9CompletionCriterion;
    applicability: G9Applicability | "MISSING";
    declaredState: G9CriterionState | "MISSING";
    effectiveState: G9CriterionState;
    authorityId: string | null;
    reasonCodes: string[];
    limitations: string[];
}
export interface G9ZeroEffectCounters {
    canonicalWriteCount: 0;
    governedTargetMutationCount: 0;
    targetExecutionCount: 0;
    providerModelCallCount: 0;
    unauthorizedNetworkCallCount: 0;
    namespaceMigrationCount: 0;
}
export interface G9TransitionCompletionAssessment {
    kind: "HITO_G9_SEMANTIC_TRANSITION_COMPLETION_ASSESSMENT";
    rulesetVersion: typeof G9_TRANSITION_COMPLETION_RULESET_VERSION;
    authority: typeof G9_TRANSITION_COMPLETION_AUTHORITY;
    assessmentId: string;
    transitionId: string;
    completionAssessment: G9CompletionAssessment;
    transitionDisposition: G9TransitionDisposition;
    recoveryAssessment: G9RecoveryState;
    semanticComparison: G8EngineeringRealityComparisonResult["semanticComparison"];
    contextDelta: G8EngineeringRealityComparisonResult["contextDelta"];
    stages: {
        proposed: G9StageState;
        committed: G9StageState;
        attempted: G9StageState;
        observed: G9StageState;
        integrated: G9StageState;
        evidenced: G9StageState;
        judged: G9StageState;
        complete: G9CompletionAssessment;
    };
    criteria: G9CriterionResult[];
    predecessorSemanticIdentity: string;
    successorSemanticIdentity: string;
    comparisonId: string;
    phase4Proposal: {
        present: boolean;
        authorityId: string | null;
        provesCommitment: false;
        provesExecution: false;
    };
    phase7Advisory: {
        present: boolean;
        assessmentId: string | null;
        provesCommitment: false;
        provesExecution: false;
    };
    reasonCodes: string[];
    zeroEffectCounters: G9ZeroEffectCounters;
    truthBoundary: string;
    limitations: string[];
}
/** Pure repaired G9 assessment. It consumes exact G8 meaning and never executes or persists a transition. */
export declare function assessG9SemanticTransitionCompletion(input: G9TransitionAssessmentInput): G9TransitionCompletionAssessment;

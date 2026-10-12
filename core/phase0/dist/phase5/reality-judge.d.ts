import type { CanonicalModel, DerivedOutput, EntityProvenance, FindingSeverity, StalenessState } from "../contracts";
import { type Phase4DecisionReport } from "../phase4/decision-engine";
/** HITO Phase 5 Repair 1: deterministic derived claim/evidence legitimacy judgment. */
export declare const PHASE5_RULESET_VERSION = "hito-phase5-reality-judge-v1-repair3-completion";
export declare const PHASE5_GENERATED_AT = "1970-01-01T00:00:00.000Z";
export type Phase5Verdict = "VERIFIED_CONTINUITY" | "VERIFIED_WITH_OBSERVATIONS" | "RECONCILIATION_REQUIRED" | "REPAIR_REQUIRED" | "BLOCKED" | "INDETERMINATE" | "COURSE_CHANGE_REQUIRED";
export type Phase5EvidenceState = "PRESENT_CURRENT" | "PRESENT_STALE" | "PRESENT_PARTIAL" | "PRESENT_CONTRADICTORY" | "MISSING" | "UNREADABLE_OR_INVALID" | "OUT_OF_SCOPE" | "UNKNOWN";
export type Phase5ProofClass = "SOURCE_PROOF" | "STATIC_PROOF" | "BUILD_PROOF" | "TEST_PROOF" | "INTEGRATION_PROOF" | "RUNTIME_PROOF" | "USER_JOURNEY_PROOF" | "RECOVERY_PROOF";
export type Phase5RecoveryAssessment = "RECOVERY_PROVEN" | "RECOVERY_EVIDENCE_PARTIAL" | "RECOVERY_UNPROVEN" | "RECOVERY_CONTRADICTED" | "RECOVERY_NOT_APPLICABLE" | "UNKNOWN";
export type Phase5ReturnStep = "INTENT" | "REALITY_SIGNAL" | "CONTRADICTION_GATE" | "RECONCILIATION" | "INTEGRATION" | "EVIDENCE_COLLECTION" | "REPAIR" | "RECOVERY" | "COURSE_CHANGE_DECISION";
export interface Phase5ProofAttestation {
    attestationId: string;
    evidenceId: string;
    evidenceContentHash: string;
    proofClass: Phase5ProofClass;
    truthBoundary: string;
    declaredScope: string;
    sourceAuthority: string;
    sourceModelRevision: number;
    attestationKind: "PHASE5_PROOF" | "DIRECTION_INVALIDATION";
}
export interface Phase5EvidenceBinding {
    evidenceId: string;
    proofClass: Phase5ProofClass;
    truthBoundary: string;
    declaredScope: string;
    attestationId?: string;
}
export interface Phase5ClaimRequest {
    claimId: string;
    claimType: string;
    subjectType: "CAPABILITY" | "PROJECT" | "RECOVERY";
    subjectId: string;
    statement: string;
    truthBoundary: string;
    requiredEvidenceClasses: Phase5ProofClass[];
    declaredScope: string;
    sourceAuthority: string;
    requestedAtContext: string;
    requestId: string;
    promiseId?: string;
    requiresIntentAuthority?: boolean;
    completionLike?: boolean;
    evidenceBindings?: Phase5EvidenceBinding[];
    proofAttestations?: Phase5ProofAttestation[];
    directionInvalidationEvidenceIds?: string[];
}
export interface Phase5EvidenceAssessment {
    evidenceId: string;
    subjectId: string;
    proofClass: Phase5ProofClass;
    state: Phase5EvidenceState;
    relevance: "RELEVANT" | "WRONG_SUBJECT" | "OUT_OF_SCOPE" | "UNKNOWN";
    strength: "SUFFICIENT" | "INSUFFICIENT" | "UNKNOWN";
    reason: string;
}
export interface Phase5JudgeResult {
    kind: "HITO_PHASE5_REALITY_JUDGE_RESULT";
    judgeResultId: string;
    claimId: string;
    subject: {
        type: string;
        id: string;
    };
    verdict: Phase5Verdict;
    truthBoundary: string;
    claimScope: string;
    requiredProof: Phase5ProofClass[];
    availableEvidence: Phase5EvidenceAssessment[];
    acceptedEvidence: string[];
    rejectedEvidence: string[];
    staleEvidence: string[];
    contradictions: string[];
    unknowns: string[];
    observations: string[];
    severity: FindingSeverity;
    confidence: number;
    supportedNarrowerClaimIfAny?: string;
    recoveryAssessment: Phase5RecoveryAssessment;
    returnStepIfFailed?: Phase5ReturnStep;
    reasoningSummary: string;
    sourceModelRevision: number;
    sourceHistoryHead: CanonicalModel["canonicalState"]["historyHead"];
    sourceEvidenceHead: CanonicalModel["canonicalState"]["evidenceHead"];
    sourcePhase4DecisionId: string;
    rulesetVersion: string;
    generatedAt: string;
    provenance: EntityProvenance;
    stalenessState: StalenessState;
    executionAuthority: "NON_EXECUTING_JUDGMENT";
    derivedOutput: DerivedOutput;
}
export declare function derivePhase5RealityJudge(model: CanonicalModel, request: Phase5ClaimRequest, phase4: Phase4DecisionReport): Phase5JudgeResult;
export declare const evaluatePhase5JudgeStaleness: (result: Phase5JudgeResult, model: CanonicalModel) => StalenessState;

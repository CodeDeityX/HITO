import { type CanonicalModel, type HistoryEvent } from "../contracts";
import { PHASE3_RULESET_VERSION, type Phase3ProjectionBundle } from "../phase3/projection";
import { PHASE4_RULESET_VERSION, type Phase4DecisionReport, type Phase4EvaluationRequest } from "../phase4/decision-engine";
import { PHASE5_RULESET_VERSION, type Phase5ClaimRequest, type Phase5JudgeResult } from "../phase5/reality-judge";
import { PHASE6_RULESET_VERSION, type Phase6ProjectionPair } from "../phase6/projection";
import { PHASE7_CONTRACT_VERSION, PHASE7_RULESET_VERSION, type BoundedActionProposal, type BoundedObservation, type GenericDiagnosticInput, type Phase5ApplicabilityState, type Phase7Assessment } from "../phase7/peg";
import { G8_ENGINEERING_REALITY_RULESET_VERSION, type G8EngineeringRealityComparisonResult, type G8EngineeringRealityProjection, type G8EngineeringRealityRequest } from "./g8-engineering-reality";
import { G9_TRANSITION_COMPLETION_RULESET_VERSION, type G9TransitionAssessmentRequest, type G9TransitionCompletionAssessment } from "./g9-transition-completion";
import { G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION, type G10SemanticHistoryDiffProjection, type G10SemanticHistoryDiffRequest } from "./g10-semantic-history-diff";
import { G11_SEMANTIC_CONFLICT_RULESET_VERSION, type G11ConflictDetectionRequest, type G11SemanticConflictDetectionResult } from "./g11-semantic-conflict-detection";
import { G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION, type G12SemanticBranchMergeAssessment, type G12SemanticBranchMergeRequest } from "./g12-semantic-branch-merge";
import { G13_PROOF_CARRYING_RELEASE_RULESET_VERSION, type G13ProofCarryingReleaseAssessment, type G13ProofCarryingReleaseRequest } from "./g13-proof-carrying-release";
import { G14_ORGANISM_FEDERATED_OBSERVATION_RULESET_VERSION, type G14FederatedObservationRequest, type G14OrganismFederatedObservationProjection } from "./g14-organism-federated-observation";
import { G15_UNIVERSAL_PROTOCOL_PROJECTION_RULESET_VERSION, type G15UniversalProtocolProjectionEnvelope, type G15UniversalProtocolProjectionRequest } from "./g15-universal-protocol-projection";
import { G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION, type G16InstallabilityMigrationRecoveryAssessment, type G16InstallabilityMigrationRecoveryRequest } from "./g16-installability-migration-recovery";
export declare const HITO_C1_COMPOSITION_CONTRACT_VERSION: "1.0.0";
export declare const HITO_C1_COMPOSITION_RULESET_VERSION: "hito-1.0-c1-composition-spine-v1";
export declare const HITO_C1_COMPOSITION_AUTHORITY: "DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING";
export declare const HITO_C2_COMPOSITION_CONTRACT_VERSION: "1.0.0";
export declare const HITO_C2_COMPOSITION_RULESET_VERSION: "hito-1.0-c2-g8-g9-semantic-kernel-v1";
export declare const HITO_C2_COMPOSITION_AUTHORITY: "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING";
export declare const HITO_C3_COMPOSITION_CONTRACT_VERSION: "1.0.0";
export declare const HITO_C3_COMPOSITION_RULESET_VERSION: "hito-1.0-c3-g10-g11-history-diff-conflict-v1";
export declare const HITO_C3_COMPOSITION_AUTHORITY: "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / DETECTION_NOT_RESOLUTION";
export declare const HITO_C4_COMPOSITION_CONTRACT_VERSION: "1.0.0";
export declare const HITO_C4_COMPOSITION_RULESET_VERSION: "hito-1.0-c4-g12-g13-branch-merge-release-v1";
export declare const HITO_C4_COMPOSITION_AUTHORITY: "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / ELIGIBILITY_NOT_EXECUTION";
export declare const HITO_C5_COMPOSITION_CONTRACT_VERSION: "1.0.0";
export declare const HITO_C5_COMPOSITION_RULESET_VERSION: "hito-1.0-c5-g14-organism-federated-observation-v1";
export declare const HITO_C5_COMPOSITION_AUTHORITY: "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / BOUNDED_OBSERVATION_ONLY";
export declare const HITO_C6_COMPOSITION_CONTRACT_VERSION: "1.0.0";
export declare const HITO_C6_COMPOSITION_RULESET_VERSION: "hito-1.0-c6-g15-universal-protocol-projection-v1";
export declare const HITO_C6_COMPOSITION_AUTHORITY: "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / PROJECTION_ONLY";
export declare const HITO_C7_COMPOSITION_CONTRACT_VERSION: "1.0.0";
export declare const HITO_C7_COMPOSITION_RULESET_VERSION: "hito-1.0-c7-g16-installability-migration-recovery-v1";
export declare const HITO_C7_COMPOSITION_AUTHORITY: "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NONEXECUTING / BOUNDED OPERATIONAL ASSESSMENT ONLY";
type ExplicitNonApplicablePhase5State = Exclude<Phase5ApplicabilityState, "APPLICABLE_AUTHENTICATED_PHASE5_JUDGMENT">;
export interface HitoC1Phase7Request {
    proposal: BoundedActionProposal;
    observations: BoundedObservation[];
    diagnostics?: GenericDiagnosticInput;
    /** Required when this composition call has no Phase-5 request. Never inferred by C1. */
    phase5Applicability?: ExplicitNonApplicablePhase5State;
}
export interface HitoC1CompositionInput {
    model: CanonicalModel;
    phase4Request?: Phase4EvaluationRequest;
    phase5Request?: Phase5ClaimRequest;
    phase7Request?: HitoC1Phase7Request;
}
export type HitoC1PersistedCompositionInput = Omit<HitoC1CompositionInput, "model">;
export interface HitoC2PredecessorRealityRequest {
    model: CanonicalModel;
    request: G8EngineeringRealityRequest;
}
export interface HitoC2G8CompositionRequest {
    current: G8EngineeringRealityRequest;
    predecessor?: HitoC2PredecessorRealityRequest;
}
export interface HitoC2CompositionInput extends HitoC1CompositionInput {
    g8Request: HitoC2G8CompositionRequest;
    /** Requires g8Request.predecessor; G8/G9 authorities are always derived in this call. */
    g9Request?: G9TransitionAssessmentRequest;
}
export type HitoC2PersistedCompositionInput = Omit<HitoC2CompositionInput, "model">;
export interface HitoC3G10CompositionRequest {
    predecessorHistory: HistoryEvent[];
    successorHistory: HistoryEvent[];
    request: G10SemanticHistoryDiffRequest;
}
export interface HitoC3PersistedG10CompositionRequest {
    predecessorHistory: HistoryEvent[];
    request: G10SemanticHistoryDiffRequest;
}
export interface HitoC3CompositionInput extends HitoC2CompositionInput {
    g10Request: HitoC3G10CompositionRequest;
    g11Request?: G11ConflictDetectionRequest;
}
export type HitoC3PersistedCompositionInput = Omit<HitoC3CompositionInput, "model" | "g10Request"> & {
    g10Request: HitoC3PersistedG10CompositionRequest;
};
export interface HitoC4CompositionInput extends HitoC3CompositionInput {
    g12Request: G12SemanticBranchMergeRequest;
    g13Request?: G13ProofCarryingReleaseRequest;
}
export type HitoC4PersistedCompositionInput = Omit<HitoC4CompositionInput, "model" | "g10Request"> & {
    g10Request: HitoC3PersistedG10CompositionRequest;
};
export interface HitoC5CompositionInput extends HitoC4CompositionInput {
    g14Request: G14FederatedObservationRequest;
}
export type HitoC5PersistedCompositionInput = Omit<HitoC5CompositionInput, "model" | "g10Request"> & {
    g10Request: HitoC3PersistedG10CompositionRequest;
};
export interface HitoC6CompositionInput extends HitoC5CompositionInput {
    g15Request: G15UniversalProtocolProjectionRequest;
}
export type HitoC6PersistedCompositionInput = Omit<HitoC6CompositionInput, "model" | "g10Request"> & {
    g10Request: HitoC3PersistedG10CompositionRequest;
};
export interface HitoC7CompositionInput extends HitoC6CompositionInput {
    g16Request: G16InstallabilityMigrationRecoveryRequest;
}
export type HitoC7PersistedCompositionInput = Omit<HitoC7CompositionInput, "model" | "g10Request"> & {
    g10Request: HitoC3PersistedG10CompositionRequest;
};
export interface HitoC1CompositionSnapshot {
    kind: "HITO_1_0_C1_COMPOSITION_SNAPSHOT";
    contract: {
        contractVersion: typeof HITO_C1_COMPOSITION_CONTRACT_VERSION;
        rulesetVersion: typeof HITO_C1_COMPOSITION_RULESET_VERSION;
        authority: typeof HITO_C1_COMPOSITION_AUTHORITY;
    };
    compositionId: string;
    source: {
        sourceIdentity: string;
        canonicalModelRevision: number;
        canonicalModelIntegrityHash: string;
        historyHead: CanonicalModel["canonicalState"]["historyHead"];
        evidenceHead: CanonicalModel["canonicalState"]["evidenceHead"];
    };
    rulesets: {
        c1: typeof HITO_C1_COMPOSITION_RULESET_VERSION;
        phase3: typeof PHASE3_RULESET_VERSION;
        phase4: typeof PHASE4_RULESET_VERSION | null;
        phase5: typeof PHASE5_RULESET_VERSION | null;
        phase6: typeof PHASE6_RULESET_VERSION | null;
        phase7: typeof PHASE7_RULESET_VERSION | null;
        phase7Contract: typeof PHASE7_CONTRACT_VERSION | null;
    };
    presence: {
        phase3: true;
        phase4: boolean;
        phase5: boolean;
        phase6: boolean;
        phase7: boolean;
    };
    phase3: Phase3ProjectionBundle;
    phase4?: Phase4DecisionReport;
    phase5?: Phase5JudgeResult;
    phase6?: Phase6ProjectionPair;
    phase7?: Phase7Assessment;
    laterSemanticAuthority: {
        g8: false;
        g9: false;
        g10Plus: false;
    };
    zeroEffectCounters: {
        canonicalWriteCount: 0;
        governedTargetMutationCount: 0;
        targetExecutionCount: 0;
        providerModelCallCount: 0;
        networkCallCount: 0;
        namespaceMigrationCount: 0;
    };
    truthBoundary: string;
    limitations: string[];
}
export interface HitoC2CompositionSnapshot {
    kind: "HITO_1_0_C2_COMPOSITION_SNAPSHOT";
    contract: {
        contractVersion: typeof HITO_C2_COMPOSITION_CONTRACT_VERSION;
        rulesetVersion: typeof HITO_C2_COMPOSITION_RULESET_VERSION;
        authority: typeof HITO_C2_COMPOSITION_AUTHORITY;
    };
    compositionId: string;
    c1: HitoC1CompositionSnapshot;
    rulesets: {
        c2: typeof HITO_C2_COMPOSITION_RULESET_VERSION;
        g8: typeof G8_ENGINEERING_REALITY_RULESET_VERSION;
        g9: typeof G9_TRANSITION_COMPLETION_RULESET_VERSION | null;
    };
    presence: {
        g8: true;
        g8Comparison: boolean;
        g9: boolean;
    };
    g8: {
        successor: G8EngineeringRealityProjection;
        predecessor?: G8EngineeringRealityProjection;
        comparison?: G8EngineeringRealityComparisonResult;
    };
    g9?: G9TransitionCompletionAssessment;
    laterSemanticAuthority: {
        g8: true;
        g9: boolean;
        g10Plus: false;
    };
    zeroEffectCounters: {
        canonicalWriteCount: 0;
        governedTargetMutationCount: 0;
        targetExecutionCount: 0;
        providerModelCallCount: 0;
        networkCallCount: 0;
        namespaceMigrationCount: 0;
    };
    truthBoundary: string;
    limitations: string[];
}
export interface HitoC3CompositionSnapshot {
    kind: "HITO_1_0_C3_COMPOSITION_SNAPSHOT";
    contract: {
        contractVersion: typeof HITO_C3_COMPOSITION_CONTRACT_VERSION;
        rulesetVersion: typeof HITO_C3_COMPOSITION_RULESET_VERSION;
        authority: typeof HITO_C3_COMPOSITION_AUTHORITY;
    };
    compositionId: string;
    c2: HitoC2CompositionSnapshot;
    rulesets: {
        c3: typeof HITO_C3_COMPOSITION_RULESET_VERSION;
        g10: typeof G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION;
        g11: typeof G11_SEMANTIC_CONFLICT_RULESET_VERSION | null;
    };
    presence: {
        g10: true;
        g11: boolean;
    };
    g10: G10SemanticHistoryDiffProjection;
    g11?: G11SemanticConflictDetectionResult;
    laterSemanticAuthority: {
        g8: true;
        g9: boolean;
        g10: true;
        g11: boolean;
        g12Plus: false;
    };
    zeroEffectCounters: {
        canonicalWriteCount: 0;
        governedTargetMutationCount: 0;
        targetExecutionCount: 0;
        providerModelCallCount: 0;
        networkCallCount: 0;
        namespaceMigrationCount: 0;
    };
    truthBoundary: string;
    limitations: string[];
}
export interface HitoC4CompositionSnapshot {
    kind: "HITO_1_0_C4_COMPOSITION_SNAPSHOT";
    contract: {
        contractVersion: typeof HITO_C4_COMPOSITION_CONTRACT_VERSION;
        rulesetVersion: typeof HITO_C4_COMPOSITION_RULESET_VERSION;
        authority: typeof HITO_C4_COMPOSITION_AUTHORITY;
    };
    compositionId: string;
    c3: HitoC3CompositionSnapshot;
    rulesets: {
        c4: typeof HITO_C4_COMPOSITION_RULESET_VERSION;
        g12: typeof G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION;
        g13: typeof G13_PROOF_CARRYING_RELEASE_RULESET_VERSION | null;
    };
    presence: {
        g12: true;
        g13: boolean;
    };
    g12: G12SemanticBranchMergeAssessment;
    g13?: G13ProofCarryingReleaseAssessment;
    laterSemanticAuthority: {
        g8: true;
        g9: boolean;
        g10: true;
        g11: boolean;
        g12: true;
        g13: boolean;
        g14Plus: false;
    };
    zeroEffectCounters: {
        canonicalWriteCount: 0;
        governedTargetMutationCount: 0;
        targetExecutionCount: 0;
        mergeExecutionCount: 0;
        deploymentExecutionCount: 0;
        providerModelCallCount: 0;
        networkCallCount: 0;
        namespaceMigrationCount: 0;
    };
    truthBoundary: string;
    limitations: string[];
}
export interface HitoC5CompositionSnapshot {
    kind: "HITO_1_0_C5_COMPOSITION_SNAPSHOT";
    contract: {
        contractVersion: typeof HITO_C5_COMPOSITION_CONTRACT_VERSION;
        rulesetVersion: typeof HITO_C5_COMPOSITION_RULESET_VERSION;
        authority: typeof HITO_C5_COMPOSITION_AUTHORITY;
    };
    compositionId: string;
    c4: HitoC4CompositionSnapshot;
    rulesets: {
        c5: typeof HITO_C5_COMPOSITION_RULESET_VERSION;
        g14: typeof G14_ORGANISM_FEDERATED_OBSERVATION_RULESET_VERSION;
    };
    presence: {
        g14: true;
    };
    g14: G14OrganismFederatedObservationProjection;
    laterSemanticAuthority: {
        g8: true;
        g9: boolean;
        g10: true;
        g11: boolean;
        g12: true;
        g13: boolean;
        g14: true;
        g15Plus: false;
    };
    zeroEffectCounters: {
        canonicalWriteCount: 0;
        governedTargetMutationCount: 0;
        targetExecutionCount: 0;
        mergeExecutionCount: 0;
        deploymentExecutionCount: 0;
        providerModelCallCount: 0;
        networkCallCount: 0;
        namespaceMigrationCount: 0;
    };
    truthBoundary: string;
    limitations: string[];
}
export interface HitoC6CompositionSnapshot {
    kind: "HITO_1_0_C6_COMPOSITION_SNAPSHOT";
    contract: {
        contractVersion: typeof HITO_C6_COMPOSITION_CONTRACT_VERSION;
        rulesetVersion: typeof HITO_C6_COMPOSITION_RULESET_VERSION;
        authority: typeof HITO_C6_COMPOSITION_AUTHORITY;
    };
    compositionId: string;
    c5: HitoC5CompositionSnapshot;
    rulesets: {
        c6: typeof HITO_C6_COMPOSITION_RULESET_VERSION;
        g15: typeof G15_UNIVERSAL_PROTOCOL_PROJECTION_RULESET_VERSION;
    };
    presence: {
        g15: true;
    };
    g15: G15UniversalProtocolProjectionEnvelope;
    laterSemanticAuthority: {
        g8: true;
        g9: boolean;
        g10: true;
        g11: boolean;
        g12: true;
        g13: boolean;
        g14: true;
        g15: true;
        g16Plus: false;
    };
    zeroEffectCounters: {
        canonicalWriteCount: 0;
        governedTargetMutationCount: 0;
        targetExecutionCount: 0;
        mergeExecutionCount: 0;
        deploymentExecutionCount: 0;
        providerModelCallCount: 0;
        networkCallCount: 0;
        namespaceMigrationCount: 0;
        gitMutationCount: 0;
    };
    truthBoundary: string;
    limitations: string[];
}
export interface HitoC7CompositionSnapshot {
    kind: "HITO_1_0_C7_COMPOSITION_SNAPSHOT";
    contract: {
        contractVersion: typeof HITO_C7_COMPOSITION_CONTRACT_VERSION;
        rulesetVersion: typeof HITO_C7_COMPOSITION_RULESET_VERSION;
        authority: typeof HITO_C7_COMPOSITION_AUTHORITY;
    };
    compositionId: string;
    c6: HitoC6CompositionSnapshot;
    rulesets: {
        c7: typeof HITO_C7_COMPOSITION_RULESET_VERSION;
        g16: typeof G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION;
    };
    presence: {
        g16: true;
    };
    g16: G16InstallabilityMigrationRecoveryAssessment;
    laterSemanticAuthority: {
        g8: true;
        g9: boolean;
        g10: true;
        g11: boolean;
        g12: true;
        g13: boolean;
        g14: true;
        g15: true;
        g16: true;
        g17Plus: false;
    };
    zeroEffectCounters: {
        realPredecessorCanonicalWrites: 0;
        isolatedFixtureHitoStateWrites: 0;
        applicationSourceMutations: 0;
        nonHitoTargetMutations: 0;
        targetCommandExecutions: 0;
        mergeExecutionCount: 0;
        deploymentExecutionCount: 0;
        providerModelRuntimeCalls: 0;
        unauthorizedNetworkCalls: 0;
        gitMutations: 0;
        hitoNamespaceCreations: 0;
        maatToHitoMigrations: 0;
    };
    truthBoundary: string;
    limitations: string[];
}
export declare function composeHitoRuntime(input: HitoC7CompositionInput): HitoC7CompositionSnapshot;
export declare function composeHitoRuntime(input: HitoC6CompositionInput): HitoC6CompositionSnapshot;
export declare function composeHitoRuntime(input: HitoC5CompositionInput): HitoC5CompositionSnapshot;
export declare function composeHitoRuntime(input: HitoC4CompositionInput): HitoC4CompositionSnapshot;
export declare function composeHitoRuntime(input: HitoC3CompositionInput): HitoC3CompositionSnapshot;
export declare function composeHitoRuntime(input: HitoC2CompositionInput): HitoC2CompositionSnapshot;
export declare function composeHitoRuntime(input: HitoC1CompositionInput): HitoC1CompositionSnapshot;
/** Reads only through the existing validated persistence authority, then delegates to the pure spine. */
export declare function readHitoRuntimeFromProjectRoot(projectRoot: string, input: HitoC7PersistedCompositionInput): Promise<HitoC7CompositionSnapshot>;
export declare function readHitoRuntimeFromProjectRoot(projectRoot: string, input: HitoC6PersistedCompositionInput): Promise<HitoC6CompositionSnapshot>;
export declare function readHitoRuntimeFromProjectRoot(projectRoot: string, input: HitoC5PersistedCompositionInput): Promise<HitoC5CompositionSnapshot>;
export declare function readHitoRuntimeFromProjectRoot(projectRoot: string, input: HitoC4PersistedCompositionInput): Promise<HitoC4CompositionSnapshot>;
export declare function readHitoRuntimeFromProjectRoot(projectRoot: string, input: HitoC3PersistedCompositionInput): Promise<HitoC3CompositionSnapshot>;
export declare function readHitoRuntimeFromProjectRoot(projectRoot: string, input: HitoC2PersistedCompositionInput): Promise<HitoC2CompositionSnapshot>;
export declare function readHitoRuntimeFromProjectRoot(projectRoot: string, input?: HitoC1PersistedCompositionInput): Promise<HitoC1CompositionSnapshot>;
export {};

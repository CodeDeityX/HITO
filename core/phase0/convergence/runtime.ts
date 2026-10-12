import {
  canonicalize,
  readCanonicalRevisionValidated,
  sha256Text,
  type CanonicalModel,
  type HistoryEvent,
} from "../contracts";
import {
  derivePhase3ProjectionBundle,
  PHASE3_RULESET_VERSION,
  type Phase3ProjectionBundle,
} from "../phase3/projection";
import {
  derivePhase4Decision,
  PHASE4_RULESET_VERSION,
  type Phase4DecisionReport,
  type Phase4EvaluationRequest,
} from "../phase4/decision-engine";
import {
  derivePhase5RealityJudge,
  PHASE5_RULESET_VERSION,
  type Phase5ClaimRequest,
  type Phase5JudgeResult,
} from "../phase5/reality-judge";
import {
  derivePhase6ReadOnlyProjections,
  PHASE6_RULESET_VERSION,
  type Phase6ProjectionPair,
} from "../phase6/projection";
import {
  assessPhase7PreEffect,
  PHASE7_CONTRACT_VERSION,
  PHASE7_RULESET_VERSION,
  type BoundedActionProposal,
  type BoundedObservation,
  type GenericDiagnosticInput,
  type Phase5ApplicabilityState,
  type Phase5Input,
  type Phase7Assessment,
} from "../phase7/peg";
import {
  compareG8EngineeringReality,
  deriveG8EngineeringRealityFromSameCallPhase3,
  G8_ENGINEERING_REALITY_RULESET_VERSION,
  type G8EngineeringRealityComparisonResult,
  type G8EngineeringRealityProjection,
  type G8EngineeringRealityRequest,
} from "./g8-engineering-reality";
import {
  assessG9SemanticTransitionCompletion,
  G9_TRANSITION_COMPLETION_RULESET_VERSION,
  type G9TransitionAssessmentRequest,
  type G9TransitionCompletionAssessment,
} from "./g9-transition-completion";
import {
  deriveG10SemanticHistoryDiff,
  G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION,
  type G10SemanticHistoryDiffProjection,
  type G10SemanticHistoryDiffRequest,
} from "./g10-semantic-history-diff";
import {
  detectG11BoundedSemanticConflict,
  G11_SEMANTIC_CONFLICT_RULESET_VERSION,
  type G11ConflictDetectionRequest,
  type G11SemanticConflictDetectionResult,
} from "./g11-semantic-conflict-detection";
import {
  assessG12SemanticBranchMerge,
  G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION,
  type G12SemanticBranchMergeAssessment,
  type G12SemanticBranchMergeRequest,
} from "./g12-semantic-branch-merge";
import {
  assessG13ProofCarryingRelease,
  G13_PROOF_CARRYING_RELEASE_RULESET_VERSION,
  type G13ProofCarryingReleaseAssessment,
  type G13ProofCarryingReleaseRequest,
} from "./g13-proof-carrying-release";
import {
  deriveG14OrganismFederatedObservation,
  G14_ORGANISM_FEDERATED_OBSERVATION_RULESET_VERSION,
  type G14FederatedObservationRequest,
  type G14OrganismFederatedObservationProjection,
} from "./g14-organism-federated-observation";
import {
  deriveG15UniversalProtocolProjection,
  G15_UNIVERSAL_PROTOCOL_PROJECTION_RULESET_VERSION,
  type G15UniversalProtocolProjectionEnvelope,
  type G15UniversalProtocolProjectionRequest,
} from "./g15-universal-protocol-projection";
import {
  deriveG16InstallabilityMigrationRecovery,
  G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION,
  type G16InstallabilityMigrationRecoveryAssessment,
  type G16InstallabilityMigrationRecoveryRequest,
} from "./g16-installability-migration-recovery";
import { sha256LengthPrefixedFrames } from "./semantic-canonicalization";

export const HITO_C1_COMPOSITION_CONTRACT_VERSION = "1.0.0" as const;
export const HITO_C1_COMPOSITION_RULESET_VERSION = "hito-1.0-c1-composition-spine-v1" as const;
export const HITO_C1_COMPOSITION_AUTHORITY = "DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING" as const;
export const HITO_C2_COMPOSITION_CONTRACT_VERSION = "1.0.0" as const;
export const HITO_C2_COMPOSITION_RULESET_VERSION = "hito-1.0-c2-g8-g9-semantic-kernel-v1" as const;
export const HITO_C2_COMPOSITION_AUTHORITY = "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING" as const;
export const HITO_C3_COMPOSITION_CONTRACT_VERSION = "1.0.0" as const;
export const HITO_C3_COMPOSITION_RULESET_VERSION = "hito-1.0-c3-g10-g11-history-diff-conflict-v1" as const;
export const HITO_C3_COMPOSITION_AUTHORITY = "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / DETECTION_NOT_RESOLUTION" as const;
export const HITO_C4_COMPOSITION_CONTRACT_VERSION = "1.0.0" as const;
export const HITO_C4_COMPOSITION_RULESET_VERSION = "hito-1.0-c4-g12-g13-branch-merge-release-v1" as const;
export const HITO_C4_COMPOSITION_AUTHORITY = "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / ELIGIBILITY_NOT_EXECUTION" as const;
export const HITO_C5_COMPOSITION_CONTRACT_VERSION = "1.0.0" as const;
export const HITO_C5_COMPOSITION_RULESET_VERSION = "hito-1.0-c5-g14-organism-federated-observation-v1" as const;
export const HITO_C5_COMPOSITION_AUTHORITY = "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / BOUNDED_OBSERVATION_ONLY" as const;
export const HITO_C6_COMPOSITION_CONTRACT_VERSION = "1.0.0" as const;
export const HITO_C6_COMPOSITION_RULESET_VERSION = "hito-1.0-c6-g15-universal-protocol-projection-v1" as const;
export const HITO_C6_COMPOSITION_AUTHORITY = "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NON_EXECUTING / PROJECTION_ONLY" as const;
export const HITO_C7_COMPOSITION_CONTRACT_VERSION = "1.0.0" as const;
export const HITO_C7_COMPOSITION_RULESET_VERSION = "hito-1.0-c7-g16-installability-migration-recovery-v1" as const;
export const HITO_C7_COMPOSITION_AUTHORITY = "HEADLESS ORCHESTRATION / DERIVED / READ_ONLY / NON_CANONICAL / NONEXECUTING / BOUNDED OPERATIONAL ASSESSMENT ONLY" as const;

type ExplicitNonApplicablePhase5State = Exclude<
  Phase5ApplicabilityState,
  "APPLICABLE_AUTHENTICATED_PHASE5_JUDGMENT"
>;

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
  presence: { g8: true; g8Comparison: boolean; g9: boolean };
  g8: {
    successor: G8EngineeringRealityProjection;
    predecessor?: G8EngineeringRealityProjection;
    comparison?: G8EngineeringRealityComparisonResult;
  };
  g9?: G9TransitionCompletionAssessment;
  laterSemanticAuthority: { g8: true; g9: boolean; g10Plus: false };
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
  presence: { g10: true; g11: boolean };
  g10: G10SemanticHistoryDiffProjection;
  g11?: G11SemanticConflictDetectionResult;
  laterSemanticAuthority: { g8: true; g9: boolean; g10: true; g11: boolean; g12Plus: false };
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
  presence: { g12: true; g13: boolean };
  g12: G12SemanticBranchMergeAssessment;
  g13?: G13ProofCarryingReleaseAssessment;
  laterSemanticAuthority: { g8: true; g9: boolean; g10: true; g11: boolean; g12: true; g13: boolean; g14Plus: false };
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
  presence: { g14: true };
  g14: G14OrganismFederatedObservationProjection;
  laterSemanticAuthority: { g8: true; g9: boolean; g10: true; g11: boolean; g12: true; g13: boolean; g14: true; g15Plus: false };
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
  presence: { g15: true };
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
  presence: { g16: true };
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

const PURE_INPUT_KEYS = ["model", "phase4Request", "phase5Request", "phase7Request"] as const;
const PERSISTED_INPUT_KEYS = ["phase4Request", "phase5Request", "phase7Request"] as const;
const C2_PURE_INPUT_KEYS = ["model", "phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request"] as const;
const C2_PERSISTED_INPUT_KEYS = ["phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request"] as const;
const C2_G8_REQUEST_KEYS = ["current", "predecessor"] as const;
const C2_PREDECESSOR_KEYS = ["model", "request"] as const;
const C3_PURE_INPUT_KEYS = ["model", "phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request"] as const;
const C3_PERSISTED_INPUT_KEYS = ["phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request"] as const;
const C3_G10_REQUEST_KEYS = ["predecessorHistory", "successorHistory", "request"] as const;
const C3_PERSISTED_G10_REQUEST_KEYS = ["predecessorHistory", "request"] as const;
const C4_PURE_INPUT_KEYS = ["model", "phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request"] as const;
const C4_PERSISTED_INPUT_KEYS = ["phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request"] as const;
const C5_PURE_INPUT_KEYS = ["model", "phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request", "g14Request"] as const;
const C5_PERSISTED_INPUT_KEYS = ["phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request", "g14Request"] as const;
const C6_PURE_INPUT_KEYS = ["model", "phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request", "g14Request", "g15Request"] as const;
const C6_PERSISTED_INPUT_KEYS = ["phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request", "g14Request", "g15Request"] as const;
const C7_PURE_INPUT_KEYS = ["model", "phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request", "g14Request", "g15Request", "g16Request"] as const;
const C7_PERSISTED_INPUT_KEYS = ["phase4Request", "phase5Request", "phase7Request", "g8Request", "g9Request", "g10Request", "g11Request", "g12Request", "g13Request", "g14Request", "g15Request", "g16Request"] as const;
const PHASE7_REQUEST_KEYS = ["proposal", "observations", "diagnostics", "phase5Applicability"] as const;

function assertExactKeys(value: object, allowed: readonly string[], label: string): void {
  const unsupported = Object.keys(value).filter((key) => !allowed.includes(key)).sort();
  if (unsupported.length > 0) {
    throw new Error(`${label} rejects unsupported or precomputed authority fields: ${unsupported.join(", ")}`);
  }
}

function assertCompositionDependencies(input: HitoC1CompositionInput): void {
  if (input.phase5Request !== undefined && input.phase4Request === undefined) {
    throw new Error("HITO C1 fails closed: Phase 5 requires an explicit Phase-4 request in the same composition call");
  }
  if (input.phase7Request !== undefined && input.phase4Request === undefined) {
    throw new Error("HITO C1 fails closed: Phase 7 requires an explicit Phase-4 request in the same composition call");
  }
  if (input.phase7Request === undefined) return;

  assertExactKeys(input.phase7Request, PHASE7_REQUEST_KEYS, "HITO C1 Phase-7 request");
  if (input.phase5Request !== undefined) {
    if (Object.hasOwn(input.phase7Request, "phase5Applicability")) {
      throw new Error("HITO C1 fails closed: caller Phase-5 applicability cannot override the same-call Phase-5 authority");
    }
    return;
  }
  if (input.phase7Request.phase5Applicability === undefined) {
    throw new Error("HITO C1 fails closed: Phase 7 without Phase 5 requires explicit Phase-5 applicability");
  }
}

function assertC2Dependencies(input: HitoC2CompositionInput): void {
  if (input.g8Request === null || typeof input.g8Request !== "object") {
    throw new Error("HITO C2 requires an explicit structured G8 request");
  }
  assertExactKeys(input.g8Request, C2_G8_REQUEST_KEYS, "HITO C2 G8 request");
  if (input.g8Request.current === undefined) throw new Error("HITO C2 requires an explicit current G8 derivation request");
  if (input.g8Request.predecessor !== undefined) {
    if (input.g8Request.predecessor === null || typeof input.g8Request.predecessor !== "object") {
      throw new Error("HITO C2 predecessor request must be structured");
    }
    assertExactKeys(input.g8Request.predecessor, C2_PREDECESSOR_KEYS, "HITO C2 predecessor request");
  }
  if (input.g9Request !== undefined && input.g8Request.predecessor === undefined) {
    throw new Error("HITO C2 fails closed: G9 requires an explicit predecessor model/request pair for same-call G8 comparison");
  }
}

function assertC3Dependencies(input: HitoC3CompositionInput): void {
  if (input.g8Request.predecessor === undefined) {
    throw new Error("HITO C3 fails closed: G10 requires an explicit predecessor model/request pair for same-call G8 comparison");
  }
  if (input.g10Request === null || typeof input.g10Request !== "object") {
    throw new Error("HITO C3 requires an explicit structured G10 request");
  }
  assertExactKeys(input.g10Request, C3_G10_REQUEST_KEYS, "HITO C3 G10 request");
  if (!Array.isArray(input.g10Request.predecessorHistory) || !Array.isArray(input.g10Request.successorHistory)) {
    throw new Error("HITO C3 requires explicit predecessor and successor canonical history collections");
  }
}

function assertC4Dependencies(input: HitoC4CompositionInput): void {
  if (input.g12Request === null || typeof input.g12Request !== "object") {
    throw new Error("HITO C4 requires an explicit structured G12 request");
  }
  if (input.g13Request !== undefined && (input.g13Request === null || typeof input.g13Request !== "object")) {
    throw new Error("HITO C4 G13 request must be structured when supplied");
  }
}

function assertC5Dependencies(input: HitoC5CompositionInput): void {
  if (input.g14Request === null || typeof input.g14Request !== "object") {
    throw new Error("HITO C5 requires an explicit structured G14 request");
  }
}

function assertC6Dependencies(input: HitoC6CompositionInput): void {
  if (input.g15Request === null || typeof input.g15Request !== "object") {
    throw new Error("HITO C6 requires an explicit structured G15 request");
  }
}

function assertC7Dependencies(input: HitoC7CompositionInput): void {
  if (input.g16Request === null || typeof input.g16Request !== "object") {
    throw new Error("HITO C7 requires an explicit structured G16 request");
  }
}

function sourceIdentity(model: CanonicalModel, phase3: Phase3ProjectionBundle): string {
  return `hito_c1_source_${sha256Text(canonicalize({
    canonicalModelRevision: model.canonicalState.modelRevision,
    historyHead: model.canonicalState.historyHead,
    evidenceHead: model.canonicalState.evidenceHead,
    phase3PulseSemanticHash: phase3.pulse.source.semanticHash,
    phase3MriSemanticHash: phase3.mri.source.semanticHash,
    c1RulesetVersion: HITO_C1_COMPOSITION_RULESET_VERSION,
  }))}`;
}

/**
 * Pure, deterministic C1 orchestration over the existing Phase 3-7 authorities.
 * It derives authority in-call and has no write, execution, provider, network, or migration path.
 */
function composeHitoC1Runtime(input: HitoC1CompositionInput): HitoC1CompositionSnapshot {
  if (input === null || typeof input !== "object") throw new Error("HITO C1 requires a structured composition input");
  assertExactKeys(input, PURE_INPUT_KEYS, "HITO C1 composition input");
  assertCompositionDependencies(input);
  const inputBefore = canonicalize(input);

  const phase3 = derivePhase3ProjectionBundle(input.model);
  const phase4 = input.phase4Request === undefined
    ? undefined
    : derivePhase4Decision(input.model, input.phase4Request);
  const phase5 = phase4 === undefined || input.phase5Request === undefined
    ? undefined
    : derivePhase5RealityJudge(input.model, input.phase5Request, phase4);
  const phase6 = phase4 === undefined || phase5 === undefined || input.phase5Request === undefined
    ? undefined
    : derivePhase6ReadOnlyProjections({
      model: input.model,
      phase4,
      phase5,
      phase5Request: input.phase5Request,
    });

  let phase7: Phase7Assessment | undefined;
  if (phase4 !== undefined && input.phase7Request !== undefined) {
    const phase5Input: Phase5Input = phase5 !== undefined && input.phase5Request !== undefined
      ? {
        state: "APPLICABLE_AUTHENTICATED_PHASE5_JUDGMENT",
        request: input.phase5Request,
        result: phase5,
      }
      : { state: input.phase7Request.phase5Applicability as ExplicitNonApplicablePhase5State };
    phase7 = assessPhase7PreEffect({
      model: input.model,
      proposal: input.phase7Request.proposal,
      phase4,
      phase5: phase5Input,
      observations: input.phase7Request.observations,
      ...(input.phase7Request.diagnostics === undefined ? {} : { diagnostics: input.phase7Request.diagnostics }),
    });
  }

  const resolvedSourceIdentity = sourceIdentity(input.model, phase3);
  const compositionId = `hito_c1_composition_${sha256Text(canonicalize({
    sourceIdentity: resolvedSourceIdentity,
    c1RulesetVersion: HITO_C1_COMPOSITION_RULESET_VERSION,
    phase3: {
      pulse: phase3.pulse.source.semanticHash,
      mri: phase3.mri.source.semanticHash,
    },
    phase4: phase4?.source.derivedOutput.derivedOutputId ?? "ABSENT",
    phase5: phase5?.judgeResultId ?? "ABSENT",
    phase6: phase6 === undefined ? "ABSENT" : {
      operator: phase6.operator.operatorProjectionId,
      agent: phase6.agent.agentContextId,
    },
    phase7: phase7?.assessmentId ?? "ABSENT",
  }))}`;

  const result: HitoC1CompositionSnapshot = {
    kind: "HITO_1_0_C1_COMPOSITION_SNAPSHOT",
    contract: {
      contractVersion: HITO_C1_COMPOSITION_CONTRACT_VERSION,
      rulesetVersion: HITO_C1_COMPOSITION_RULESET_VERSION,
      authority: HITO_C1_COMPOSITION_AUTHORITY,
    },
    compositionId,
    source: {
      sourceIdentity: resolvedSourceIdentity,
      canonicalModelRevision: input.model.canonicalState.modelRevision,
      canonicalModelIntegrityHash: input.model.canonicalState.integrity.modelHash,
      historyHead: structuredClone(input.model.canonicalState.historyHead),
      evidenceHead: structuredClone(input.model.canonicalState.evidenceHead),
    },
    rulesets: {
      c1: HITO_C1_COMPOSITION_RULESET_VERSION,
      phase3: PHASE3_RULESET_VERSION,
      phase4: phase4 === undefined ? null : PHASE4_RULESET_VERSION,
      phase5: phase5 === undefined ? null : PHASE5_RULESET_VERSION,
      phase6: phase6 === undefined ? null : PHASE6_RULESET_VERSION,
      phase7: phase7 === undefined ? null : PHASE7_RULESET_VERSION,
      phase7Contract: phase7 === undefined ? null : PHASE7_CONTRACT_VERSION,
    },
    presence: {
      phase3: true,
      phase4: phase4 !== undefined,
      phase5: phase5 !== undefined,
      phase6: phase6 !== undefined,
      phase7: phase7 !== undefined,
    },
    phase3,
    ...(phase4 === undefined ? {} : { phase4 }),
    ...(phase5 === undefined ? {} : { phase5 }),
    ...(phase6 === undefined ? {} : { phase6 }),
    ...(phase7 === undefined ? {} : { phase7 }),
    laterSemanticAuthority: { g8: false, g9: false, g10Plus: false },
    zeroEffectCounters: {
      canonicalWriteCount: 0,
      governedTargetMutationCount: 0,
      targetExecutionCount: 0,
      providerModelCallCount: 0,
      networkCallCount: 0,
      namespaceMigrationCount: 0,
    },
    truthBoundary: "C1 composes existing Phase 3-7 derived authorities over one validated canonical model. It is read-only, noncanonical, nonexecuting, and grants no G8-or-later semantic authority.",
    limitations: [
      "No canonical write",
      "No target execution",
      "No provider or model call",
      "No network call",
      "No namespace migration",
      "No G8, G9, or later semantic authority",
    ],
  };

  if (canonicalize(input) !== inputBefore) throw new Error("HITO C1 composition mutated caller input");
  return result;
}

function c1InputFromC2(input: HitoC2CompositionInput): HitoC1CompositionInput {
  return {
    model: input.model,
    ...(input.phase4Request === undefined ? {} : { phase4Request: input.phase4Request }),
    ...(input.phase5Request === undefined ? {} : { phase5Request: input.phase5Request }),
    ...(input.phase7Request === undefined ? {} : { phase7Request: input.phase7Request }),
  };
}

function composeHitoC2Runtime(input: HitoC2CompositionInput): HitoC2CompositionSnapshot {
  assertExactKeys(input, C2_PURE_INPUT_KEYS, "HITO C2 composition input");
  assertCompositionDependencies(input);
  assertC2Dependencies(input);
  const inputBefore = canonicalize(input);
  const c1 = composeHitoC1Runtime(c1InputFromC2(input));
  const successor = deriveG8EngineeringRealityFromSameCallPhase3(input.model, c1.phase3, input.g8Request.current);

  let predecessor: G8EngineeringRealityProjection | undefined;
  let comparison: G8EngineeringRealityComparisonResult | undefined;
  if (input.g8Request.predecessor !== undefined) {
    const predecessorC1 = composeHitoC1Runtime({ model: input.g8Request.predecessor.model });
    predecessor = deriveG8EngineeringRealityFromSameCallPhase3(
      input.g8Request.predecessor.model,
      predecessorC1.phase3,
      input.g8Request.predecessor.request,
    );
    comparison = compareG8EngineeringReality(predecessor, successor);
  }

  const g9 = input.g9Request === undefined
    ? undefined
    : assessG9SemanticTransitionCompletion({
      predecessorModel: input.g8Request.predecessor?.model as CanonicalModel,
      successorModel: input.model,
      predecessor: predecessor as G8EngineeringRealityProjection,
      successor,
      comparison: comparison as G8EngineeringRealityComparisonResult,
      request: input.g9Request,
      ...(c1.phase4 === undefined ? {} : { phase4: c1.phase4 }),
      ...(c1.phase5 === undefined ? {} : { phase5: c1.phase5 }),
      ...(c1.phase7 === undefined ? {} : { phase7: c1.phase7 }),
    });

  const compositionId = `hito_c2_composition_${sha256LengthPrefixedFrames([
    { label: "c2-ruleset", value: HITO_C2_COMPOSITION_RULESET_VERSION },
    { label: "c1-composition", value: c1.compositionId },
    { label: "g8-successor", value: successor.derivationEnvelopeIdentity },
    { label: "g8-predecessor", value: predecessor?.derivationEnvelopeIdentity ?? "ABSENT" },
    { label: "g8-comparison", value: comparison?.comparisonId ?? "ABSENT" },
    { label: "g9-assessment", value: g9?.assessmentId ?? "ABSENT" },
  ])}`;
  const result: HitoC2CompositionSnapshot = {
    kind: "HITO_1_0_C2_COMPOSITION_SNAPSHOT",
    contract: {
      contractVersion: HITO_C2_COMPOSITION_CONTRACT_VERSION,
      rulesetVersion: HITO_C2_COMPOSITION_RULESET_VERSION,
      authority: HITO_C2_COMPOSITION_AUTHORITY,
    },
    compositionId,
    c1,
    rulesets: {
      c2: HITO_C2_COMPOSITION_RULESET_VERSION,
      g8: G8_ENGINEERING_REALITY_RULESET_VERSION,
      g9: g9 === undefined ? null : G9_TRANSITION_COMPLETION_RULESET_VERSION,
    },
    presence: { g8: true, g8Comparison: comparison !== undefined, g9: g9 !== undefined },
    g8: {
      successor,
      ...(predecessor === undefined ? {} : { predecessor }),
      ...(comparison === undefined ? {} : { comparison }),
    },
    ...(g9 === undefined ? {} : { g9 }),
    laterSemanticAuthority: { g8: true, g9: g9 !== undefined, g10Plus: false },
    zeroEffectCounters: {
      canonicalWriteCount: 0,
      governedTargetMutationCount: 0,
      targetExecutionCount: 0,
      providerModelCallCount: 0,
      networkCallCount: 0,
      namespaceMigrationCount: 0,
    },
    truthBoundary: "C2 is bounded headless orchestration. C1 remains the Phase 3-7 spine, G8 owns derived Engineering Reality semantics, and G9 owns derived transition-completion assessment.",
    limitations: [
      "No canonical RealityState or SemanticTransition",
      "No canonical write or target execution",
      "No provider/model or runtime network call",
      "No namespace migration",
      "No later convergence-stage implementation",
    ],
  };
  if (canonicalize(input) !== inputBefore) throw new Error("HITO C2 composition mutated caller input");
  return result;
}

function c2InputFromC3(input: HitoC3CompositionInput): HitoC2CompositionInput {
  return {
    model: input.model,
    ...(input.phase4Request === undefined ? {} : { phase4Request: input.phase4Request }),
    ...(input.phase5Request === undefined ? {} : { phase5Request: input.phase5Request }),
    ...(input.phase7Request === undefined ? {} : { phase7Request: input.phase7Request }),
    g8Request: input.g8Request,
    ...(input.g9Request === undefined ? {} : { g9Request: input.g9Request }),
  };
}

function composeHitoC3Runtime(input: HitoC3CompositionInput): HitoC3CompositionSnapshot {
  assertExactKeys(input, C3_PURE_INPUT_KEYS, "HITO C3 composition input");
  assertCompositionDependencies(input);
  assertC2Dependencies(input);
  assertC3Dependencies(input);
  const inputBefore = canonicalize(input);
  const c2 = composeHitoC2Runtime(c2InputFromC3(input));
  const predecessorRequest = input.g8Request.predecessor as HitoC2PredecessorRealityRequest;
  const predecessor = c2.g8.predecessor as G8EngineeringRealityProjection;
  const comparison = c2.g8.comparison as G8EngineeringRealityComparisonResult;
  const g10 = deriveG10SemanticHistoryDiff({
    predecessorModel: predecessorRequest.model,
    successorModel: input.model,
    predecessorHistory: input.g10Request.predecessorHistory,
    successorHistory: input.g10Request.successorHistory,
    predecessor,
    successor: c2.g8.successor,
    comparison,
    ...(c2.g9 === undefined ? {} : { g9: c2.g9 }),
    request: input.g10Request.request,
  });
  const g11 = input.g11Request === undefined
    ? undefined
    : detectG11BoundedSemanticConflict({
      model: input.model,
      g8Successor: c2.g8.successor,
      ...(c2.g9 === undefined ? {} : { g9: c2.g9 }),
      g10,
      ...(c2.c1.phase4 === undefined ? {} : { phase4: c2.c1.phase4 }),
      request: input.g11Request,
    });
  const compositionId = `hito_c3_composition_${sha256LengthPrefixedFrames([
    { label: "c3-ruleset", value: HITO_C3_COMPOSITION_RULESET_VERSION },
    { label: "c2-composition", value: c2.compositionId },
    { label: "g10-projection", value: g10.projectionId },
    { label: "g11-assessment", value: g11?.assessmentId ?? "ABSENT" },
  ])}`;
  const result: HitoC3CompositionSnapshot = {
    kind: "HITO_1_0_C3_COMPOSITION_SNAPSHOT",
    contract: {
      contractVersion: HITO_C3_COMPOSITION_CONTRACT_VERSION,
      rulesetVersion: HITO_C3_COMPOSITION_RULESET_VERSION,
      authority: HITO_C3_COMPOSITION_AUTHORITY,
    },
    compositionId,
    c2,
    rulesets: {
      c3: HITO_C3_COMPOSITION_RULESET_VERSION,
      g10: G10_SEMANTIC_HISTORY_DIFF_RULESET_VERSION,
      g11: g11 === undefined ? null : G11_SEMANTIC_CONFLICT_RULESET_VERSION,
    },
    presence: { g10: true, g11: g11 !== undefined },
    g10,
    ...(g11 === undefined ? {} : { g11 }),
    laterSemanticAuthority: {
      g8: true,
      g9: c2.g9 !== undefined,
      g10: true,
      g11: g11 !== undefined,
      g12Plus: false,
    },
    zeroEffectCounters: {
      canonicalWriteCount: 0,
      governedTargetMutationCount: 0,
      targetExecutionCount: 0,
      providerModelCallCount: 0,
      networkCallCount: 0,
      namespaceMigrationCount: 0,
    },
    truthBoundary: "C3 is bounded headless orchestration. C2 remains the G8/G9 semantic kernel, G10 owns derived causal history/diff projection, and G11 detects but never resolves bounded semantic conflict.",
    limitations: [
      "No canonical SemanticHistory or SemanticDiff",
      "No second history store, revision ledger, reconciliation engine, or decision engine",
      "No conflict resolution, winner selection, branch or merge execution",
      "No canonical write, target execution, provider/model call, runtime network call, or namespace migration",
      "No G12 or later implementation",
    ],
  };
  if (canonicalize(input) !== inputBefore) throw new Error("HITO C3 composition mutated caller input");
  return result;
}

function c3InputFromC4(input: HitoC4CompositionInput): HitoC3CompositionInput {
  return {
    model: input.model,
    ...(input.phase4Request === undefined ? {} : { phase4Request: input.phase4Request }),
    ...(input.phase5Request === undefined ? {} : { phase5Request: input.phase5Request }),
    ...(input.phase7Request === undefined ? {} : { phase7Request: input.phase7Request }),
    g8Request: input.g8Request,
    ...(input.g9Request === undefined ? {} : { g9Request: input.g9Request }),
    g10Request: input.g10Request,
    ...(input.g11Request === undefined ? {} : { g11Request: input.g11Request }),
  };
}

function composeHitoC4Runtime(input: HitoC4CompositionInput): HitoC4CompositionSnapshot {
  assertExactKeys(input, C4_PURE_INPUT_KEYS, "HITO C4 composition input");
  assertCompositionDependencies(input);
  assertC2Dependencies(input);
  assertC3Dependencies(input);
  assertC4Dependencies(input);
  const inputBefore = canonicalize(input);
  const c3 = composeHitoC3Runtime(c3InputFromC4(input));
  const predecessor = c3.c2.g8.predecessor as G8EngineeringRealityProjection;
  const comparison = c3.c2.g8.comparison as G8EngineeringRealityComparisonResult;
  const g12 = assessG12SemanticBranchMerge({
    model: input.model,
    predecessor,
    successor: c3.c2.g8.successor,
    comparison,
    ...(c3.c2.g9 === undefined ? {} : { g9: c3.c2.g9 }),
    g10: c3.g10,
    ...(c3.g11 === undefined ? {} : { g11: c3.g11 }),
    request: input.g12Request,
  });
  const g13 = input.g13Request === undefined
    ? undefined
    : assessG13ProofCarryingRelease({
      model: input.model,
      g8Successor: c3.c2.g8.successor,
      ...(c3.c2.g9 === undefined ? {} : { g9: c3.c2.g9 }),
      g10: c3.g10,
      ...(c3.g11 === undefined ? {} : { g11: c3.g11 }),
      g12,
      request: input.g13Request,
    });
  const compositionId = `hito_c4_composition_${sha256LengthPrefixedFrames([
    { label: "c4-ruleset", value: HITO_C4_COMPOSITION_RULESET_VERSION },
    { label: "c3-composition", value: c3.compositionId },
    { label: "g12-assessment", value: g12.assessmentId },
    { label: "g13-assessment", value: g13?.assessmentId ?? "ABSENT" },
  ])}`;
  const result: HitoC4CompositionSnapshot = {
    kind: "HITO_1_0_C4_COMPOSITION_SNAPSHOT",
    contract: {
      contractVersion: HITO_C4_COMPOSITION_CONTRACT_VERSION,
      rulesetVersion: HITO_C4_COMPOSITION_RULESET_VERSION,
      authority: HITO_C4_COMPOSITION_AUTHORITY,
    },
    compositionId,
    c3,
    rulesets: {
      c4: HITO_C4_COMPOSITION_RULESET_VERSION,
      g12: G12_SEMANTIC_BRANCH_MERGE_RULESET_VERSION,
      g13: g13 === undefined ? null : G13_PROOF_CARRYING_RELEASE_RULESET_VERSION,
    },
    presence: { g12: true, g13: g13 !== undefined },
    g12,
    ...(g13 === undefined ? {} : { g13 }),
    laterSemanticAuthority: {
      g8: true,
      g9: c3.c2.g9 !== undefined,
      g10: true,
      g11: c3.g11 !== undefined,
      g12: true,
      g13: g13 !== undefined,
      g14Plus: false,
    },
    zeroEffectCounters: {
      canonicalWriteCount: 0,
      governedTargetMutationCount: 0,
      targetExecutionCount: 0,
      mergeExecutionCount: 0,
      deploymentExecutionCount: 0,
      providerModelCallCount: 0,
      networkCallCount: 0,
      namespaceMigrationCount: 0,
    },
    truthBoundary: "C4 is bounded headless orchestration. C3 remains the G10/G11 history/conflict layer, G12 owns candidate-only branch/merge assessment, and G13 owns proof-carrying release eligibility only.",
    limitations: [
      "No merged reality, merge execution, deployment authority, deployment execution, or deployment success",
      "No canonical write, target execution, provider/model call, runtime network call, or namespace migration",
      "G9 remains the only implemented transition-completion owner",
      "No G14 or later implementation",
    ],
  };
  if (canonicalize(input) !== inputBefore) throw new Error("HITO C4 composition mutated caller input");
  return result;
}

function c4InputFromC5(input: HitoC5CompositionInput): HitoC4CompositionInput {
  return {
    model: input.model,
    ...(input.phase4Request === undefined ? {} : { phase4Request: input.phase4Request }),
    ...(input.phase5Request === undefined ? {} : { phase5Request: input.phase5Request }),
    ...(input.phase7Request === undefined ? {} : { phase7Request: input.phase7Request }),
    g8Request: input.g8Request,
    ...(input.g9Request === undefined ? {} : { g9Request: input.g9Request }),
    g10Request: input.g10Request,
    ...(input.g11Request === undefined ? {} : { g11Request: input.g11Request }),
    g12Request: input.g12Request,
    ...(input.g13Request === undefined ? {} : { g13Request: input.g13Request }),
  };
}

function composeHitoC5Runtime(input: HitoC5CompositionInput): HitoC5CompositionSnapshot {
  assertExactKeys(input, C5_PURE_INPUT_KEYS, "HITO C5 composition input");
  assertCompositionDependencies(input);
  assertC2Dependencies(input);
  assertC3Dependencies(input);
  assertC4Dependencies(input);
  assertC5Dependencies(input);
  const inputBefore = canonicalize(input);
  const c4 = composeHitoC4Runtime(c4InputFromC5(input));
  const g14 = deriveG14OrganismFederatedObservation({
    model: input.model,
    g8Successor: c4.c3.c2.g8.successor,
    ...(c4.c3.c2.g9 === undefined ? {} : { g9: c4.c3.c2.g9 }),
    g10: c4.c3.g10,
    ...(c4.c3.g11 === undefined ? {} : { g11: c4.c3.g11 }),
    g12: c4.g12,
    ...(c4.g13 === undefined ? {} : { g13: c4.g13 }),
    request: input.g14Request,
  });
  const compositionId = `hito_c5_composition_${sha256LengthPrefixedFrames([
    { label: "c5-ruleset", value: HITO_C5_COMPOSITION_RULESET_VERSION },
    { label: "c4-composition", value: c4.compositionId },
    { label: "g14-projection", value: g14.projectionId },
  ])}`;
  const result: HitoC5CompositionSnapshot = {
    kind: "HITO_1_0_C5_COMPOSITION_SNAPSHOT",
    contract: {
      contractVersion: HITO_C5_COMPOSITION_CONTRACT_VERSION,
      rulesetVersion: HITO_C5_COMPOSITION_RULESET_VERSION,
      authority: HITO_C5_COMPOSITION_AUTHORITY,
    },
    compositionId,
    c4,
    rulesets: {
      c5: HITO_C5_COMPOSITION_RULESET_VERSION,
      g14: G14_ORGANISM_FEDERATED_OBSERVATION_RULESET_VERSION,
    },
    presence: { g14: true },
    g14,
    laterSemanticAuthority: {
      g8: true,
      g9: c4.c3.c2.g9 !== undefined,
      g10: true,
      g11: c4.c3.g11 !== undefined,
      g12: true,
      g13: c4.g13 !== undefined,
      g14: true,
      g15Plus: false,
    },
    zeroEffectCounters: {
      canonicalWriteCount: 0,
      governedTargetMutationCount: 0,
      targetExecutionCount: 0,
      mergeExecutionCount: 0,
      deploymentExecutionCount: 0,
      providerModelCallCount: 0,
      networkCallCount: 0,
      namespaceMigrationCount: 0,
    },
    truthBoundary: "C5 is bounded headless orchestration. C4 remains the branch/merge/release eligibility layer, while G14 owns only derived organism identity, bounded federated observation, runtime-realization lineage, and territory relationship assessment.",
    limitations: [
      "No canonical OrganismIdentity, FederatedObservation, or RuntimeRealization",
      "No scalar physical truth, universal federation, cloud control plane, or deployment enforcement",
      "No canonical write, target execution, provider/model call, runtime network call, or namespace migration",
      "No G15 or later implementation",
    ],
  };
  if (canonicalize(input) !== inputBefore) throw new Error("HITO C5 composition mutated caller input");
  return result;
}

function c5InputFromC6(input: HitoC6CompositionInput): HitoC5CompositionInput {
  return {
    model: input.model,
    ...(input.phase4Request === undefined ? {} : { phase4Request: input.phase4Request }),
    ...(input.phase5Request === undefined ? {} : { phase5Request: input.phase5Request }),
    ...(input.phase7Request === undefined ? {} : { phase7Request: input.phase7Request }),
    g8Request: input.g8Request,
    ...(input.g9Request === undefined ? {} : { g9Request: input.g9Request }),
    g10Request: input.g10Request,
    ...(input.g11Request === undefined ? {} : { g11Request: input.g11Request }),
    g12Request: input.g12Request,
    ...(input.g13Request === undefined ? {} : { g13Request: input.g13Request }),
    g14Request: input.g14Request,
  };
}

function composeHitoC6Runtime(input: HitoC6CompositionInput): HitoC6CompositionSnapshot {
  assertExactKeys(input, C6_PURE_INPUT_KEYS, "HITO C6 composition input");
  assertCompositionDependencies(input);
  assertC2Dependencies(input);
  assertC3Dependencies(input);
  assertC4Dependencies(input);
  assertC5Dependencies(input);
  assertC6Dependencies(input);
  const inputBefore = canonicalize(input);
  const c5 = composeHitoC5Runtime(c5InputFromC6(input));
  const g15 = deriveG15UniversalProtocolProjection({ model: input.model, c5, request: input.g15Request });
  const compositionId = `hito_c6_composition_${sha256LengthPrefixedFrames([
    { label: "c6-ruleset", value: HITO_C6_COMPOSITION_RULESET_VERSION },
    { label: "c5-composition", value: c5.compositionId },
    { label: "g15-envelope", value: g15.envelopeId },
  ])}`;
  const result: HitoC6CompositionSnapshot = {
    kind: "HITO_1_0_C6_COMPOSITION_SNAPSHOT",
    contract: {
      contractVersion: HITO_C6_COMPOSITION_CONTRACT_VERSION,
      rulesetVersion: HITO_C6_COMPOSITION_RULESET_VERSION,
      authority: HITO_C6_COMPOSITION_AUTHORITY,
    },
    compositionId,
    c5,
    rulesets: {
      c6: HITO_C6_COMPOSITION_RULESET_VERSION,
      g15: G15_UNIVERSAL_PROTOCOL_PROJECTION_RULESET_VERSION,
    },
    presence: { g15: true },
    g15,
    laterSemanticAuthority: {
      g8: true,
      g9: c5.c4.c3.c2.g9 !== undefined,
      g10: true,
      g11: c5.c4.c3.g11 !== undefined,
      g12: true,
      g13: c5.c4.g13 !== undefined,
      g14: true,
      g15: true,
      g16Plus: false,
    },
    zeroEffectCounters: {
      canonicalWriteCount: 0,
      governedTargetMutationCount: 0,
      targetExecutionCount: 0,
      mergeExecutionCount: 0,
      deploymentExecutionCount: 0,
      providerModelCallCount: 0,
      networkCallCount: 0,
      namespaceMigrationCount: 0,
      gitMutationCount: 0,
    },
    truthBoundary: "C6 is bounded headless orchestration over the exact same-call C5 snapshot. G15 owns presentation only and grants no canonical, semantic, ontology, mutation, execution, provider, network, Git, migration, or G16 authority.",
    limitations: [
      "No canonical write, target execution, merge, deployment, provider/model call, runtime network call, Git mutation, or namespace migration",
      "No browser-shell rewire, model-assisted interaction, cloud control plane, install/attach/recovery, or G16 implementation",
      "Projection modes cannot alter underlying governed truth",
    ],
  };
  if (canonicalize(input) !== inputBefore) throw new Error("HITO C6 composition mutated caller input");
  return result;
}

function c6InputFromC7(input: HitoC7CompositionInput): HitoC6CompositionInput {
  return {
    model: input.model,
    ...(input.phase4Request === undefined ? {} : { phase4Request: input.phase4Request }),
    ...(input.phase5Request === undefined ? {} : { phase5Request: input.phase5Request }),
    ...(input.phase7Request === undefined ? {} : { phase7Request: input.phase7Request }),
    g8Request: input.g8Request,
    ...(input.g9Request === undefined ? {} : { g9Request: input.g9Request }),
    g10Request: input.g10Request,
    ...(input.g11Request === undefined ? {} : { g11Request: input.g11Request }),
    g12Request: input.g12Request,
    ...(input.g13Request === undefined ? {} : { g13Request: input.g13Request }),
    g14Request: input.g14Request,
    g15Request: input.g15Request,
  };
}

function composeHitoC7Runtime(input: HitoC7CompositionInput): HitoC7CompositionSnapshot {
  assertExactKeys(input, C7_PURE_INPUT_KEYS, "HITO C7 composition input");
  assertCompositionDependencies(input);
  assertC2Dependencies(input);
  assertC3Dependencies(input);
  assertC4Dependencies(input);
  assertC5Dependencies(input);
  assertC6Dependencies(input);
  assertC7Dependencies(input);
  const inputBefore = canonicalize(input);
  const c6 = composeHitoC6Runtime(c6InputFromC7(input));
  const g16 = deriveG16InstallabilityMigrationRecovery({ model: input.model, c6, request: input.g16Request });
  const compositionId = `hito_c7_composition_${sha256LengthPrefixedFrames([
    { label: "c7-ruleset", value: HITO_C7_COMPOSITION_RULESET_VERSION },
    { label: "c6-composition", value: c6.compositionId },
    { label: "g16-assessment", value: g16.assessmentId },
  ])}`;
  const result: HitoC7CompositionSnapshot = {
    kind: "HITO_1_0_C7_COMPOSITION_SNAPSHOT",
    contract: {
      contractVersion: HITO_C7_COMPOSITION_CONTRACT_VERSION,
      rulesetVersion: HITO_C7_COMPOSITION_RULESET_VERSION,
      authority: HITO_C7_COMPOSITION_AUTHORITY,
    },
    compositionId,
    c6,
    rulesets: {
      c7: HITO_C7_COMPOSITION_RULESET_VERSION,
      g16: G16_INSTALLABILITY_MIGRATION_RECOVERY_RULESET_VERSION,
    },
    presence: { g16: true },
    g16,
    laterSemanticAuthority: {
      g8: true,
      g9: c6.c5.c4.c3.c2.g9 !== undefined,
      g10: true,
      g11: c6.c5.c4.c3.g11 !== undefined,
      g12: true,
      g13: c6.c5.c4.g13 !== undefined,
      g14: true,
      g15: true,
      g16: true,
      g17Plus: false,
    },
    zeroEffectCounters: {
      realPredecessorCanonicalWrites: 0,
      isolatedFixtureHitoStateWrites: 0,
      applicationSourceMutations: 0,
      nonHitoTargetMutations: 0,
      targetCommandExecutions: 0,
      mergeExecutionCount: 0,
      deploymentExecutionCount: 0,
      providerModelRuntimeCalls: 0,
      unauthorizedNetworkCalls: 0,
      gitMutations: 0,
      hitoNamespaceCreations: 0,
      maatToHitoMigrations: 0,
    },
    truthBoundary: "C7 is bounded headless assessment over the exact same-call C6 snapshot. G16 operational modes are not ontology; C7 composes no operational write, target execution, migration, provider, network, Git, deployment, or G17 authority.",
    limitations: [
      "Operational attach and recovery writes are available only through separately explicit isolated C7 fixture adapters",
      "No application/non-HITO mutation, .hito creation, .maat-to-.hito migration, dual write, target command, deployment, provider/model call, network call, Git mutation, or external control-plane mutation",
      "No universal enforcement, OS/language/parser/compiler parity, enterprise scale, remote backup/sync, or G17 implementation",
      "C6 CLI command surface remains unchanged",
    ],
  };
  if (canonicalize(input) !== inputBefore) throw new Error("HITO C7 composition mutated caller input");
  return result;
}

export function composeHitoRuntime(input: HitoC7CompositionInput): HitoC7CompositionSnapshot;
export function composeHitoRuntime(input: HitoC6CompositionInput): HitoC6CompositionSnapshot;
export function composeHitoRuntime(input: HitoC5CompositionInput): HitoC5CompositionSnapshot;
export function composeHitoRuntime(input: HitoC4CompositionInput): HitoC4CompositionSnapshot;
export function composeHitoRuntime(input: HitoC3CompositionInput): HitoC3CompositionSnapshot;
export function composeHitoRuntime(input: HitoC2CompositionInput): HitoC2CompositionSnapshot;
export function composeHitoRuntime(input: HitoC1CompositionInput): HitoC1CompositionSnapshot;
export function composeHitoRuntime(
  input: HitoC1CompositionInput | HitoC2CompositionInput | HitoC3CompositionInput | HitoC4CompositionInput | HitoC5CompositionInput | HitoC6CompositionInput | HitoC7CompositionInput,
): HitoC1CompositionSnapshot | HitoC2CompositionSnapshot | HitoC3CompositionSnapshot | HitoC4CompositionSnapshot | HitoC5CompositionSnapshot | HitoC6CompositionSnapshot | HitoC7CompositionSnapshot {
  if (input === null || typeof input !== "object") throw new Error("HITO composition requires a structured input");
  if (Object.hasOwn(input, "g16Request")) return composeHitoC7Runtime(input as HitoC7CompositionInput);
  if (Object.hasOwn(input, "g15Request")) return composeHitoC6Runtime(input as HitoC6CompositionInput);
  if (Object.hasOwn(input, "g14Request")) return composeHitoC5Runtime(input as HitoC5CompositionInput);
  if (Object.hasOwn(input, "g12Request")) return composeHitoC4Runtime(input as HitoC4CompositionInput);
  if (Object.hasOwn(input, "g10Request")) return composeHitoC3Runtime(input as HitoC3CompositionInput);
  if (Object.hasOwn(input, "g8Request")) return composeHitoC2Runtime(input as HitoC2CompositionInput);
  return composeHitoC1Runtime(input);
}

/** Reads only through the existing validated persistence authority, then delegates to the pure spine. */
export function readHitoRuntimeFromProjectRoot(
  projectRoot: string,
  input: HitoC7PersistedCompositionInput,
): Promise<HitoC7CompositionSnapshot>;
export function readHitoRuntimeFromProjectRoot(
  projectRoot: string,
  input: HitoC6PersistedCompositionInput,
): Promise<HitoC6CompositionSnapshot>;
export function readHitoRuntimeFromProjectRoot(
  projectRoot: string,
  input: HitoC5PersistedCompositionInput,
): Promise<HitoC5CompositionSnapshot>;
export function readHitoRuntimeFromProjectRoot(
  projectRoot: string,
  input: HitoC4PersistedCompositionInput,
): Promise<HitoC4CompositionSnapshot>;
export function readHitoRuntimeFromProjectRoot(
  projectRoot: string,
  input: HitoC3PersistedCompositionInput,
): Promise<HitoC3CompositionSnapshot>;
export function readHitoRuntimeFromProjectRoot(
  projectRoot: string,
  input: HitoC2PersistedCompositionInput,
): Promise<HitoC2CompositionSnapshot>;
export function readHitoRuntimeFromProjectRoot(
  projectRoot: string,
  input?: HitoC1PersistedCompositionInput,
): Promise<HitoC1CompositionSnapshot>;
export async function readHitoRuntimeFromProjectRoot(
  projectRoot: string,
  input: HitoC1PersistedCompositionInput | HitoC2PersistedCompositionInput | HitoC3PersistedCompositionInput | HitoC4PersistedCompositionInput | HitoC5PersistedCompositionInput | HitoC6PersistedCompositionInput | HitoC7PersistedCompositionInput = {},
): Promise<HitoC1CompositionSnapshot | HitoC2CompositionSnapshot | HitoC3CompositionSnapshot | HitoC4CompositionSnapshot | HitoC5CompositionSnapshot | HitoC6CompositionSnapshot | HitoC7CompositionSnapshot> {
  if (input === null || typeof input !== "object") throw new Error("HITO composition requires a structured persisted input");
  if (Object.hasOwn(input, "g16Request")) {
    assertExactKeys(input, C7_PERSISTED_INPUT_KEYS, "HITO C7 persisted composition input");
    const g10Request = (input as HitoC7PersistedCompositionInput).g10Request;
    if (g10Request === null || typeof g10Request !== "object") throw new Error("HITO C7 requires a structured persisted G10 request");
    assertExactKeys(g10Request, C3_PERSISTED_G10_REQUEST_KEYS, "HITO C7 persisted G10 request");
  } else if (Object.hasOwn(input, "g15Request")) {
    assertExactKeys(input, C6_PERSISTED_INPUT_KEYS, "HITO C6 persisted composition input");
    const g10Request = (input as HitoC6PersistedCompositionInput).g10Request;
    if (g10Request === null || typeof g10Request !== "object") throw new Error("HITO C6 requires a structured persisted G10 request");
    assertExactKeys(g10Request, C3_PERSISTED_G10_REQUEST_KEYS, "HITO C6 persisted G10 request");
  } else if (Object.hasOwn(input, "g14Request")) {
    assertExactKeys(input, C5_PERSISTED_INPUT_KEYS, "HITO C5 persisted composition input");
    const g10Request = (input as HitoC5PersistedCompositionInput).g10Request;
    if (g10Request === null || typeof g10Request !== "object") throw new Error("HITO C5 requires a structured persisted G10 request");
    assertExactKeys(g10Request, C3_PERSISTED_G10_REQUEST_KEYS, "HITO C5 persisted G10 request");
  } else if (Object.hasOwn(input, "g12Request")) {
    assertExactKeys(input, C4_PERSISTED_INPUT_KEYS, "HITO C4 persisted composition input");
    const g10Request = (input as HitoC4PersistedCompositionInput).g10Request;
    if (g10Request === null || typeof g10Request !== "object") throw new Error("HITO C4 requires a structured persisted G10 request");
    assertExactKeys(g10Request, C3_PERSISTED_G10_REQUEST_KEYS, "HITO C4 persisted G10 request");
  } else if (Object.hasOwn(input, "g10Request")) {
    assertExactKeys(input, C3_PERSISTED_INPUT_KEYS, "HITO C3 persisted composition input");
    const g10Request = (input as HitoC3PersistedCompositionInput).g10Request;
    if (g10Request === null || typeof g10Request !== "object") throw new Error("HITO C3 requires a structured persisted G10 request");
    assertExactKeys(g10Request, C3_PERSISTED_G10_REQUEST_KEYS, "HITO C3 persisted G10 request");
  } else if (Object.hasOwn(input, "g8Request")) {
    assertExactKeys(input, C2_PERSISTED_INPUT_KEYS, "HITO C2 persisted composition input");
  } else {
    assertExactKeys(input, PERSISTED_INPUT_KEYS, "HITO C1 persisted composition input");
  }
  const persisted = await readCanonicalRevisionValidated(projectRoot);
  if (Object.hasOwn(input, "g16Request")) {
    const c7 = input as HitoC7PersistedCompositionInput;
    return composeHitoRuntime({
      ...c7,
      model: persisted.model,
      g10Request: {
        predecessorHistory: c7.g10Request.predecessorHistory,
        successorHistory: persisted.history,
        request: c7.g10Request.request,
      },
    });
  }
  if (Object.hasOwn(input, "g15Request")) {
    const c6 = input as HitoC6PersistedCompositionInput;
    return composeHitoRuntime({
      ...c6,
      model: persisted.model,
      g10Request: {
        predecessorHistory: c6.g10Request.predecessorHistory,
        successorHistory: persisted.history,
        request: c6.g10Request.request,
      },
    });
  }
  if (Object.hasOwn(input, "g14Request")) {
    const c5 = input as HitoC5PersistedCompositionInput;
    return composeHitoRuntime({
      ...c5,
      model: persisted.model,
      g10Request: {
        predecessorHistory: c5.g10Request.predecessorHistory,
        successorHistory: persisted.history,
        request: c5.g10Request.request,
      },
    });
  }
  if (Object.hasOwn(input, "g12Request")) {
    const c4 = input as HitoC4PersistedCompositionInput;
    return composeHitoRuntime({
      ...c4,
      model: persisted.model,
      g10Request: {
        predecessorHistory: c4.g10Request.predecessorHistory,
        successorHistory: persisted.history,
        request: c4.g10Request.request,
      },
    });
  }
  if (Object.hasOwn(input, "g10Request")) {
    const c3 = input as HitoC3PersistedCompositionInput;
    return composeHitoRuntime({
      ...c3,
      model: persisted.model,
      g10Request: {
        predecessorHistory: c3.g10Request.predecessorHistory,
        successorHistory: persisted.history,
        request: c3.g10Request.request,
      },
    });
  }
  return Object.hasOwn(input, "g8Request")
    ? composeHitoRuntime({ ...(input as HitoC2PersistedCompositionInput), model: persisted.model })
    : composeHitoRuntime({ ...(input as HitoC1PersistedCompositionInput), model: persisted.model });
}
